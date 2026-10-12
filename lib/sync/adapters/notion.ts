import { Client } from "@notionhq/client";
import { NOTION_VERSION } from "@/lib/notion/schema";
import { withBudget, withRetry, noteRateLimit } from "../budget";
import {
  AdapterError,
  type DataSourceInfo,
  type PropertySchema,
  type QueryResult,
  type Row,
  type UploadResult,
  type WhoAmI,
  type WorkspaceAdapter,
} from "../transport";
import type { ConnectionKind } from "../types";
import { newId } from "../ids";

/**
 * The real Notion API, behind the same interface as the mock.
 *
 * Everything provider-specific lives here: the data-source split, the two
 * documented 403s that look alike, the file-upload dance for the offline
 * renderer, and the markdown endpoint that the SDK does not cover yet.
 *
 * Every call is wrapped in `withBudget` (per-connection token bucket) and
 * `withRetry` (429/529 only, `Retry-After` honoured), per
 * docs/DATA_SYNC_RESEARCH.md §2.5 and the request-limits guide.
 */

export class NotionAdapter implements WorkspaceAdapter {
  readonly kind: ConnectionKind;
  readonly label = "Notion API";
  private client: Client;
  private connectionId: string;

  constructor(opts: { token: string; connectionId: string; kind?: ConnectionKind }) {
    this.client = new Client({ auth: opts.token, notionVersion: NOTION_VERSION });
    this.connectionId = opts.connectionId;
    this.kind = opts.kind ?? "oauth";
  }

  private async call<T>(cost: number, fn: () => Promise<T>): Promise<T> {
    return withBudget(this.connectionId, () => withRetry(fn, { attempts: 3 }), cost) as Promise<T>;
  }

  /** Turn any Notion failure into one error type the engine understands. */
  private wrap(err: unknown, context: string): never {
    const e = err as any;
    const status = e?.status ?? e?.code;
    const retryAfter = Number(e?.headers?.["retry-after"] ?? e?.additional_data?.retry_after ?? 0);
    if (e?.code === "rate_limited" || status === 429 || status === 529) {
      noteRateLimit(this.connectionId, retryAfter || 5);
      throw new AdapterError(`${context}: Notion is rate limiting this connection.`, {
        code: "rate_limited",
        status: 429,
        retryAfter: retryAfter || 5,
      });
    }
    const blockLimit =
      e?.body?.additional_data?.block_limit ?? e?.additional_data?.block_limit ?? undefined;
    if (e?.code === "restricted_resource" || status === 403) {
      throw new AdapterError(
        blockLimit
          ? "This workspace has used all of its free blocks. Upgrade the plan in Notion to keep writing rows."
          : `${context}: the connection is not allowed to do that here (share the page with the connection, or check its capabilities).`,
        { code: "restricted_resource", status: 403, planLimit: Boolean(blockLimit) }
      );
    }
    throw new AdapterError(`${context}: ${e?.message ?? String(err)}`, {
      code: e?.code ?? "notion_error",
      status: typeof status === "number" ? status : undefined,
    });
  }

  async whoAmI(): Promise<WhoAmI> {
    try {
      const me: any = await this.call(1, () => this.client.users.me({}));
      const owner = me?.bot?.owner;
      return {
        botId: me?.id,
        name: me?.name ?? me?.bot?.owner?.workspace_name ?? "Notion connection",
        workspaceId: owner?.workspace ? undefined : owner?.workspace_id,
        workspaceName: owner?.workspace_name ?? me?.bot?.workspace_name,
        account: owner?.user
          ? { id: owner.user.id, name: owner.user.name, email: owner.user.person?.email }
          : undefined,
      };
    } catch (err) {
      this.wrap(err, "Reading the connection identity");
    }
  }

  async searchDataSources(query: string, limit = 10): Promise<DataSourceInfo[]> {
    try {
      const res: any = await this.call(1, () =>
        (this.client as any).search({
          query: query || undefined,
          page_size: Math.min(limit, 25),
          filter: { property: "object", value: "data_source" },
        })
      );
      return (res.results ?? []).map((ds: any) => this.dataSourceInfo(ds));
    } catch (err) {
      this.wrap(err, "Searching for databases");
    }
  }

  async getDataSource(id: string): Promise<DataSourceInfo | undefined> {
    try {
      const ds: any = await this.call(1, () =>
        (this.client as any).dataSources.retrieve({ data_source_id: id })
      );
      return this.dataSourceInfo(ds);
    } catch (err) {
      const e = err as any;
      if (e?.status === 404) return undefined;
      this.wrap(err, "Reading the data source");
    }
  }

  private dataSourceInfo(ds: any): DataSourceInfo {
    const properties: Record<string, PropertySchema> = {};
    for (const [name, value] of Object.entries<any>(ds?.properties ?? {})) {
      properties[name] = {
        id: value?.id,
        type: value?.type ?? "rich_text",
        format: value?.number?.format,
        options: value?.select?.options ?? value?.multi_select?.options ?? value?.status?.options,
      };
    }
    return {
      id: ds?.id,
      databaseId: ds?.parent?.database_id ?? ds?.database_id,
      title: (ds?.title ?? []).map((t: any) => t.plain_text ?? "").join("") || "Untitled database",
      url: ds?.url,
      properties,
    };
  }

  async createDataSource(input: {
    title: string;
    properties: Record<string, PropertySchema>;
    parentPageId?: string;
  }): Promise<DataSourceInfo> {
    const properties: Record<string, unknown> = {};
    for (const [name, schema] of Object.entries(input.properties)) {
      properties[name] = propertySchemaPayload(schema);
    }
    try {
      const created: any = await this.call(2, () =>
        (this.client as any).databases.create({
          // Omitting `parent` creates the database in the authorising user's
          // Private section. Only public connections may do this; see
          // developers.notion.com/guides/get-started/preparing-for-users.
          ...(input.parentPageId
            ? { parent: { type: "page_id", page_id: input.parentPageId } }
            : {}),
          title: [{ type: "text", text: { content: input.title } }],
          is_inline: false,
          initial_data_source: { properties },
        })
      );
      const dataSourceId = created?.data_sources?.[0]?.id;
      if (!dataSourceId) throw new AdapterError("The database was created without a data source.");
      return {
        id: dataSourceId,
        databaseId: created.id,
        title: input.title,
        url: created.url,
        properties: input.properties,
      };
    } catch (err) {
      this.wrap(err, `Creating the “${input.title}” database`);
    }
  }

  async queryRows(input: {
    dataSourceId: string;
    pageSize?: number;
    cursor?: string;
    filters?: { prop: string; equals: string | number | boolean }[];
  }): Promise<QueryResult> {
    const filter =
      input.filters?.length
        ? {
            and: input.filters.map((f) => ({
              property: f.prop,
              [typeof f.equals === "number"
                ? "number"
                : typeof f.equals === "boolean"
                  ? "checkbox"
                  : "rich_text"]: { equals: f.equals },
            })),
          }
        : undefined;
    try {
      const res: any = await this.call(1, () =>
        (this.client as any).dataSources.query({
          data_source_id: input.dataSourceId,
          page_size: Math.min(input.pageSize ?? 100, 100),
          start_cursor: input.cursor,
          ...(filter ? { filter } : {}),
        })
      );
      return {
        rows: (res.results ?? []).map((page: any) => this.toRow(page)),
        hasMore: Boolean(res.has_more),
        nextCursor: res.next_cursor ?? undefined,
      };
    } catch (err) {
      this.wrap(err, "Querying the data source");
    }
  }

  private toRow(page: any): Row {
    return {
      id: page.id,
      url: page.url,
      lastEditedTime: page.last_edited_time,
      raw: page.properties ?? {},
      inTrash: page.in_trash ?? page.archived ?? false,
      dataSourceId:
        (page.parent as { type?: string; data_source_id?: string } | undefined)
          ?.data_source_id ?? undefined,
    };
  }

  async retrieveRow(id: string): Promise<Row | undefined> {
    try {
      const page: any = await this.call(1, () => this.client.pages.retrieve({ page_id: id }));
      return this.toRow(page);
    } catch (err) {
      const e = err as any;
      if (e?.status === 404) return undefined;
      this.wrap(err, "Reading a row");
    }
  }

  async createRow(input: { dataSourceId: string; properties: Record<string, unknown> }): Promise<Row> {
    try {
      const page: any = await this.call(1, () =>
        this.client.pages.create({
          parent: { type: "data_source_id", data_source_id: input.dataSourceId } as any,
          properties: input.properties as any,
          // A 40-row sync must not notify every watcher of the database.
          notifications: { mode: "silent" },
        } as any)
      );
      return this.toRow(page);
    } catch (err) {
      this.wrap(err, "Creating a row");
    }
  }

  async updateRow(input: { id: string; properties: Record<string, unknown> }): Promise<Row> {
    try {
      const page: any = await this.call(1, () =>
        (this.client as any).pages.update({
          page_id: input.id,
          properties: input.properties,
          notifications: { mode: "silent" },
        })
      );
      return this.toRow(page);
    } catch (err) {
      this.wrap(err, "Updating a row");
    }
  }

  async trashRow(id: string): Promise<void> {
    try {
      await this.call(1, () =>
        (this.client as any).pages.update({ page_id: id, in_trash: true, notifications: { mode: "silent" } })
      );
    } catch (err) {
      this.wrap(err, "Deleting a row");
    }
  }

  /* --- renderers --------------------------------------------------- */

  async updateDataSourceProperties(input: {
    dataSourceId: string;
    properties: Record<string, PropertySchema>;
  }): Promise<void> {
    const properties: Record<string, unknown> = {};
    for (const [name, schema] of Object.entries(input.properties)) {
      properties[name] = propertySchemaPayload(schema);
    }
    try {
      await this.call(1, () =>
        (this.client as any).dataSources.update({
          data_source_id: input.dataSourceId,
          properties,
        })
      );
    } catch (err) {
      this.wrap(err, "Adding properties to the bound database");
    }
  }

  async uploadHtml(input: { filename: string; html: string }): Promise<UploadResult> {
    try {
      return await this.call(2, async () => {
        const upload: any = await (this.client as any).fileUploads.create({
          mode: "single_part",
          filename: input.filename,
          content_type: "text/html",
        });
        const form = new FormData();
        form.append(
          "file",
          new Blob([Buffer.from(input.html, "utf8")], { type: "text/html" }),
          upload.filename ?? input.filename
        );
        const res = await fetch(upload.upload_url, { method: "POST", body: form as any });
        if (!res.ok) {
          throw new AdapterError(`Upload failed (${res.status}): ${await res.text()}`, {
            code: "upload_failed",
            status: res.status,
          });
        }
        return { fileUploadId: upload.id };
      });
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      this.wrap(err, "Uploading the widget file");
    }
  }

  async appendHtmlBlock(input: {
    parentId: string;
    fileUploadId: string;
    caption?: string;
  }): Promise<{ blockId: string }> {
    try {
      const res: any = await this.call(1, () =>
        this.client.blocks.children.append({
          block_id: input.parentId,
          children: [
            {
              object: "block",
              type: "embed",
              embed: {
                type: "file_upload",
                file_upload: { id: input.fileUploadId },
                caption: input.caption ? [{ type: "text", text: { content: input.caption } }] : [],
              },
            } as any,
          ],
        } as any)
      );
      return { blockId: res?.results?.[0]?.id };
    } catch (err) {
      this.wrap(err, "Installing the HTML block");
    }
  }

  /**
   * Refresh the file behind a live HTML block.
   *
   * PATCH /v1/blocks/{id} accepts an embed `file_upload` (OpenAPI:
   * updateEmbedFileUploadRequest), so a refresh is one request and the user's
   * page keeps its layout, caption and position. Open question Q3 in
   * docs/DATA_SYNC_RESEARCH.md §8 is exactly this call: if a real workspace
   * rejects it, the caller falls back to delete plus re-append at `position`.
   */
  async replaceBlockFile(input: { blockId: string; fileUploadId: string }): Promise<void> {
    try {
      await this.call(1, () =>
        this.client.blocks.update({
          block_id: input.blockId,
          embed: { type: "file_upload", file_upload: { id: input.fileUploadId } } as any,
        } as any)
      );
    } catch (err) {
      this.wrap(err, "Refreshing the HTML block file");
    }
  }

  async appendMarkdown(input: { pageId: string; markdown: string }): Promise<{ appended: number }> {
    // The markdown endpoints are newer than the SDK surface, and patching a page
    // is the only way to hit them without a block walk.
    try {
      return await this.call(2, async () => {
        const res = await this.raw("PATCH", `/v1/pages/${input.pageId}/markdown`, {
          markdown: input.markdown,
          mode: "append",
        });
        return { appended: Number((res as any)?.blocks_appended ?? 0) };
      });
    } catch (err) {
      this.wrap(err, "Appending markdown to the page");
    }
  }

  async recentRows(input: { dataSourceId: string; limit?: number }): Promise<Row[]> {
    const res = await this.queryRows({ dataSourceId: input.dataSourceId, pageSize: input.limit ?? 50 });
    return res.rows;
  }

  /** Raw REST escape hatch for endpoints the typed SDK does not expose yet. */
  private async raw(method: string, path: string, body?: unknown): Promise<unknown> {
    const token = (this.client as any).auth as string;
    const res = await fetch(`https://api.notion.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const retryAfter = Number(res.headers.get("retry-after") ?? 0);
      if (res.status === 429 && retryAfter) noteRateLimit(this.connectionId, retryAfter);
      throw Object.assign(
        new AdapterError(`Notion ${res.status} on ${path}: ${parsed?.message ?? text}`, {
          code: parsed?.code ?? `http_${res.status}`,
          status: res.status,
          retryAfter: retryAfter || undefined,
          planLimit: Boolean(parsed?.additional_data?.block_limit),
        }),
        { body: parsed }
      );
    }
    return parsed;
  }
}

/**
 * Property schema -> create payload.
 *
 * Only the types a widget can actually write are expressible here. Anything
 * else (formula, rollup, created_time, ...) has no create payload, which is the
 * correct outcome: a component must not provision a column it cannot fill.
 */
export function propertySchemaPayload(schema: PropertySchema): Record<string, unknown> {
  switch (schema.type) {
    case "title":
      return { title: {} };
    case "rich_text":
      return { rich_text: {} };
    case "number":
      return { number: { format: schema.format ?? "number" } };
    case "checkbox":
      return { checkbox: {} };
    case "date":
      return { date: {} };
    case "url":
      return { url: {} };
    case "email":
      return { email: {} };
    case "phone_number":
      return { phone_number: {} };
    case "select":
      return {
        select: {
          options: (schema.options ?? []).map((o) => ({ name: o.name, color: o.color ?? "default" })),
        },
      };
    case "multi_select":
      return {
        multi_select: {
          options: (schema.options ?? []).map((o) => ({ name: o.name, color: o.color ?? "default" })),
        },
      };
    case "status":
      return {
        status: {
          options: (schema.options ?? []).map((o) => ({
            name: o.name,
            color: o.color ?? "default",
            ...(o.group ? { group: o.group } : {}),
          })),
        },
      };
    case "people":
      return { people: {} };
    case "relation":
      return { relation: {} };
    default:
      throw new AdapterError(`Property type “${schema.type}” cannot be created by a component.`, {
        code: "unsupported_property_type",
      });
  }
}

/** Stable, human-readable ids for rows we create so logs are greppable. */
export function localRowTag(key: string) {
  return `arena_${newId("row", 4)}_${key.slice(0, 24)}`;
}

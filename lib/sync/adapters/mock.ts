import { Store } from "../store";
import { newId } from "../ids";
import { readProperty } from "../mapping";
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
import type { ConnectionKind, NotionPropertyType } from "../types";

/**
 * A Notion-shaped workspace that lives in our own store.
 *
 * It exists for three reasons, in order of importance:
 *
 * 1. The two-way loop cannot be developed or tested against a real workspace.
 *    Webhook URLs must be public, `Retry-After` behaviour cannot be triggered on
 *    demand, and a 403 `restricted_resource` (the Free-plan block limit, see
 *    docs/DATA_SYNC_RESEARCH.md §2.5) needs a workspace to reproduce.
 * 2. The playground has to be clickable in a preview with no credentials.
 * 3. It is the executable spec for the real adapter: same payload shapes, same
 *    cursor semantics, same failure codes. If a shape is wrong here, the real
 *    adapter is wrong in the same way, which is worse.
 *
 * Property payloads are stored exactly as the Notion API returns them, so
 * `readProperty` in lib/sync/mapping.ts is exercised by both adapters.
 */

export interface MockRow {
  id: string;
  createdAt: string;
  lastEditedTime: string;
  createdBy: string;
  lastEditedBy: string;
  properties: Record<string, unknown>;
  inTrash?: boolean;
}

export interface MockDataSource {
  id: string;
  databaseId: string;
  title: string;
  properties: Record<string, PropertySchema>;
  rows: MockRow[];
}

export interface MockUpload {
  id: string;
  filename: string;
  bytes: number;
  html: string;
  createdAt: string;
}

export interface MockBlock {
  id: string;
  parentId: string;
  type: "embed";
  fileUploadId?: string;
  url?: string;
  caption?: string;
  createdAt: string;
  /** how many times the file behind this block was replaced */
  refreshes: number;
}

export interface MockWorkspace {
  workspaceId: string;
  workspaceName: string;
  users: { id: string; name: string; email: string }[];
  dataSources: MockDataSource[];
  blocks: MockBlock[];
  uploads: MockUpload[];
  seq: number;
}

const DEFAULT_HABITS = ["Read", "Move", "Write", "No screens", "Sleep 8h"];

function iso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function prop(type: string, name: string, value: unknown): Record<string, unknown> {
  switch (type) {
    case "title":
    case "rich_text":
      return { [type]: value ? [{ type: "text", text: { content: String(value) } }] : [] };
    case "number":
      return { number: value === null || value === undefined ? null : Number(value) };
    case "checkbox":
      return { checkbox: Boolean(value) };
    case "date":
      return { date: value ? { start: String(value) } : null };
    case "select":
      return { select: value ? { name: String(value) } : null };
    case "multi_select":
      return { multi_select: Array.isArray(value) ? value.map((n) => ({ name: String(n) })) : [] };
    case "url":
      return { url: value ?? null };
    default:
      return { rich_text: value ? [{ type: "text", text: { content: String(value) } }] : [] };
  }
}

function seed(): MockWorkspace {
  const someone = { id: "user_owner", name: "Workspace Owner", email: "owner@example.com" };
  const ws: MockWorkspace = {
    workspaceId: "ws_mock_arena",
    workspaceName: "Arena demo workspace",
    users: [
      someone,
      { id: "user_teammate", name: "Teammate", email: "teammate@example.com" },
    ],
    dataSources: [],
    blocks: [],
    uploads: [],
    seq: 1,
  };

  ws.dataSources.push({
    id: "ds_habits",
    databaseId: "db_habits",
    title: "Habits",
    properties: {
      Habit: { type: "title" },
      Date: { type: "date" },
      Level: { type: "number", format: "number" },
      "Arena key": { type: "rich_text" },
      Updated: { type: "date" },
      Source: { type: "select", options: [{ name: "widget" }, { name: "notion" }] },
    },
    rows: [],
  });

  ws.dataSources.push({
    id: "ds_expenses",
    databaseId: "db_expenses",
    title: "Expenses",
    properties: {
      Description: { type: "title" },
      Amount: { type: "number", format: "dollar" },
      Category: { type: "select", options: [{ name: "Food" }, { name: "Travel" }, { name: "Tools" }] },
      Date: { type: "date" },
      "Arena key": { type: "rich_text" },
      Source: { type: "select", options: [{ name: "widget" }, { name: "notion" }] },
    },
    rows: [],
  });

  // The generic binding target: one row per instance, whole state JSON inside.
  ws.dataSources.push({
    id: "ds_arena_state",
    databaseId: "db_arena_state",
    title: "Arena component state",
    properties: {
      Component: { type: "title" },
      Instance: { type: "rich_text" },
      State: { type: "rich_text" },
      Rev: { type: "number", format: "number" },
      Updated: { type: "date" },
      Device: { type: "select", options: [{ name: "desktop" }, { name: "phone" }, { name: "notion" }] },
    },
    rows: [],
  });

  // A few habit ticks a human "already typed into Notion", so the first pull
  // has something real in it and the heatmap is not empty on first load.
  const today = new Date();
  for (let back = 1; back <= 6; back++) {
    const d = new Date(today.getTime() - back * 86_400_000);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    for (const habit of DEFAULT_HABITS.slice(0, 3)) {
      const key = `${habit}|${date}`;
      ws.dataSources[0].rows.push({
        id: newId("row", 8),
        createdAt: iso(-back * 86_400_000),
        lastEditedTime: iso(-back * 86_400_000),
        createdBy: someone.id,
        lastEditedBy: someone.id,
        properties: {
          Habit: prop("title", "Habit", habit),
          Date: prop("date", "Date", date),
          Level: prop("number", "Level", (back % 3) + 1),
          "Arena key": prop("rich_text", "Arena key", key),
          Updated: prop("date", "Updated", date),
          Source: prop("select", "Source", "notion"),
        },
      });
    }
  }

  return ws;
}

let cached: MockWorkspace | null = null;

export async function loadMock(): Promise<MockWorkspace> {
  if (cached) return cached;
  const stored = await Store.mockState<MockWorkspace>();
  cached = stored ?? seed();
  if (!stored) await Store.saveMockState(cached);
  return cached;
}

async function save(ws: MockWorkspace) {
  cached = ws;
  await Store.saveMockState(ws);
}

export function resetMockCache() {
  cached = null;
}

function source(ws: MockWorkspace, id: string): MockDataSource {
  const ds = ws.dataSources.find((d) => d.id === id || d.databaseId === id);
  if (!ds) {
    throw new AdapterError(`Unknown data source ${id}`, { code: "object_not_found", status: 404 });
  }
  return ds;
}

function plain(properties: Record<string, unknown>, prop: string): string {
  const raw = properties[prop] as any;
  if (!raw) return "";
  if (raw.title) return raw.title.map((t: any) => t.plain_text ?? t.text?.content ?? "").join("");
  if (raw.rich_text)
    return raw.rich_text.map((t: any) => t.plain_text ?? t.text?.content ?? "").join("");
  if (raw.number !== undefined) return String(raw.number);
  if (raw.checkbox !== undefined) return String(raw.checkbox);
  if (raw.date) return raw.date?.start ?? "";
  if (raw.select) return raw.select?.name ?? "";
  return "";
}

function toRow(row: MockRow, dataSourceId?: string): Row {
  return {
    id: row.id,
    lastEditedTime: row.lastEditedTime,
    raw: row.properties,
    inTrash: row.inTrash,
    dataSourceId,
  };
}

/** Option merge that mirrors Notion's case-insensitive, keep-colour behaviour. */
function mergeOptions(
  before: PropertySchema["options"],
  after: PropertySchema["options"]
): PropertySchema["options"] {
  if (!after?.length) return before;
  const merged = [...(before ?? [])];
  for (const option of after) {
    const hit = merged.find((o) => o.name.toLowerCase() === option.name.toLowerCase());
    if (hit) hit.color = option.color ?? hit.color;
    else merged.push(option);
  }
  return merged;
}

/* ------------------------------------------------------------------ */
/* The adapter                                                         */
/* ------------------------------------------------------------------ */

export class MockWorkspaceAdapter implements WorkspaceAdapter {
  readonly kind: ConnectionKind = "mock";
  readonly label = "Mock workspace";

  async whoAmI(): Promise<WhoAmI> {
    const ws = await loadMock();
    return {
      botId: "bot_mock_arena",
      name: "Arena (mock connection)",
      workspaceId: ws.workspaceId,
      workspaceName: ws.workspaceName,
      account: ws.users[0],
    };
  }

  async searchDataSources(query: string, limit = 10): Promise<DataSourceInfo[]> {
    const ws = await loadMock();
    const q = query.trim().toLowerCase();
    return ws.dataSources
      .filter((d) => !q || d.title.toLowerCase().includes(q))
      .slice(0, limit)
      .map((d) => ({
        id: d.id,
        databaseId: d.databaseId,
        title: d.title,
        properties: d.properties,
      }));
  }

  async getDataSource(id: string): Promise<DataSourceInfo | undefined> {
    const ws = await loadMock();
    const ds = ws.dataSources.find((d) => d.id === id || d.databaseId === id);
    if (!ds) return undefined;
    return { id: ds.id, databaseId: ds.databaseId, title: ds.title, properties: ds.properties };
  }

  async createDataSource(input: {
    title: string;
    properties: Record<string, PropertySchema>;
    parentPageId?: string;
  }): Promise<DataSourceInfo> {
    const ws = await loadMock();
    ws.seq += 1;
    const ds: MockDataSource = {
      id: `ds_${ws.seq}_${Math.random().toString(36).slice(2, 6)}`,
      databaseId: `db_${ws.seq}_${Math.random().toString(36).slice(2, 6)}`,
      title: input.title,
      properties: input.properties,
      rows: [],
    };
    ws.dataSources.push(ds);
    await save(ws);
    return { id: ds.id, databaseId: ds.databaseId, title: ds.title, properties: ds.properties };
  }

  async queryRows(input: {
    dataSourceId: string;
    pageSize?: number;
    cursor?: string;
    filters?: { prop: string; equals: string | number | boolean }[];
  }): Promise<QueryResult> {
    const ws = await loadMock();
    const ds = source(ws, input.dataSourceId);
    const pageSize = Math.min(input.pageSize ?? 100, 100);
    let rows = ds.rows.filter((r) => !r.inTrash);
    for (const filter of input.filters ?? []) {
      rows = rows.filter((r) => {
        const actual = plain(r.properties, filter.prop);
        return actual.toLowerCase() === String(filter.equals).toLowerCase();
      });
    }
    const offset = input.cursor ? Number(input.cursor) : 0;
    const slice = rows.slice(offset, offset + pageSize);
    return {
      rows: slice.map((r) => toRow(r, ds.id)),
      hasMore: offset + pageSize < rows.length,
      nextCursor: offset + pageSize < rows.length ? String(offset + pageSize) : undefined,
    };
  }

  async updateDataSourceProperties(input: {
    dataSourceId: string;
    properties: Record<string, PropertySchema>;
  }): Promise<void> {
    const ws = await loadMock();
    const ds = source(ws, input.dataSourceId);
    for (const [name, schema] of Object.entries(input.properties)) {
      const existing = Object.keys(ds.properties).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        // Mirror the October 2026 update semantics: keep the existing name,
        // refresh the type, merge options rather than replacing them.
        ds.properties[existing] = {
          ...ds.properties[existing],
          ...schema,
          options: mergeOptions(ds.properties[existing].options, schema.options),
        };
      } else {
        ds.properties[name] = schema;
      }
    }
    await save(ws);
  }

  async retrieveRow(id: string): Promise<Row | undefined> {
    const ws = await loadMock();
    for (const ds of ws.dataSources) {
      const row = ds.rows.find((r) => r.id === id);
      if (row) return toRow(row, ds.id);
    }
    return undefined;
  }

  async createRow(input: {
    dataSourceId: string;
    properties: Record<string, unknown>;
  }): Promise<Row> {
    const ws = await loadMock();
    const ds = source(ws, input.dataSourceId);
    const now = iso();
    const row: MockRow = {
      id: newId("row", 8),
      createdAt: now,
      lastEditedTime: now,
      createdBy: "bot_mock_arena",
      lastEditedBy: "bot_mock_arena",
      properties: input.properties,
    };
    ds.rows.push(row);
    await save(ws);
    return toRow(row, ds.id);
  }

  async updateRow(input: { id: string; properties: Record<string, unknown> }): Promise<Row> {
    const ws = await loadMock();
    for (const ds of ws.dataSources) {
      const row = ds.rows.find((r) => r.id === input.id);
      if (row) {
        row.properties = { ...row.properties, ...input.properties };
        row.lastEditedTime = iso();
        row.lastEditedBy = "bot_mock_arena";
        await save(ws);
        return toRow(row, ds.id);
      }
    }
    throw new AdapterError(`Unknown row ${input.id}`, { code: "object_not_found", status: 404 });
  }

  async trashRow(id: string): Promise<void> {
    const ws = await loadMock();
    for (const ds of ws.dataSources) {
      const row = ds.rows.find((r) => r.id === id);
      if (row) {
        row.inTrash = true;
        row.lastEditedTime = iso();
        await save(ws);
        return;
      }
    }
  }

  async uploadHtml(input: { filename: string; html: string }): Promise<UploadResult> {
    const ws = await loadMock();
    const upload: MockUpload = {
      id: newId("up", 8),
      filename: input.filename,
      bytes: Buffer.byteLength(input.html, "utf8"),
      html: input.html,
      createdAt: iso(),
    };
    ws.uploads.push(upload);
    await save(ws);
    return { fileUploadId: upload.id };
  }

  async appendHtmlBlock(input: {
    parentId: string;
    fileUploadId: string;
    caption?: string;
  }): Promise<{ blockId: string }> {
    const ws = await loadMock();
    const block: MockBlock = {
      id: newId("blk", 8),
      parentId: input.parentId,
      type: "embed",
      fileUploadId: input.fileUploadId,
      caption: input.caption,
      createdAt: iso(),
      refreshes: 0,
    };
    ws.blocks.push(block);
    await save(ws);
    return { blockId: block.id };
  }

  async replaceBlockFile(input: { blockId: string; fileUploadId: string }): Promise<void> {
    const ws = await loadMock();
    const block = ws.blocks.find((b) => b.id === input.blockId);
    if (!block) {
      throw new AdapterError(`Unknown block ${input.blockId}`, {
        code: "object_not_found",
        status: 404,
      });
    }
    block.fileUploadId = input.fileUploadId;
    block.refreshes += 1;
    await save(ws);
  }

  async appendMarkdown(input: { pageId: string; markdown: string }): Promise<{ appended: number }> {
    const ws = await loadMock();
    ws.blocks.push({
      id: newId("blk", 8),
      parentId: input.pageId,
      type: "embed",
      url: `data:text/markdown,${encodeURIComponent(input.markdown.slice(0, 64))}`,
      createdAt: iso(),
      refreshes: 0,
    });
    await save(ws);
    return { appended: input.markdown.split("\n\n").length };
  }

  async recentRows(input: { dataSourceId: string; limit?: number }): Promise<Row[]> {
    const ws = await loadMock();
    const ds = source(ws, input.dataSourceId);
    return ds.rows
      .filter((r) => !r.inTrash)
      .sort((a, b) => b.lastEditedTime.localeCompare(a.lastEditedTime))
      .slice(0, input.limit ?? 50)
      .map((r) => toRow(r, ds.id));
  }
}

/* ------------------------------------------------------------------ */
/* Human edits: what the dev route and the playground trigger           */
/* ------------------------------------------------------------------ */

export interface MockEditInput {
  dataSourceId: string;
  /** target by row id, or by business key property + value */
  rowId?: string;
  keyProp?: string;
  keyValue?: string;
  properties: Record<string, unknown>;
  authorId?: string;
}

/**
 * Simulates a person editing a row in the Notion UI, including the properties
 * the engine never writes (`Source`, `lastEditedBy`), because that asymmetry is
 * exactly what a sync engine has to survive.
 */
export async function mockHumanEdit(
  input: MockEditInput
): Promise<{ rowId: string; dataSourceId: string; created: boolean }> {
  const ws = await loadMock();
  const ds = source(ws, input.dataSourceId);
  let row: MockRow | undefined;
  let created = false;

  if (input.rowId) {
    row = ds.rows.find((r) => r.id === input.rowId);
    if (!row) {
      throw new AdapterError(`No row ${input.rowId} in “${ds.title}”.`, {
        code: "object_not_found",
        status: 404,
      });
    }
  } else if (input.keyProp && input.keyValue !== undefined) {
    // Read it the way the engine reads it, so the simulator cannot be fooled by
    // a payload shape the reader would not accept.
    const keyType = (ds.properties[input.keyProp]?.type as NotionPropertyType) ?? "rich_text";
    row = ds.rows.find(
      (r) => readPlain(r.properties[input.keyProp!], keyType) === input.keyValue
    );
    if (!row) {
      throw new AdapterError(
        `No row in “${ds.title}” has ${input.keyProp} = “${input.keyValue}”. A person editing in Notion can only change a row that is there.`,
        { code: "object_not_found", status: 404 }
      );
    }
  } else {
    // No target given: this is "someone typed a new row into the table", which
    // is a real and common case, so it is allowed but reported as such.
    created = true;
  }

  if (created || !row) {
    const now = iso();
    row = {
      id: newId("row", 8),
      createdAt: now,
      lastEditedTime: now,
      createdBy: input.authorId ?? "user_owner",
      lastEditedBy: input.authorId ?? "user_owner",
      properties: input.properties,
    };
    ds.rows.push(row);
  } else {
    row.properties = { ...row.properties, ...input.properties };
    row.lastEditedTime = iso();
    row.lastEditedBy = input.authorId ?? "user_owner";
  }
  await save(ws);
  return { rowId: row.id, dataSourceId: ds.id, created };
}

/** The typed reader, applied to one stored payload. Keeps the simulator honest. */
function readPlain(raw: unknown, type: NotionPropertyType): string {
  const value = readProperty(type, raw);
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export async function mockDeleteRow(rowId: string): Promise<void> {
  const ws = await loadMock();
  for (const ds of ws.dataSources) {
    const row = ds.rows.find((r) => r.id === rowId);
    if (row) {
      row.inTrash = true;
      row.lastEditedTime = iso();
      await save(ws);
      return;
    }
  }
}

/** A mock table view for the playground: rows as the user sees them in Notion. */
export async function mockTableView(dataSourceId: string, limit = 50) {
  const ws = await loadMock();
  const ds = source(ws, dataSourceId);
  const rows = ds.rows.filter((r) => !r.inTrash).slice(-limit).reverse();
  const columns = Object.keys(ds.properties);
  return {
    databaseTitle: ds.title,
    columns,
    rows: rows.map((r) => ({
      id: r.id,
      lastEditedTime: r.lastEditedTime,
      lastEditedBy: r.lastEditedBy,
      cells: Object.fromEntries(columns.map((c) => [c, plain(r.properties, c)])),
    })),
  };
}

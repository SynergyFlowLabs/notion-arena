import type { ConnectionKind } from "./types";

/**
 * The small surface of Notion the engine actually needs.
 *
 * Two implementations ship: `adapters/mock.ts` (a workspace that lives in the
 * store, used by the playground and by tests, with no credentials) and
 * `adapters/notion.ts` (the real API). Everything above this interface is
 * agnostic about which one is in play, which is what makes the engine testable
 * without a workspace and what makes the notebook of "what Notion can do" a
 * single file.
 */

export interface PropertySchema {
  id?: string;
  name?: string;
  type: string;
  format?: string;
  options?: { id?: string; name: string; color?: string; group?: string }[];
}

export interface DataSourceInfo {
  id: string;
  databaseId?: string;
  title: string;
  url?: string;
  properties: Record<string, PropertySchema>;
}

/** A row, normalised. `raw` keeps the provider's own property payload. */
export interface Row {
  id: string;
  url?: string;
  lastEditedTime: string;
  raw: Record<string, unknown>;
  inTrash?: boolean;
  /**
   * Which data source this row belongs to.
   *
   * The webhook payload is a set of ids with no context (research §2.3), and one
   * connection usually backs several instances, so the fan-out has to ask
   * "is this row in *my* table?" before it commits a change. Without this, a
   * single edit fans out to every instance on the connection.
   */
  dataSourceId?: string;
}

export interface QueryResult {
  rows: Row[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface WhoAmI {
  botId?: string;
  name?: string;
  workspaceId?: string;
  workspaceName?: string;
  account?: { id?: string; name?: string; email?: string };
}

export interface UploadResult {
  fileUploadId: string;
}

export interface WorkspaceAdapter {
  readonly kind: ConnectionKind;
  /** provider label used in logs and in the UI ("Mock workspace", "Notion API") */
  readonly label: string;

  whoAmI(): Promise<WhoAmI>;

  /** Find candidate databases to bind to. Real adapter uses POST /v1/search. */
  searchDataSources(query: string, limit?: number): Promise<DataSourceInfo[]>;

  getDataSource(id: string): Promise<DataSourceInfo | undefined>;

  /** Create a data source + database at workspace level (public connections only). */
  createDataSource(input: {
    title: string;
    properties: Record<string, PropertySchema>;
    parentPageId?: string;
  }): Promise<DataSourceInfo>;

  /**
   * Add or change properties on an existing data source.
   *
   * Needed because a user almost always points a component at a database they
   * already built, and the widget's fields have to land somewhere. October 2026
   * changed the semantics here in our favour: option colours update in place,
   * option names match case-insensitively, and omitting `description` keeps the
   * existing one (changelog, October 9 2026).
   */
  updateDataSourceProperties(input: {
    dataSourceId: string;
    properties: Record<string, PropertySchema>;
  }): Promise<void>;

  queryRows(input: {
    dataSourceId: string;
    pageSize?: number;
    cursor?: string;
    filters?: { prop: string; equals: string | number | boolean }[];
  }): Promise<QueryResult>;

  retrieveRow(id: string): Promise<Row | undefined>;

  createRow(input: { dataSourceId: string; properties: Record<string, unknown> }): Promise<Row>;

  updateRow(input: { id: string; properties: Record<string, unknown> }): Promise<Row>;

  trashRow(id: string): Promise<void>;

  /* --- renderers ------------------------------------------------- */

  /** Upload a rendered widget file. Used by the offline renderer refresh. */
  uploadHtml(input: { filename: string; html: string }): Promise<UploadResult>;

  /** Attach an uploaded file as a new embed block (the HTML block install). */
  appendHtmlBlock(input: {
    parentId: string;
    fileUploadId: string;
    caption?: string;
  }): Promise<{ blockId: string }>;

  /**
   * Replace the file behind an existing embed block in place.
   *
   * This is the mechanism that keeps an offline renderer fresh: the OpenAPI
   * schema for PATCH /v1/blocks/{id} accepts an embed `file_upload`, so a
   * refresh costs one request and does not churn the user's page layout.
   */
  replaceBlockFile(input: { blockId: string; fileUploadId: string }): Promise<void>;

  /** Append markdown to a page (page-body bindings). */
  appendMarkdown(input: { pageId: string; markdown: string }): Promise<{ appended: number }>;

  /** Recent edits in a data source, used to prime the change log after downtime. */
  recentRows(input: { dataSourceId: string; limit?: number }): Promise<Row[]>;
}

export class AdapterError extends Error {
  code: string;
  status?: number;
  retryAfter?: number;
  /** Notion's 403 `restricted_resource` with `additional_data.block_limit`. */
  planLimit?: boolean;
  constructor(
    message: string,
    opts: { code?: string; status?: number; retryAfter?: number; planLimit?: boolean } = {}
  ) {
    super(message);
    this.name = "AdapterError";
    this.code = opts.code ?? "adapter_error";
    this.status = opts.status;
    this.retryAfter = opts.retryAfter;
    this.planLimit = opts.planLimit;
  }
}

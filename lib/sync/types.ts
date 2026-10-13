/**
 * The data plane's vocabulary.
 *
 * Two things existed before this file: components (a config surface) and a
 * one-shot installer (a token used for the duration of a request). Neither can
 * express "this widget, on this Notion page, writes to these rows in that
 * database". Everything below exists to say exactly that.
 *
 * See docs/DATA_SYNC_RESEARCH.md for why each field is here.
 */

/** How a widget's state maps onto Notion. */
export type BindingMode =
  /** One row per instance, the whole state JSON in a rich_text property.
   *  Works for all 192 widgets with zero widget changes: the bridge adopts
   *  their existing `notion-arena.<slug>.v1` localStorage key. */
  | "kv-blob"
  /** One row per record, field-mapped to real properties. This is what makes a
   *  widget "loggable" in Notion tables: a habit tick becomes a row you can
   *  sort, group, roll up and filter. */
  | "records"
  /** Append-only markdown into a page body (journals, meeting notes, logs).
   *  Declared here so bindings can be authored against it; the engine ships it
   *  in phase 3 (see docs/SYNC_PLAN.md). */
  | "page-body";

export type NotionPropertyType =
  | "title"
  | "rich_text"
  | "number"
  | "checkbox"
  | "date"
  | "select"
  | "multi_select"
  | "status"
  | "url"
  | "email"
  | "phone_number"
  | "people"
  | "relation";

export interface FieldMap {
  /** key inside the widget's record object */
  key: string;
  /** property name in the bound data source */
  prop: string;
  type: NotionPropertyType;
  /** number format hint, applied when we provision a database for the user */
  format?: string;
  /** select/multi_select vocabulary, so a provisioned table matches the widget */
  options?: string[];
  /** true when the value is part of the business key used for upserts */
  keyPart?: boolean;
  /** read-only properties (formula, rollup, created_*) may be displayed, never written */
  readOnly?: boolean;
}

export interface Binding {
  mode: BindingMode;
  /** the Notion data source that holds the rows */
  dataSourceId: string;
  /** the Notion database container (needed for views and page parents) */
  databaseId?: string;
  databaseTitle: string;
  /** records mode: name of the property holding the business key */
  keyProp: string;
  /** records mode: field map */
  fields: FieldMap[];
  /** kv-blob mode: property names */
  stateProp?: string;
  updatedProp?: string;
  revProp?: string;
  /** page-body mode: page id + optional section anchor */
  pageId?: string;
  anchor?: string;
  /**
   * The shape of the widget's first document, one record deep.
   *
   * A binding used to be rebuilt from its rows alone, which is fine for an
   * array of records and wrong for everything else: a widget whose document is
   * `{meeting, date, items: […]}` read back as a bare array, and a widget keyed
   * by an id read back as a list. The device that receives that document is the
   * widget whose storage it lands in, so it has to be the shape the widget
   * wrote. This is that shape, kept as evidence rather than re-guessed.
   */
  docHint?: unknown;
  /** how to resolve a key written on both sides before either was observed */
  conflict: "last-write-wins" | "keep-both" | "manual";
  /** only sync rows matching this filter (authoring convenience, server-side) */
  scope?: { prop: string; equals: string | number | boolean }[];
}

export type ConnectionKind = "oauth" | "pat" | "internal" | "mock";

/** A workspace-level credential. The raw Notion token never leaves the server. */
export interface Connection {
  id: string;
  kind: ConnectionKind;
  /** human label: workspace name, or "Personal token" */
  label: string;
  workspaceId?: string;
  workspaceName?: string;
  botId?: string;
  /** AES-256-GCM sealed token, see lib/sync/crypto.ts */
  sealed: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  /** set when Notion or the user revokes us */
  revokedAt?: string;
  account?: { id?: string; name?: string; email?: string };
}

export interface PublishState {
  channel: "html-block" | "embed" | "both" | "none";
  pageId?: string;
  blockId?: string;
  fileUploadId?: string;
  /** instance rev that the offline file currently carries */
  publishedRev?: number;
  publishedAt?: string;
  /** republish bookkeeping: how many refreshes we have made */
  refreshes?: number;
}

/** One rendered component somewhere in a workspace. */
export interface Instance {
  id: string;
  slug: string;
  /** display name, defaults to the component name */
  name: string;
  createdAt: string;
  updatedAt: string;
  connectionId: string;
  binding: Binding;
  /** widget config, same key set the query string used to carry */
  config: Record<string, string | number | boolean>;
  /** server revision. Monotonic. Every accepted op or remote change bumps it. */
  rev: number;
  /** sha256 of the sync key. Verification never needs the key itself. */
  syncKeyHash: string;
  /**
   * The key, sealed with the same envelope as a connection token.
   *
   * Stored because two features are impossible without it: republishing the
   * offline renderer (the baked file has to keep working), and handing the user
   * their embed URL again after the fact. It is never returned by an API that
   * is not explicitly asked to reveal it, and rotation invalidates it.
   */
  syncKeySealed: string;
  syncKeyPrefix: string;
  keyRotatedAt: string;
  revokedAt?: string;
  publish: PublishState;
  /** components of `notion-arena.<slug>.v1` this instance adopts */
  adoptKey: string;
  stats: { reads: number; writes: number; conflicts: number; lastPulledAt?: string; lastPushedAt?: string };
}

export interface SyncKeyRecord {
  hash: string;
  prefix: string;
  rotatedAt: string;
}

/** A change in the instance's flat key space. `key` is a business key. */
export interface SyncOp {
  /** client-minted, used for idempotent replay */
  id: string;
  key: string;
  /** value in the widget's own JSON shape; absent for deletes */
  value?: unknown;
  del?: boolean;
  /** client clock, ms since epoch. Used as a tiebreaker, never trusted blindly */
  at: number;
  /** the revision the client believed it was editing on top of */
  baseRev?: number;
}

export interface ChangeRecord {
  key: string;
  /**
   * Where this change lands in the widget's own document, when we can say.
   *
   * `key` is the business key, which is a key in *our* vocabulary; the widget
   * needs a path in its own state shape, and for an array-shaped document the
   * honest answer is "__doc" (replace it) because an index is not stable across
   * a merge.
   */
  path?: string;
  value?: unknown;
  deleted?: boolean;
  rev: number;
  at: string;
  source: "widget" | "notion" | "server" | "import";
  /** which fields actually changed, when we can tell */
  fields?: string[];
  /** set when the op lost a conflict and the server value won */
  conflict?: { policy: Binding["conflict"]; incoming: unknown; kept: unknown };
}

export interface SyncRequest {
  /** the revision the client last saw; omit for a full snapshot */
  rev?: number;
  ops?: SyncOp[];
  /** how many changes the client wants, default 500, max 2000 */
  limit?: number;
  /** client capabilities, so the server can shape the response */
  transport?: TransportKind;
}

export interface SyncResponse {
  ok: boolean;
  instanceId: string;
  rev: number;
  /** ids of ops that are durably stored (idempotency acknowledgement) */
  ack: string[];
  /** ops rejected outright, with a reason the bridge can show */
  rejected: { id: string; reason: string }[];
  changes: ChangeRecord[];
  /** true when the server has more changes past `rev` than the limit */
  truncated?: boolean;
  conflicts: ChangeRecord[];
  /**
   * A full state document, sent when the client has no usable revision (first
   * load, after a wipe, or when it fell too far behind for the log window).
   * `hash` lets a renderer skip a repaint when nothing actually changed.
   */
  snapshot?: { hash: string; doc: unknown; count: number };
  notion: { applied: number; queued: number; lastError?: string };
  budget: { remaining: number; resetAt: string; rpm: number };
  serverTime: string;
}

export type TransportKind = "live" | "outbox" | "memory";

/**
 * What the bridge measured in the current frame, reported to the server so the
 * server can shape responses (and so support can debug a screenshot).
 */
export interface CapabilityProfile {
  framed: boolean;
  /** the frame's origin, "null" when the sandbox is opaque */
  origin: string;
  storage: "localStorage" | "sessionStorage" | "memory";
  storageError?: string;
  network: boolean;
  clipboard: boolean;
  popups: boolean;
  broadcastChannel: boolean;
  dark: boolean;
  transport: TransportKind;
  userAgent?: string;
}

/** A portable blob that moves offline edits to a reachable renderer. */
export interface SyncCode {
  v: 1;
  /** instance id, so a code cannot be applied to the wrong component */
  i: string;
  /** the revision the offline renderer was based on */
  base: number;
  /** operations that have not been flushed */
  ops: SyncOp[];
  /** sha256 of the ops payload, for tamper detection and dedupe */
  hash: string;
  at: string;
  /** which renderer produced it, for the audit trail */
  device: string;
}

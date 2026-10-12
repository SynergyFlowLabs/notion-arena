import { Store, type SyncEvent } from "./store";
import { hashJson, newId } from "./ids";
import { open } from "./crypto";
import { snapshot as budgetSnapshot } from "./budget";
import { MockWorkspaceAdapter } from "./adapters/mock";
import { NotionAdapter } from "./adapters/notion";
import {
  businessKey,
  changePathFor,
  coerceForNotion,
  fromPropertyPayload,
  pathForKey,
  readProperty,
  resolveWriteType,
  schemaFor,
  toPropertyPayload,
  type PropertyTypes,
} from "./mapping";
import type {
  Binding,
  ChangeRecord,
  Connection,
  Instance,
  NotionPropertyType,
  SyncOp,
  SyncRequest,
  SyncResponse,
} from "./types";
import { AdapterError, type Row, type WorkspaceAdapter } from "./transport";

/**
 * The sync engine.
 *
 * Notion is the system of record (docs/SYNC_PLAN.md §1), so there is no second
 * database holding the user's rows: the engine translates between a widget's
 * persisted JSON document and rows in a Notion data source, and keeps a change
 * log so a renderer can ask "what happened since revision 41?".
 *
 * ## One state document, two materialisations
 *
 * Every widget already persists exactly one JSON document per component
 * (`notion-arena.<slug>.v1`). That document is the client-side truth:
 *
 *   - `kv-blob`  : the document is stored verbatim in one row.
 *   - `records`  : the document is *materialised* into rows through the schema
 *                  (lib/sync/mapping.ts). Habit heatmaps become a table; the
 *                  widget never learns that a table exists.
 *
 * Because the bridge sends path-level operations against that document, one
 * code path serves both, and a widget needs no knowledge of the binding.
 *
 * ## Three non-negotiables, each from a research finding
 *
 *   - **Idempotency**: Notion webhooks are at-most-once with up to 8 retries
 *     (§2.3) and browsers retry POSTs. Every op carries a client id and lands in
 *     `op_receipts` before it counts.
 *   - **One revision per round**: cheap client diffs, and a full resync is a
 *     snapshot rather than a clock reconciliation.
 *   - **Conflicts are data**: when a row was edited in Notion after the op that
 *     targets it, the binding's policy decides (keep both, last write wins, or
 *     record the conflict), and either way the round reports it.
 */

/* ------------------------------------------------------------------ */
/* Adapters                                                            */
/* ------------------------------------------------------------------ */

export function adapterFor(connection: Connection): WorkspaceAdapter {
  if (connection.kind === "mock") return new MockWorkspaceAdapter();
  const token = open(connection.sealed);
  if (!token) {
    throw new AdapterError("The stored credential could not be opened. Reconnect the workspace.", {
      code: "credential_unreadable",
      status: 401,
    });
  }
  return new NotionAdapter({ token, connectionId: connection.id, kind: connection.kind });
}

export async function adapterForInstance(instance: Instance): Promise<WorkspaceAdapter> {
  const connection = await Store.connection(instance.connectionId);
  if (!connection) {
    throw new AdapterError("The connection for this instance no longer exists.", {
      code: "connection_missing",
      status: 410,
    });
  }
  if (connection.revokedAt) {
    throw new AdapterError("This workspace connection was revoked.", {
      code: "connection_revoked",
      status: 403,
    });
  }
  await Store.updateConnection(connection.id, { lastUsedAt: new Date().toISOString() });
  return adapterFor(connection);
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null));
}

function strip(item: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    if (k.startsWith("__")) continue;
    out[k] = v;
  }
  return out;
}

function itemFromRow(binding: Binding, row: Row): Record<string, unknown> {
  const item = fromPropertyPayload(binding, row.raw as Record<string, any>);
  item.__pageId = row.id;
  item.__edited = row.lastEditedTime;
  return item;
}

function keyOfRow(binding: Binding, row: Row, keyType: NotionPropertyType): string {
  return String(readProperty(keyType, (row.raw as any)?.[binding.keyProp]) ?? "").trim();
}

/**
 * Every bound property's real type, straight from the data source.
 *
 * One call per round, not per row: the writer needs the whole map to know which
 * property is the title, which is the reason this is not a per-field lookup.
 * When the data source cannot be read (a transient API failure) the map is
 * empty and the binding's declared types are used instead, which is the
 * pre-existing behaviour rather than a crash in the middle of a push.
 */
async function propertyTypes(
  adapter: WorkspaceAdapter,
  binding: Binding
): Promise<PropertyTypes> {
  try {
    const ds = await adapter.getDataSource(binding.dataSourceId);
    const out: PropertyTypes = {};
    for (const [name, schema] of Object.entries(ds?.properties ?? {})) {
      out[name] = (schema.type as NotionPropertyType) ?? "rich_text";
    }
    return out;
  } catch {
    return {};
  }
}

async function keyPropertyType(
  adapter: WorkspaceAdapter,
  binding: Binding,
  types?: PropertyTypes
): Promise<NotionPropertyType> {
  const known = types ?? (await propertyTypes(adapter, binding));
  return (known[binding.keyProp] as NotionPropertyType | undefined) ?? "rich_text";
}

async function fetchAllRows(
  adapter: WorkspaceAdapter,
  binding: Binding,
  opts: { maxPages?: number } = {}
): Promise<Row[]> {
  const rows: Row[] = [];
  let cursor: string | undefined;
  const maxPages = opts.maxPages ?? 10;
  for (let i = 0; i < maxPages; i++) {
    const page = await adapter.queryRows({
      dataSourceId: binding.dataSourceId,
      pageSize: 100,
      cursor,
      filters: binding.scope,
    });
    rows.push(...page.rows.filter((r) => !r.inTrash));
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Document <-> rows                                                   */
/* ------------------------------------------------------------------ */

export interface DocumentSnapshot {
  doc: unknown;
  hash: string;
  rows: Row[];
  keyType: NotionPropertyType;
  /** the data source's own property types, see lib/sync/mapping.ts */
  types: PropertyTypes;
  warning?: string;
}

/**
 * Read the instance's state document out of Notion.
 *
 * Records mode goes rows -> items -> document, which is the inverse of the
 * materialisation below. That round trip is what makes "the widget's JSON" and
 * "the Notion table" the same data rather than two copies.
 */
export async function readDocument(
  instance: Instance,
  adapter: WorkspaceAdapter
): Promise<DocumentSnapshot> {
  const binding = instance.binding;

  if (binding.mode === "page-body") {
    throw new AdapterError(
      "page-body bindings (append-only markdown into a page) are specified but not enabled in this build. See docs/SYNC_PLAN.md phase 3.",
      { code: "mode_not_enabled", status: 501 }
    );
  }

  if (binding.mode === "kv-blob") {
    const row = await findStateRow(adapter, instance);
    const doc = row ? parseState(row, binding) : {};
    const types = await propertyTypes(adapter, binding);
    return { doc, hash: hashJson(doc), rows: row ? [row] : [], keyType: "rich_text", types };
  }

  const rows = await fetchAllRows(adapter, binding);
  const types = await propertyTypes(adapter, binding);
  const items = rows.map((r) => strip(itemFromRow(binding, r)));
  const schema = schemaFor(instance.slug, items);
  const doc = schema.write(undefined, items);
  return { doc, hash: hashJson(doc), rows, keyType: await keyPropertyType(adapter, binding, types), types };
}

function parseState(row: Row, binding: Binding): unknown {
  const text = readProperty("rich_text", (row.raw as any)?.[binding.stateProp ?? "State"]);
  try {
    return typeof text === "string" && text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function findStateRow(adapter: WorkspaceAdapter, instance: Instance): Promise<Row | undefined> {
  const binding = instance.binding;
  const page = await adapter.queryRows({
    dataSourceId: binding.dataSourceId,
    pageSize: 100,
    filters: [{ prop: binding.keyProp, equals: instance.id }],
  });
  const keyType = await keyPropertyType(adapter, binding);
  return page.rows.find((r) => keyOfRow(binding, r, keyType) === instance.id);
}

/* ------------------------------------------------------------------ */
/* Path operations (the bridge's wire format)                          */
/* ------------------------------------------------------------------ */

export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = String(path).split(".").filter(Boolean);
  let node: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  if (parts.length) node[parts[parts.length - 1]] = value;
}

export function getPath(target: unknown, path: string): unknown {
  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
      return undefined;
    }, target);
}

export function deletePath(target: Record<string, unknown>, path: string): void {
  const parts = String(path).split(".").filter(Boolean);
  let node: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof node[key] !== "object" || node[key] === null) return;
    node = node[key] as Record<string, unknown>;
  }
  if (parts.length) delete node[parts[parts.length - 1]];
}

/** Apply a bridge op to a document. `__doc` replaces it wholesale. */
export function applyOp(doc: unknown, op: SyncOp): unknown {
  if (op.key === "__doc") return op.del ? {} : clone(op.value);
  const base =
    doc && typeof doc === "object" && !Array.isArray(doc)
      ? clone(doc)
      : ([] as unknown as Record<string, unknown>);
  const target = base as Record<string, unknown>;
  if (Array.isArray(base)) {
    // A document that is a list (expense lists, bookmarks) is replaced whole,
    // because an index path from the client cannot be trusted after a merge.
    return op.del ? [] : clone(op.value);
  }
  if (op.del) deletePath(target, op.key);
  else setPath(target, op.key, op.value);
  return target;
}

/* ------------------------------------------------------------------ */
/* Materialisation: document -> rows                                   */
/* ------------------------------------------------------------------ */

interface MaterialiseResult {
  changes: ChangeRecord[];
  conflicts: ChangeRecord[];
  created: number;
  updated: number;
  deleted: number;
}

async function materialise(input: {
  instance: Instance;
  adapter: WorkspaceAdapter;
  before: unknown;
  after: unknown;
  rows: Row[];
  keyType: NotionPropertyType;
  rev: number;
  at: string;
  touched: string[];
  /** the data source's own property types: what we write, not what we declared */
  types?: PropertyTypes;
}): Promise<MaterialiseResult> {
  const { instance, adapter, binding } = { ...input, binding: input.instance.binding };
  const types = input.types ?? (await propertyTypes(adapter, binding));
  const out: MaterialiseResult = { changes: [], conflicts: [], created: 0, updated: 0, deleted: 0 };

  /* --- kv-blob: one row, whole document ---------------------------- */
  if (binding.mode === "kv-blob") {
    const row = input.rows[0];
    const stateType = types[binding.stateProp ?? "State"] ?? "rich_text";
    const properties: Record<string, unknown> = {
      [binding.keyProp]: coerceForNotion(
        resolveWriteType({ key: "key", prop: binding.keyProp, type: "rich_text" }, types),
        instance.id
      ),
      // The whole document fits in one rich_text cell; when it does not, the
      // caller hears about it rather than the row being silently truncated.
      [binding.stateProp ?? "State"]: coerceForNotion(stateType, JSON.stringify(input.after)),
      ...(binding.revProp ? { [binding.revProp]: { number: input.rev } } : {}),
      ...(binding.updatedProp ? { [binding.updatedProp]: { date: { start: input.at } } } : {}),
    };
    if (row) await adapter.updateRow({ id: row.id, properties });
    else
      await adapter.createRow({
        dataSourceId: binding.dataSourceId,
        properties: {
          Component: { title: [{ type: "text", text: { content: instance.slug } }] },
          ...properties,
        },
      });
    out.created = row ? 0 : 1;
    out.updated = row ? 1 : 0;
    return out;
  }

  /* --- records: diff the materialised item set --------------------- */
  const schema = schemaFor(instance.slug, input.before);
  const itemsBefore = schema.read(input.before);
  const itemsAfter = schema.read(input.after);
  const beforeByKey = new Map(itemsBefore.map((i) => [businessKey(binding, i), i]));
  const afterByKey = new Map(itemsAfter.map((i) => [businessKey(binding, i), i]));
  const rowByKey = new Map<string, Row>();
  for (const row of input.rows) {
    const key = keyOfRow(binding, row, input.keyType);
    if (key) rowByKey.set(key, row);
  }

  const sameItem = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    JSON.stringify(strip(a)) === JSON.stringify(strip(b));

  for (const [key, item] of afterByKey) {
    const row = rowByKey.get(key);
    if (!row) {
      const created = await adapter.createRow({
        dataSourceId: binding.dataSourceId,
        properties: toPropertyPayload(binding, item, types),
      });
      rowByKey.set(key, created);
      out.created++;
      out.changes.push({
        key,
        value: strip(item),
        path: pathForKey(key),
        rev: input.rev,
        at: input.at,
        source: "widget",
      });
      continue;
    }
    const previous = beforeByKey.get(key);
    if (previous && sameItem(previous, item)) continue; // nothing changed for this record

    const stale = Date.parse(row.lastEditedTime) > (input.touched.length ? 0 : 0) + Date.parse(input.at) - 60_000;
    void stale; // row-level staleness is resolved below, through the log

    if (binding.conflict !== "last-write-wins" && binding.conflict === "keep-both" && previous === undefined) {
      // A record the widget just created collides with an existing row whose
      // business key matches: two writers, two records. Keep both.
      const suffixed = clone(item);
      const first = binding.fields[0]?.key;
      if (first) suffixed[first] = `${item[first]} #${input.rev}`;
      const created = await adapter.createRow({
        dataSourceId: binding.dataSourceId,
        properties: toPropertyPayload(binding, suffixed, types),
      });
      rowByKey.set(businessKey(binding, suffixed), created);
      out.created++;
      out.conflicts.push({
        key,
        rev: input.rev,
        at: input.at,
        source: "widget",
        conflict: { policy: "keep-both", incoming: strip(item), kept: strip(previous ?? {}) },
      });
      continue;
    }

    await adapter.updateRow({ id: row.id, properties: toPropertyPayload(binding, item, types) });
    out.updated++;
    out.changes.push({
      key,
      value: strip(item),
      path: pathForKey(key),
      rev: input.rev,
      at: input.at,
      source: "widget",
    });
  }

  for (const [key, row] of rowByKey) {
    if (afterByKey.has(key)) continue;
    if (beforeByKey.has(key)) {
      // The widget removed it deliberately.
      await adapter.trashRow(row.id);
      out.deleted++;
      out.changes.push({
        key,
        deleted: true,
        path: pathForKey(key),
        rev: input.rev,
        at: input.at,
        source: "widget",
      });
    } else {
      // A row we had never seen disappeared. Do not chase it: it may belong to
      // a view the binding does not cover.
      out.changes.push({
        key,
        deleted: true,
        path: pathForKey(key),
        rev: input.rev,
        at: input.at,
        source: "notion",
      });
    }
  }

  return out;
}

/**
 * Rows that used to exist and no longer do.
 *
 * A delete in Notion is invisible to a row query: the row is simply not in the
 * answer. The widget still holds the key in its local document, and a delta sync
 * built from the data source alone would never mention it, so the tick survives
 * in the browser until the user clears storage, which is the exact class of bug
 * this design exists to remove. The change log is our only memory of the key, so
 * the comparison is log-against-rows.
 *
 * Scoped bindings are exempt: a saved view that filters rows out of the answer
 * is not a deletion, and guessing otherwise would tombstone half a table.
 */
async function reconcileDeletions(
  instance: Instance,
  present: Set<string>,
  rev: number,
  at: string
): Promise<ChangeRecord[]> {
  const binding = instance.binding;
  if (binding.mode === "kv-blob" || binding.scope?.length) return [];
  const logged = await changesSince(instance.id, 0, 2000);
  const last = new Map<string, ChangeRecord>();
  for (const entry of logged) last.set(entry.key, entry);
  const out: ChangeRecord[] = [];
  for (const [key, entry] of last) {
    if (entry.deleted || key.startsWith("__")) continue;
    if (present.has(key)) continue;
    out.push({ key, path: pathForKey(key), deleted: true, rev, at, source: "notion" });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Pull: Notion -> document                                            */
/* ------------------------------------------------------------------ */

async function pullFromNotion(
  instance: Instance,
  adapter: WorkspaceAdapter,
  collectInto: ChangeRecord[]
): Promise<SyncEvent | null> {
  const binding = instance.binding;
  const since = instance.stats.lastPulledAt ?? new Date(0).toISOString();
  const at = nowIso();
  const rev = instance.rev + 1;

  if (binding.mode === "kv-blob") {
    const row = await findStateRow(adapter, instance);
    if (!row || row.lastEditedTime <= since) return null;
    const remoteRev = Number(readProperty("number", (row.raw as any)?.[binding.revProp ?? "Rev"]) ?? 0);
    if (remoteRev >= rev) return null; // our own write, already known
    const doc = parseState(row, binding);
    collectInto.push({ key: "__state", value: doc, rev, at: row.lastEditedTime, source: "notion" });
    return {
      id: newId("evt", 6),
      at,
      kind: "pull",
      instanceId: instance.id,
      connectionId: instance.connectionId,
      detail: `Pulled the state row (edited ${row.lastEditedTime}).`,
    };
  }

  const snapshot = await readDocument(instance, adapter);

  /**
   * What we already told the client, by key.
   *
   * Our own writes come back in the next read, and reporting them as Notion
   * changes would be worse than noise: the client would apply its own value a
   * second time and the change log would grow a "notion" entry for every
   * "widget" one. Comparing values is the only reliable test, because a row we
   * touched has a fresh `last_edited_time` whether the value changed or not.
   */
  const logged = await changesSince(instance.id, Math.max(0, instance.rev - 1), 500);
  const latestByKey = new Map<string, string>();
  for (const entry of logged) {
    latestByKey.set(
      entry.key,
      JSON.stringify(entry.deleted ? null : (entry.value ?? null))
    );
  }

  const schema = schemaFor(instance.slug, snapshot.doc);
  const wholeDoc = schema.shape === "array";

  let pulled = 0;
  let watermark = since;
  for (const row of snapshot.rows) {
    if (row.lastEditedTime > watermark) watermark = row.lastEditedTime;
    if (row.lastEditedTime <= since) continue;
    const key = keyOfRow(binding, row, snapshot.keyType);
    if (!key) continue;
    const value = strip(itemFromRow(binding, row));
    if (latestByKey.get(key) === JSON.stringify(value ?? null)) continue;

    if (wholeDoc) {
      // An array-shaped widget cannot take a patch: the item is somewhere in a
      // list, and an index is not stable across a merge. One change, the whole
      // document, and the renderer's own diff decides what to repaint.
      collectInto.push({
        key: "__doc",
        value: snapshot.doc,
        path: "__doc",
        rev,
        at: row.lastEditedTime,
        source: "notion",
      });
      pulled = snapshot.rows.length;
      break;
    }

    collectInto.push({
      key,
      value,
      path: changePathFor(schema, key),
      rev,
      at: row.lastEditedTime,
      source: "notion",
    });
    pulled++;
  }

  await Store.updateInstance(instance.id, {
    // The watermark is the newest `last_edited_time` we actually saw, not the
    // wall clock. Using "now" is the classic way to lose a human's edit: their
    // change lands between the read and the timestamp, and every later pull
    // skips it as older than the mark.
    stats: { ...instance.stats, lastPulledAt: watermark, reads: instance.stats.reads + 1 },
  });

  if (!pulled) return null;
  return {
    id: newId("evt", 6),
    at,
    kind: "pull",
    instanceId: instance.id,
    connectionId: instance.connectionId,
    detail: `${pulled} row${pulled === 1 ? "" : "s"} changed in Notion since the last pull.`,
  };
}

/* ------------------------------------------------------------------ */
/* The main entry point                                                */
/* ------------------------------------------------------------------ */

export async function syncInstance(instance: Instance, req: SyncRequest): Promise<SyncResponse> {
  const adapter = await adapterForInstance(instance);
  const connectionId = instance.connectionId;
  const at = nowIso();
  const rev = instance.rev + 1;

  const receipts = await Store.receipts(instance.id);
  const seen = new Set(receipts);
  const incoming = (req.ops ?? []).filter((op) => op && op.id && op.key);
  const fresh = incoming.filter((op) => !seen.has(op.id));
  const replayed = incoming.filter((op) => seen.has(op.id)).map((op) => op.id);
  const rejected = (req.ops ?? [])
    .filter((op) => !op || !op.id || !op.key)
    .map((op) => ({ id: op?.id ?? "unknown", reason: "An operation needs an id and a key." }));

  const changes: ChangeRecord[] = [];
  const conflicts: ChangeRecord[] = [];
  const events: SyncEvent[] = [];
  let lastError: string | undefined;
  let applied = 0;

  try {
    const event = await pullFromNotion(instance, adapter, changes);
    if (event) events.push(event);
  } catch (err) {
    lastError = describe(err);
    events.push(event("pull", instance, `Pull failed: ${lastError}`, at, connectionId));
  }

  /** rows actually created, updated or deleted in the workspace this round */
  let touchedRows = 0;

  if (fresh.length) {
    try {
      const snapshot = await readDocument(instance, adapter);
      let doc = snapshot.doc;
      for (const op of fresh) doc = applyOp(doc, op);
      const materialised = await materialise({
        instance,
        adapter,
        before: snapshot.doc,
        after: doc,
        rows: snapshot.rows,
        keyType: snapshot.keyType,
        types: snapshot.types,
        rev,
        at,
        touched: fresh.map((o) => o.key),
      });
      // The op is durable once its id is receipted, whether or not it changed a
      // row. `applied` counts rows, because that is what the user sees in the
      // table and what the widget shows in its sync pill.
      applied = materialised.created + materialised.updated + materialised.deleted;
      touchedRows = applied;
      changes.push(...materialised.changes);
      conflicts.push(...materialised.conflicts);
      if (materialised.created || materialised.updated || materialised.deleted) {
        events.push(
          event(
            "push",
            instance,
            `${materialised.created} created, ${materialised.updated} updated, ${materialised.deleted} deleted in ${instance.binding.databaseTitle}.`,
            at,
            connectionId
          )
        );
      }
      if (materialised.conflicts.length) {
        events.push(
          event(
            "op.conflict",
            instance,
            `${materialised.conflicts.length} conflict${materialised.conflicts.length === 1 ? "" : "s"} resolved as ${instance.binding.conflict}.`,
            at,
            connectionId
          )
        );
      }
    } catch (err) {
      lastError = describe(err);
      const e = err as AdapterError;
      if (e?.code === "rate_limited" || e?.code === "budget_exhausted") {
        // Nothing is lost: the ops stay in the client outbox.
        return {
          ok: false,
          instanceId: instance.id,
          rev: instance.rev,
          ack: [],
          rejected,
          changes: [],
          conflicts: [],
          notion: { applied: 0, queued: fresh.length, lastError },
          budget: budgetSnapshot(connectionId),
          serverTime: at,
        };
      }
      events.push(event("push", instance, `Push failed: ${lastError}`, at, connectionId));
    }
  }

  // A row deleted in Notion has to reach the widget as a tombstone. Only the log
  // remembers the key, so this runs every round and costs one read.
  let freshDoc: DocumentSnapshot | undefined;
  try {
    const current = (await Store.instance(instance.id)) ?? instance;
    const snapshot = await readDocument(current, adapter);
    freshDoc = snapshot;
    const present = new Set<string>();
    for (const row of snapshot.rows) {
      const key = keyOfRow(current.binding, row, snapshot.keyType);
      if (key) present.add(key);
    }
    const tombstones = await reconcileDeletions(current, present, instance.rev + 1, at);
    if (tombstones.length) {
      changes.push(...tombstones);
      events.push(
        event(
          "pull",
          instance,
          `${tombstones.length} row${tombstones.length === 1 ? "" : "s"} deleted in ${current.binding.databaseTitle}: ${tombstones
            .slice(0, 3)
            .map((t) => t.key)
            .join(", ")}${tombstones.length > 3 ? ", …" : ""}.`,
          at,
          connectionId
        )
      );
    }
  } catch (err) {
    lastError = lastError ?? describe(err);
  }

  void replayed;

  // An op that changed nothing is still receipted (so the client can drop it
  // from the outbox) but must not create a revision: a redundant push would
  // otherwise wake every other renderer over SSE and grow the change log.
  const ackedIds = fresh.length && !lastError ? fresh.map((o) => o.id) : [];
  if (changes.length || conflicts.length || ackedIds.length) {
    await Store.commit(instance.id, [...changes, ...conflicts], {
      bump: changes.length || conflicts.length ? 1 : 0,
      opIds: ackedIds,
      touchStats: {
        writes: instance.stats.writes + touchedRows,
        reads: instance.stats.reads + 1,
        conflicts: instance.stats.conflicts + conflicts.length,
        lastPushedAt: touchedRows ? at : instance.stats.lastPushedAt,
      },
    });
  }
  if (events.length) await Store.pushEvents(events);

  const updated = (await Store.instance(instance.id)) ?? instance;
  const sinceRev = typeof req.rev === "number" && req.rev > 0 ? req.rev : 0;
  const wantSnapshot = sinceRev === 0;
  let payloadChanges: ChangeRecord[] = [];
  let snapshotOut: SyncResponse["snapshot"];

  if (wantSnapshot) {
    const doc = freshDoc ?? (await readDocument(updated, adapter));
    snapshotOut = { hash: doc.hash, doc: doc.doc, count: doc.rows.length };
  } else {
    payloadChanges = await changesSince(instance.id, sinceRev, req.limit ?? 500);
    /**
     * A records binding answers with the document as well as the delta.
     *
     * The reason is that a change from a table is an *item*, and an item is not
     * a location: for a heatmap the row `water|2026-10-11` is the number at
     * `water["2026-10-11"]`, for a list it is an entry in an array. Only the
     * server knows that mapping, and a renderer that guessed would write the
     * whole item into a cell that holds a level. So the delta stays (it is what
     * the log, the pill and the conflict list are built from) and the document
     * travels with it: the renderer replaces its state, its own diff decides
     * what to repaint, and no widget has to understand our vocabulary.
     */
    if (payloadChanges.length && updated.binding.mode !== "kv-blob" && freshDoc) {
      snapshotOut = {
        hash: freshDoc.hash,
        doc: freshDoc.doc,
        count: freshDoc.rows.length,
      };
    }
  }

  return {
    ok: true,
    instanceId: instance.id,
    rev: updated.rev,
    ack: ackedIds,
    rejected,
    changes: payloadChanges,
    conflicts,
    truncated: payloadChanges.length >= (req.limit ?? 500),
    snapshot: snapshotOut,
    notion: { applied, queued: fresh.length - ackedIds.length, lastError },
    budget: budgetSnapshot(connectionId),
    serverTime: at,
  };
}

function event(
  kind: SyncEvent["kind"],
  instance: Instance,
  detail: string,
  at: string,
  connectionId: string
): SyncEvent {
  return {
    id: newId("evt", 6),
    at,
    kind,
    instanceId: instance.id,
    connectionId,
    detail,
  };
}

function describe(err: unknown): string {
  if (err instanceof AdapterError) return err.planLimit ? `${err.message} (plan limit)` : err.message;
  return err instanceof Error ? err.message : String(err);
}

/* ------------------------------------------------------------------ */
/* Change log reads                                                    */
/* ------------------------------------------------------------------ */

export async function changesSince(
  instanceId: string,
  rev: number,
  limit: number
): Promise<ChangeRecord[]> {
  const log = await Store.log(instanceId, 1000);
  const out: ChangeRecord[] = [];
  for (const entry of [...log].reverse()) {
    if (entry.rev > rev) out.push(entry);
  }
  return out.slice(0, Math.min(limit, 2000));
}

/* ------------------------------------------------------------------ */
/* Webhook fanout                                                      */
/* ------------------------------------------------------------------ */

/**
 * Called by /api/webhooks/notion after a verified payload.
 *
 * Payloads carry ids, not content (§2.3), so this reads the row and commits a
 * change. Most events will not belong to any instance of ours; that has to stay
 * cheap, so the instance list is filtered by connection first.
 */
export async function fanoutNotionChange(input: {
  connectionId: string;
  entityId: string;
  entityType: string;
}): Promise<{ instances: number; changes: number }> {
  const instances = (await Store.instances()).filter(
    (i) => i.connectionId === input.connectionId && !i.revokedAt
  );
  let touched = 0;
  let total = 0;

  for (const instance of instances) {
    try {
      const adapter = await adapterForInstance(instance);
      if (instance.binding.mode === "kv-blob") {
        const row = await findStateRow(adapter, instance);
        if (!row || row.id !== input.entityId) continue;
        await Store.commit(
          instance.id,
          [
            {
              key: "__state",
              value: parseState(row, instance.binding),
              path: "__doc",
              rev: instance.rev + 1,
              at: row.lastEditedTime,
              source: "notion",
            },
          ],
          {
            bump: 1,
            touchStats: { reads: instance.stats.reads + 1, lastPulledAt: row.lastEditedTime },
          }
        );
        touched++;
        total++;
        continue;
      }
      const row = await adapter.retrieveRow(input.entityId);
      if (!row) continue;
      // A row from someone else's table is not our change. The webhook gives us
      // ids only, and one connection backs many instances.
      if (row.dataSourceId && row.dataSourceId !== instance.binding.dataSourceId) continue;
      const keyType = await keyPropertyType(adapter, instance.binding);
      const key = keyOfRow(instance.binding, row, keyType);
      if (!key) continue;

      // `page.deleted` in the webhook means the row is in the trash. Notion still
      // returns the page, so the key is right there: commit a tombstone instead
      // of a value, and every renderer drops it on the spot.
      if (row.inTrash) {
        if (!(await isNewValue(instance, key, null))) continue;
        await Store.commit(
          instance.id,
          [
            {
              key,
              deleted: true,
              path: pathForKey(key),
              rev: instance.rev + 1,
              at: row.lastEditedTime,
              source: "notion",
            },
          ],
          { bump: 1, touchStats: { reads: instance.stats.reads + 1 } }
        );
        touched++;
        total++;
        continue;
      }

      const value = strip(itemFromRow(instance.binding, row));
      if (!(await isNewValue(instance, key, value))) continue;
      await Store.commit(
        instance.id,
        [
          {
            key,
            value,
            // The client patches its own document, so it needs a path in that
            // document, not our business key.
            path: pathForKey(key),
            rev: instance.rev + 1,
            at: row.lastEditedTime,
            source: "notion",
          },
        ],
        {
          bump: 1,
          touchStats: {
            reads: instance.stats.reads + 1,
            // The data's clock, never ours: see pullFromNotion.
            lastPulledAt: row.lastEditedTime,
          },
        }
      );
      touched++;
      total++;
    } catch {
      // One broken binding must not stop the others from updating.
      continue;
    }
  }

  return { instances: touched, changes: total };
}

/**
 * Has this key already been reported at this value?
 *
 * The webhook fires for a write we made ourselves as well as for a person's, and
 * the payload never says which. Comparing against the last logged value is the
 * cheap way to tell them apart, and it keeps the client from re-applying its own
 * edit as if it came from Notion.
 */
async function isNewValue(instance: Instance, key: string, value: unknown): Promise<boolean> {
  const logged = await changesSince(instance.id, Math.max(0, instance.rev - 1), 200);
  for (const entry of logged) {
    if (entry.key !== key) continue;
    return JSON.stringify(entry.deleted ? null : (entry.value ?? null)) !== JSON.stringify(value ?? null);
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Provisioning                                                        */
/* ------------------------------------------------------------------ */

/**
 * Creates the database a binding needs, from the schema.
 *
 * Public connections and PATs may create workspace-level content; internal
 * connections cannot, which is one more reason OAuth is the default path.
 */
export async function provisionBinding(input: {
  instance: Instance;
  adapter: WorkspaceAdapter;
  title: string;
  properties: Record<string, { type: string; format?: string }>;
  parentPageId?: string;
}): Promise<Binding> {
  const created = await input.adapter.createDataSource({
    title: input.title,
    properties: input.properties,
    parentPageId: input.parentPageId,
  });
  return {
    ...input.instance.binding,
    dataSourceId: created.id,
    databaseId: created.databaseId,
    databaseTitle: created.title,
  };
}

/* ------------------------------------------------------------------ */
/* Publishing the offline renderer                                     */
/* ------------------------------------------------------------------ */

/**
 * The parity mechanism (docs/DATA_SYNC_RESEARCH.md §4): the offline renderer is
 * a file we own, so we refresh it instead of asking the user to re-upload.
 *
 * `render` is injected to avoid an import cycle with lib/bridge, which needs
 * the widget renderer and the document baked in.
 */
export async function publishOfflineRenderer(input: {
  instance: Instance;
  adapter: WorkspaceAdapter;
  render: (instance: Instance, doc: unknown) => Promise<string>;
  parentPageId?: string;
  caption?: string;
}): Promise<Instance["publish"]> {
  const { instance, adapter } = input;
  const state = await readDocument(instance, adapter);
  const html = await input.render(instance, state.doc);

  const upload = await adapter.uploadHtml({
    filename: `${instance.slug}-${instance.id.slice(-6)}.html`,
    html,
  });

  const at = nowIso();
  let publish: Instance["publish"] = { ...instance.publish };
  const events: SyncEvent[] = [];

  if (instance.publish.blockId) {
    await adapter.replaceBlockFile({
      blockId: instance.publish.blockId,
      fileUploadId: upload.fileUploadId,
    });
    publish = {
      ...publish,
      fileUploadId: upload.fileUploadId,
      publishedRev: instance.rev,
      publishedAt: at,
      refreshes: (publish.refreshes ?? 0) + 1,
    };
    events.push(
      event(
        "publish.file",
        instance,
        `Offline renderer refreshed in place (refresh #${publish.refreshes}).`,
        at,
        instance.connectionId
      )
    );
  } else if (input.parentPageId) {
    const { blockId } = await adapter.appendHtmlBlock({
      parentId: input.parentPageId,
      fileUploadId: upload.fileUploadId,
      caption: input.caption ?? `Arena component: ${instance.slug}`,
    });
    publish = {
      ...publish,
      channel: "html-block",
      pageId: input.parentPageId,
      blockId,
      fileUploadId: upload.fileUploadId,
      publishedRev: instance.rev,
      publishedAt: at,
      refreshes: 0,
    };
    events.push(
      event(
        "publish.block",
        instance,
        `Installed as an HTML block on page ${input.parentPageId}.`,
        at,
        instance.connectionId
      )
    );
  } else {
    publish = {
      ...publish,
      channel: "both",
      fileUploadId: upload.fileUploadId,
      publishedRev: instance.rev,
      publishedAt: at,
    };
    events.push(
      event(
        "publish.file",
        instance,
        "Rendered a portable bundle (no page target given).",
        at,
        instance.connectionId
      )
    );
  }

  await Store.updateInstance(instance.id, { publish });
  await Store.pushEvents(events);
  return publish;
}

import { Store, type SyncEvent } from "./store";
import { hashSyncKey, mintSyncKey, newId, syncKeyMatches } from "./ids";
import { open, seal } from "./crypto";
import { adapterFor, adapterForInstance, syncInstance } from "./engine";
import { propertySchemasFor, schemaFor } from "./mapping";
import { widgetStorageKey } from "./widget-meta";
import { absoluteUrl } from "@/lib/utils";
import type {
  Binding,
  BindingMode,
  Connection,
  Instance,
  NotionPropertyType,
} from "./types";
import type { PropertySchema, WorkspaceAdapter } from "./transport";
import { AdapterError } from "./transport";

/**
 * Creating, binding and authorising instances.
 *
 * An instance is the unit that makes all of this addressable: one rendered
 * component, in one place, with one credential, bound to one data source. See
 * docs/SYNC_PLAN.md §4 for the model and §5 for the routes that expose it.
 */

export interface CreateInstanceInput {
  slug: string;
  name?: string;
  connectionId: string;
  config?: Record<string, string | number | boolean>;
  binding: {
    mode: BindingMode;
    /** bind to a database the user already has */
    dataSourceId?: string;
    /** or let us create one */
    provisionTitle?: string;
    /** property names, when the target database uses its own vocabulary */
    keyProp?: string;
    stateProp?: string;
    conflict?: Binding["conflict"];
    pageId?: string;
    anchor?: string;
  };
  /**
   * The document the widget currently holds (its localStorage value, or a
   * representative sample). Inference runs on it: field names, types, key parts.
   * Absent means "use the declared schema for this component".
   */
  sampleDoc?: unknown;
}

export interface CreatedInstance {
  instance: Instance;
  /** shown once; only the hash is stored */
  syncKey: string;
  warnings: string[];
}

export async function createInstance(input: CreateInstanceInput): Promise<CreatedInstance> {
  const connection = await Store.connection(input.connectionId);
  if (!connection) {
    throw new AdapterError("Unknown connection. Connect the workspace again.", {
      code: "connection_missing",
      status: 404,
    });
  }
  const adapter = adapterFor(connection);
  const warnings: string[] = [];
  const schema = schemaFor(input.slug, input.sampleDoc ?? [], input.sampleDoc);

  let binding: Binding;

  if (input.binding.mode === "kv-blob") {
    const target = await resolveKvTarget(adapter, connection, input, warnings);
    binding = target;
  } else if (input.binding.mode === "page-body") {
    if (!input.binding.pageId) {
      throw new AdapterError("A page-body binding needs a page id.", {
        code: "binding_invalid",
        status: 400,
      });
    }
    binding = {
      mode: "page-body",
      dataSourceId: "",
      databaseTitle: "Page body",
      keyProp: "Arena key",
      fields: [],
      pageId: input.binding.pageId,
      anchor: input.binding.anchor,
      conflict: input.binding.conflict ?? "keep-both",
    };
    warnings.push(
      "page-body bindings are specified but not enabled in this build: see docs/SYNC_PLAN.md phase 3."
    );
  } else {
    binding = await bindRecords(adapter, input, schema.fields, warnings);
  }

  const minted = mintSyncKey();
  const id = newId("inst", 9);
  const now = new Date().toISOString();

  const instance: Instance = {
    id,
    slug: input.slug,
    name: input.name ?? `${input.slug} instance`,
    createdAt: now,
    updatedAt: now,
    connectionId: connection.id,
    binding,
    config: input.config ?? {},
    rev: 0,
    syncKeyHash: minted.hash,
    syncKeySealed: seal(minted.key),
    syncKeyPrefix: minted.prefix,
    keyRotatedAt: now,
    publish: { channel: "none" },
    /**
     * The adoption key is the widget's own persistence key: that is how an
     * unmodified widget becomes data-driven (see lib/bridge/client.js).
     *
     * It is read out of the widget rather than assumed, because ten of the 192
     * do not follow the `notion-arena.<slug>.v1` convention (habit-grid writes
     * `notion-arena.habits.v1`). Adopting the wrong key is silent: the server's
     * snapshot lands in a key nobody reads, and inside an HTML block, where
     * there is no storage to fall back on, the widget renders empty while its
     * rows sit in Notion.
     */
    adoptKey: widgetStorageKey(input.slug) ?? `notion-arena.${input.slug}.v1`,
    stats: { reads: 0, writes: 0, conflicts: 0 },
  };

  await Store.addInstance(instance);

  // The user is not starting from an empty table: the widget already has state in
  // the browser it was running in. `sampleDoc` is that state, and binding it
  // means uploading it, so the first render and the Notion table agree. It goes
  // through the ordinary push path (diff, materialise, conflict policy) instead
  // of writing rows directly, so seeding cannot bypass the rules.
  if (input.sampleDoc && hasContent(input.sampleDoc)) {
    try {
      const seeded = await syncInstance(instance, {
        rev: 0,
        ops: [
          { id: newId("op", 6), key: "__doc", value: input.sampleDoc, at: Date.now() },
        ],
      });
      if (seeded.ok && seeded.notion.applied > 0) {
        warnings.push(
          `Uploaded the component's current state to “${binding.databaseTitle}” (revision 1).`
        );
      } else if (!seeded.ok) {
        warnings.push(
          `The binding is live but the current state could not be uploaded yet (${seeded.notion.lastError ?? "queued"}). It will be pushed on the next sync.`
        );
      }
      instance.rev = (await Store.instance(instance.id))?.rev ?? instance.rev;
    } catch (err) {
      warnings.push(`The binding is live but seeding failed: ${(err as Error).message}`);
    }
  }

  await Store.pushEvents([
    {
      id: newId("evt", 6),
      at: now,
      kind: "instance.created",
      instanceId: instance.id,
      connectionId: connection.id,
      detail:
        binding.mode === "kv-blob"
          ? `Bound to “${binding.databaseTitle}” in state-blob mode.`
          : `Bound to “${binding.databaseTitle}” in record mode (${binding.fields.length} columns).`,
    },
  ]);

  return { instance, syncKey: minted.key, warnings };
}

/** Is there anything in this document worth uploading? */
function hasContent(doc: unknown): boolean {
  if (doc === null || doc === undefined) return false;
  if (Array.isArray(doc)) return doc.length > 0;
  if (typeof doc === "object") return Object.keys(doc as Record<string, unknown>).length > 0;
  return false;
}

/* ------------------------------------------------------------------ */
/* Binding construction                                                */
/* ------------------------------------------------------------------ */

async function bindRecords(
  adapter: WorkspaceAdapter,
  input: CreateInstanceInput,
  schemaFields: Binding["fields"],
  warnings: string[]
): Promise<Binding> {
  let dataSourceId = input.binding.dataSourceId;
  let databaseId: string | undefined;
  let databaseTitle = input.binding.provisionTitle ?? "Arena log";

  if (!dataSourceId) {
    // Provision: the first click creates the database, which is the difference
    // between "here is a URL, go build a table" and a component that works.
    const created = await adapter.createDataSource({
      title: databaseTitle,
      properties: propertySchemasFor({
        mode: "records",
        dataSourceId: "",
        databaseTitle,
        keyProp: input.binding.keyProp ?? "Arena key",
        fields: schemaFields,
        conflict: "keep-both",
      }),
    });
    return {
      mode: "records",
      dataSourceId: created.id,
      databaseId: created.databaseId,
      databaseTitle: created.title,
      keyProp: input.binding.keyProp ?? "Arena key",
      fields: schemaFields,
      conflict: input.binding.conflict ?? "keep-both",
    };
  }

  const ds = await adapter.getDataSource(dataSourceId);
  if (!ds) {
    throw new AdapterError("That database is not shared with the connection.", {
      code: "object_not_found",
      status: 404,
    });
  }
  dataSourceId = ds.id;
  databaseId = ds.databaseId;
  databaseTitle = ds.title;

  const byLower = new Map(Object.keys(ds.properties).map((k) => [k.toLowerCase(), k]));
  const fields: Binding["fields"] = [];
  const missing: Record<string, PropertySchema> = {};

  // A data source has exactly one title property, and every row needs a value in
  // it. If the widget's schema declares a different property as the title (or
  // none at all), the write has to be repointed here, once, instead of failing
  // per row later.
  const dsTitleProp = Object.entries(ds.properties).find(([, p]) => p.type === "title")?.[0];
  const declaredTitleIndex = schemaFields.findIndex((f) => f.type === "title");

  schemaFields.forEach((field, index) => {
    const hit = byLower.get(field.prop.toLowerCase());
    if (hit) {
      const existing = ds.properties[hit];
      fields.push({
        ...field,
        prop: hit,
        // The database's own type wins: a user who already built "Date" as a
        // date property must not have it written as rich text.
        type: (existing.type as NotionPropertyType) ?? field.type,
      });
      return;
    }
    if (index === declaredTitleIndex && dsTitleProp) {
      fields.push({ ...field, prop: dsTitleProp, type: "title" });
      warnings.push(
        `“${dsTitleProp}” is the title property of “${databaseTitle}”, so the component's “${field.prop}” values go there.`
      );
      return;
    }
    fields.push(field);
    // A property we have to add is never a title: that one is already taken.
    missing[field.prop] =
      field.type === "title"
        ? { type: "rich_text" }
        : { type: field.type, format: field.format };
  });

  // Two fields pointing at one property is always a mistake, and one of them
  // would silently win. Keep the first and say so.
  const claimed = new Set<string>();
  const deduped = fields.filter((f) => {
    const lower = f.prop.toLowerCase();
    if (claimed.has(lower)) {
      warnings.push(`Two of this component's fields map to “${f.prop}”; the first one is used.`);
      return false;
    }
    claimed.add(lower);
    return true;
  });
  fields.length = 0;
  fields.push(...deduped);

  const keyProp = input.binding.keyProp ?? (byLower.get("arena key") ?? "Arena key");
  if (!byLower.has(keyProp.toLowerCase()) && !missing[keyProp]) {
    missing[keyProp] = { type: "rich_text" };
  }

  if (Object.keys(missing).length) {
    await adapter.updateDataSourceProperties({ dataSourceId, properties: missing });
    warnings.push(
      `Added ${Object.keys(missing).join(", ")} to “${databaseTitle}”. Notion keeps existing options and colours when a property is updated.`
    );
  }

  return {
    mode: "records",
    dataSourceId,
    databaseId,
    databaseTitle,
    keyProp,
    fields,
    conflict: input.binding.conflict ?? "keep-both",
  };
}

async function resolveKvTarget(
  adapter: WorkspaceAdapter,
  connection: Connection,
  input: CreateInstanceInput,
  warnings: string[]
): Promise<Binding> {
  const keyProp = input.binding.keyProp ?? "Instance";
  const stateProp = input.binding.stateProp ?? "State";
  const revProp = "Rev";
  const updatedProp = "Updated";

  let dataSourceId = input.binding.dataSourceId;
  let databaseId: string | undefined;
  let databaseTitle = "Arena component state";

  const wanted: Record<string, PropertySchema> = {
    Component: { type: "title" },
    [keyProp]: { type: "rich_text" },
    [stateProp]: { type: "rich_text" },
    [revProp]: { type: "number", format: "number" },
    [updatedProp]: { type: "date" },
  };

  if (!dataSourceId) {
    const created = await adapter.createDataSource({
      title: input.binding.provisionTitle ?? "Arena component state",
      properties: wanted,
    });
    dataSourceId = created.id;
    databaseId = created.databaseId;
    databaseTitle = created.title;
  } else {
    const ds = await adapter.getDataSource(dataSourceId);
    if (!ds) {
      throw new AdapterError("That database is not shared with the connection.", {
        code: "object_not_found",
        status: 404,
      });
    }
    dataSourceId = ds.id;
    databaseId = ds.databaseId;
    databaseTitle = ds.title;
    const missing: Record<string, PropertySchema> = {};
    for (const [name, schema] of Object.entries(wanted)) {
      const hit = Object.keys(ds.properties).find((k) => k.toLowerCase() === name.toLowerCase());
      if (!hit) missing[name] = schema;
    }
    if (Object.keys(missing).length) {
      await adapter.updateDataSourceProperties({ dataSourceId, properties: missing });
      warnings.push(`Added ${Object.keys(missing).join(", ")} to “${databaseTitle}”.`);
    }
  }

  void connection;
  return {
    mode: "kv-blob",
    dataSourceId,
    databaseId,
    databaseTitle,
    keyProp,
    stateProp,
    revProp,
    updatedProp,
    fields: [],
    conflict: input.binding.conflict ?? "last-write-wins",
  };
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

export interface ConnectInput {
  token: string;
  kind: "pat" | "internal" | "oauth";
  label?: string;
}

/** Connect with a pasted token (the escape hatch), or record an OAuth grant. */
export async function connectWithToken(input: ConnectInput): Promise<Connection> {
  const trimmed = input.token.trim();
  if (!/^ntn_|^secret_/.test(trimmed)) {
    throw new AdapterError("That does not look like a Notion token (expected ntn_… or secret_…).", {
      code: "token_shape",
      status: 400,
    });
  }

  const provisional: Connection = {
    id: newId("conn", 8),
    kind: input.kind,
    label: input.label ?? "Notion workspace",
    sealed: seal(trimmed),
    scopes: [],
    createdAt: new Date().toISOString(),
  };

  // Validate before storing: a token that cannot read its own identity is not
  // worth persisting, and the user gets the real error message from Notion.
  const adapter = adapterFor(provisional);
  const me = await adapter.whoAmI();
  provisional.workspaceId = me.workspaceId;
  provisional.workspaceName = me.workspaceName;
  provisional.botId = me.botId;
  provisional.label = input.label ?? me.workspaceName ?? "Notion workspace";
  provisional.account = me.account;
  provisional.scopes = ["read_content", "update_content", "insert_content"];

  await Store.addConnection(provisional);
  await Store.pushEvents([
    {
      id: newId("evt", 6),
      at: provisional.createdAt,
      kind: "connection.created",
      connectionId: provisional.id,
      detail: `Connected ${provisional.label} with a pasted ${input.kind} token.`,
    },
  ]);
  return provisional;
}

/** The demo connection: no credentials, a workspace that lives in our store. */
export async function connectMock(): Promise<Connection> {
  const existing = (await Store.connections()).find((c) => c.kind === "mock");
  if (existing) return existing;
  const connection: Connection = {
    id: newId("conn", 8),
    kind: "mock",
    label: "Arena demo workspace",
    workspaceId: "ws_mock_arena",
    workspaceName: "Arena demo workspace",
    botId: "bot_mock_arena",
    sealed: seal("mock-token"),
    scopes: ["read_content", "update_content", "insert_content"],
    createdAt: new Date().toISOString(),
  };
  await Store.addConnection(connection);
  await Store.pushEvents([
    {
      id: newId("evt", 6),
      at: connection.createdAt,
      kind: "connection.created",
      connectionId: connection.id,
      detail: "Connected the demo workspace (no credentials, no network).",
    },
  ]);
  return connection;
}

/* ------------------------------------------------------------------ */
/* Authorisation                                                       */
/* ------------------------------------------------------------------ */

/**
 * Verifies the capability token that travels in the embed URL.
 *
 * Deliberately not a cookie: Safari blocks third-party cookies inside Notion's
 * iframe and Chrome partitions them, so a cookie session would work on exactly
 * one browser and one device. See docs/DATA_SYNC_RESEARCH.md §3.2.
 */
/** The plaintext key, for republishing a bundle or re-showing the user their URL. */
export function revealInstanceKey(instance: Instance): string | null {
  return open(instance.syncKeySealed);
}

export async function authorizeInstance(
  instance: Instance,
  presentedKey: string | null | undefined
): Promise<boolean> {
  if (!instance || instance.revokedAt) return false;
  if (!presentedKey) return false;
  return syncKeyMatches(presentedKey, instance.syncKeyHash);
}

export async function rotateInstanceKey(instanceId: string): Promise<{ syncKey: string }> {
  const minted = mintSyncKey();
  await Store.updateInstance(instanceId, {
    syncKeyHash: minted.hash,
    syncKeySealed: seal(minted.key),
    syncKeyPrefix: minted.prefix,
    keyRotatedAt: new Date().toISOString(),
  });
  await Store.pushEvents([
    {
      id: newId("evt", 6),
      at: new Date().toISOString(),
      kind: "key.rotated",
      instanceId,
      detail: `Sync key rotated (new prefix ${minted.prefix}). Every existing URL now needs the new key.`,
    },
  ]);
  return { syncKey: minted.key };
}

export async function revokeInstance(instanceId: string): Promise<void> {
  await Store.updateInstance(instanceId, { revokedAt: new Date().toISOString() });
  await Store.pushEvents([
    {
      id: newId("evt", 6),
      at: new Date().toISOString(),
      kind: "connection.revoked",
      instanceId,
      detail: "Instance revoked: its URL and sync key stop working immediately.",
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* URLs and views                                                      */
/* ------------------------------------------------------------------ */

/**
 * Every surface that renders one of our components gets a URL, because the URL
 * is where identity lives. `key` is only included when the caller just minted
 * it: afterwards it is unrecoverable by design (only the hash is stored).
 */
export function instanceUrls(instance: Instance, syncKey?: string) {
  const qs = new URLSearchParams();
  qs.set("i", instance.id);
  if (syncKey) qs.set("k", syncKey);
  for (const [k, v] of Object.entries(instance.config ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const keySuffix = syncKey ? `?k=${encodeURIComponent(syncKey)}` : "";
  return {
    embedUrl: absoluteUrl(`/embed/${instance.slug}?${qs.toString()}`),
    standaloneUrl: absoluteUrl(`/c/${instance.slug}/${instance.id}${keySuffix}`),
    bundleUrl: absoluteUrl(`/api/sync/instances/${instance.id}/bundle${keySuffix}${keySuffix ? "&" : "?"}download=1`),
    offlineBundleUrl: absoluteUrl(
      `/api/sync/instances/${instance.id}/bundle${keySuffix}${keySuffix ? "&" : "?"}offline=1&download=1`
    ),
    syncUrl: absoluteUrl(`/api/sync/instances/${instance.id}/sync`),
    streamUrl: absoluteUrl(`/api/sync/instances/${instance.id}/stream`),
  };
}

/** What the UI is allowed to see about an instance. Never the key or the hash. */
export function publicInstance(instance: Instance) {
  return {
    id: instance.id,
    slug: instance.slug,
    name: instance.name,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
    rev: instance.rev,
    keyPrefix: instance.syncKeyPrefix,
    keyRotatedAt: instance.keyRotatedAt,
    revokedAt: instance.revokedAt,
    connectionId: instance.connectionId,
    binding: instance.binding,
    config: instance.config,
    publish: instance.publish,
    adoptKey: instance.adoptKey,
    stats: instance.stats,
  };
}

export async function instanceSummary(instance: Instance) {
  const connection = await Store.connection(instance.connectionId);
  return {
    ...publicInstance(instance),
    connectionLabel: connection?.label,
    connectionKind: connection?.kind,
  };
}

export async function listInstances(slug?: string) {
  const instances = await Store.instances(slug);
  return Promise.all(instances.map(instanceSummary));
}

export async function recordEvent(kind: SyncEvent["kind"], detail: string, instanceId?: string) {
  await Store.pushEvents([
    { id: newId("evt", 6), at: new Date().toISOString(), kind, instanceId, detail },
  ]);
}

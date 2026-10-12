import { promises as fs } from "node:fs";
import path from "node:path";
import type { ChangeRecord, Connection, Instance } from "./types";

/**
 * Persistence for the data plane.
 *
 * The shipped slice uses a single JSON document on disk: enough to make the
 * whole loop (bind, write, webhook, fan-out, republish) work end to end in
 * development and in a single-instance deployment, with no database to run.
 *
 * The production target is Postgres with the same shape plus two extra tables
 * the interface below already implies:
 *   instance_revisions  (instance_id, rev, change)   append-only change log
 *   op_receipts         (instance_id, op_id) unique  idempotent replay guard
 * Because this file is the only thing that touches storage, swapping it is a
 * single-module change; nothing else in lib/sync imports `fs`.
 *
 * Writes are serialised through a promise chain so two concurrent requests
 * cannot interleave a read-modify-write on the same document.
 */

interface DbShape {
  version: 1;
  connections: Connection[];
  instances: Instance[];
  /** per-instance change log, capped (see MAX_LOG) */
  log: Record<string, ChangeRecord[]>;
  /** op ids already applied, for idempotent replay */
  receipts: Record<string, string[]>;
  /** events surfaced in the playground timeline and used for fanout */
  events: SyncEvent[];
  /** dev-only: the mock workspace is stored next to everything else */
  mock?: unknown;
}

export interface SyncEvent {
  id: string;
  at: string;
  instanceId?: string;
  connectionId?: string;
  kind:
    | "instance.created"
    | "instance.bound"
    | "op.applied"
    | "op.conflict"
    | "pull"
    | "push"
    | "webhook.received"
    | "webhook.ignored"
    | "publish.file"
    | "publish.block"
    | "connection.created"
    | "connection.revoked"
    | "key.rotated"
    | "notion.edit";
  detail: string;
  meta?: Record<string, unknown>;
}

const MAX_LOG = 500;
const MAX_EVENTS = 400;
const MAX_RECEIPTS = 2000;

const DATA_DIR = process.env.ARENA_DATA_DIR ?? path.join(process.cwd(), ".arena-data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let cache: DbShape | null = null;
let queue: Promise<unknown> = Promise.resolve();

function blank(): DbShape {
  return { version: 1, connections: [], instances: [], log: {}, receipts: {}, events: [] };
}

async function load(): Promise<DbShape> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as DbShape;
    cache = { ...blank(), ...parsed };
  } catch {
    cache = blank();
  }
  return cache;
}

async function persist(db: DbShape): Promise<void> {
  cache = db;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    // A read-only filesystem (some serverless runtimes) must not break the
    // request path: the in-process cache stays authoritative for this instance.
    console.warn("[arena-sync] cannot persist store:", (err as Error).message);
  }
}

/** Read-modify-write under a mutex. The callback may not await anything but the db. */
export function mutate<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  // Keep the chain alive even if one mutation throws.
  queue = run.catch(() => undefined);
  return run;
}

export async function read<T>(fn: (db: DbShape) => T): Promise<T> {
  const db = await load();
  return fn(db);
}

/* --- accessors ---------------------------------------------------- */

export const Store = {
  async connection(id: string) {
    return read((db) => db.connections.find((c) => c.id === id));
  },
  async connections() {
    return read((db) => [...db.connections]);
  },
  async instance(id: string) {
    return read((db) => db.instances.find((i) => i.id === id));
  },
  async instances(slug?: string) {
    return read((db) =>
      [...db.instances]
        .filter((i) => (slug ? i.slug === slug : true))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
  },
  async log(instanceId: string, limit = 100) {
    return read((db) => (db.log[instanceId] ?? []).slice(-limit).reverse());
  },
  async receipts(instanceId: string) {
    return read((db) => db.receipts[instanceId] ?? []);
  },
  async events(limit = 60) {
    return read((db) => db.events.slice(-limit).reverse());
  },

  async addConnection(conn: Connection) {
    return mutate((db) => {
      db.connections.push(conn);
      return conn;
    });
  },
  async updateConnection(id: string, patch: Partial<Connection>) {
    return mutate((db) => {
      const c = db.connections.find((x) => x.id === id);
      if (!c) return undefined;
      Object.assign(c, patch);
      return c;
    });
  },
  async addInstance(instance: Instance) {
    return mutate((db) => {
      db.instances.push(instance);
      return instance;
    });
  },
  async updateInstance(id: string, patch: Partial<Instance>) {
    return mutate((db) => {
      const i = db.instances.find((x) => x.id === id);
      if (!i) return undefined;
      Object.assign(i, patch);
      return i;
    });
  },
  async removeInstance(id: string) {
    return mutate((db) => {
      db.instances = db.instances.filter((x) => x.id !== id);
      delete db.log[id];
      delete db.receipts[id];
      return true;
    });
  },

  /** Append changes to the log and bump the instance revision. */
  async commit(
    instanceId: string,
    changes: ChangeRecord[],
    opts: { bump?: number; opIds?: string[]; touchStats?: Partial<Instance["stats"]> } = {}
  ) {
    return mutate((db) => {
      const instance = db.instances.find((i) => i.id === instanceId);
      if (!instance) return { rev: 0 };
      const log = db.log[instanceId] ?? (db.log[instanceId] = []);
      log.push(...changes);
      if (log.length > MAX_LOG) db.log[instanceId] = log.slice(-MAX_LOG);
      const receipts = db.receipts[instanceId] ?? (db.receipts[instanceId] = []);
      if (opts.opIds?.length) {
        receipts.push(...opts.opIds);
        if (receipts.length > MAX_RECEIPTS) {
          db.receipts[instanceId] = receipts.slice(-MAX_RECEIPTS);
        }
      }
      instance.rev += opts.bump ?? Math.max(1, changes.length);
      instance.updatedAt = new Date().toISOString();
      if (opts.touchStats) Object.assign(instance.stats, opts.touchStats);
      return { rev: instance.rev };
    });
  },

  async pushEvents(events: SyncEvent[]) {
    return mutate((db) => {
      db.events.push(...events);
      if (db.events.length > MAX_EVENTS) db.events = db.events.slice(-MAX_EVENTS);
      return events.length;
    });
  },

  /* --- dev-only mock workspace -------------------------------------- */
  async mockState<T>() {
    return read((db) => db.mock as T | undefined);
  },
  async saveMockState(state: unknown) {
    return mutate((db) => {
      db.mock = state;
      return true;
    });
  },

  /** Test helper: wipe everything. Never wired to a route in production. */
  async reset() {
    return mutate((db) => {
      const fresh = blank();
      Object.assign(db, fresh);
      return true;
    });
  },
};

export type { DbShape };

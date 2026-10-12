import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Ids                                                                  */
/* ------------------------------------------------------------------ */

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, sortable-ish, URL-safe ids. `inst_` / `conn_` prefixes make logs readable. */
export function newId(prefix: string, bytes = 9): string {
  const buf = randomBytes(bytes);
  let out = "";
  for (const b of buf) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${out}`;
}

/* ------------------------------------------------------------------ */
/* Sync keys                                                            */
/* ------------------------------------------------------------------ */

/**
 * The widget credential.
 *
 * It travels in the embed URL because cookies do not survive Notion's iframe in
 * Safari and are partitioned in Chrome (see docs/DATA_SYNC_RESEARCH.md §3). It
 * is therefore:
 *   • scoped to exactly one instance
 *   • read/write only for that instance's records
 *   • hashed at rest, so a database dump leaks nothing usable
 *   • rotatable and revocable from the instance settings
 *   • not a Notion token: possession of it never reaches the workspace directly
 */
export interface MintedKey {
  key: string;
  hash: string;
  prefix: string;
}

export function mintSyncKey(): MintedKey {
  const raw = randomBytes(24).toString("base64url");
  const key = `sk_${raw}`;
  return { key, hash: hashSyncKey(key), prefix: key.slice(0, 11) };
}

export function hashSyncKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Constant-time compare of a presented key against a stored hash. */
export function syncKeyMatches(presented: string, hash: string): boolean {
  const a = Buffer.from(hashSyncKey(presented), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Signing (webhook-free internal links, sync codes, state)             */
/* ------------------------------------------------------------------ */

function secret(): string {
  const s = process.env.ARENA_SYNC_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    // Fail loudly rather than silently shipping a predictable secret.
    console.warn(
      "[arena-sync] ARENA_SYNC_SECRET is unset. Set it in production: sync codes and OAuth state are signed with it."
    );
  }
  return "arena-dev-secret-not-for-production";
}

export function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signedValue(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySignedValue<T = unknown>(token: string): T | null {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Stable short hash of any JSON-serialisable value. */
export function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

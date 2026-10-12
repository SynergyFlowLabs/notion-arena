import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * At-rest protection for Notion credentials.
 *
 * The engine needs the workspace token between requests (webhooks, background
 * publishes, a user opening the widget on a new device), so the token has to be
 * stored. It is sealed with AES-256-GCM under a key derived from
 * ARENA_SYNC_SECRET. In production that secret is a KMS-held value and the
 * ciphertext lives in Postgres; in development it is an env var and the
 * ciphertext lives in a gitignored JSON file (see lib/sync/store.ts).
 */

const KEY_INFO = "arena-sync.v1.token";

function key(): Buffer {
  const secret = process.env.ARENA_SYNC_SECRET ?? "arena-dev-secret-not-for-production";
  // scrypt keeps the derivation honest even if the secret is a short passphrase.
  return scryptSync(secret, KEY_INFO, 32);
}

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ct.toString("base64url")}.${tag.toString("base64url")}`;
}

export function open(sealed: string): string | null {
  try {
    const [version, ivPart, ctPart, tagPart] = sealed.split(".");
    if (version !== "v1" || !ivPart || !ctPart || !tagPart) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** Never render a token in a UI or log. This is the only representation clients see. */
export function maskToken(token: string): string {
  if (token.length <= 8) return "••••";
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

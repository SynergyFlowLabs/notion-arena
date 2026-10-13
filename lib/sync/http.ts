import { NextRequest } from "next/server";
import { Store } from "./store";
import { authorizeInstance } from "./instances";
import type { Instance } from "./types";

/**
 * Shared route plumbing for the data plane.
 *
 * Two rules the routes all follow:
 *   • The widget's credential arrives as `x-arena-key` (header) or `?k=`
 *     (query). Headers are used when the frame can set them; the query param is
 *     what makes an EventSource possible without cookies.
 *   • Nothing in a response ever includes a stored credential: the sync key
 *     hash, the sealed Notion token and the raw token are all server-only.
 */

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data as Record<string, unknown>, init);
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: message, ...extra }, { status });
}

export function presentedKey(req: NextRequest): string | null {
  return (
    req.headers.get("x-arena-key") ??
    req.nextUrl.searchParams.get("k") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null
  );
}

/**
 * Loads an instance and verifies the presented key.
 *
 * Returns a Response when it fails, so routes read as
 * `const auth = await authorize(req, id); if (auth instanceof Response) return auth;`
 */
export async function authorize(
  req: NextRequest,
  instanceId: string
): Promise<{ instance: Instance; key: string } | Response> {
  const instance = await Store.instance(instanceId);
  if (!instance) return fail("Unknown component instance.", 404);
  const key = presentedKey(req);
  const ok = await authorizeInstance(instance, key);
  if (!ok) {
    return fail(
      instance.revokedAt
        ? "This component instance was revoked."
        : "This component instance needs a valid sync key. Re-copy the embed URL.",
      instance.revokedAt ? 410 : 401
    );
  }
  return { instance, key: key as string };
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

/** Best-effort client descriptor for logs and the audit trail. */
export function clientLabel(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "unknown";
  if (/notion/i.test(ua)) return "notion-app";
  if (/iphone|ipad|android/i.test(ua)) return "mobile";
  if (/electron/i.test(ua)) return "desktop-app";
  return "browser";
}

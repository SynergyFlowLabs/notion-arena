import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { readDocument } from "@/lib/sync/engine";
import { adapterForInstance } from "@/lib/sync/engine";
import { authorize, isResponse, type RouteContext } from "@/lib/sync/http";
import { renderDataBundle } from "@/lib/bridge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/sync/instances/{id}/bundle?offline=1&download=1
 *
 * The artifact that becomes a Notion HTML block.
 *
 * `offline=1` is the honest switch: it bakes the current document into the file
 * and sets the runtime to `outbox` transport, so the file behaves the way it
 * will inside Notion's sandbox (no network) rather than pretending it can call
 * home. Without it, the same document is served with the live transport, which
 * is what a user sees if they open the file in a browser by accident.
 *
 * The same function renders the hosted embed (app/embed/[slug]/route.ts), which
 * is the whole point: one instance, two renderers, one code path.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorize(req, id);
  if (isResponse(auth)) return auth;

  const offline = req.nextUrl.searchParams.get("offline") === "1";
  const download = req.nextUrl.searchParams.get("download") !== "0";
  const adapter = await adapterForInstance(auth.instance);
  const state = await readDocument(auth.instance, adapter);

  const html = await renderDataBundle({
    instance: auth.instance,
    doc: state.doc,
    transport: offline ? "outbox" : "live",
    syncKey: auth.key,
    ui: req.nextUrl.searchParams.get("ui") !== "0",
    // In a sandbox with no network, reloading cannot fetch anything; leave the
    // baked snapshot in place and let the outbox carry the delta.
    reloadOnRemote: !offline,
    // For Arena's own surfaces only. A Notion HTML block gets this file too,
    // and there the flag stays off, because the parent is the Notion app.
    host: req.nextUrl.searchParams.get("host") === "1",
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(download
        ? {
            "content-disposition": `attachment; filename="${auth.instance.slug}-${auth.instance.id.slice(-6)}.html"`,
          }
        : {}),
      "cache-control": "no-store",
      "x-arena-rev": String(auth.instance.rev),
      "x-arena-transport": offline ? "outbox" : "live",
      // A sandboxed HTML block has an opaque origin: no CSP to speak of applies
      // to it, but the live variant is served to a normal browsing context.
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src 'self'; base-uri 'none'; frame-ancestors *",
      "referrer-policy": "no-referrer",
    },
  });
}

/** HEAD reports the revision the bundle would carry, without rendering it. */
export async function HEAD(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const instance = await Store.instance(id);
  if (!instance) return new Response(null, { status: 404 });
  return new Response(null, {
    headers: { "x-arena-rev": String(instance.rev), "cache-control": "no-store" },
  });
}

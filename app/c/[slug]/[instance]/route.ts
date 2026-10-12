import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { adapterForInstance, readDocument } from "@/lib/sync/engine";
import { authorizeInstance } from "@/lib/sync/instances";
import { ARENA_CSP, renderDataBundle } from "@/lib/bridge";
import type { RouteContext } from "@/lib/sync/http";

export const dynamic = "force-dynamic";

/**
 * GET /c/{slug}/{instance}?k=…
 *
 * The standalone renderer: the same instance, the same bundle, no pill.
 *
 * It exists for the places an embed cannot go. A Notion embed block needs a URL
 * that renders in an iframe; mobile clients and a user's own site do not, and in
 * the HTML-block channel this is the surface a phone opens when the block itself
 * refuses to render (research §8, Q4). Nothing here is a second implementation:
 * the state comes from the same read, and the page is the same file the embed
 * and the downloaded block are.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { slug, instance: instanceId } = await ctx.params;
  const presented = req.nextUrl.searchParams.get("k");

  const instance = await Store.instance(instanceId);
  if (!instance || instance.slug !== slug) {
    return html(
      404,
      "This component instance does not exist.",
      "Instance ids are shown when you create one, next to the embed URL."
    );
  }
  if (!(await authorizeInstance(instance, presented))) {
    return html(
      instance.revokedAt ? 410 : 401,
      instance.revokedAt ? "This instance was revoked." : "This page is missing its key.",
      "Open the instance's page in Arena and copy the URL again, or rotate the key."
    );
  }

  let doc: unknown = {};
  let warning: string | undefined;
  try {
    const adapter = await adapterForInstance(instance);
    doc = (await readDocument(instance, adapter)).doc;
  } catch (err) {
    warning = (err as Error).message;
  }

  const page = await renderDataBundle({
    instance,
    doc,
    transport: "live",
    syncKey: presented ?? undefined,
    // No pill: this is a page a person reads, not a block inside Notion.
    ui: false,
  });

  return new Response(page, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": ARENA_CSP,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      ...(warning ? { "x-arena-warning": warning.slice(0, 200) } : {}),
    },
  });
}

function html(status: number, title: string, detail: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
 :root{color-scheme:light dark}
 body{margin:0;min-height:100vh;display:grid;place-items:center;
      font:14px/1.6 ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
      background:#fff;color:#37352f;padding:24px}
 @media (prefers-color-scheme:dark){body{background:#191919;color:#e6e6e4}}
 .box{max-width:32rem}
 h1{font-size:16px;margin:0 0 6px}
 p{color:#787774;margin:0 0 14px}
 a{color:#2383e2}
</style></head><body><div class="box">
<h1>${title}</h1><p>${detail}</p>
<p><a href="/docs/sync">How two-way sync works</a></p>
</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

import { NextRequest } from "next/server";
import { buildConfig, getWidget, renderWidgetHtml } from "@/lib/widget";
import { Store } from "@/lib/sync/store";
import { adapterForInstance, readDocument } from "@/lib/sync/engine";
import { authorizeInstance, revealInstanceKey } from "@/lib/sync/instances";
import { ARENA_CSP, renderDataBundle } from "@/lib/bridge";

export const dynamic = "force-dynamic";

/**
 * GET /embed/<slug>?work=25&accent=%23e03e3e
 * GET /embed/<slug>?i=inst_…&k=sk_…
 *
 * Two shapes of the same route.
 *
 * Without `i` this is the original behaviour: a URL-configured widget with no
 * network of its own. With `i` the widget is a *data-bound renderer*: the state
 * document is read from the user's Notion database at render time and baked in,
 * the bridge is injected, and the frame talks to our API with the instance sync
 * key (never a cookie, because Safari blocks third-party cookies inside Notion's
 * iframe and Chrome partitions them: research §3.2).
 *
 * Note the CSP: `connect-src 'self'` is added only on the bound path. A widget
 * with no instance keeps the stricter policy it always had, so nothing silently
 * becomes network-capable.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const widget = getWidget(slug);

  if (!widget) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Not found</title>
       <body style="font:14px ui-sans-serif,system-ui;padding:24px;color:#787774">
       Unknown component “${slug}”. <a href="/components">Browse the catalog</a>.</body>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const instanceId = req.nextUrl.searchParams.get("i");
  const presented = req.nextUrl.searchParams.get("k");

  /* --- bound instance ---------------------------------------------- */
  if (instanceId) {
    const instance = await Store.instance(instanceId);
    if (!instance || instance.slug !== slug) {
      return explain(
        404,
        "This component instance does not exist.",
        "It may have been deleted. Open the Arena component page to make a new one."
      );
    }
    if (!(await authorizeInstance(instance, presented))) {
      return explain(
        instance.revokedAt ? 410 : 401,
        instance.revokedAt ? "This instance was revoked." : "This URL is missing its sync key.",
        "Copy the embed URL again from the component's page in Arena. Keys are shown when they are created and can be rotated at any time."
      );
    }

    let doc: unknown = {};
    let warning: string | undefined;
    try {
      const adapter = await adapterForInstance(instance);
      const state = await readDocument(instance, adapter);
      doc = state.doc;
    } catch (err) {
      // A renderer must still render: a broken connection shows the last known
      // state rather than an error box, and the pill reports the failure.
      warning = (err as Error).message;
    }

    const html = await renderDataBundle({
      instance,
      doc,
      transport: "live",
      syncKey: presented ?? undefined,
      // Opt-in postMessage channel for a parent we control (the standalone page,
      // the playground, an integrator's own site). Notion's parent ignores it:
      // there is no host SDK, see docs/DATA_SYNC_RESEARCH.md §2.7.
      host: req.nextUrl.searchParams.get("host") === "1",
    });

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": ARENA_CSP,
        // The document is baked per instance and per revision: caching it would
        // show one user's rows to the next reader of the same URL.
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        ...(warning ? { "x-arena-warning": warning.slice(0, 200) } : {}),
      },
    });
  }

  /* --- configuration-only widget (unchanged behaviour) -------------- */
  const config = buildConfig(widget, req.nextUrl.searchParams);
  const html = await renderWidgetHtml(widget, config);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Notion builds its own iframe around this URL. There is no X-Frame-Options
      // value that means "allow everywhere": the correct way is to omit the
      // header and allow framing explicitly with CSP frame-ancestors.
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors *",
      "cache-control": "public, max-age=60, stale-while-revalidate=600",
      "referrer-policy": "no-referrer",
    },
  });
}

/**
 * Rendered inside Notion's iframe, so it has to be a page, not JSON.
 * `/api/sync/instances/{id}` returns the machine-readable version of the same
 * refusal for agents.
 */
function explain(status: number, title: string, detail: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <style>
       :root{--bg:#fff;--fg:#37352f;--muted:#787774;--border:#e9e9e7}
       @media (prefers-color-scheme:dark){:root{--bg:#191919;--fg:#e6e6e4;--muted:#9b9a97;--border:#2f2f2f}}
       body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;padding:18px}
       h1{font-size:14px;margin:0 0 6px}
       p{margin:0 0 10px;color:var(--muted)}
       code{font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(120,119,116,.12);padding:1px 4px;border-radius:4px}
     </style></head><body>
     <h1>${title}</h1><p>${detail}</p>
     <p>Arena component</p>
     </body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors *",
      },
    }
  );
}


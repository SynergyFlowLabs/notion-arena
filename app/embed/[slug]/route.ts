import { NextRequest } from "next/server";
import { buildConfig, getWidget, renderWidgetHtml } from "@/lib/widget";

export const dynamic = "force-dynamic";

/**
 * GET /embed/<slug>?work=25&accent=%23e03e3e
 *
 * The URL users paste into Notion's /embed block. Serves the widget with its
 * configuration read from the query string at runtime, and with framing
 * explicitly allowed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const widget = getWidget(slug);

  if (!widget) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Not found</title>
       <body style="font:14px ui-sans-serif,system-ui;padding:24px;color:#787774">
       Unknown component “${slug}”. <a href="/components">Browse the catalog</a>.</body>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const config = buildConfig(widget, req.nextUrl.searchParams);
  const html = await renderWidgetHtml(widget, config);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Notion builds its own iframe around this URL. There is no X-Frame-Options
      // value that means "allow everywhere" — the correct way is to omit the
      // header and allow framing explicitly with CSP frame-ancestors.
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors *",
      "cache-control": "public, max-age=60, stale-while-revalidate=600",
      "referrer-policy": "no-referrer",
    },
  });
}

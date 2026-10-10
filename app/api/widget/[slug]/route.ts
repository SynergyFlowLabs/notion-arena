import { NextRequest } from "next/server";
import { buildConfig, getWidget, renderWidgetHtml } from "@/lib/widget";

export const dynamic = "force-dynamic";

/**
 * GET /api/widget/<slug>?download=1&work=25
 *
 * Returns the widget as a single self-contained .html file with the current
 * configuration baked in. This is the artifact you upload to Notion as an HTML
 * block — the sandbox has no URL, so configuration cannot come from a query
 * string and must live inside the file.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const widget = getWidget(slug);
  if (!widget) {
    return Response.json({ error: `Unknown component: ${slug}` }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const download = sp.get("download") !== "0";
  const config = buildConfig(widget, sp);
  const html = await renderWidgetHtml(widget, config);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(download
        ? { "content-disposition": `attachment; filename="${slug}.html"` }
        : {}),
      "cache-control": "no-store",
    },
  });
}

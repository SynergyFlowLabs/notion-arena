import { NextRequest } from "next/server";
import { getComponent } from "@/lib/catalog";
import { isWidget } from "@/lib/types";
import { getRecipe, planInstall } from "@/lib/recipes";
import { installHtmlBlock, installEmbedBlock, installRecipe } from "@/lib/notion/installer";
import { buildConfig, getWidget, renderWidgetHtml } from "@/lib/widget";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/install
 *
 * {
 *   "component": "crm-pipeline",     // catalog slug
 *   "token": "ntn_••••",             // integration token or OAuth access token
 *   "parentPageId": "…",             // where to install
 *   "mode": "api" | "html-block" | "embed" | "plan",
 *   "config": { … }                  // widget configuration, optional
 * }
 *
 * `mode: "plan"` needs no credentials and returns the exact request sequence —
 * that is what the detail page renders before you ever connect a workspace.
 *
 * The token is used for the duration of the request and never persisted. In
 * production this route should be behind Notion's OAuth flow so the browser
 * never sees an integration token; see /docs/oauth.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const slug = String(body?.component ?? "");
  const component = getComponent(slug);
  if (!component) {
    return Response.json({ ok: false, error: `Unknown component “${slug}”.` }, { status: 404 });
  }

  const mode: string = body?.mode ?? "plan";
  const token: string | undefined = body?.token;
  const parentPageId: string | undefined = body?.parentPageId;

  /* --- plan only: no credentials required --------------------------- */
  if (mode === "plan") {
    if (component.kind === "native") {
      const recipe = getRecipe((component as any).recipe);
      if (!recipe) return Response.json({ ok: false, error: "Recipe missing." }, { status: 500 });
      return Response.json({
        ok: true,
        mode: "plan",
        component: slug,
        plan: planInstall(recipe, parentPageId ?? "{parent_page_id}"),
      });
    }
    const widget = getWidget(slug)!;
    const config = buildConfig(widget, body?.config ?? {});
    return Response.json({
      ok: true,
      mode: "plan",
      component: slug,
      embedUrl: absoluteUrl(`/embed/${slug}?${new URLSearchParams(
        Object.entries(config).map(([k, v]) => [k, String(v)])
      )}`),
      downloadUrl: absoluteUrl(`/api/widget/${slug}`),
      htmlBlockSteps: [
        "POST /v1/file_uploads  { mode: 'single_part', filename: '<slug>.html', content_type: 'text/html' }",
        "POST <upload_url>     multipart/form-data, file=<configured .html>",
        `PATCH /v1/blocks/${parentPageId ?? "<page_id>"}/children  { children: [{ type: 'embed', embed: { type: 'file_upload', file_upload: { id: '<file_upload_id>' } } }] }`,
      ],
      embedSteps: [
        `PATCH /v1/blocks/${parentPageId ?? "<page_id>"}/children  { children: [{ type: 'embed', embed: { url: '<embedUrl>' } }] }`,
      ],
    });
  }

  /* --- everything below needs a token ------------------------------- */
  if (!token) {
    return Response.json(
      { ok: false, error: "A Notion integration token is required for this mode." },
      { status: 400 }
    );
  }
  if (!parentPageId) {
    return Response.json(
      { ok: false, error: "parentPageId is required — the page or block to install into." },
      { status: 400 }
    );
  }

  try {
    if (component.kind === "native") {
      if (mode !== "api") {
        return Response.json(
          { ok: false, error: `Native recipes install with mode "api", not "${mode}".` },
          { status: 400 }
        );
      }
      const result = await installRecipe({ token, recipeId: (component as any).recipe, parentPageId });
      return Response.json(result);
    }

    const widget = getWidget(slug)!;
    const config = buildConfig(widget, body?.config ?? {});

    if (mode === "embed") {
      const url = `${absoluteUrl(`/embed/${slug}`)}?${new URLSearchParams(
        Object.entries(config).map(([k, v]) => [k, String(v)])
      ).toString()}`;
      const res = await installEmbedBlock({ token, parentBlockId: parentPageId, url, caption: widget.name });
      return Response.json({ ...res, ok: res.ok === true && !!res.blockId, mode, component: slug, url });
    }

    if (mode === "html-block") {
      const html = await renderWidgetHtml(widget, config);
      const res = await installHtmlBlock({
        token,
        parentBlockId: parentPageId,
        filename: `${slug}.html`,
        html,
        caption: widget.name,
      });
      return Response.json({ ...res, ok: res.ok === true, mode, component: slug, bytes: Buffer.byteLength(html) });
    }

    return Response.json({ ok: false, error: `Unknown mode “${mode}”.` }, { status: 400 });
  } catch (err: any) {
    const message = err?.message ?? String(err);
    const status = /401|403|unauthorized|restricted/i.test(message) ? 403 : 500;
    return Response.json(
      {
        ok: false,
        error: message,
        hint:
          status === 403
            ? "The integration cannot see that page. Share the page with the integration: page ••• → Connections → add your integration."
            : undefined,
      },
      { status }
    );
  }
}

export async function GET() {
  return Response.json({
    name: "Blocksmith install API",
    usage: "POST with { component, token, parentPageId, mode, config }",
    modes: {
      plan: "No credentials. Returns the exact Notion request sequence.",
      embed: "Appends an embed block pointing at the hosted widget URL.",
      "html-block": "Uploads a configured .html and appends it as a sandboxed HTML block.",
      api: "Installs a native recipe: databases, data sources, views, seed rows, pages.",
    },
    notionVersion: "2026-03-11",
    index: absoluteUrl("/r/index.json"),
  });
}

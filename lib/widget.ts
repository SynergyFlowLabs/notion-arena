import { promises as fs } from "node:fs";
import path from "node:path";
import { COMPONENT_MAP } from "./catalog";
import { isWidget, type WidgetComponent } from "./types";
import { absoluteUrl } from "./utils";

export const WIDGET_DIR = path.join(process.cwd(), "public", "widgets");

export function getWidget(slug: string): WidgetComponent | undefined {
  const c = COMPONENT_MAP.get(slug);
  return c && isWidget(c) ? c : undefined;
}

export async function readWidgetFile(widget: WidgetComponent): Promise<string> {
  const file = path.join(process.cwd(), "public", widget.file.replace(/^\//, ""));
  return fs.readFile(file, "utf8");
}

/** Coerce a query-string value to the type the widget declared. */
export function coerceValue(raw: string, type: string): string | number | boolean {
  if (type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "boolean") return raw === "true" || raw === "1" || raw === "on";
  return raw;
}

/**
 * Builds a config object from a request's query params, validated against the
 * widget's declared params. Unknown keys are dropped, so a crafted URL cannot
 * inject arbitrary JSON into the block.
 */
export function buildConfig(
  widget: WidgetComponent,
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  widget.params.forEach((p) => {
    const raw =
      searchParams instanceof URLSearchParams
        ? searchParams.get(p.key)
        : (() => {
            const v = searchParams[p.key];
            return Array.isArray(v) ? v[0] : v ?? null;
          })();
    if (raw === null || raw === undefined || raw === "") {
      out[p.key] = p.default as string | number | boolean;
      return;
    }
    out[p.key] = coerceValue(String(raw), p.type);
  });
  return out;
}

/**
 * Injects the config as an inline JSON script tag.
 *
 * This matters because a Notion HTML block is rendered from an uploaded file in
 * a sandboxed iframe with `srcdoc` semantics : there is no URL, so
 * `location.search` is empty. The `/embed/<slug>?work=25` path reads params at
 * runtime; the downloaded `.html` file carries them baked in. Same component,
 * two delivery channels.
 */
export function injectConfig(html: string, config: Record<string, unknown>): string {
  const json = JSON.stringify(config)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const tag = `<script id="bk-config" type="application/json">${json}</script>`;
  if (html.includes("</head>")) return html.replace("</head>", `${tag}\n</head>`);
  return tag + html;
}

export async function renderWidgetHtml(
  widget: WidgetComponent,
  config: Record<string, string | number | boolean>
): Promise<string> {
  const source = await readWidgetFile(widget);
  return injectConfig(source, config);
}

/** The URL a user pastes into Notion's `/embed` block. */
export function embedUrl(slug: string, config: Record<string, unknown> = {}): string {
  const url = new URL(absoluteUrl(`/embed/${slug}`));
  Object.entries(config).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}

/** Only the params the user actually changed away from the default. */
export function diffConfig(
  widget: WidgetComponent,
  config: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  widget.params.forEach((p) => {
    const v = config[p.key];
    if (v !== undefined && String(v) !== String(p.default)) out[p.key] = v;
  });
  return out;
}

/** The exact request a Notion HTML-block install makes. */
export function htmlBlockInstallSnippet(slug: string, config: Record<string, unknown>) {
  return `POST https://api.notion.com/v1/file_uploads
Notion-Version: 2026-03-11
Authorization: Bearer ntn_••••
Content-Type: application/json

{ "mode": "single_part", "filename": "${slug}.html", "content_type": "text/html" }

# → { "id": "<file_upload_id>", "upload_url": "https://api.notion.com/v1/file_uploads/<id>/send", "status": "pending" }

POST <upload_url>
Content-Type: multipart/form-data

file=@${slug}.html        # the configured HTML, downloaded from this page

# → { "status": "uploaded" }

PATCH https://api.notion.com/v1/blocks/<page_or_block_id>/children
Notion-Version: 2026-03-11
Authorization: Bearer ntn_••••
Content-Type: application/json

{
  "children": [{
    "object": "block",
    "type": "embed",
    "embed": {
      "type": "file_upload",
      "file_upload": { "id": "<file_upload_id>" },
      "caption": []
    }
  }]
}`;
}

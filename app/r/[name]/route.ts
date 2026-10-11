import { registryIndex, registryItemWithContent, widgetParamsSchema } from "@/lib/registry";
import { getComponent } from "@/lib/catalog";
import { isWidget } from "@/lib/types";

export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=300",
};

/**
 * shadcn/ui-compatible registry endpoints.
 *
 *   GET /r/index.json          the whole catalog
 *   GET /r/schema.json         the config schema for every widget
 *   GET /r/<name>.json         one item, with file contents inlined
 *
 * Add this to a components.json and the stock shadcn CLI can pull items:
 *   "registries": { "@notion-arena": "https://<host>/r/{name}.json" }
 */
/**
 * Every URL inside a manifest should point at the host that served it, so a
 * consumer behind a proxy or on a preview domain gets links that work.
 */
function requestBase(req: Request) {
  const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto");
  if (fwdHost) return `${fwdProto ?? (fwdHost.startsWith("localhost") ? "http" : "https")}://${fwdHost}`;
  return new URL(req.url).origin;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const base = requestBase(req);

  if (name === "index.json" || name === "index") {
    return Response.json(registryIndex(base), { headers: JSON_HEADERS });
  }

  if (name === "schema.json" || name === "schema") {
    const { COMPONENTS } = await import("@/lib/catalog");
    const schemas = Object.fromEntries(
      COMPONENTS.filter(isWidget).map((w) => [w.slug, widgetParamsSchema(w)])
    );
    return Response.json(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Notion Arena widget configuration schemas",
        description:
          "One JSON Schema per widget. Everything a widget accepts as configuration, with types, bounds and defaults, so an agent can configure one without reading its source.",
        definitions: schemas,
      },
      { headers: JSON_HEADERS }
    );
  }

  const slug = name.replace(/\.json$/, "");
  const component = getComponent(slug);
  if (!component) {
    return Response.json(
      { error: `No registry item named “${slug}”.`, index: "/r/index.json" },
      { status: 404, headers: JSON_HEADERS }
    );
  }

  const item = await registryItemWithContent(slug, base);
  return Response.json(item, { headers: JSON_HEADERS });
}

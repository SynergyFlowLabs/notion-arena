import { COMPONENTS, getComponent } from "./catalog";
import { CATEGORIES, isWidget, type CatalogComponent, type WidgetComponent } from "./types";
import { absoluteUrl } from "./utils";
import { getRecipe } from "./recipes";

export const REGISTRY_NAME = "blocksmith";
export const REGISTRY_HOMEPAGE = absoluteUrl("/");

/**
 * The base every URL inside a registry item is built from.
 *
 * Defaults to the configured site URL, but callers that have the live request
 * can pass the real origin so the manifest a consumer downloads points at the
 * host that actually served it.
 */
export function registryBase(reqBase?: string) {
  return (reqBase ?? absoluteUrl("")).replace(/\/$/, "");
}

const at = (base: string | undefined, path: string) => `${registryBase(base)}${path}`;

/**
 * A registry item in the shadcn/ui shape.
 *
 * shadcn items ship `files` with source code the CLI writes into your project.
 * Blocksmith items ship the same envelope, but `files` contain the artifacts
 * Notion actually consumes:
 *   • a `.html` file  → upload via the File Upload API, attach to an embed block
 *   • a `.json` file  → the Notion API payloads a recipe installs
 *   • a `.md` file    → the manual steps the API cannot express
 *
 * Keeping the envelope identical means existing tooling : the shadcn CLI, an
 * MCP registry server, a `components.json` namespace entry : can address this
 * catalog without modification:
 *
 *   "registries": { "@blocksmith": "https://blocksmith.dev/r/{name}.json" }
 */
export interface RegistryItem {
  $schema: string;
  name: string;
  type: string;
  title: string;
  description: string;
  author: string;
  categories: string[];
  tags: string[];
  meta: Record<string, unknown>;
  files: { path: string; type: string; target?: string; content?: string }[];
}

const ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const INDEX_SCHEMA = "https://ui.shadcn.com/schema/registry.json";

export function buildRegistryItem(c: CatalogComponent, base?: string): RegistryItem {
  const widget = isWidget(c) ? c : null;

  const files: RegistryItem["files"] = [];
  if (widget) {
    files.push({
      path: `widgets/${widget.slug}.html`,
      type: "registry:file",
      target: `notion/widgets/${widget.slug}.html`,
    });
  } else {
    files.push({
      path: `recipes/${c.slug}.json`,
      type: "registry:file",
      target: `notion/recipes/${c.slug}.json`,
    });
    files.push({
      path: `recipes/${c.slug}.manual.md`,
      type: "registry:file",
      target: `notion/recipes/${c.slug}.manual.md`,
    });
  }

  return {
    $schema: ITEM_SCHEMA,
    name: c.slug,
    type: c.kind === "widget" ? "registry:component" : "registry:block",
    title: c.name,
    description: c.tagline,
    author: "Blocksmith",
    categories: [c.category],
    tags: [c.kind, c.tier, ...c.tags],
    meta: {
      kind: c.kind,
      tier: c.tier,
      version: c.version,
      updatedAt: c.updatedAt,
      notionPlan: c.plan,
      emoji: c.emoji,
      delivery: c.delivery,
      capabilities: c.capabilities,
      ...(widget
        ? {
            embedUrl: at(base, `/embed/${widget.slug}`),
            fileUrl: at(base, widget.file),
            downloadUrl: at(base, `/api/widget/${widget.slug}`),
            height: widget.height,
            minHeight: widget.minHeight,
            maxHeight: widget.maxHeight,
            params: widget.params,
          }
        : {
            recipe: (c as { recipe: string }).recipe,
            installUrl: at(base, "/api/install"),
          }),
    },
    files,
  };
}

export function registryIndex(base?: string) {
  return {
    $schema: INDEX_SCHEMA,
    name: REGISTRY_NAME,
    homepage: at(base, "/"),
    items: COMPONENTS.map((c) => buildRegistryItem(c, base)),
  };
}

/** Full item, with file contents inlined : this is what `GET /r/<name>.json` returns. */
export async function registryItemWithContent(slug: string, base?: string) {
  const c = getComponent(slug);
  if (!c) return null;
  const item = buildRegistryItem(c, base);

  if (isWidget(c)) {
    const { promises: fs } = await import("node:fs");
    const path = await import("node:path");
    const file = path.join(process.cwd(), "public", c.file.replace(/^\//, ""));
    const content = await fs.readFile(file, "utf8");
    item.files = item.files.map((f) => (f.path.endsWith(".html") ? { ...f, content } : f));
  } else {
    const recipe = getRecipe((c as { recipe: string }).recipe);
    if (recipe) {
      item.files = item.files.map((f) => {
        if (f.path.endsWith(".json")) {
          return {
            ...f,
            content: JSON.stringify(
              {
                $schema: at(base, "/r/schema.json"),
                notionVersion: "2026-03-11",
                id: recipe.id,
                summary: recipe.summary,
                databases: recipe.databases,
                views: recipe.views,
                pages: recipe.pages,
              },
              null,
              2
            ),
          };
        }
        if (f.path.endsWith(".manual.md")) {
          return {
            ...f,
            content: recipe.manual
              .map(
                (m) =>
                  `## ${m.title}\n\n**Why this cannot be scripted:** ${m.reason}\n\n${m.steps
                    .map((s, i) => `${i + 1}. ${s}`)
                    .join("\n")}\n`
              )
              .join("\n"),
          };
        }
        return f;
      });
    }
  }

  return item;
}

export function widgetParamsSchema(w: WidgetComponent) {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: `${w.name} configuration`,
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      w.params.map((p) => [
        p.key,
        {
          type:
            p.type === "number"
              ? "number"
              : p.type === "boolean"
                ? "boolean"
                : "string",
          description: p.help ?? p.label,
          default: p.default,
          ...(p.min !== undefined ? { minimum: p.min } : {}),
          ...(p.max !== undefined ? { maximum: p.max } : {}),
          ...(p.options ? { enum: p.options.map((o) => o.value) } : {}),
        },
      ])
    ),
  };
}

export { CATEGORIES };

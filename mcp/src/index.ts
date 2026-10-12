#!/usr/bin/env node
/**
 * Notion Arena MCP Server
 * 
 * The component registry for Notion — exposed as MCP tools.
 * 
 * Tools:
 * - list_components: browse all 155 components
 * - search_components: keyword search
 * - get_component: full detail for a slug
 * - get_widget_schema: param schema for a widget
 * - build_embed_url: build configured URLs
 * - plan_install: dry-run install plan (no credentials needed)
 * - get_registry_item: shadcn-compatible registry JSON
 * - get_install_guide: human-readable install guide
 * - get_categories: list categories
 * - get_recipe: native recipe detail
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load catalog — try multiple locations for robustness
function loadCatalog() {
  const candidates = [
    path.join(__dirname, "data", "catalog.json"),
    path.join(__dirname, "..", "src", "data", "catalog.json"),
    path.join(process.cwd(), "mcp", "src", "data", "catalog.json"),
    path.join(process.cwd(), "src", "data", "catalog.json"),
  ];
  
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
      }
    } catch {}
  }
  
  // Fallback: try to load from parent project's generated file via relative path
  try {
    const fallback = path.join(__dirname, "..", "..", "mcp", "src", "data", "catalog.json");
    if (fs.existsSync(fallback)) {
      return JSON.parse(fs.readFileSync(fallback, "utf-8"));
    }
  } catch {}
  
  throw new Error("Catalog not found. Run `node scripts/generate-mcp-catalog.mjs` from repo root.");
}

const catalogData = loadCatalog();
const COMPONENTS: any[] = catalogData.components;
const RECIPES: Record<string, any> = catalogData.recipes ?? {};

const SITE_URL = process.env.NOTION_ARENA_SITE_URL || process.env.BLOCKSMITH_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://notionarena.vercel.app";
const REGISTRY_BASE = process.env.NOTION_ARENA_REGISTRY_URL || process.env.BLOCKSMITH_REGISTRY_URL || `${SITE_URL.replace(/\/$/, "")}/r`;

function absoluteUrl(p: string) {
  if (p.startsWith("http")) return p;
  return `${SITE_URL.replace(/\/$/, "")}${p.startsWith("/") ? p : `/${p}`}`;
}

function embedUrl(slug: string, config: Record<string, any> = {}) {
  const url = new URL(`${SITE_URL.replace(/\/$/, "")}/embed/${slug}`);
  Object.entries(config).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
}

function downloadUrl(slug: string, config: Record<string, any> = {}) {
  const url = new URL(`${SITE_URL.replace(/\/$/, "")}/api/widget/${slug}`);
  Object.entries(config).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
}

function buildConfig(widget: any, inputConfig: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const p of widget.params || []) {
    const raw = inputConfig[p.key];
    if (raw === undefined || raw === null || raw === "") {
      out[p.key] = p.default;
    } else {
      // coerce
      if (p.type === "number") {
        const n = Number(raw);
        out[p.key] = Number.isFinite(n) ? n : raw;
      } else if (p.type === "boolean") {
        out[p.key] = raw === true || raw === "true" || raw === "1";
      } else {
        out[p.key] = String(raw);
      }
    }
  }
  // allow theme/accent always
  if (!out.theme) out.theme = "auto";
  return out;
}

const server = new McpServer({
  name: "notion-arena",
  version: "0.2.2",
});

// --- Tool: list_components ---
server.registerTool(
  "list_components",
  {
    title: "List Notion Arena components",
    description: "List all 155 Notion Arena components (144 widgets + 11 native recipes). Filter by category, kind (widget/native), tier (free/pro), or delivery channel. Returns slug, name, tagline, category, capabilities.",
    inputSchema: {
      category: z.string().optional().describe("Filter by category: dashboards, time, trackers, planning, business, visuals, docs, automations"),
      kind: z.enum(["widget", "native"]).optional().describe("Filter by kind: widget (HTML embed) or native (Notion API recipe)"),
      tier: z.enum(["free", "pro"]).optional().describe("Filter by tier"),
      delivery: z.enum(["embed", "html-block", "download", "api"]).optional().describe("Filter by delivery channel"),
      limit: z.number().min(1).max(200).optional().default(50).describe("Max results, default 50"),
      offset: z.number().min(0).optional().default(0).describe("Offset for pagination"),
    }
  },
  async ({ category, kind, tier, delivery, limit = 50, offset = 0 }) => {
    let filtered = COMPONENTS;
    if (category) filtered = filtered.filter((c: any) => c.category === category);
    if (kind) filtered = filtered.filter((c: any) => c.kind === kind);
    if (tier) filtered = filtered.filter((c: any) => c.tier === tier);
    if (delivery) filtered = filtered.filter((c: any) => c.delivery?.includes(delivery));
    
    const total = filtered.length;
    const slice = filtered.slice(offset, offset + limit);
    
    const text = JSON.stringify({
      total,
      count: slice.length,
      offset,
      limit,
      components: slice.map((c: any) => ({
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        tagline: c.tagline,
        category: c.category,
        kind: c.kind,
        tier: c.tier,
        tags: c.tags,
        plan: c.plan,
        badge: c.badge,
        capabilities: c.capabilities,
        delivery: c.delivery,
        file: c.file,
        height: c.height,
      }))
    }, null, 2);
    
    return { content: [{ type: "text", text }] };
  }
);

// --- Tool: search_components ---
server.registerTool(
  "search_components",
  {
    title: "Search Notion Arena components",
    description: "Keyword search across name, tagline, description, tags, category. Use for 'find me a timer', 'CRM', 'habit tracker', etc.",
    inputSchema: {
      query: z.string().describe("Search query, e.g. 'pomodoro', 'budget', 'kanban', 'CRM pipeline'"),
      kind: z.enum(["widget", "native"]).optional(),
      category: z.string().optional(),
      limit: z.number().min(1).max(50).optional().default(10),
    }
  },
  async ({ query, kind, category, limit = 10 }) => {
    const q = query.toLowerCase();
    let results = COMPONENTS.filter((c: any) => {
      const hay = `${c.slug} ${c.name} ${c.tagline} ${c.description} ${c.tags.join(" ")} ${c.category}`.toLowerCase();
      return hay.includes(q);
    });
    
    if (kind) results = results.filter((c: any) => c.kind === kind);
    if (category) results = results.filter((c: any) => c.category === category);
    
    // simple relevance: name match > tagline > description
    results.sort((a: any, b: any) => {
      const aName = a.name.toLowerCase().includes(q) ? 0 : 1;
      const bName = b.name.toLowerCase().includes(q) ? 0 : 1;
      if (aName !== bName) return aName - bName;
      const aTag = a.tagline.toLowerCase().includes(q) ? 0 : 1;
      const bTag = b.tagline.toLowerCase().includes(q) ? 0 : 1;
      return aTag - bTag;
    });
    
    const slice = results.slice(0, limit);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          query,
          total: results.length,
          results: slice.map((c: any) => ({
            slug: c.slug,
            name: c.name,
            emoji: c.emoji,
            tagline: c.tagline,
            category: c.category,
            kind: c.kind,
            tier: c.tier,
            score: `${c.name.toLowerCase().includes(q) ? 'name-match' : c.tagline.toLowerCase().includes(q) ? 'tagline-match' : 'description-match'}`,
            embedUrl: c.kind === 'widget' ? absoluteUrl(`/embed/${c.slug}`) : null,
            registry: `${REGISTRY_BASE}/${c.slug}.json`
          }))
        }, null, 2)
      }]
    };
  }
);

// --- Tool: get_component ---
server.registerTool(
  "get_component",
  {
    title: "Get component detail",
    description: "Get full detail for a single Notion Arena component by slug. Includes params, features, useCases, capabilities, delivery, embed/download URLs, and recipe info for native components.",
    inputSchema: {
      slug: z.string().describe("Component slug, e.g. 'pomodoro-timer', 'crm-pipeline', 'habit-grid'"),
    }
  },
  async ({ slug }) => {
    const c = COMPONENTS.find((x: any) => x.slug === slug);
    if (!c) {
      return {
        content: [{
          type: "text",
          text: `Component "${slug}" not found. Use list_components or search_components to discover available slugs. Total: ${COMPONENTS.length} components.`
        }],
        isError: true
      };
    }
    
    const enriched = {
      ...c,
      urls: {
        page: absoluteUrl(`/components/${c.slug}`),
        embed: c.kind === 'widget' ? absoluteUrl(`/embed/${c.slug}`) : null,
        download: c.kind === 'widget' ? absoluteUrl(`/api/widget/${c.slug}`) : null,
        file: c.kind === 'widget' ? absoluteUrl(c.file) : null,
        registry: `${REGISTRY_BASE}/${c.slug}.json`,
        index: `${REGISTRY_BASE}/index.json`,
      },
      install: c.kind === 'widget' ? {
        embed: `Paste ${absoluteUrl(`/embed/${c.slug}`)} into Notion's /embed block`,
        htmlBlock: `Download from ${absoluteUrl(`/api/widget/${c.slug}`)} then upload via Notion File Upload API as embed.file_upload`,
        api: `POST ${absoluteUrl('/api/install')} with { component: "${c.slug}", mode: "embed" | "html-block", parentPageId, token, config }`
      } : {
        plan: `POST ${absoluteUrl('/api/install')} { component: "${c.slug}", mode: "plan" } — no credentials needed`,
        install: `POST ${absoluteUrl('/api/install')} { component: "${c.slug}", mode: "api", token, parentPageId }`,
        recipe: RECIPES[c.recipe] || null
      }
    };
    
    return {
      content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }]
    };
  }
);

// --- Tool: get_widget_schema ---
server.registerTool(
  "get_widget_schema",
  {
    title: "Get widget config schema",
    description: "Get JSON Schema for a widget's configurable parameters. Use to validate config before building embed URLs. Every widget has theme (auto/light/dark) and accent (color).",
    inputSchema: {
      slug: z.string().describe("Widget slug, e.g. 'pomodoro-timer', 'countdown', 'kpi-strip'"),
    }
  },
  async ({ slug }) => {
    const c = COMPONENTS.find((x: any) => x.slug === slug);
    if (!c) {
      return { content: [{ type: "text", text: `Widget "${slug}" not found.` }], isError: true };
    }
    if (c.kind !== 'widget') {
      return { content: [{ type: "text", text: `"${slug}" is a native recipe, not a widget. Native recipes don't have widget params. Use get_component to see its databases and manual steps.` }], isError: true };
    }
    
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: `${c.name} configuration`,
      description: c.tagline,
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        c.params.map((p: any) => [
          p.key,
          {
            type: p.type === "number" ? "number" : p.type === "boolean" ? "boolean" : "string",
            description: p.help || p.label,
            default: p.default,
            ...(p.min !== undefined ? { minimum: p.min } : {}),
            ...(p.max !== undefined ? { maximum: p.max } : {}),
            ...(p.options ? { enum: p.options.map((o: any) => o.value), enumLabels: p.options } : {}),
          }
        ])
      ),
      required: [],
      examples: [
        buildConfig(c, {}),
      ]
    };
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          slug,
          name: c.name,
          schema,
          defaults: buildConfig(c, {}),
          embedExample: embedUrl(slug, buildConfig(c, {})),
        }, null, 2)
      }]
    };
  }
);

// --- Tool: build_embed_url ---
server.registerTool(
  "build_embed_url",
  {
    title: "Build embed & download URLs",
    description: "Build configured embed URL and download URL for a widget. Config is validated against the widget's declared params. Unknown keys are dropped.",
    inputSchema: {
      slug: z.string().describe("Widget slug"),
      config: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().default({}).describe("Configuration object, e.g. { work: 25, accent: '#e03e3e', theme: 'dark' }"),
    }
  },
  async ({ slug, config = {} }) => {
    const c = COMPONENTS.find((x: any) => x.slug === slug);
    if (!c) {
      return { content: [{ type: "text", text: `Widget "${slug}" not found.` }], isError: true };
    }
    if (c.kind !== 'widget') {
      return { content: [{ type: "text", text: `"${slug}" is a native recipe. Use plan_install for recipes.` }], isError: true };
    }
    
    const built = buildConfig(c, config);
    const diff: Record<string, any> = {};
    c.params.forEach((p: any) => {
      if (String(built[p.key]) !== String(p.default)) diff[p.key] = built[p.key];
    });
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          slug,
          name: c.name,
          config: built,
          changed: diff,
          urls: {
            embed: embedUrl(slug, built),
            embedMinimal: embedUrl(slug, diff),
            download: downloadUrl(slug, built),
            downloadMinimal: downloadUrl(slug, diff),
            page: absoluteUrl(`/components/${slug}`),
          },
          notionSteps: {
            embedBlock: `1. In Notion, type /embed and paste: ${embedUrl(slug, built)}`,
            htmlBlock: `1. Download: ${downloadUrl(slug, built)}\n2. Upload via Notion API: POST /v1/file_uploads then PATCH /v1/blocks/{page_id}/children with embed.file_upload`,
          }
        }, null, 2)
      }]
    };
  }
);

// --- Tool: plan_install ---
server.registerTool(
  "plan_install",
  {
    title: "Plan install (dry-run)",
    description: "Dry-run install plan for any component. For widgets: returns embed URL, download URL, and exact Notion API calls. For native recipes: returns full sequence of Notion API requests (databases, views, seed rows, pages) without needing credentials. Mode 'plan' requires no token.",
    inputSchema: {
      slug: z.string().describe("Component slug"),
      mode: z.enum(["plan", "embed", "html-block", "api"]).optional().default("plan").describe("plan = dry-run (no token), embed = append embed block, html-block = upload HTML, api = install recipe"),
      config: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Widget config"),
      parentPageId: z.string().optional().describe("Notion page ID where to install (placeholder used if omitted)"),
    }
  },
  async ({ slug, mode = "plan", config = {}, parentPageId = "{parent_page_id}" }) => {
    const c = COMPONENTS.find((x: any) => x.slug === slug);
    if (!c) {
      return { content: [{ type: "text", text: `Component "${slug}" not found.` }], isError: true };
    }
    
    if (c.kind === 'widget') {
      const built = buildConfig(c, config || {});
      const embed = embedUrl(slug, built);
      const dl = downloadUrl(slug, built);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            mode,
            component: slug,
            kind: "widget",
            config: built,
            embedUrl: embed,
            downloadUrl: dl,
            htmlBlockSteps: [
              `POST /v1/file_uploads  { mode: 'single_part', filename: '${slug}.html', content_type: 'text/html' }`,
              `POST <upload_url>     multipart/form-data, file=<configured .html>`,
              `PATCH /v1/blocks/${parentPageId}/children  { children: [{ type: 'embed', embed: { type: 'file_upload', file_upload: { id: '<file_upload_id>' } } }] }`,
            ],
            embedSteps: [
              `PATCH /v1/blocks/${parentPageId}/children  { children: [{ type: 'embed', embed: { url: '${embed}' } }] }`,
            ],
            api: {
              endpoint: absoluteUrl('/api/install'),
              method: 'POST',
              body: {
                component: slug,
                mode,
                parentPageId,
                config: built,
                token: mode === 'plan' ? undefined : 'ntn_•••• (required for non-plan modes)'
              }
            },
            note: mode === 'plan' ? 'This is a dry-run. No credentials needed. The embedUrl and downloadUrl are ready to use.' : `Mode ${mode} requires a Notion token. The plan above shows what will happen.`
          }, null, 2)
        }]
      };
    } else {
      // native recipe
      const recipe = RECIPES[c.recipe];
      if (!recipe) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: true,
              mode: "plan",
              component: slug,
              kind: "native",
              recipe: c.recipe,
              note: "Recipe detail not in lite catalog. Fetch from /r/{slug}.json or use get_component for full plan via API.",
              planEndpoint: absoluteUrl('/api/install'),
              planBody: { component: slug, mode: "plan", parentPageId },
              installBody: { component: slug, mode: "api", token: "ntn_••••", parentPageId },
              manualSteps: "See get_component for manual steps that API cannot automate (buttons, automations, etc.)"
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: true,
            mode,
            component: slug,
            kind: "native",
            recipe: c.recipe,
            summary: recipe.summary,
            creates: {
              databases: recipe.databases.map((d: any) => `${d.title} (${d.properties.length} props, ${d.seedCount} seed rows)`),
              views: `${recipe.viewsCount} views`,
              pages: `${recipe.pagesCount} pages`,
              manual: recipe.manual
            },
            plan: {
              endpoint: absoluteUrl('/api/install'),
              method: 'POST',
              body: { component: slug, mode: "plan", parentPageId },
              note: "POST to this endpoint (no token) to get exact request sequence with payloads"
            },
            install: mode === 'plan' ? null : {
              endpoint: absoluteUrl('/api/install'),
              method: 'POST',
              body: { component: slug, mode: "api", token: "ntn_••••", parentPageId }
            }
          }, null, 2)
        }]
      };
    }
  }
);

// --- Tool: get_registry_item ---
server.registerTool(
  "get_registry_item",
  {
    title: "Get registry item (shadcn format)",
    description: "Get shadcn-compatible registry JSON for a component. This is what GET /r/{name}.json returns, with file contents inlined. Use for CLI installs or to inspect the exact HTML/JSON that gets installed.",
    inputSchema: {
      slug: z.string().describe("Component slug"),
      baseUrl: z.string().optional().describe("Override registry base URL, default from env NOTION_ARENA_REGISTRY_URL"),
    }
  },
  async ({ slug, baseUrl }) => {
    const c = COMPONENTS.find((x: any) => x.slug === slug);
    if (!c) {
      return { content: [{ type: "text", text: `Component "${slug}" not found.` }], isError: true };
    }
    
    const base = (baseUrl || REGISTRY_BASE).replace(/\/$/, "");
    const isWidget = c.kind === 'widget';
    
    const item = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: c.slug,
      type: c.kind === 'widget' ? 'registry:component' : 'registry:block',
      title: c.name,
      description: c.tagline,
      author: "Notion Arena",
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
        ...(isWidget ? {
          embedUrl: absoluteUrl(`/embed/${c.slug}`),
          fileUrl: absoluteUrl(c.file),
          downloadUrl: absoluteUrl(`/api/widget/${c.slug}`),
          height: c.height,
          params: c.params,
        } : {
          recipe: c.recipe,
          installUrl: absoluteUrl('/api/install'),
        })
      },
      files: isWidget ? [{
        path: `widgets/${c.slug}.html`,
        type: "registry:file",
        target: `notion/widgets/${c.slug}.html`,
        content: `// Fetch from ${base}/${c.slug}.json or ${absoluteUrl(`/api/widget/${c.slug}`)} for full HTML`
      }] : [
        {
          path: `recipes/${c.slug}.json`,
          type: "registry:file",
          target: `notion/recipes/${c.slug}.json`,
        },
        {
          path: `recipes/${c.slug}.manual.md`,
          type: "registry:file",
          target: `notion/recipes/${c.slug}.manual.md`,
        }
      ],
      registryUrl: `${base}/${c.slug}.json`,
      docsUrl: absoluteUrl(`/components/${c.slug}`),
      note: `For full file contents with inlined HTML, fetch ${base}/${c.slug}.json directly. This MCP response is a summary; the live registry has the complete file.`
    };
    
    return {
      content: [{ type: "text", text: JSON.stringify(item, null, 2) }]
    };
  }
);

// --- Tool: get_install_guide ---
server.registerTool(
  "get_install_guide",
  {
    title: "Get install guide",
    description: "Human-readable install guide for a component: explains delivery channels, Notion plan requirements, offline safety, and step-by-step instructions.",
    inputSchema: {
      slug: z.string().describe("Component slug"),
    }
  },
  async ({ slug }) => {
    const c = COMPONENTS.find((x: any) => x.slug === slug);
    if (!c) {
      return { content: [{ type: "text", text: `Component "${slug}" not found.` }], isError: true };
    }
    
    const guide = c.kind === 'widget' ? `
# ${c.emoji} ${c.name} — Install Guide

**${c.tagline}**

Category: ${c.category} | Tier: ${c.tier} | Plan: ${c.plan} | Version: ${c.version}

## What it is
${c.description}

Features:
${c.features.map((f: string) => `- ${f}`).join('\n')}

Use cases:
${c.useCases.map((u: string) => `- ${u}`).join('\n')}

## Delivery channels
- **Embed URL**: Paste \`${absoluteUrl(`/embed/${c.slug}`)}\` into Notion's /embed block. Requires network at render. Gets automatic updates.
- **HTML block**: Download \`${absoluteUrl(`/api/widget/${c.slug}`)}\` and upload via File Upload API as \`embed.file_upload\`. No network needed. Frozen version.
- **Download**: Same file as HTML block, but you host it.

Capabilities:
- Interactive: ${c.capabilities.interactive}
- Offline safe: ${c.capabilities.offlineSafe}
- Persists locally: ${c.capabilities.persistsLocally} (browser localStorage, not shared)
- Writes to Notion: ${c.capabilities.writesToNotion} (widgets never do)
- Needs network: ${c.capabilities.needsNetwork}

## Configuration
Params: ${c.params.map((p: any) => `${p.key} (${p.type}, default: ${p.default})`).join(', ')}

Example embed URL with config:
${embedUrl(slug, buildConfig(c, {}))}

With custom config { work: 25, accent: "#e03e3e", theme: "dark" }:
${embedUrl(slug, { work: 25, accent: "#e03e3e", theme: "dark" })}

## Steps

### Embed URL (fastest)
1. In Notion, type /embed
2. Paste: ${embedUrl(slug, {})}
3. Configure via query params: ?work=25&theme=dark

### HTML block (offline, no updates)
1. Download: ${downloadUrl(slug, {})}
2. POST https://api.notion.com/v1/file_uploads { mode: 'single_part', filename: '${slug}.html', content_type: 'text/html' }
3. POST <upload_url> multipart/form-data file=@${slug}.html
4. PATCH /v1/blocks/{page_id}/children { children: [{ type: 'embed', embed: { type: 'file_upload', file_upload: { id: '<file_upload_id>' } } }] }

### Via API (agent)
POST ${absoluteUrl('/api/install')} 
{ "component": "${slug}", "mode": "embed", "parentPageId": "...", "token": "ntn_...", "config": {} }

### Via registry (shadcn CLI)
components.json:
{ "registries": { "@notion-arena": "${REGISTRY_BASE}/{name}.json" } }
Then: npx shadcn add @notion-arena/${slug}

Registry JSON: ${REGISTRY_BASE}/${slug}.json
Docs: ${absoluteUrl(`/components/${slug}`)}
` : `
# ${c.emoji} ${c.name} — Install Guide (Native Recipe)

**${c.tagline}**

Category: ${c.category} | Tier: ${c.tier} | Plan: ${c.plan} | Version: ${c.version}

## What it is
${c.description}

Creates:
${c.creates?.map((cr: any) => `- ${cr.icon} ${cr.label}: ${cr.detail}`).join('\n') || '- See recipe detail'}

Features:
${c.features.map((f: string) => `- ${f}`).join('\n')}

## How native recipes work
Unlike widgets, recipes are real Notion databases, views, and pages created via the Notion API. They write to your workspace, are shared with your team, and respect permissions.

**Two-pass install** (required by Notion API):
1. Create databases with base properties
2. Read back data_source_ids
3. Patch in relations → rollups → formulas → views → seed rows → pages → blocks

**Honesty**: Recipes declare what they cannot automate (button blocks, automations, recurring templates, synced-block duplicates) as manual steps with reasons.

## Steps

### Plan first (no token, safe)
curl -X POST ${absoluteUrl('/api/install')} \\
  -H 'content-type: application/json' \\
  -d '{"component":"${slug}","mode":"plan"}'

Returns exact request sequence, totalRequests, manualSteps, warnings.

### Then install (needs token)
curl -X POST ${absoluteUrl('/api/install')} \\
  -H 'content-type: application/json' \\
  -d '{"component":"${slug}","mode":"api","token":"'"$NOTION_TOKEN"'","parentPageId":"'"$PAGE_ID"'"}'

Or via MCP tool plan_install with mode: api

Registry: ${REGISTRY_BASE}/${slug}.json
Docs: ${absoluteUrl(`/components/${slug}`)}
Install API: ${absoluteUrl('/api/install')}
`;
    
    return {
      content: [{ type: "text", text: guide.trim() }]
    };
  }
);

// --- Tool: get_categories ---
server.registerTool(
  "get_categories",
  {
    title: "List categories",
    description: "List all 8 Notion Arena categories with counts",
    inputSchema: {}
  },
  async () => {
    const cats = [
      { slug: "dashboards", name: "Dashboards & KPIs", emoji: "📊" },
      { slug: "time", name: "Time & Focus", emoji: "⏱️" },
      { slug: "trackers", name: "Trackers", emoji: "🔥" },
      { slug: "planning", name: "Planning & Projects", emoji: "🗂️" },
      { slug: "business", name: "Business & CRM", emoji: "💼" },
      { slug: "visuals", name: "Visuals & Diagrams", emoji: "🎨" },
      { slug: "docs", name: "Docs & Systems", emoji: "📚" },
      { slug: "automations", name: "Buttons & Automations", emoji: "⚡" },
    ];
    
    const withCounts = cats.map(cat => ({
      ...cat,
      count: COMPONENTS.filter((c: any) => c.category === cat.slug).length,
      widgets: COMPONENTS.filter((c: any) => c.category === cat.slug && c.kind === 'widget').length,
      recipes: COMPONENTS.filter((c: any) => c.category === cat.slug && c.kind === 'native').length,
    }));
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: COMPONENTS.length,
          widgets: COMPONENTS.filter((c: any) => c.kind === 'widget').length,
          recipes: COMPONENTS.filter((c: any) => c.kind === 'native').length,
          categories: withCounts
        }, null, 2)
      }]
    };
  }
);

// --- Tool: get_site_info ---
server.registerTool(
  "get_site_info",
  {
    title: "Get Notion Arena site info",
    description: "Get Notion Arena site info: registry endpoints, delivery channels, API limits, honesty policy",
    inputSchema: {}
  },
  async () => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          name: "Notion Arena",
          tagline: "The component registry for Notion",
          description: "155 components: 144 embeddable widgets that run inside a Notion page, and 11 native database recipes that install through the Notion API. 144 free, 11 Pro.",
          stats: {
            total: COMPONENTS.length,
            widgets: COMPONENTS.filter((c: any) => c.kind === 'widget').length,
            recipes: COMPONENTS.filter((c: any) => c.kind === 'native').length,
            free: COMPONENTS.filter((c: any) => c.tier === 'free').length,
            pro: COMPONENTS.filter((c: any) => c.tier === 'pro').length,
          },
          registry: {
            index: `${REGISTRY_BASE}/index.json`,
            item: `${REGISTRY_BASE}/{name}.json`,
            schema: `${REGISTRY_BASE}/schema.json`,
            componentsJson: `{ "registries": { "@notion-arena": "${REGISTRY_BASE}/{name}.json" } }`,
          },
          endpoints: {
            embed: `${SITE_URL}/embed/{slug}?config`,
            download: `${SITE_URL}/api/widget/{slug}?config`,
            install: `${SITE_URL}/api/install`,
            widgetFile: `${SITE_URL}/widgets/{slug}.html`,
          },
          delivery: {
            embed: "Paste URL into Notion /embed block. Needs network. Auto-updates.",
            htmlBlock: "Upload HTML file via File Upload API as embed.file_upload. Offline. Frozen.",
            api: "POST /api/install mode:api installs native recipe (databases, views, seed rows)"
          },
          limits: {
            widgets: "Cannot read/write Notion data. Sandbox has no network. State is localStorage only (notion-arena.<slug>.v1), not shared. If workflow needs workspace records, use native recipe.",
            recipes: "Two-pass install required for relations (data_source_id doesn't exist until DB created). Four real API gaps appear as manual[] steps: no button block type, no automation endpoint, no recurring-template endpoint, no synced-block duplicates."
          },
          docs: {
            howItWorks: absoluteUrl('/how-it-works'),
            registry: absoluteUrl('/registry'),
            apiLimits: absoluteUrl('/docs/api-limits'),
            authoring: absoluteUrl('/docs/authoring'),
            recipes: absoluteUrl('/docs/recipes'),
          },
          siteUrl: SITE_URL,
          registryBase: REGISTRY_BASE,
        }, null, 2)
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[notion-arena-mcp] Server started. ${COMPONENTS.length} components loaded. Site: ${SITE_URL} Registry: ${REGISTRY_BASE}`);
}

main().catch((err) => {
  console.error("[notion-arena-mcp] Fatal:", err);
  process.exit(1);
});

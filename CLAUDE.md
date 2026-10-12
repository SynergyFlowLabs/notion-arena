# CLAUDE.md — Notion Arena

This file helps Claude Code (and other AI agents) work effectively in this repo.

## What this is

Notion Arena — the component registry for Notion. 203 components: 192 embeddable widgets (single-file HTML, zero deps, offline-safe) + 11 native database recipes (real Notion databases via API).

- **Source of truth**: `lib/catalog.ts` — all 203 components
- **Products**: `public/widgets/*.html` — 192 self-contained HTML files
- **Registry**: `app/r/[name]/route.ts` — shadcn-compatible, `GET /r/index.json`, `GET /r/{name}.json`, `GET /r/schema.json`
- **Install API**: `app/api/install/route.ts` — `plan` (dry-run, no token) | `embed` | `html-block` | `api`
- **Widget logic**: `lib/widget.ts` (server), `lib/widget-url.ts` (browser-safe)
- **Recipes**: `lib/recipes/` + `lib/notion/installer.ts` + `lib/notion/schema.ts`

## For AI agents — MCP + Skill

This repo ships both an MCP server and an agent skill so users who work from AI agents can plug and play.

### MCP server

- **Location**: `mcp/` — npm package `notion-arena-mcp`
- **Build**: `npm run build:mcp` (generates catalog from `lib/catalog.ts` → `mcp/src/data/catalog.json`, then tsc)
- **Tools**: `list_components`, `search_components`, `get_component`, `get_widget_schema`, `build_embed_url`, `plan_install`, `get_registry_item`, `get_install_guide`, `get_categories`, `get_site_info`
- **Config**: `.mcp.json` at repo root for local dev (uses `node mcp/dist/index.js` with `NOTION_ARENA_SITE_URL=http://localhost:3000`)
- **Env**: `NOTION_ARENA_SITE_URL` (default `https://notionarena.vercel.app`), `NOTION_ARENA_REGISTRY_URL` (default `{SITE_URL}/r`)

Test MCP:
```bash
node scripts/generate-mcp-catalog.mjs
cd mcp && npm install && npm run build
# then in another terminal, run inspector or use claude mcp list
```

### Skill

- **Distributable**: `skills/notion-arena/SKILL.md` — discovered by `skills.sh` (`npx skills add`)
- **Project skill**: `.claude/skills/notion-arena/SKILL.md` — committed via .gitignore exception, travels with repo, loaded by Claude Code
- **Plugin**: `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` — Claude Code plugin marketplace, bundles skill + MCP
- **Full guide**: `docs/AGENT_SETUP.md`

When user asks for Notion widget/component, use Notion Arena skill workflow:
1. Discover via `search_components` / `list_components` or `GET /r/index.json`
2. Detail via `get_component` or `GET /r/{slug}.json`
3. Configure via `get_widget_schema` + `build_embed_url`
4. Plan install via `plan_install` mode `plan` (no token)
5. Install via `plan_install` mode `embed`/`html-block`/`api` with token if user provides

### Skills already installed (dev)

`skills-lock.json` lists 13 design/dev skills restored into `.agents/skills/` via `npx skills experimental_install -y`:
- `frontend-design`, `web-design-guidelines`, `canvas-design`, `algorithmic-art`, `brand-guidelines`, `theme-factory`, `webapp-testing`, `writing-guidelines`, etc.

These are for building the site itself, not for Notion Arena users.

## Key constraints

- **Widget contract**: zero external requests, two config sources (`bk-config` script tag + URLSearchParams), theme+accent on every widget, namespaced state `notion-arena.<slug>.v1`, `overflow: hidden` + `.wrap` scroll, `prefers-reduced-motion`, clipboard also `console.log`
- **A widget file itself still cannot read or write Notion** (no network in the sandbox), **but a bound instance can**: the data plane is injected at render time by the server, never by the widget. A component becomes data-bound through `lib/sync` and `lib/bridge`, and the widget source stays sandbox-pure. See `docs/SYNC_PLAN.md`.
- **Relations force two-pass install** — create DBs without relations → read back data_source_ids → patch relations → rollups → formulas → views → seed rows → pages → blocks in chunks of 100
- **Honesty policy**: no fabricated counts, badges qualitative, capability flags booleans, manual steps cite real API gaps only (button, automation, recurring-template, synced-block duplicates)

## Commands

```bash
npm install
npx skills experimental_install -y
npm run dev                 # http://localhost:3000
npx tsc --noEmit
npm run check:widgets
npm run check:sync          # data plane: protocol + injected runtime (needs npm run dev)
npm run generate:mcp-catalog
npm run build:mcp
npm run dev:mcp
```

## Docs

- `docs/RESEARCH.md` — research with sources
- `docs/DATA_SYNC_RESEARCH.md` — two-way sync research, with platform citations
- `docs/SYNC_PLAN.md` — the plan for the data plane, and what ships today
- `docs/DESIGN.md` — design system
- `docs/AGENT_SETUP.md` — MCP + skill setup for users
- `app/docs/authoring/page.tsx` — widget authoring guide
- `app/docs/api-limits/page.tsx` — Notion API limits
- `skills/notion-arena/SKILL.md` — agent skill (what users install)

---
name: notion-arena
description: Use Notion Arena — the component registry for Notion — to browse, configure, and install 143 Notion components (132 widgets + 11 native database recipes). Use when the user wants a Notion widget, embed, HTML block, dashboard component, timer, tracker, kanban, CRM, or to install anything into Notion via API.
---

# Notion Arena — The Component Registry for Notion

You are working with **Notion Arena**, a shadcn-style registry for Notion. It has 143 components: 132 embeddable widgets (single-file HTML, zero dependencies, offline-safe) and 11 native database recipes (real Notion databases installed via API).

**Honesty policy**: No fabricated install counts. Widgets cannot read/write Notion data — Notion's HTML block sandbox has no network. If workflow needs workspace records, collaboration, permissions, use a native recipe.

## When to use this skill

- User asks for a Notion widget, embed, dashboard component, timer, calendar, tracker, kanban, CRM, budget, habit grid, etc.
- User wants to install something into Notion
- User says "add to Notion", "Notion component", "Notion block"
- User is building a Notion template, dashboard, or system
- You see `notion-arena`, `notion-components`, or registry URLs like `/r/{name}.json`

## Quick reference

**Site**: `https://notionarena.vercel.app` (override with `NOTION_ARENA_SITE_URL` env or local `http://localhost:3000`)

**Registry** (shadcn-compatible):
```
GET /r/index.json          — whole catalog
GET /r/{name}.json         — one item with file contents inlined
GET /r/schema.json         — JSON Schema for all widget params
```

`components.json`:
```json
{ "registries": { "@notion-arena": "https://notionarena.vercel.app/r/{name}.json" } }
```

**Three delivery channels**:

| Channel | What it is | Install | Network at render | Reads Notion data | State shared | Gets updates |
|---------|------------|---------|-------------------|-------------------|--------------|--------------|
| Embed URL | We host widget, Notion iframes it | `/embed` → paste | Required | No | No | Automatically |
| HTML block | You upload file to Notion storage | `/html` → upload or 3 API calls | None | No | No | No, frozen |
| Native recipe | We call Notion API | `POST /api/install` | None | It *is* the data | Yes | n/a |

One HTML file serves both widget channels, so they cannot drift. Config comes from query string on hosted path and from baked-in `<script id="bk-config">` on downloaded path.

## Categories (8)

- `dashboards` 📊 — Clocks, progress indicators, glanceable status
- `time` ⏱️ — Calendars, countdowns, clocks, stopwatches, focus timers
- `trackers` 🔥 — Habits, streaks, mood, counters with heatmaps
- `planning` 🗂️ — Kanban, Gantt, prioritisation matrices, roadmaps
- `business` 💼 — Pipelines, budgets, inventory, intake workflows
- `visuals` 🎨 — Org charts, whiteboards, quote cards
- `docs` 📚 — Knowledge systems, study aids, meeting notes, PARA
- `automations` ⚡ — Database automations, recurring templates, button chains

## Workflow

### 1. Discover

If you have the Notion Arena MCP server (`notion-arena-mcp`), use its tools:
- `list_components` — browse with filters
- `search_components` — keyword search: "pomodoro", "CRM", "budget"
- `get_categories` — list categories with counts
- `get_site_info` — site info, endpoints, limits

Without MCP, fetch the registry:
```bash
curl https://notionarena.vercel.app/r/index.json | jq '.items[] | {name, title, categories}'
curl https://notionarena.vercel.app/r/pomodoro-timer.json | jq
```

Or read local catalog if in this repo: `lib/catalog.ts` is source of truth, `public/widgets/*.html` are the products.

### 2. Get detail

MCP: `get_component` with slug, e.g. `pomodoro-timer`, `crm-pipeline`, `habit-grid`

Or:
```bash
curl https://notionarena.vercel.app/r/pomodoro-timer.json
```

Detail includes:
- `params` — configurable keys (every widget has `theme=auto|light|dark` and `accent` color)
- `capabilities` — `interactive`, `offlineSafe`, `persistsLocally`, `writesToNotion`, `needsNetwork`
- `delivery` — which channels supported
- `features`, `useCases`

### 3. Configure (widgets only)

MCP: `get_widget_schema` to get JSON Schema, then `build_embed_url` with config.

Manual:
- Coerce values to declared type: `number`, `boolean`, `text`, `select`, `color`, `date`
- Unknown keys are dropped by `buildConfig()` — security
- Only changed values need to be in URL; defaults omitted

Example:
```
https://notionarena.vercel.app/embed/pomodoro-timer?work=25&short=5&long=15&rounds=4&label=Deep%20work&accent=%23e03e3e&theme=auto
```

For HTML block, config is baked into file as:
```html
<script id="bk-config" type="application/json">{"work":25,"accent":"#e03e3e"}</script>
```

Widget contract (every widget in `public/widgets/`):
1. Zero external requests — no CDN, no webfont, no fetch, no @import
2. Two config sources: baked-in `bk-config` script tag, then `URLSearchParams` on top
3. `theme` and `accent` on every widget — `theme` sets `data-theme` on `<html>`, `accent` writes `--accent` with derived shades via `color-mix(in oklab, ...)`
4. Namespaced state only when persisted: `notion-arena.<slug>.v1`, wrapped in try/catch, per-browser not synced
5. `body { overflow: hidden }` with `.wrap` managing scroll (one scrollbar), `prefers-reduced-motion` escape hatch, clipboard exports also `console.log`

### 4. Install

#### Widget — Embed URL (fastest, auto-updates)

MCP: `build_embed_url` or `plan_install` with mode `embed`

Manual:
1. In Notion, type `/embed`
2. Paste: `https://notionarena.vercel.app/embed/pomodoro-timer?work=25&accent=%23e03e3e`
3. Resize block as needed

API (agent):
```bash
POST /api/install
{
  "component": "pomodoro-timer",
  "mode": "embed",
  "parentPageId": "abc123...",
  "token": "ntn_...",
  "config": { "work": 25, "accent": "#e03e3e" }
}
```

#### Widget — HTML block (offline, frozen)

MCP: `build_embed_url` gives download URL, `plan_install` mode `html-block` gives steps

Manual:
1. Download: `https://notionarena.vercel.app/api/widget/pomodoro-timer?work=25&accent=%23e03e3e`
2. Upload via Notion API:
```
POST https://api.notion.com/v1/file_uploads
{ "mode": "single_part", "filename": "pomodoro-timer.html", "content_type": "text/html" }
→ { "id": "<file_upload_id>", "upload_url": "..." }

POST <upload_url> multipart/form-data file=@pomodoro-timer.html
→ { "status": "uploaded" }

PATCH https://api.notion.com/v1/blocks/{page_id}/children
{ "children": [{ "type": "embed", "embed": { "type": "file_upload", "file_upload": { "id": "<file_upload_id>" }, "caption": [] } }] }
```
3. Or in Notion UI: `/html` → upload file (if available on your plan)

#### Native recipe — API (real databases)

MCP: `plan_install` mode `plan` (dry-run, no token), then `plan_install` mode `api` with token

**Always plan first — no credentials needed**:
```bash
curl -X POST https://notionarena.vercel.app/api/install \
  -H 'content-type: application/json' \
  -d '{"component":"crm-pipeline","mode":"plan"}'
```

Returns: exact request sequence, `totalRequests`, `manualSteps`, `warnings`, payload shapes.

**Then install**:
```bash
curl -X POST https://notionarena.vercel.app/api/install \
  -H 'content-type: application/json' \
  -d '{"component":"crm-pipeline","mode":"api","token":"'"$NOTION_TOKEN"'","parentPageId":"'"$PAGE_ID"'"}'
```

Why two-pass install: Notion split databases from data sources — `relation` property targets a `data_source_id` that doesn't exist until target database created and read back. So `planInstall()` emits: create databases with base properties → read back each data source id → patch in relations → patch in rollups → patch in formulas → views → seed rows → pages → block bodies in chunks of 100.

Recipes declare what they **cannot** do as `manual[]` steps, each citing real API limitation:
- No `button` block type
- No automation endpoint
- No recurring-template endpoint
- No synced-block duplicates

A manual step whose reason is "it's easier by hand" is rejected.

#### Registry — shadcn CLI

```bash
# components.json already has @notion-arena registry
npx shadcn add @notion-arena/pomodoro-timer
# or
npx shadcn add @notion-arena/crm-pipeline
```

This writes files to `notion/widgets/{slug}.html` or `notion/recipes/{slug}.json` per `lib/registry.ts`.

## For agents building on Notion Arena

**A widget cannot read or write your Notion data.** Sandbox has no network and no bridge to parent page. Widgets may keep user-entered personal state in this browser, but that state is not Notion data and not shared. If workflow needs workspace records, collaboration, permissions, audit trail, use native database or recipe.

**Capabilities flags** in catalog are booleans: `interactive`, `offlineSafe`, `persistsLocally`, `writesToNotion`, `needsNetwork` — filter on them instead of reading prose.

**Versioning**: Items carry semver in `meta.version`. Widget source files frozen per version at `/widgets/{slug}.html`; embed URLs serve latest patch. Slugs never change once published; retired slugs keep resolving with `meta.deprecated` flag rather than 404.

**Self-hosting**: Widgets are single files with no dependencies. Fork repo, serve `public/widgets/` from anywhere, point registry base at own host. Nothing phones home.

## Authoring new widgets

See `/docs/authoring` page in repo and `lib/widget.ts` for contract. Every widget:

- Single self-contained HTML file in `public/widgets/`
- No external requests
- Reads config from `<script id="bk-config">` then `URLSearchParams`
- Has `theme` and `accent` params
- Namespaces localStorage as `notion-arena.<slug>.v1`
- `body { overflow: hidden }`, `.wrap` manages scroll
- `prefers-reduced-motion` support
- Clipboard exports also `console.log` as fallback

Add entry to `lib/catalog.ts` with slug, name, emoji, tagline, description, category, kind=widget, tier, tags, color, plan, version, updatedAt, file, height, params, delivery, features, useCases, capabilities.

Run checks:
```bash
npm run check:widgets  # offline HTML widget contract checks
npx tsc --noEmit       # type-check
```

## MCP server

If user works from AI agents most of time, they should plug the MCP server:

**Claude Code**:
```bash
claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp
# self-hosted:
claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp -e NOTION_ARENA_SITE_URL=https://your-host.com
```

**Claude Desktop** `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "notion-arena": {
      "command": "npx",
      "args": ["-y", "notion-arena-mcp"],
      "env": { "NOTION_ARENA_SITE_URL": "https://notionarena.vercel.app" }
    }
  }
}
```

**Cursor** `.cursor/mcp.json` — same.

MCP tools: `list_components`, `search_components`, `get_component`, `get_widget_schema`, `build_embed_url`, `plan_install`, `get_registry_item`, `get_install_guide`, `get_categories`, `get_site_info`

Env: `NOTION_ARENA_SITE_URL` (default `https://notionarena.vercel.app`), `NOTION_ARENA_REGISTRY_URL` (default `{SITE_URL}/r`)

## Skill installation (this skill)

**Via skills CLI (Vercel skills.sh)** — recommended:
```bash
npx skills add SynergyFlowLabs/notion-components --skill notion-arena
# or all skills from repo
npx skills add SynergyFlowLabs/notion-components --all
```

**Via Claude Code plugin marketplace** (if published as plugin):
```bash
/plugin marketplace add SynergyFlowLabs/notion-components
```

**Manual** — copy this folder to:
- Project: `.claude/skills/notion-arena/` (travels with repo)
- Personal: `~/.claude/skills/notion-arena/` (all your projects)

**For Cursor / Windsurf / other agents**:
- Cursor: `.cursor/skills/notion-arena/` or copy SKILL.md content into your rules
- Windsurf: similar, or use `npx skills add` with `--agent cursor --agent windsurf`

## Examples

### User: "I need a pomodoro timer for my Notion dashboard"

1. `search_components` query "pomodoro" → finds `pomodoro-timer`
2. `get_component` slug `pomodoro-timer` → shows params: work, short, long, rounds, label, accent, theme
3. `build_embed_url` slug `pomodoro-timer` config `{ work: 25, label: "Deep work", accent: "#e03e3e", theme: "auto" }` → returns embed URL
4. Tell user: paste embed URL into Notion /embed block, or download HTML for offline

### User: "Add a CRM pipeline to my Notion"

1. `search_components` query "CRM" → finds `crm-pipeline` (native recipe)
2. `get_component` slug `crm-pipeline` → shows it creates databases, views, seed rows, manual steps
3. `plan_install` slug `crm-pipeline` mode `plan` → dry-run, no token, shows exact API calls
4. Ask user for parent page ID and token, then `plan_install` mode `api` or POST to `/api/install`
5. Explain manual steps if any

### User: "Find me a habit tracker that works offline"

1. `list_components` category `trackers`, delivery `html-block`
2. Filter where `capabilities.offlineSafe=true` and `persistsLocally=true`
3. `get_component` for `habit-grid` etc.
4. Provide download URL: `https://notionarena.vercel.app/api/widget/habit-grid`

## References

- Docs: `/docs/RESEARCH.md` — full research with sources
- Design: `/docs/DESIGN.md`
- Authoring: `app/docs/authoring/page.tsx`
- API limits: `app/docs/api-limits/page.tsx`
- Registry: `app/r/[name]/route.ts`, `lib/registry.ts`
- Widget contract: `lib/widget.ts`, `lib/widget-url.ts`
- Installer: `lib/notion/installer.ts`, `lib/recipes/`
- Site: `app/page.tsx`, `components/catalog-browser.tsx`

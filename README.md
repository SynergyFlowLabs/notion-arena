# Blocksmith

**The component registry for Notion.** shadcn/ui's model: browse, configure,
copy, own, install from code, applied to Notion dashboards.

119 components: **108 embeddable widgets** that run inside a Notion page, and
**11 native database recipes** that install through the Notion API. 108 components are free; 11 are Pro.

> Notion is a trademark of Notion Labs Inc. This is an independent project and is
> not affiliated with or endorsed by Notion.

---

## Why this exists

Notion's block system is built for documents, not interfaces. The public block
reference has no timer, no progress ring, no countdown, no sparkline, no heatmap,
and no draggable card that is not a database row.

The ecosystem's answers are hosted embed galleries, one-off paid block bundles, or
app builders that live outside Notion. None publish a machine-readable manifest.

Blocksmith publishes one.

See **[`docs/RESEARCH.md`](docs/RESEARCH.md)** for the full research that drove
every design decision here, with sources.

---

## Three delivery channels

| | Embed URL | HTML block | Native recipe |
|---|---|---|---|
| What it is | We host the widget, Notion iframes it | You upload the file to Notion's storage | We call the Notion API |
| Install | `/embed` → paste | `/html` → upload, or 3 API calls | `POST /api/install` |
| Network at render | Required | None | None |
| Reads your Notion data | No | No | It *is* the data |
| State shared with team | No | No | Yes |
| Gets our updates | Automatically | No. Frozen | n/a |
| Min. plan | Free | Free | Free |

One HTML file serves both widget channels, so they cannot drift. Configuration
comes from the query string on the hosted path and from a baked-in
`<script id="bk-config">` on the downloaded path, because a sandboxed block has
no URL.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Node 22+. Next.js 16 (Turbopack), React 19, Tailwind v4, TypeScript.

```bash
npx tsc --noEmit     # type-check
npm run check:widgets # offline HTML widget contract checks
npm run build        # production build
```

Set `NEXT_PUBLIC_SITE_URL` in production so registry manifests emit absolute URLs
for the right host. Without it, URLs are derived from the request's forwarded
host, falling back to `http://localhost:3000`.

---

## Layout

```
public/widgets/*.html      the products: 108 self-contained HTML files
lib/catalog.ts             source of truth for all 119 components
lib/types.ts               component/param types + the 8 categories
lib/widget.ts              config coercion, injection, HTML rendering  (server)
lib/widget-url.ts          URL builders                                (browser-safe)
lib/notion/schema.ts       Notion API payload builders
lib/notion/installer.ts    executes plans against @notionhq/client
lib/recipes/               11 recipe declarations + planInstall()
lib/registry.ts            shadcn-compatible manifest generation
components/                site UI, catalog browser, configurator, docs prose
app/embed/[slug]/          framed, configured widget HTML
app/api/widget/[slug]/     the same HTML as a download
app/r/[name]/              registry: index.json, schema.json, {name}.json
app/api/install/           plan | embed | html-block | api
docs/RESEARCH.md           the research behind all of it
```

---

## The registry

shadcn `registry-item` schema, with source **inlined** rather than linked.

```
GET /r/index.json          the whole catalog
GET /r/{name}.json         one item, HTML or recipe JSON inline
GET /r/schema.json         JSON Schema of every widget's parameters
```

```jsonc
// mcp config / components.json
{ "registries": { "@blocksmith": "https://your-host/r/{name}.json" } }
```

```bash
# see exactly what an install will do: no credentials, touches nothing
curl -X POST localhost:3000/api/install \
  -H 'content-type: application/json' \
  -d '{"component":"crm-pipeline","mode":"plan"}'

# then run it
curl -X POST localhost:3000/api/install \
  -H 'content-type: application/json' \
  -d '{"component":"crm-pipeline","mode":"api",
       "token":"'"$NOTION_TOKEN"'","parentPageId":"'"$PAGE_ID"'"}'
```

`mode: "plan"` requiring no token is deliberate: review the request sequence
before authorising any write to your workspace.

---

## Two things worth knowing before you build on this

**A widget cannot read or write your Notion data.** Notion's HTML block sandbox
has no network access and no bridge to its parent page. Widgets may keep user-
entered personal state in this browser, but that state is not Notion data and is
not shared. If a workflow needs workspace records, collaboration, permissions,
or an audit trail, use a native database or recipe.

**Relations force a two-pass install.** Since Notion split databases from data
sources, a `relation` property targets a `data_source_id` that does not exist
until the target database has been created and read back. `planInstall()`
therefore emits: create databases with base properties → read back each data
source id → patch in relations → patch in rollups → patch in formulas → views →
seed rows → pages → block bodies in chunks of 100.

Recipes also declare what they **cannot** do. Four real API gaps (no `button`
block type, no automation endpoint, no recurring-template endpoint, no synced-block
duplicates) appear as `manual[]` steps, each citing the limitation. A manual step
whose reason is "it's easier by hand" is rejected.

---

## Widget contract

Every widget in `public/widgets/` implements the same four rules. See
[`/docs/authoring`](app/docs/authoring/page.tsx) for the full guide and checklist.

1. **Zero external requests.** No CDN, no webfont, no `fetch()`, no `@import`.
   The sandbox has no network, so a remote asset is a blank block.
2. **Two config sources**, read in order: the baked-in `bk-config` script tag,
   then `URLSearchParams` on top. Only declared parameters survive; unknown keys
   are dropped by `buildConfig()`.
3. **`theme` and `accent` on every widget.** `theme=auto|light|dark` sets
   `data-theme` on `<html>` and follows `prefers-color-scheme` when auto;
   `accent` writes `--accent`, with derived shades via `color-mix(in oklab, …)`.
4. **Namespaced state, only when persisted.** Widgets that save browser state use
   `blocksmith.<slug>.v1` and wrap storage access in try/catch. That state stays
   in one browser and never syncs, so shared trackers belong in native recipes.

Plus: `body { overflow: hidden }` with `.wrap` managing its own scroll (one
scrollbar, not two), a `prefers-reduced-motion` escape hatch, and clipboard
exports that always also `console.log` the payload as a fallback.

---

## Honesty policy

No fabricated install counts, star counts or customer logos. Badges are
qualitative (`new`, `popular`, `staff-pick`) and derived from the catalog. Market
numbers appear only where cited. Capability claims are booleans in the catalog (
`interactive`, `offlineSafe`, `persistsLocally`, `writesToNotion`,
`needsNetwork`) exposed in the registry so an agent can filter on them instead of
reading prose.

---

## License

Components you download are yours: modify them, host them, ship them in templates
you sell. Free components carry no attribution requirement. See
[`/legal/terms`](app/legal/terms/page.tsx).

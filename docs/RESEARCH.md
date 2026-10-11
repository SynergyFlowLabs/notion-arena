# Research behind Blocksmith

Everything in this document was gathered before the first line of product code was
written, and every consequential design decision in the repo traces back to a
finding here. Sources are listed with the specific takeaway each one produced.

Date of research: October 2026. Notion API version targeted: `2026-03-11`.

---

## 1. The problem, restated from the research

Notion's block system is optimised for documents, not interfaces. The public
[block object reference](https://developers.notion.com/reference/block) enumerates
every type Notion can create: paragraph, headings 1-4, list items, to_do, toggle,
quote, callout, divider, code, equation, embed, bookmark, column_list,
synced_block, table, breadcrumb, table_of_contents, child_page, child_database.

There is no timer. No progress ring. No countdown. No sparkline. No heatmap. No
draggable card that is not a database row. The gaps are not subtle: they are
categories.

Meanwhile the ecosystem's answer has been one of three things:

| Approach | Representative | Real cost |
|---|---|---|
| Hosted embed galleries | [widgetsfornotion.com](https://widgetsfornotion.com/) (65 free widgets), [mindfulsetups.com/widgets](https://mindfulsetups.com/widgets) (13) | Embed-only. No offline delivery, no API install, no data-driven components. |
| Paid block bundles | [nimblegot.com/blocks-for-notion](https://nimblegot.com/blocks-for-notion/) ($149 / $449 / $249) | One-off purchase, updated by hand, nothing scriptable. |
| App builders | NotionApps, Super, Tapti (via [templatesfornotion.com/notion-tools](https://templatesfornotion.com/notion-tools)) | A separate product outside Notion, priced as SaaS. |

None of them publish a machine-readable manifest. That is the gap Blocksmith
fills: **shadcn/ui's model (copy, own, configure, install from code) applied to
Notion.**

The shadcn analogy is not decorative. The
[registry-item schema](https://ui.shadcn.com/docs/registry/examples) and
[namespaced registry config](https://tailkits.com/blog/shadcn-registry/) are the
actual wire format `/r/index.json` and `/r/{name}.json` emit, which is why
existing tooling can address this catalog without modification.

---

## 2. The single most important finding: HTML blocks

Notion 3.6 shipped a native HTML block. The
[changelog](https://developers.notion.com/page/changelog) documents it, and
[Matthias Frank's capability matrix](https://matthiasfrank.de/en/notion-html-blocks/)
is the clearest third-party writeup of what it can do.

| Capability | Status | Consequence for us |
|---|---|---|
| View on any plan | ✅ | No Business/Enterprise gate. Free tier is genuinely free. |
| AI generates the HTML | ✅ Business+ | Not our path, but it means agents can author blocks too. |
| Interactive JS | ✅ | Timers, drag, canvas, WebAudio all viable. |
| Read Notion data | ❌ | **No widget can be data-driven.** This is the architectural fork. |
| Write to Notion | ❌ | A block can never tick a checkbox in the page it sits on. |
| External API calls | ❌ | No CDN, no webfonts, no analytics, no fetch. Everything inline. |
| Shared memory | ⚠️ local only | localStorage is per browser. Team-shared state must be a database. |
| Edit in place | ❌ | You replace the file, you don't patch it. |

Two conclusions follow, and they shaped the whole product:

1. **A widget must be a single self-contained HTML file with zero external
   requests.** Not a preference: the sandbox has no network.
2. **Anything that must read or write workspace data, collaborate, or preserve
   an audit trail needs a native database or recipe.** A personal widget may
   keep manually entered state in localStorage, but that state is private to
   this browser and is not a synchronized version of Notion data.

### The API path is not obvious

There is no `html` block type. The `embed` block does double duty: with a `url`
it iframes a remote page, with a `file_upload.id` it renders an uploaded HTML
file. Installation is three requests:
[create a file upload](https://developers.notion.com/reference/create-a-file-upload),
send the bytes to the returned `upload_url`, then
[append block children](https://developers.notion.com/reference/patch-block-children)
with an `embed` block referencing the id. Documented in
[uploading small files](https://developers.notion.com/docs/uploading-small-files).

This is implemented in `lib/notion/installer.ts` as `installHtmlBlock()`.

### Configuration cannot come from a URL

A sandboxed block has no `location.search`. So the same file needs two config
sources: a baked-in `<script id="bk-config" type="application/json">` for the
download path, and `URLSearchParams` for the `/embed` path. That contract is
implemented identically in all 96 widgets and documented in
`app/docs/authoring/page.tsx`.

---

## 3. The four API gaps that generate every manual step

Research into the block reference, the
[property object](https://developers.notion.com/reference/property-object), and
the Q1 2026 feature roundups
([olsnotion](https://olsnotion.com/blog/every-notion-update-from-q1-2026),
[fazm.ai](https://fazm.ai/blog/notion-automation-features-2026),
[notelinker](https://notelinker.com/blog/notion-automation)) established four
hard limits:

| Gap | Evidence | Where it surfaces |
|---|---|---|
| **No `button` block type** | The block type enum in the reference does not include it. The `button` *property* is explicitly response-only: the API returns the schema but ignores writes. | 6 recipes ship a manual button click-path. |
| **No automation endpoint** | Database automations are configured in the UI and are absent from the public schema entirely. | 9 recipes. |
| **No recurring-template endpoint** | Database templates can be created as page bodies, but the repeat schedule is a Business+ UI feature with no API. | 6 recipes. |
| **Synced-block duplicates** | The API creates a `synced_block` original with children; it cannot create the linked duplicate elsewhere in the workspace. | 1 recipe. |

The policy that follows is in `lib/recipes/types.ts` as four shared constants
(`BUTTON_LIMITATION`, `AUTOMATION_LIMITATION`, `RECURRING_LIMITATION`,
`SYNCED_BLOCK_LIMITATION`). Every `manual[]` entry in every recipe cites one of
them. **A manual step whose reason is "it's easier by hand" is rejected**: that
rule is written into `app/docs/recipes/page.tsx`.

---

## 4. The two-pass problem (data sources)

The most consequential technical finding, and the reason `planInstall()` exists.

Notion split **databases** from **data sources**. A
[relation property](https://developers.notion.com/reference/property-object) now
targets a `data_source_id`, not a `database_id`. Every database created via
[POST /v1/databases](https://developers.notion.com/reference/create-a-data-source)
arrives with exactly one default data source whose id you cannot predict.

So a recipe declaring `Deals.Company → companies` **cannot** be created in one
pass. The correct order:

```
pass 1 · POST  /v1/databases          base properties only: relations,
                                      rollups and dependent formulas stripped
pass 2 · GET   /v1/databases/{id}     read back data_sources[0].id
pass 3 · PATCH /v1/data_sources/{id}  relations, refs resolved to real ids
pass 4 · PATCH /v1/data_sources/{id}  rollups (they name a relation property)
pass 5 · PATCH /v1/data_sources/{id}  formulas reading either of the above
```

Recipes therefore address each other by `ref` (a local string) and the
installer marks those with an internal `__relationRef` field
(`lib/notion/schema.ts` → `relation()`), strips them from pass 1, and resolves
them in pass 3. This is what allows a recipe to declare a *bidirectional*
relation between two databases that do not yet exist.

Any tool showing a single `POST /v1/databases` per table with relations inline is
not telling the whole story.

Also from the property reference: `status` options accept a `group` field
(`To-do` / `In progress` / `Complete`) on create, but responses return groups
separately with `option_ids`, so a read-modify-write round trip is not
symmetrical. `unique_id` accepts a `prefix` but not a number.

---

## 5. The Views API is what makes provisioning viable

[Working with views](https://developers.notion.com/guides/data-apis/working-with-views)
documents `POST /v1/views` for table, board, list, calendar, timeline, gallery,
form, chart, map and dashboard, including board groups, timeline date
properties, chart axes, calendar ranges and form questions.

Before this, you could create a database but not shape how anyone looked at it.
A "workspace system" installed from code was therefore always half-finished.

**One limit remains:** dashboard view *layouts* are read-only. You can create the
dashboard view and each widget/chart view, but Notion composes the arrangement.
Recipes say so in their manual steps rather than implying full control. The Q1
2026 updates also added a per-view widget cap on dashboards.

Implemented in `lib/recipes/*` as `ViewSpec[]` and executed by
`lib/notion/installer.ts`.

---

## 6. Hard numbers that constrain the installer

From
[Append block children](https://developers.notion.com/reference/patch-block-children)
and the changelog:

- **100 children per request.** `installRecipe()` chunks every page body.
- **2 nesting levels per request.** Deeper trees are split across sequential
  appends against the block id the previous request returned.
- **~3 requests/second average.** A 26-request CRM install still runs in well under
  a minute; the installer deliberately does not parallelise writes to one parent.
- **500 KB per request payload.**
- **`position` replaced `after`** for child placement in `2026-03-11`.
- **`notifications.mode: "silent"`**: bulk installs should send it, or every
  appended block can notify page watchers.
- **`heading_4` and tab blocks** are new in this version.
- **`restricted_resource`** is what every write returns when the integration is
  not connected to the target page. `/api/install` detects it and responds 403
  with the "share the page with the integration" hint rather than a bare error.

---

## 7. Delivery model: MCP vs API

Compared
[scalekit on Notion MCP vs API](https://scalekit.com/blog/notion-mcp-vs-api) and
[stackone's MCP deep dive](https://stackone.com/blog/notion-mcp-deep-dive/):

| | MCP | REST API |
|---|---|---|
| Auth | OAuth, human present | Integration token, headless |
| Granularity | Page-level | Block-level |
| Best for | "Build me a CRM" in a chat | Deterministic, repeatable provisioning |

Blocksmith supports both. The registry manifest is what an MCP server or agent
reads; `POST /api/install` is what executes deterministically. **`mode: "plan"`
requires no credentials at all** and returns the full ordered request sequence:
so an agent can be shown exactly what will happen before anyone hands it a token.
That decision came directly from the MCP/API tradeoff: the trustworthy path is
"review the plan, then authorise the write".

---

## 8. Design language

- [notion-ui.vercel.app](https://notion-ui.vercel.app/) and
  [steeeee0223/notion-kit](https://github.com/steeeee0223/notion-kit): React
  Notion-style UI kits. Adjacent rather than competing, and the reference for
  spacing, type scale and colour values used in `app/globals.css`.
- [nicelydone.club](https://nicelydone.club/examples/apps/notion/components):
  screenshots of Notion's own primitives. The goal for widgets is that they read
  as native: `#37352f` foreground on `#ffffff`, `#e6e6e4` on `#191919`, the
  Notion select palette, and the system font stack rather than a webfont (which
  the sandbox could not load anyway).
- [createxyz components](https://createxyz.notion.site/Create-Components-):
  component *variations* plus a version-staleness / one-click-update model.
  Adopted as `meta.version` + `updatedAt` in the registry, and as the reason
  embed URLs serve latest while downloaded files are frozen.

---

## 9. Market context (used for honest social proof only)

From [content-site-lovat's Notion statistics](https://content-site-lovat.vercel.app/articles/notion-statistics-2026.html):
100M+ users, ~$600M revenue, ~4M paid seats, 50%+ of the Fortune 500.

From creator-economy reporting
([insightraider](https://insightraider.com/en/answers/how-much-can-you-make-selling-notion-templates-on-gumroad),
[biztoolkit](https://biztoolkit.co/post/how-much-do-notion-template-creators-make-in-2026),
[zanfia](https://zanfia.com/blog/selling-notion-templates-2026-)): revenue is
extremely top-heavy, most template sellers earn little, and the durable products
are systems rather than one-off pages.

**Consequence:** no fabricated install counts, star counts or customer logos
anywhere in this repo. Badges are qualitative (`new`, `popular`, `staff-pick`)
and derived from the catalog, not invented. The one place market numbers appear
is the landing page, cited. `app/changelog/page.tsx` states this explicitly.

**Pricing consequence:** freemium with $0 / $9 / $29 tiers, Pro free during beta,
and a hard commitment that downloaded files never stop working, because the
research shows the failure mode users actually fear is a purchased template
rotting.

---

## 10. Component taxonomy

Adopted from
[templatesfornotion.com/notion-elements](https://templatesfornotion.com/notion-elements),
which classifies the ecosystem as Component, Template, Database Template, Page,
Button, Feature, Formula, Database Automation.

Blocksmith collapses this to two kinds, because the research in §2 and §3 makes
only two delivery mechanisms real:

- **`widget`**: a self-contained HTML file. Channels: `embed`, `html-block`,
  `download`. Cannot touch Notion data.
- **`native`**: a recipe of API calls plus documented manual steps. Channels:
  `api`, `duplicate`, `guide`. Creates real databases.

Eight categories, 107 components: 96 widgets, 11 recipes, 96 free and 11 Pro.

---

## 11. Dead ends

Recorded so they are not retried:

- **Fetching a signed OSS proxy URL with an explicit `chunkIndex`** returns
  `SignatureDoesNotMatch`. Chunked re-fetches of proxy URLs do not work; use
  search for follow-up detail instead.
- **`landmarklabs.co/notion-templates`** returns only a CookieYes consent blob to
  a non-browser client. Not essential; not retried.
- **`app/r/index.json/route.ts`** was written and deleted. Next.js route files may
  only export HTTP methods and config; re-exporting `COMPONENTS` or builder
  functions from one is illegal. `index.json` is now special-cased inside
  `app/r/[name]/route.ts`.
- **Server-computed absolute iframe `src`.** Under a reverse proxy the server sees
  `localhost:3000`, so an absolute URL computed in a server component points the
  *browser* at localhost and the preview breaks. All iframe `src` and client
  `fetch` calls in this repo use relative paths; absolute URLs appear only in
  machine-readable output (registry JSON, copyable snippets), where the request's
  forwarded host is used.
- **Google Fonts is unreachable from the build sandbox**, so `app/globals.css`
  uses Notion's system font stack. This turned out to be correct anyway: an HTML
  block cannot load a webfont.
- **`X-Frame-Options: ALLOWALL`** is not a real value. Framing is permitted by
  *omitting* the header; `/embed/*` states it explicitly with
  `Content-Security-Policy: frame-ancestors *`.

---

## 12. Source list

**Notion platform**
- developers.notion.com/reference/block
- developers.notion.com/reference/property-object
- developers.notion.com/reference/patch-block-children
- developers.notion.com/reference/create-a-data-source
- developers.notion.com/reference/create-a-file-upload
- developers.notion.com/reference/file-upload
- developers.notion.com/docs/uploading-small-files
- developers.notion.com/guides/data-apis/working-with-views
- developers.notion.com/page/changelog

**Ecosystem & competitors**
- widgetsfornotion.com (+ /widgets, /blog/best-notion-widgets)
- mindfulsetups.com/widgets
- nimblegot.com/blocks-for-notion/
- templatesfornotion.com/notion-elements, /notion-tools
- notion-ui.vercel.app, github.com/steeeee0223/notion-kit
- nicelydone.club/examples/apps/notion/components
- createxyz.notion.site/Create-Components-

**HTML block behaviour**
- matthiasfrank.de/en/notion-html-blocks/

**Registry format**
- ui.shadcn.com/docs/registry/examples
- tailkits.com/blog/shadcn-registry/

**Agents & API strategy**
- scalekit.com/blog/notion-mcp-vs-api
- stackone.com/blog/notion-mcp-deep-dive/

**Automation & platform limits**
- fazm.ai/blog/notion-automation-features-2026
- notelinker.com/blog/notion-automation
- olsnotion.com/blog/every-notion-update-from-q1-2026

**Market & pricing**
- content-site-lovat.vercel.app/articles/notion-statistics-2026.html
- insightraider.com/en/answers/how-much-can-you-make-selling-notion-templates-on-gumroad
- biztoolkit.co/post/how-much-do-notion-template-creators-make-in-2026
- zanfia.com/blog/selling-notion-templates-2026-

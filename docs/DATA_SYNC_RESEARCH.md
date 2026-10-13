# Research: making every component configurable and loggable with Notion data

Date of research: October 2026. Notion API version targeted: `2026-03-11`. Browser
behaviour checked against Chrome 140s, Safari 18/26, Firefox 14x, the Notion web
app, the Notion desktop app (Electron) and the Notion iOS app.

This document answers two questions the first research pass (`docs/RESEARCH.md`)
deliberately left open:

1. The catalog has 203 components. All 192 widgets are **configuration-only**
   (`params: WidgetParam[]`, scalars in a query string). None of them can read or
   write a user's Notion tables, databases or pages. Why, structurally, and what
   would have to exist for that to change?
2. Every widget that persists anything uses `localStorage`. Notion renders a
   widget inside an iframe it owns, which makes that storage third-party and
   therefore partitioned or blocked. So state does not follow the user across
   devices. Why, and what replaces it?

Everything here was gathered before the plan in `docs/SYNC_PLAN.md` was written,
and each design decision in that plan cites a finding below.

Six figures draw the conclusion rather than argue it: `app/docs/sync/diagrams`
(the page), `lib/diagrams.ts` (the source) and `public/diagrams/*.png` (the
export). Where a figure states a number, it is a number measured in this
repository, and the figure's footer names the file it came from.

---

## 1. Five root causes, stated plainly

The catalog is not missing a feature. It is missing a **data plane**, and the
absence has five independent causes. Fixing four of them changes nothing.

| # | Cause | Evidence | Consequence if left alone |
|---|---|---|---|
| **R1** | The HTML-block sandbox has no network | Notion's HTML block runs in a sandboxed iframe with no external calls. Stated in [Matthias Frank's capability matrix](https://matthiasfrank.de/en/notion-html-blocks/) ("External API calls: No. No live web widgets") and independently by [widgetsfornotion](https://widgetsfornotion.com/tools/embed-html-in-notion) ("Browsers restrict cookies and localStorage inside embedded frames") | No widget file can ever phone home. Any data path must be built outside the file. |
| **R2** | The embed channel never got an identity | `app/embed/[slug]/route.ts` serialises `params` into the query string and nothing else. There is no instance id, no binding, no session | Two people on the same page see two private worlds. Nothing can be addressed, revoked, or shared. |
| **R3** | `localStorage` in Notion is third-party storage | Chrome partitions storage by top-level site; Safari blocks third-party cookies outright and requires the [Storage Access API](https://developer.mozilla.org/en-US/docs/Web/API/Document/requestStorageAccess) after a user gesture; Firefox partitions under Total Cookie Protection. Inside an HTML block the origin may be opaque, in which case `localStorage` throws outright | State is per browser, per device, and silently lost. All 166 widgets that persist state today hide the failure inside `try { } catch { }`, so it looks like it worked. |
| **R4** | There is no server-side connection to Notion | `app/api/install/route.ts` takes a token **per request** and states "The token is used for the duration of the request and never persisted" | No read-modify-write, no incremental sync, no webhooks, no way to answer "what changed since Thursday". Every sync would be a full re-upload. |
| **R5** | The component model has no vocabulary for records | `lib/types.ts` models config as scalar params. `capabilities.writesToNotion: false` is a *label*, not a mechanism. There is no field mapping, no record identity, no conflict policy | Even with a data plane, no widget could say which Notion property a click writes to. |

R1 and R3 are platform facts and cannot be engineered away. R2, R4 and R5 are
ours, and they are the real work.

---

## 2. The platforms we can build on (verified October 2026)

### 2.1 Notion connections

Three credential types exist, and they are not interchangeable
([authorization guide](https://developers.notion.com/guides/get-started/authorization),
[public connections](https://developers.notion.com/guides/get-started/public-connections),
[PATs](https://developers.notion.com/guides/get-started/personal-access-tokens)):

| | Internal connection | Public connection (OAuth 2.0) | Personal access token |
|---|---|---|---|
| Scope | One workspace, chosen at creation | Any workspace or selected workspaces | One user, one workspace |
| Identity | A bot user | **The authorising user** | **The token creator** |
| Access granted by | Manual "Add connections" per page | OAuth page picker at install time | The user's own permissions, no page picker |
| Token lifetime | Static | Static per authorisation, revoked by user | 7d / 30d / 90d / 180d / 1y |
| Workspace-level pages | No | **Yes** (`parent` omitted, lands in Private) | Yes |
| Marketplace | No | Requires "Any workspace" scope | No |

Two consequences matter more than the rest:

- **Public connections can create databases and pages at the workspace level**
  immediately after the authorisation code is exchanged
  ([preparing your connection for users](https://developers.notion.com/guides/get-started/preparing-for-users)).
  That is the difference between "here is a URL, go create a database yourself"
  and "your bound database already exists". It is also the only way to provision
  before the user has shared anything.
- A public connection's token is **per user**, not per workspace. The webhook
  payload carries `accessible_by` for exactly this reason (see 2.3). Any design
  that stores one token per workspace will break the moment two colleagues
  install the app.

Personal access tokens have one property with real teeth: they are **user-scoped
and exempt from Free-workspace block-limit enforcement** (2.5). A PAT is the
right fallback for solo users, self-hosters and headless scripts, and the wrong
primary path, because it is a long-lived credential the user pastes into a text
box.

### 2.2 Data model: databases, data sources, views

`2026-03-11` keeps the split introduced in `2025-09-03`: a **database** is a
container, a **data source** holds the schema and the rows, and relations point
at `data_source_id`. `docs/RESEARCH.md` §4 already covers the two-pass install
this forces. Three further findings matter for sync:

- Rows are pages (`page_id`), so a row's identity is stable, `last_edited_time`
  is available on every read, and `archived`/`in_trash` are observable.
- `POST /v1/views/{view_id}/query` executes a **saved** view's filter and sorts
  server-side and returns the first page of results
  ([create a view query](https://developers.notion.com/reference/create-view-query),
  [get view query results](https://developers.notion.com/reference/get-view-query-results)).
  A widget bound to "the view the user already curates" is one request, not a
  reimplementation of the user's filter logic.
- Comments are a first-class resource with create, update, delete and list
  ([comment object](https://developers.notion.com/reference/comment-object)).
  A widget can log a note into a page's discussion without writing a block.

### 2.3 Webhooks

Webhooks are a connection-level subscription, configured once in the developer
portal, verified with a one-time `verification_token`, and signed on every
delivery with `X-Notion-Signature` (HMAC-SHA256 over the raw body)
([webhooks](https://developers.notion.com/reference/webhooks),
[event types and delivery](https://developers.notion.com/reference/webhooks-events-delivery)).

The properties that shape the design:

| Property | Value | Design consequence |
|---|---|---|
| Payload | IDs and metadata only, never content | Every event triggers a follow-up read. Budget for it. |
| Delivery | Typically under a minute, worst case ~5 minutes | Not a realtime bus. UI must tolerate minutes, not milliseconds. |
| Aggregation | High-frequency events coalesced per entity | A burst of 50 habit ticks is one event. Good. |
| Ordering | Not guaranteed | Order by `timestamp`, never by arrival. |
| Delivery guarantee | At-most-once, up to 8 retries over ~24h | Idempotency keys are mandatory, not optional. |
| Event granularity | `data_source.content_updated`, `page.properties_updated`, `page.created`, `comment.created`, ... | Content and property changes are separable, so a property-only change can skip a block re-read. |
| `accessible_by` | Present on public-connection events only | Tells us which users can see the entity, so fanout to the wrong user is avoidable. |

Webhook setup has two sharp edges worth recording: the URL **cannot be changed
after verification** (delete and recreate instead), and localhost endpoints are
unreachable, which makes the entire webhook path untestable without a public
tunnel or a mock. Both push toward a first-class local simulator in the test
plan rather than manual clicking.

### 2.4 Blocks, files and the HTML-block mechanics

Two endpoints decide whether the offline channel can be kept fresh:

- `PATCH /v1/blocks/{block_id}` accepts an embed block update, and the OpenAPI
  schema at that endpoint includes `updateEmbedFileUploadRequest` alongside the
  URL variant ([update a block](https://developers.notion.com/reference/update-a-block)).
  So the file backing an existing HTML block can be **replaced in place**.
- File uploads are three calls: create a `single_part` upload, POST the bytes to
  `upload_url`, attach the id ([uploading small files](https://developers.notion.com/docs/uploading-small-files)).
  Up to 20 MB single-part, multi-part above that.

Together those two facts are the difference between "the offline block is a
frozen snapshot forever" and "the offline block is a cache we refresh". No
rebuilding the page, no block churn, one request per refresh.

### 2.5 Limits that constrain the sync engine

| Limit | Value | Source |
|---|---|---|
| Requests per connection | 180/min (Free, Plus), 600/min (Business, Enterprise) | [request limits](https://developers.notion.com/reference/request-limits) |
| Workspace-wide shared budget | Scaled to plan, shared by all connections; `Retry-After` can exceed a minute | same |
| Query page size | 100 rows, cursor pagination | [intro](https://developers.notion.com/reference/intro) |
| Children per append | 100, two nesting levels per request | [append block children](https://developers.notion.com/reference/patch-block-children) |
| Payload | 500 KB | same |
| Free workspace block limit | 1,000 lifetime blocks, multi-member Free workspaces only; enforced on API writes for internal connections and selected-workspace OAuth connections; **not** for PATs or "Any workspace" OAuth connections; returns 403 `restricted_resource` with `additional_data.block_limit` | [workspace block limits](https://developers.notion.com/reference/workspace-block-limits) |

Two of these are easy to get wrong:

- **Rate limits are per connection, not per user or per widget.** Ten widgets on
  one page polling Notion independently would share 180 requests per minute and
  one of them would starve. All widget traffic must funnel through one
  server-side budget.
- **The Free block limit is a plan limit, not a throttle.** Retrying does not
  help, and the error code (`restricted_resource`) is the same one used for
  permission failures. The distinguishing field is `additional_data.block_limit`.
  A sync engine that writes rows must surface that as a product message
  ("upgrade the workspace or use fewer bound rows"), not as a generic failure.

### 2.6 Notion Workers: what they are and what they are not

Workers are hosted TypeScript that Notion runs (syncs, agent tools, inbound
webhooks), deployed with `ntn workers deploy`
([workers overview](https://developers.notion.com/workers/get-started/overview)).
They look like the answer to "hosted sync without infrastructure". The sync
guide is explicit about the catch
([syncs](https://developers.notion.com/workers/guides/syncs)):

> **Synced columns are read-only.** You cannot manually edit any property
> declared in the sync's `schema.properties`. [...] **Rows cannot be added or
> deleted manually.**

A Worker sync therefore makes a database **one-way by construction**. It is the
right tool for pulling Stripe or GitHub into Notion, and the wrong tool for a
widget whose whole purpose is that a human edits the data. It stays in the plan
as an optional mirror for external sources, never as the write path.

Workers do have one genuinely interesting capability for us: an inbound webhook
URL (`https://{space}.webhook.notionusercontent.com/webhooks/worker/...`) with
synchronous verification support. That is a Notion-hosted HTTP endpoint that can
call out to our API, which makes a "no server of your own" self-hosted variant
possible. It is documented in the plan as an escape hatch, not a foundation.

### 2.7 What Notion does not have

Collected so it is not re-litigated:

- **No HTML block type in the API.** HTML blocks are `embed` blocks whose
  content is a `file_upload`. That is what the installer already does.
- **No host SDK for iframes.** There is no `postMessage` protocol from the
  embedded page to the Notion app. The parent is opaque and will stay opaque.
  Anything a widget wants from Notion must come over the network to our own
  server, or it does not come.
- **No webhook for a single page's body only.** `page.content_updated` is
  per-page and aggregated, so a page-level subscription model is possible, but
  the coalescing window is ours to respect.
- **No `button` block, no automation endpoint, no recurring-template endpoint,
  no linked synced block.** Unchanged from `docs/RESEARCH.md` §3, now with one
  more tool that cannot be scripted: nothing in this design may depend on a
  button existing.
- **No per-database webhook filter.** Subscriptions are per event type for the
  whole connection, so filtering happens on our side.

---

## 3. Browser reality: where state actually goes today

This section is the reason the second half of the user's complaint ("data is not
synced across devices") is not a bug in our widgets.

### 3.1 The embedding context decides storage

| Context | Origin of the page | `localStorage` | Cookies of the widget's own domain | Notes |
|---|---|---|---|---|
| `/embed/...` inside Notion web app | `notion.so` is top level, we are the frame | **Partitioned** by (top-level site, our origin) in Chrome and Firefox | Blocked in Safari, partitioned in Chrome | Chrome's partitioning is per top-level site, so the same widget on two Notion pages shares storage; on two *browsers* it does not. |
| `/embed/...` inside Notion desktop app | Electron; the app's own storage | Partitioned, and cleared more aggressively by app updates | Same as above | Desktop app behaves like a browser with a strict third-party policy. |
| HTML block (uploaded file) | Sandboxed frame, possibly **opaque origin** | **Throws** `SecurityError` if the sandbox lacks `allow-same-origin` | None | The 166 widgets that persist state wrap the call in `try/catch`, so the failure is silent. |
| Opened directly (`/embed/slug`) in a tab | Ours | Normal, first-party | Normal | This is the only context where "browser storage" behaves the way an author expects. |
| Notion iOS / iPadOS / Android app | Native shell | Not reliably available | Not shared between apps | Notion's own support has told users that iPad embeds do not work because "cookies cannot be shared between Notion and other apps". Embed rendering on mobile is inconsistent across widget vendors. |

The conclusion is unavoidable and it is the single most important design input
in this document:

> Browser storage in Notion is **a cache at best, and unavailable at worst**.
> It can never be the identity of a widget instance or the system of record for
> a user's data.

### 3.2 The identity therefore belongs in the URL

Every Notion surface that renders one of our components gets a URL we control:

- the embed block (`/embed/{slug}?i=...&k=...`)
- the downloaded `.html` we hand to the File Upload API (config baked in, so the
  same fields can be baked into a `bk-config` block)
- the standalone page (`/c/{slug}/{instance}`) for mobile browsers, where the
  Notion app refuses to render embeds
- the registry/MCP path, where an agent composes the same URL

If the instance id and its capability token travel in that URL, then "synced
across devices" reduces to "the same URL was used", which is exactly what a
Notion page guarantees: a page is the same page on every device the user signs
into. This is how the design gets cross-device sync without asking the user to
pair anything, and it is why the plan stores no user identity in the browser.

The token in the URL is the only part that needs care. Findings that shaped it:

- Safari needs `requestStorageAccess()` **inside a user gesture** before any
  cookie-based session works in an iframe
  ([Smashing Magazine: reliably detecting third-party cookie blocking](https://www.smashingmagazine.com/2025/05/reliably-detecting-third-party-cookie-blocking-2025/),
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/requestStorageAccess)).
- Chrome and Firefox partition rather than block, so a cookie set inside the
  frame works until the user opens the widget in a top-level tab, at which point
  it is a different jar.
- The Storage Access API can be extended to non-cookie storage
  (`requestStorageAccess({ all: true })`) but that is a prototype, not something
  to depend on ([blink-dev intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/inRN8tI49O0/m/rQaJNCV8AgAJ)).

So: a **scoped, revocable capability token in the URL** for the widget, and a
normal first-party session cookie only on our own domain, used for the
configuration UI. Anything else is a browser-specific house of cards.

### 3.3 What the sandbox does allow

Worth recording, because the offline design leans on it:

- Full JavaScript, inline CSS, canvas, WebAudio, `localStorage` *when the origin
  is not opaque*.
- `BroadcastChannel` and `storage` events **within one partition**, so two
  widgets from our origin on the same Notion page can coordinate.
- The clipboard is not guaranteed: `navigator.clipboard.writeText` in a
  cross-origin frame needs the embedding page to grant `clipboard-write`, which
  Notion does not, so copy actions must fall back to selection plus
  `execCommand("copy")` and to `console.log`, which is what the widgets already do.

---

## 4. The parity theorem (why "both channels equal" cannot mean "both have a socket")

The user's requirement is that **both** delivery channels (hosted embed and
offline HTML block) participate in two-way sync. R1 and R3 make one reading of
that requirement impossible: a file with no network cannot send anything.

What *is* achievable, and what the plan specifies, is **one logical instance with
two renderers**:

| | Live renderer (embed) | Offline renderer (HTML block) |
|---|---|---|
| Reads | Pull from our API, which pulls from Notion | Data snapshot baked into the file **and** a local cache |
| Writes | Optimistic locally, queued, flushed to Notion | Local only, queued into an **outbox** |
| Getting data in | Every load, every webhook-driven push | **Republish**: we re-render the file with fresh data and `PATCH` the block's `file_upload` (2.4). One request per refresh, no block churn. |
| Getting data out | Automatic | **Outbox handoff**: a portable sync code (and file) that any other renderer of the same instance can flush |
| Identity | `i` + `k` in the URL | Same `i` + `k`, baked into `bk-config` |
| Truth | Notion | Notion, via the other renderer |

The parity claim is therefore precise and testable, and the plan commits to
these five statements rather than to "it syncs":

1. Both renderers resolve to the same instance id and the same Notion records.
2. A write on either side is durable in Notion without manual re-entry, provided
   *some* renderer of that instance is reachable (which is true the moment the
   user opens the page on desktop web).
3. Offline writes are never lost: they sit in the outbox with a visible count
   until flushed, and the outbox is portable between devices.
4. The offline renderer is refreshed by us, not by the user, whenever its data
   changes, bounded by a configurable staleness window.
5. Anything the platform cannot do is surfaced in the component's capability
   flags, not hidden behind a spinner.

Point 3 is what makes the offline story honest: the requirement "it must sync"
becomes "it must not lose data", which is achievable in a sandbox that only
allows storage.

---

## 5. Notion as the system of record

Since the user chose Notion-as-truth, the engine's job is to map widget state
onto Notion objects with the fewest surprises. Research findings that shaped the
mapping:

### 5.1 Record identity

| Option | Works when | Cost |
|---|---|---|
| `page_id` | Always, once a row exists | Useless for rows created in Notion by a human or by another widget instance |
| `unique_id` property | The database has one | Prefix only, the number is server-assigned, so it cannot be used as an upsert key on create |
| **Business key in a property** (e.g. `Date` for a habit tick, `Slug` for a bookmark) | The widget's natural key is knowable | Requires a convention and, for composite keys, a normalised text property |

The plan uses a business key, because "the same habit, the same day" must
resolve to the same row whether it was clicked in the widget or typed into
Notion. Where a component has no natural key, the plan mints one and stores it in
the bound database's key property, which is also what makes idempotent replay
after a webhook storm possible.

### 5.2 Concurrency and conflicts

- `last_edited_time` is on every page and is the only monotonic signal we get.
  It is **not** a version vector: two edits in the same second are
  indistinguishable, and it changes for property edits and content edits alike.
- Webhooks are unordered and at-most-once, so "I received an event after my
  write" does not prove "the user changed it after me".
- Deletes are observable as `page.deleted` events and `in_trash` on retrieve,
  but a delete in Notion has no counterpart in a widget's local cache unless we
  write a tombstone.

Chosen policy (see the plan for the full table): **per-field last-write-wins
resolved by (last_edited_time, then our own monotonic counter), with an
append-only conflict log and tombstones**, plus a per-component override for
event-shaped data (habit ticks, journal entries, expense rows) where the correct
answer is always "keep both, they are different records".

### 5.3 Property type mapping

The mapping layer has exactly one hard rule: **a widget's field type must
serialise into a real Notion property type, or the binding is rejected at
configuration time.** No silent stringification into a title.

| Widget field | Notion property | Round-trip notes |
|---|---|---|
| label/name | `title` | One per database, always required |
| count/number | `number` (format chosen at bind time) | `null` clears, `0` is a value |
| checked/done | `checkbox` | |
| date | `date` (`start`, optional `end`) | Date-only vs datetime is a binding option; timezone belongs to the date, not the widget |
| select | `select` / `status` | `status` needs groups; option colours are preserved on update since the October 2026 fixes |
| list of labels | `multi_select` | Ordering is not preserved by Notion |
| url | `url` | Empty string is invalid; send `null` |
| long text / notes | `rich_text` (2000 chars per rich_text item, paginate) | Markdown is not implied |
| person | `people` | Requires user capability on the connection |
| relation | `relation` → `data_source_id` | Two-pass creation; a widget can bind to an existing relation but cannot invent targets |
| formula/rollup/created/edited | read-only | Bindable for display, never for write |

### 5.4 Page-level components

"The user's pages" are the other half of the brief, and they do not fit a row
model. Research outcome:

- `GET /v1/pages/{id}` plus block children gives a page's properties and body.
  Two new endpoints (`retrieve page as markdown`, `update page as markdown`)
  make whole-page read and targeted markdown edits cheap compared with walking
  blocks, with the documented caveat that a page large enough to exceed ~20,000
  records cannot be partially edited
  ([changelog, October 2 2026](https://developers.notion.com/page/changelog)).
- So page-bound components get **two binding modes**: `page.props` (properties of
  the page, e.g. a status dashboard) and `page.body` (append-only or
  replace-section markdown, e.g. a journal entry, meeting note, daily log).
  `page.body` is append-biased on purpose: append is idempotent enough to retry,
  while replace needs a section anchor and a conflict check.

---

## 6. Prior art, and what it implies for positioning

| Product / approach | Direction | What it proves |
|---|---|---|
| Whalesync, 2sync, Unito ([whalesync](https://www.whalesync.com/connector/notion), [2sync](https://2sync.com/blog/how-to-sync-notion-with-google-calendar)) | True two-way, database to database, hosted | Two-way sync is a product people pay for. It is also a *connector* business: the UI is field mapping tables, and the value is reliability, not widgets. |
| Widgetsfornotion, Blocs, Indify-style galleries ([widgetsfornotion](https://widgetsfornotion.com/tools/embed-html-in-notion), [blocs](https://blocs.me/blog/interactive-widgets-for-notion)) | Embed-only, browser-local state | The entire widget category has the same hole we do. Nobody in it has a data plane. This is the differentiator, and the honest capability table is the marketing. |
| Notion Workers syncs | One-way in, read-only columns | Notion's own answer to "get external data into Notion". Deliberately not editable, which leaves the two-way case open. |
| Notion native database syncs (UI) | One-way in | Same conclusion at the product level. |
| Notion MCP | Agent-mediated read/write | Agents are already a supported way to mutate a workspace. A widget that exposes the same records to an agent costs almost nothing once instances are addressable. |

Positioning statement the plan defends: **the first widget registry where a
component is bound to real Notion data, on both delivery channels, with the
conflicts and the limits written down.** Mapping tables are commodity; a
binding model plus an offline story plus an agent-readable instance graph is not.

---

## 7. Dead ends and anti-patterns

Recorded so they are not retried, in the style of `docs/RESEARCH.md` §11:

- **Cookie-based sessions inside the Notion iframe.** Safari blocks them,
  Chrome partitions them, and a user who opens the widget in a tab gets a
  different jar. URL-scoped capability tokens instead.
- **Posting messages to the Notion parent window.** There is no host SDK and no
  documented protocol. `postMessage` from our frame to Notion is discarded.
- **Letting widget files call `fetch` directly.** It breaks the sandbox contract
  that `scripts/check-widgets.mjs` enforces, and it would make 192 files
  network-dependent. Data access belongs in an injected bridge; the files stay
  pure. (The checker only guards `public/widgets/`, so a *generated* bundle may
  contain the bridge: source stays sandbox-clean, artifact carries the bridge.)
- **Per-widget polling of the Notion API.** 180 requests/minute per connection
  is shared. Ten widgets on a page is a self-inflicted outage.
- **Storing the Notion token in the browser or in the embed URL.** The token is
  a machine credential for the whole connection; the widget gets a scoped,
  revocable instance token that only reaches our API.
- **Using a Worker sync as the write path.** Its schema columns are read-only by
  design, so a user could never tick the habit.
- **Relying on the HTML block sandbox for persistence.** Either the origin is
  opaque (storage throws) or it is partitioned (storage is per device). Both lose.
- **Assuming embeds render on mobile.** They do not, reliably, on any vendor's
  widgets. A first-party URL is part of the product, not a nicety.
- **Appending a new block to refresh an HTML widget.** `PATCH /v1/blocks/{id}`
  with a new `file_upload` replaces the file in place. Appending churns the page
  and breaks the user's layout.

---

## 8. Open questions that need a real workspace

These are the unknowns that the plan turns into an explicit test harness rather
than assumptions. Each has a two-minute experiment:

| # | Question | Experiment | Fallback if the answer is bad |
|---|---|---|---|
| Q1 | Does a Notion HTML block's iframe origin allow `localStorage`? | Install a probe file that reports `origin`, `localStorage` availability and `BroadcastChannel` via a rendered badge | Treat the offline cache as memory-only; outbox becomes mandatory rather than a safety net |
| Q2 | Does the embed iframe permit popups and clipboard writes? | Probe `window.open` result and `navigator.clipboard.writeText` rejection | Connect flow uses a code shown in-frame and completed on a phone or in a tab |
| Q3 | Does `PATCH /v1/blocks/{id}` in-place swap of `file_upload` succeed on a real uploaded HTML block? | Install, then patch with a second upload, then re-open the page | Delete plus re-append at `position`, with a caption warning |
| Q4 | Does the Notion mobile app render HTML blocks where it refuses embeds? | Same probe file, both channels, iOS | Standalone `/c/{slug}/{instance}` URL becomes the mobile surface |
| Q5 | Do file uploads survive workspace exports, and do they count against the Free block limit? | Check block usage before and after one HTML block install | Surface the block cost in the install preview |
| Q6 | How does the webhook `accessible_by` list behave for pages shared with several users of the same connection? | Two accounts, one bound database, one webhook subscription | Fanout by page id and rely on our own permission table |

Status: Q1 to Q4 have a probe in the shipped slice. `GET /api/sync/probe`
returns the file, and `?download=1` gives the version to upload as an HTML
block. It has no network dependency, so the same file answers the question in
either channel, and the playground at `/docs/sync` reads the live frame's
capability report next to it. Q5 and Q6 need a live workspace and a public
webhook endpoint.

---

## 9. What this means for the product (one paragraph)

Everything above reduces to a single architectural move: **give every rendered
component an addressable instance, give the instance a scoped credential, and
put the Notion API behind our own sync engine.** Configuration stops being a
query string and becomes a binding. Persistence stops being `localStorage` and
becomes a record in the user's own workspace. Cross-device sync stops being a
storage problem and becomes an identity problem, which the URL already solves.
The offline channel stops being a dead end because we own the file and can
replace it. And the capability table in `lib/types.ts` stops being a list of
booleans we assert and becomes a list of guarantees the engine enforces.

The implementation plan is in `docs/SYNC_PLAN.md`.

---

## 10. Sources

**Notion platform (read October 2026)**
- developers.notion.com/reference/intro
- developers.notion.com/reference/capabilities
- developers.notion.com/reference/webhooks
- developers.notion.com/reference/webhooks-events-delivery
- developers.notion.com/reference/request-limits
- developers.notion.com/reference/workspace-block-limits
- developers.notion.com/reference/update-a-block (OpenAPI `updateEmbedFileUploadRequest`)
- developers.notion.com/reference/create-view-query, /get-view-query-results
- developers.notion.com/reference/comment-object
- developers.notion.com/guides/get-started/authorization
- developers.notion.com/guides/get-started/personal-access-tokens
- developers.notion.com/guides/get-started/public-connections
- developers.notion.com/guides/get-started/preparing-for-users
- developers.notion.com/guides/get-started/marketplace-listing
- developers.notion.com/guides/data-apis/uploading-small-files
- developers.notion.com/workers/get-started/overview
- developers.notion.com/workers/guides/syncs
- developers.notion.com/workers/guides/webhooks
- developers.notion.com/page/changelog (Oct 2, Oct 6 to Oct 9 2026 entries)

**HTML block behaviour and the sandbox**
- matthiasfrank.de/en/notion-html-blocks/
- widgetsfornotion.com/tools/embed-html-in-notion
- theorganizednotebook.com/blogs/blog/notion-html-block-interactive-widgets
- stacktr.ee/blog/notion-html-block-explained
- reddit.com/r/Notion "HTML blocks just landed in Notion"

**Browser storage, iframes and auth inside frames**
- developer.mozilla.org/en-US/docs/Web/API/Document/requestStorageAccess
- developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- privacysandbox.google.com/cookies/storage-access-api
- developers.google.com/privacy-sandbox/3pcd/chips
- smashingmagazine.com/2025/05/reliably-detecting-third-party-cookie-blocking-2025/
- groups.google.com/a/chromium.org/g/blink-dev "Extending Storage Access API to non-cookie storage"
- github.com/privacycg/CHIPS/issues/88 (partitioned storage shared between frames)
- reddit.com/r/Notion "iPad app won't show embedded Google Sheet due to disabled cookies"
- widgetsfornotion.com/blog/notion-widgets-on-ios
- blocs.me/blog/how-to-embed-spotify-in-notion (mobile embed rendering)

**Two-way sync prior art**
- whalesync.com/connector/notion
- 2sync.com/blog/how-to-sync-notion-with-google-calendar
- jotform.com/blog/best-notion-integrations

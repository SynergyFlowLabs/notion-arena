# Plan: two-way sync between Notion Arena components and the user's workspace

This is the build plan for the design in `docs/DATA_SYNC_RESEARCH.md`. The
research says what is true about the platform; this says what we build, in what
order, and how we know each step works.

Status legend: **shipped** (in this repository, verified by a script),
**next** (designed, not built), **later** (deliberately deferred).

---

## 1. The claim

A component in Notion Arena is configurable with the user's own data, and that
data syncs both ways, from every device.

Three parts, and each one has a test:

1. **Notion is the system of record.** Arena stores bindings, a sealed key and a
   cache. Delete Arena and every row is still a database in the user's workspace,
   readable by any Notion client. *Test: `npm run check:sync` deletes nothing and
   reads the user's table back out of the workspace adapter.*
2. **Every rendered component is an addressable instance.** One component, one
   configuration, one binding, one key. The instance is in the URL, never in a
   cookie. *Test: the same embed URL opened in a different browser profile
   renders the same rows.*
3. **Both channels write.** The embed and the HTML block are one instance with
   two transports. *Test: the runtime check drives a widget write through a live
   renderer and an offline renderer, and shows the offline write becoming a row
   through a sync code.*

---

## 2. What ships in this slice

### 2.1 Files

| Path | What it is |
|---|---|
| `lib/sync/types.ts` | the vocabulary: Instance, Binding, FieldMap, SyncOp, ChangeRecord, SyncResponse |
| `lib/sync/ids.ts` | id minting, sync key minting and hashing |
| `lib/sync/crypto.ts` | AES-256-GCM seal and open for stored tokens and keys |
| `lib/sync/store.ts` | the workspace cache: one JSON document, one mutex, four bounded rings |
| `lib/sync/transport.ts` | `WorkspaceAdapter`, the 15 methods both backends implement, and `AdapterError` |
| `lib/sync/mapping.ts` | widget JSON to Notion properties: inference, declared schemas, business keys, path translation |
| `lib/sync/adapters/mock.ts` | a Notion-shaped workspace in our own store, so the loop is testable without credentials |
| `lib/sync/adapters/notion.ts` | the real API: data sources, query, rows, uploads, blocks, page markdown |
| `lib/sync/budget.ts` | one token bucket per connection, matching Notion's documented request limits |
| `lib/sync/engine.ts` | the sync round: pull, push, materialise, reconcile, fan out, publish |
| `lib/sync/instances.ts` | create, bind, authorise, rotate, revoke, summarise |
| `lib/sync/http.ts` | route plumbing: present a key, authorise, fail |
| `lib/bridge/index.ts` | the envelope and the injection point; one render path for both channels |
| `lib/bridge/client.js` | the injected runtime: storage adoption, diffing, outbox, SSE, sync codes |
| `app/api/sync/**` | connections, datasources, instances, sync, stream, bundle, publish, table, probe |
| `app/api/webhooks/notion/route.ts` | signature-verified fanout into the change log |
| `app/api/dev/notion/route.ts` | the development simulator, because a webhook cannot reach localhost |
| `app/embed/[slug]/route.ts` | both shapes of the embed: configured by URL, or bound to an instance |
| `app/docs/sync/page.tsx` | the playground and the explanation, on one page |
| `scripts/check-sync.mjs` | 58 protocol checks, including the two-renderer path |
| `scripts/check-bridge.mjs` | 28 runtime checks, executing the injected bridge in a sandbox |

### 2.2 The model, in one table

| Concept | Where it lives | Lifetime |
|---|---|---|
| Workspace connection | `Store.connections`, token sealed | until revoked |
| Instance | `Store.instances`, key hashed, key sealed for re-show | until revoked |
| Binding | inside the instance: mode, data source, field map, key property, conflict policy | editable |
| State document | the user's database, or one state row per instance | the data's own life |
| Cache | `Store.log`, `Store.receipts`, `Store.events` | bounded rings |
| Sync key | in the URL, hashed at rest | rotatable, revocable |

### 2.3 What the loop does, per round

1. **Pull.** Read the bound data source. Anything newer than the last watermark
   becomes a change. The watermark is the newest `last_edited_time` seen, never
   the wall clock, because a human edit that lands between a read and a clock
   reading would otherwise be skipped forever.
2. **Echo filter.** A row we wrote ourselves comes back in the next read with a
   fresh timestamp. It is only reported when its value differs from the last
   value we logged for that key.
3. **Push.** Apply the client's operations to the cached document, diff it
   against what the data source holds, and write only what changed. Every
   property is written with the type the *data source* declares, because writing
   a second title is invalid on Notion and reads back as an empty string, which
   makes every later write look like a new record.
4. **Reconcile deletions.** A row that is gone from the query is invisible to
   the delta, so the change log is compared against the current rows and a
   tombstone is emitted for every key that disappeared. Scoped bindings are
   exempt: a saved view that filters rows out is not a deletion.
5. **Fan out.** Webhook events carry ids, not content, so the engine re-reads the
   row, checks that it belongs to this instance's data source, checks that the
   value is new, and commits the change.
6. **Ack.** An operation whose id was seen before is a replay. An operation that
   changed nothing is still receipted, so the client can drop it from its outbox,
   but it does not create a revision: a redundant push must not wake every other
   renderer or grow the log.
7. **Render.** For a records binding, the response carries the delta *and* the
   document, because a row is not a location: for a heatmap the row
   `water|2026-10-11` is the number at `water["2026-10-11"]`, and only the server
   knows that mapping. The renderer replaces its state and its own diff decides
   what to repaint.

### 2.4 The three binding modes

| Mode | State shape | In the user's workspace | When it is right |
|---|---|---|---|
| `records` | array of flat records | one row per record, properties inferred then fixed by the user | the majority of the catalog; data a person wants to query, group and roll up |
| `records`, declared | nested but rectangular | one row per leaf, keys promoted to properties | a heatmap, a matrix, anything where a person would want a row per cell |
| `kv-blob` | arbitrary nesting | one row per instance, the whole document in one rich text cell | widgets whose state is genuinely a document |

Inference covers the first row of the table without per-widget work, because the
catalog already persists arrays of flat objects under a namespaced key.
`lib/sync/mapping.ts` holds one declared schema (`habit-grid`), which is the
template for the rest.

### 2.5 How it is verified

```
npm run dev            # one terminal
npm run check:sync     # another: 58 protocol checks, 28 runtime checks
```

The protocol half asserts the properties a sync design lives or dies on:
idempotent replay, no duplicate rows on a redundant push, no echo of our own
writes, a human edit arriving with the right value and a path into the widget's
own shape, a delete arriving as a tombstone exactly once, refusals for a missing
or rotated key, and that the two renderers differ by exactly one field.

The runtime half takes the injected scripts out of a served bundle and runs them
in a sandbox: a widget write through `localStorage` becomes an operation, a
Notion change patches both the document and the widget's storage, an offline
renderer queues instead of fetching, a sync code carries the queue to a
reachable renderer, and replaying a code cannot double-write.

Settings that make it local and repeatable:

- `ARENA_SYNC_SECRET` seals tokens and keys. Absent, the store uses a development
  secret and says so in the event log.
- `.arena-data/store.json` is the cache. It is in `.gitignore`, because it holds
  connection tokens.
- `POST /api/dev/notion { "reset": true }` wipes the demo workspace and the cache.
- `POST /api/dev/notion { "rowId" | "keyProp" + "keyValue", "properties": {} }`
  is a person editing a row. Naming a key that is not there is a 404, because a
  simulator that invents rows hides the bug it exists to catch.

---

## 3. Phase 1: the real workspace (next)

The slice runs against the mock adapter. Phase 1 is the same loop against the
Notion API, which is a matter of three things: credentials, a subscription, and
the unverified payload shapes.

### 3.1 OAuth (the default path)

1. `GET /api/sync/oauth/start` builds the authorization URL with a state value
   stored server-side, and the public connection's client id.
2. The callback exchanges the code, reads the workspace identity with
   `whoAmI`, and stores the token sealed: `{ kind: "oauth", sealed, label,
   workspaceName, scopes, installationScope: "any_workspace" }`.
3. A connection list entry gains an install link, because a public connection
   cannot create anything at the workspace level until it is installed in that
   workspace.
4. `POST /api/sync/connections` keeps the pasted token path for personal access
   tokens and internal connections. It already validates the token by reading its
   own identity before storing it, so a wrong token fails at connect time rather
   than at first sync.

Acceptance: connect a real workspace, create an instance, see the database
appear, edit a cell by hand, watch the widget update. No tunnel required, because
the widget pulls.

### 3.2 Webhooks, the part that changes with a real workspace

1. `POST /api/sync/connections/{id}/subscribe` creates a subscription with our
   public endpoint plus a per-connection verification token.
2. `GET` and `POST /api/webhooks/notion` verify the handshake, then verify
   `X-Notion-Signature` as HMAC-SHA256 over the raw body. A per-connection
   verification token means one leaked secret cannot forge events for another
   workspace.
3. The route already handles the shape we must live with: at most once, ids only,
   aggregated, up to about five minutes late, and an endpoint URL that cannot be
   changed after verification. That last one is why the endpoint is a single
   stable route and why local development uses the simulator.

Acceptance: a signature-verified event for a bound row produces one change; a
duplicate delivery produces none; a forged signature produces a 401 and an event.

### 3.3 Payload shapes that only a real workspace can confirm

Listed here so they are not silently assumed:

| Call | Risk if the shape is wrong |
|---|---|
| `dataSources.create` with `initial_data_source` | provisioning fails; fallback is `databases.create` with `initial_data_source` |
| `dataSources.update` property merge | the added key column does not appear; fallback is to require the user to add it |
| `file_uploads` three-call flow | the offline renderer cannot be published; fallback is the delete and re-append path |
| `PATCH /v1/blocks/{id}` with a fresh `file_upload` | the HTML block cannot be refreshed in place; fallback is re-append at `position` with a caption note |
| `PATCH /v1/pages/{id}/markdown` | the page-body mode stays disabled; it is already reported as `mode_not_enabled` |

### 3.4 Postgres, when more than one process needs the cache

`lib/sync/store.ts` is one JSON document behind a promise chain. That is correct
for one process and wrong for two. The swap is small because every caller goes
through the `Store` object: connections, instances, log, receipts, events become
tables, `commit` becomes a transaction that also bumps `rev` and inserts
receipts, and the rings become `DELETE` policies. The one thing that must not
change is the interface, because the engine never touches the file.

---

## 4. Phase 2: the surfaces (next)

### 4.1 The component page

`/components/{slug}` gains a **Bind to Notion** panel beside the configurator:

1. Connect a workspace (or paste a token), then choose a database from the list
   the connection can see, or let Arena create one.
2. Two buttons, and they are different things: **Copy the embed URL** (live) and
   **Download the HTML file** (offline). The panel says which one needs a
   pasted key and which does not.
3. The sync key is shown once, with rotate and revoke beside it. Rotating has to
   say what it invalidates: every URL already pasted.
4. The panel shows the same table the playground shows, so "your clicks are
   rows" is visible before anyone installs anything.

### 4.2 The standalone renderer

`/c/{slug}/{instance}?k=` is the same bundle with `transport: live`, no framing
assumptions and no pill. It exists for mobile and for anything that refuses an
embed, which is also the answer to Q4 if the mobile app refuses HTML blocks.

### 4.3 The probe

`/c/probe` renders the same file as `/api/sync/probe` but inside our chrome, with
a form that posts the measurements back to set the answers in the research
document. The value is that the four open questions stop being questions without
anyone editing a file by hand.

### 4.4 Catalog coverage

The work is per widget, and it is small: a declared schema is about ten lines.
The order should follow the catalog's own popularity, and the heuristic in
`mapping.ts` should be treated as a starting point a human confirms, not as
truth. `npm run check:widgets` should grow one check: every widget whose state is
not a flat array must have a declared schema, so the default binding for it is
not a guess.

---

## 5. Phase 3: the rest (later)

- **Page-body mode.** Append-only markdown into a page: a widget that logs
  journal entries. The transport method exists; the engine refuses it with
  `mode_not_enabled` until it is implemented, which is better than a mode that
  half works.
- **Workers as a mirror.** A Worker sync can hold a read-only projection of a
  bound database and its inbound webhook is a no-server escape hatch. It cannot
  be the write path, because declared sync columns are read-only and rows cannot
  be added or deleted, so it is a mirror at best.
- **Comments as a log target.** Append a comment per change, for teams that want
  the history inside the page rather than in our log.
- **Marketplace listing.** Public connection with any-workspace installation,
  review taking five to ten business days, and a privacy page that says what we
  store: a sealed token, a key hash, and a change log.
- **Column caps.** A rich text cell holds about two thousand characters; a blob
  mode instance has to warn well before it, and a records instance with a field
  that runs long has to be steered to a second row.

---

## 6. The invariants, and where they are enforced

| Invariant | Enforced in | Tested by |
|---|---|---|
| A Notion token never reaches a browser | `lib/sync/instances.ts` (seal on store, `instanceSummary` on read) | check-sync, the connection list contains no secret |
| The sync key is hashed at rest and compared in constant time | `lib/sync/ids.ts`, `bumpSyncKey` | check-sync, rotation invalidates the old URL immediately |
| One op id applies once | `Store.receipts`, `syncInstance` | check-sync, replay changes nothing and does not move the revision |
| A redundant write does not create a revision | `syncInstance` commit policy | check-sync, identical value is acked with `applied: 0` |
| A human edit is never skipped | the watermark is data time, not wall clock | check-sync, an edit in the same second is still pulled |
| A delete reaches the widget | `reconcileDeletions`, the fanout trash branch | check-sync, a tombstone arrives once |
| A widget's own write does not echo back | the value comparison in `pullFromNotion` | check-sync, the round after a push is empty |
| Only the data source's title property gets a title payload | `mapping.toPropertyPayload` with the real property types | check-sync, the key column reads back |
| A rate limit does not lose an operation | `budget.ts`, `syncInstance` returns no ack, the outbox keeps it | check-bridge, the queued write survives and flushes later |
| An offline write is not lost | the outbox, the sync code, the rebase on merge | check-bridge, sections 3 and 4 |

---

## 7. Risks, ranked

1. **Unverifiable with the current access.** Everything about the Notion API is
   doc-derived; there is no token in this environment. Phase 1 exists to convert
   each row of section 3.3 into a fact. Until then, treat the real adapter as
   written but unproven, and say so rather than shipping it quietly.
2. **The Free plan block cap.** A multi-member workspace on Free can refuse a new
   database with a 403 `restricted_resource`. The response carries
   `additional_data.block_limit`, and the engine must surface it as a sentence,
   not retry. Personal access tokens and any-workspace installations are exempt.
3. **Records key collisions.** Inference cannot know which fields identify a row.
   Two coffees on different days need the date in the key, which is why the
   heuristic takes the first field plus the first time-like field. A wrong key
   merges records, which is data loss, so the UI must show the key column and let
   the user disagree.
4. **Granularity of a Notion change.** A records change arrives as the document,
   not as a leaf, because an item is not a location. That is correct and
   expensive: a large heatmap sends its whole document on each change. The
   upgrade is a declared `path` per schema, which the change record already
   carries a field for.
5. **Two writers, one cell.** Per-field last-writer-wins with an append-only
   conflict log is a policy, not a solution. Event-shaped data uses keep-both,
   and the UI must show conflicts rather than resolve them silently.

---

## 8. Acceptance criteria

The slice is done when all of these are true, and each one is a check in
`npm run check:sync`:

- [x] A component binds to a database Arena creates, and to one the user already
      has, including its own title property.
- [x] The component's existing state is uploaded on binding, so the first render
      and the table agree.
- [x] A widget write becomes a row; a redundant write does not; a replayed
      operation applies once.
- [x] A human edit in the table reaches the widget, with the value and the path
      into its own state.
- [x] A row deleted in the table reaches the widget as a tombstone, exactly once.
- [x] The embed and the downloaded file come from one instance and one render
      path, and differ by the transport field.
- [x] An offline renderer writes to an outbox, produces a sync code, and the code
      becomes a row through a reachable renderer.
- [x] A missing, wrong or rotated key is refused, as a page, with an explanation.
- [x] The rate limit budget is per connection and a limited round loses nothing.
- [ ] A real workspace, through OAuth, with a signature-verified webhook. Phase 1.
- [ ] The probe answers Q1 to Q4 from inside a real HTML block and embed. Needs a
      workspace and a phone, not code.

---

## 9. What changes if the open questions resolve badly

- **Q1, HTML block storage is opaque and throws.** Already handled: the runtime
  detects it, keeps its document in memory, and the outbox plus a sync code is
  the write path. The offline renderer becomes slightly more important than the
  embed rather than less.
- **Q2, the embed frame refuses popups and the clipboard.** The connect flow
  moves out of the frame: the panel shows a code, the user completes it in a tab.
  Nothing else depends on either capability.
- **Q3, a block's file cannot be swapped in place.** The publish path falls back
  to trash plus append at a position, with a caption that says why, and the
  refresh becomes a scheduled job rather than a per-change call.
- **Q4, mobile refuses HTML blocks.** The standalone URL becomes the mobile
  surface, which is why it is in phase 2 rather than later.

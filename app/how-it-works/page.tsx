import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";
import { ThemedIllustration } from "@/components/illustrations";
import { IconAlert, IconArrowRight, IconCheck, IconClose, IconPlus } from "@/components/icons";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The three ways a Notion Arena component gets into a Notion page: hosted embed URLs, native HTML blocks via the File Upload API, and database recipes via the Notion API, including exactly where each one breaks.",
};

const DECISION_ROWS = [
  ["I want it on a page in 30 seconds", "Embed URL", "Type /embed, paste, resize. No account, no integration, works on Free."],
  ["I am putting it in a template I sell", "HTML block", "Self-contained, offline, frozen at the version you took. Nothing can rot underneath your buyer."],
  ["It must show real database numbers", "Native recipe", "Widgets cannot read Notion. Relations, rollups and chart views can."],
  ["My whole team needs to see the same state", "Native recipe", "localStorage is per browser. A database is shared."],
  ["An agent should build it from a prompt", "Registry + API", "/r/index.json for discovery, POST /api/install for execution."],
  ["The workspace is air-gapped or offline", "HTML block", "The only channel with zero network dependency at render time."],
  ["I need drag-and-drop inside the block", "Widget", "Notion cannot script its own blocks; a sandboxed iframe can script itself."],
  ["I need it to trigger something in Notion", "Neither. Read this", "No channel can write to Notion from inside a block. Buttons and automations are the answer, and they are manual."],
];

const SANDBOX_ROWS: [string, boolean | "partial", string][] = [
  ["JavaScript, CSS, canvas, SVG, WebAudio", true, "Full. requestAnimationFrame, drag, keyboard, sound all work."],
  ["localStorage / IndexedDB", "partial", "Works, but scoped to the browser. Not synced to teammates, cleared with site data."],
  ["Reading the page it is embedded in", false, "No postMessage bridge to the parent, no access to page content or properties."],
  ["Writing to Notion", false, "No API access. This is a security boundary, not a missing feature."],
  ["External network calls, CDN fonts, analytics", false, "No network at all. Our widgets therefore inline every asset."],
  ["Clipboard", "partial", "Write via the async Clipboard API when you gesture; some browsers gate reads."],
  ["Editing the source in place", false, "Replace the block: download a new file and upload it."],
  ["Viewing on any plan", true, "Free, Plus, Business, Enterprise. Only AI generation of HTML needs Business+."],
];

export default function HowItWorks() {
  return (
    <PageTransition>
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[900px] px-4 pb-12 pt-14 sm:px-6">
          <p className="label-mono text-primary">
            How it works
          </p>
          <h1 className="font-display mt-4 text-h1 text-foreground sm:text-hero sm:leading-[1.04] sm:tracking-[-0.025em]">
            Three ways a component gets into your page
          </h1>
          <p className="mt-5 max-w-2xl text-lede text-ink-soft">
            Notion does not have a plugin system, so there is no single install
            path. There are three, each with different powers and different
            failure modes. This page explains all three honestly, including the
            things none of them can do.
          </p>
          <ThemedIllustration
            name="how-it-works"
            alt="Three delivery channels, an embed link, an uploaded file and a script of API calls, converging on one Notion page and its database."
            className="mt-8 h-56 w-full max-w-[560px] sm:h-64"
          />
          <nav className="mt-7 flex flex-wrap gap-2">
            {[
              ["#artifact", "The artifact"],
              ["#embed", "Embed URL"],
              ["#html-block", "HTML block"],
              ["#recipe", "Native recipe"],
              ["#config", "Configuration"],
              ["#limits", "Limits"],
              ["#choose", "Which one?"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6">
        {/* ===================== ARTIFACT ===================== */}
        <Section id="artifact" label="the artifact" title="One artifact, deliberately">
          <p>
            A widget is a single{" "}
            <code>.html</code> file: inline CSS, inline JavaScript, no
            dependencies, no CDN, no build step, no webfont requests. It reads
            its configuration from a JSON script tag or from the URL, renders
            itself, and never contacts a server again.
          </p>
          <p>
            That single file is what makes both hosted and offline delivery
            possible without the two versions drifting apart. The{" "}
            <code>/embed</code> URL streams it with your parameters appended to
            the query string. The download endpoint streams the same bytes with
            your parameters baked into the file, because a sandboxed block has
            no URL to read them from.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-secondary/50 px-3.5 py-2 font-mono text-[11.5px] text-muted-foreground">
              the same source, two deliveries
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-[1fr_auto_1fr]">
              <div className="bg-card p-4">
                <div className="text-[12px] font-semibold text-primary">Hosted</div>
                <pre className="mt-2 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-muted-foreground">
{`GET /embed/pomodoro-timer
      ?work=25&short=5
      &accent=%23e03e3e

→ streams pomodoro-timer.html
→ /embed block iframes it
→ we can ship fixes to you`}
                </pre>
              </div>
              <div className="grid place-items-center bg-card px-2 text-muted-foreground">
                <IconPlus size={18} />
              </div>
              <div className="bg-card p-4">
                <div className="text-[12px] font-semibold text-[var(--tag-ink-purple)]">Downloaded</div>
                <pre className="mt-2 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-muted-foreground">
{`GET /api/widget/pomodoro-timer
      ?work=25&short=5

→ same HTML, config injected as
  <script id="bk-config">
→ /html block renders it
→ works offline, forever`}
                </pre>
              </div>
            </div>
            <div className="border-t border-border bg-raised px-4 py-2.5 font-mono text-[11.5px] text-muted-foreground">
              public/widgets/pomodoro-timer.html. One file, 100% self-contained
            </div>
          </div>
        </Section>

        {/* ===================== EMBED ===================== */}
        <Section id="embed" label="channel: embed" title="Embed URL" accent="var(--notion-blue)">
          <p>
            The oldest trick in the book, and still the fastest. Notion's{" "}
            <code>/embed</code> block iframes any URL that allows framing. We
            serve widgets with{" "}
            <code>Content-Security-Policy: frame-ancestors *</code> and no{" "}
            <code>X-Frame-Options</code>, so Notion can wrap them.
          </p>

          <Steps
            items={[
              {
                t: "Copy the URL from any component page",
                d: "The configurator writes every control into the query string as you change it, so the URL you copy is the URL you configured.",
                code: "https://notionarena.vercel.app/embed/pomodoro-timer?work=25&short=5&accent=%23e03e3e",
              },
              {
                t: "In Notion, type /embed and press Enter",
                d: "Choose “Embed link”, not “Upload”, which is the HTML block path.",
              },
              {
                t: "Paste and resize",
                d: "Drag the block's bottom edge to set the height. Notion remembers the size per block, and the widget's layout adapts.",
              },
            ]}
          />

          <Callout tone="blue" title="What you get">
            Zero setup. Works on the Free plan. No integration, no token, no
            shared page. The widget keeps receiving our updates, so a bug fix
            reaches every page it is on without you re-installing anything.
          </Callout>
          <Callout tone="red" title="What it costs you">
            The block depends on our host being up. If we disappear, the block
            goes blank. It also means the widget's markup travels over the
            network on every page load, which matters if your workspace has
            strict content policies. For anything you are selling or archiving,
            download the HTML block instead.
          </Callout>
        </Section>

        {/* ===================== HTML BLOCK ===================== */}
        <Section id="html-block" label="channel: html block" title="Native HTML block" accent="var(--notion-purple)">
          <p>
            Notion 3.6 shipped a real HTML block. It is not an iframe of a URL.
            it is a file you upload, stored in Notion's own file storage and
            rendered in a sandboxed frame with no address. The{" "}
            <code>/html</code> slash command creates one by hand, and the Notion
            API creates one through the File Upload endpoints.
          </p>
          <p>
            Because the sandbox has no URL, configuration cannot come from a
            query string. It is injected into the file at download time as a JSON
            script tag that the widget reads before it renders:
          </p>

          <div className="relative">
            <pre className="code-block overflow-auto pr-12">
              <code>{`<!-- injected just before </head> -->
<script id="bk-config" type="application/json">
  {"work":25,"short":5,"accent":"#e03e3e","theme":"auto"}
</script>`}</code>
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton compact value={`<script id="bk-config" type="application/json">{"work":25,"short":5,"accent":"#e03e3e","theme":"auto"}</script>`} />
            </div>
          </div>

          <h3 className="mt-7 text-[15px] font-semibold tracking-[-0.01em]">
            Installing one with the API
          </h3>
          <p>
            Three requests. This is the flow Notion documents for HTML blocks and
            the one Notion MCP uses internally. It just is not obvious from the
            block reference, because the{" "}
            <code>embed</code> block type does the double duty.
          </p>

          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            {[
              {
                m: "POST",
                p: "/v1/file_uploads",
                n: "Reserve an upload. Responds with an id, an upload_url and a size limit.",
              },
              {
                m: "POST",
                p: "{upload_url}",
                n: "PUT the bytes straight to Notion's storage host with content-type: text/html.",
              },
              {
                m: "PATCH",
                p: "/v1/blocks/{parent}/children",
                n: 'Append an embed block whose file_upload.id points at the upload.',
              },
            ].map((r, i) => (
              <div key={i} className="flex gap-3 border-b border-border px-3.5 py-2.5 last:border-0 odd:bg-card even:bg-raised/60">
                <span className="mt-px w-4 shrink-0 text-right font-mono text-[11px] text-muted-foreground/70">{i + 1}</span>
                <span
                  className={cn(
                    "mt-px h-fit shrink-0 rounded border px-1.5 py-px font-mono text-[10.5px] font-bold",
                    r.m === "POST"
                      ? "border-[var(--notion-green)]/40 bg-[var(--notion-green)]/10 text-[var(--tag-ink-green)]"
                      : "border-[var(--notion-yellow)]/40 bg-[var(--notion-yellow)]/12 text-[var(--tag-ink-yellow)]"
                  )}
                >
                  {r.m}
                </span>
                <div className="min-w-0 flex-1">
                  <code className="block truncate font-mono text-[12px]">{r.p}</code>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{r.n}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-3">
            <pre className="code-block max-h-[400px] overflow-auto pr-12">
              <code>{`# 1: reserve
curl -X POST https://api.notion.com/v1/file_uploads \\
  -H "Authorization: Bearer $NOTION_TOKEN" \\
  -H "Notion-Version: 2026-03-11" \\
  -H "Content-Type: application/json" -d '{}'

# 2: upload the bytes to the returned upload_url
curl -X POST "$UPLOAD_URL" \\
  -H "Content-Type: text/html" \\
  --data-binary @pomodoro-timer.html

# 3: append the block
curl -X PATCH \\
  https://api.notion.com/v1/blocks/$PAGE_ID/children \\
  -H "Authorization: Bearer $NOTION_TOKEN" \\
  -H "Notion-Version: 2026-03-11" \\
  -H "Content-Type: application/json" \\
  -d '{
    "children": [{
      "object": "block",
      "type": "embed",
      "embed": {
        "file_upload": { "id": "'"$UPLOAD_ID"'" },
        "caption": [{ "type": "text", "text": { "content": "Pomodoro" } }]
      }
    }]
  }'`}</code>
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton compact value="curl -X POST https://api.notion.com/v1/file_uploads -H 'Authorization: Bearer $NOTION_TOKEN' -H 'Notion-Version: 2026-03-11' -d '{}'" />
            </div>
          </div>

          <h3 className="mt-8 text-[15px] font-semibold tracking-[-0.01em]">
            The sandbox, line by line
          </h3>
          <p>
            This table is the reason our widgets are built the way they are. It
            is worth reading before you design anything for Notion.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            {SANDBOX_ROWS.map(([label, ok, note]) => (
              <div key={String(label)} className="flex items-start gap-2.5 border-b border-border bg-card px-3.5 py-2.5 last:border-0">
                <span
                  className={cn(
                    "mt-px grid size-[16px] shrink-0 place-items-center rounded-full text-[9.5px] font-bold",
                    ok === true && "bg-[color-mix(in_oklab,var(--notion-green)_16%,transparent)] text-[var(--tag-ink-green)]",
                    ok === "partial" && "bg-[color-mix(in_oklab,var(--notion-yellow)_22%,transparent)] text-[var(--tag-ink-yellow)]",
                    ok === false && "bg-[color-mix(in_oklab,var(--notion-red)_14%,transparent)] text-[var(--tag-ink-red)]"
                  )}
                >
                  {ok === true ? (
                    <IconCheck size={10} />
                  ) : ok === "partial" ? (
                    <IconAlert size={10} />
                  ) : (
                    <IconClose size={9} />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{String(label)}</div>
                  <div className="text-[12.5px] leading-relaxed text-muted-foreground">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ===================== RECIPE ===================== */}
        <Section id="recipe" label="channel: native recipe" title="Native recipe" accent="var(--notion-green)">
          <p>
            A CRM, an OKR tree or a meeting-notes system is not a widget. It is
            databases with relations between them, rollups that aggregate across
            those relations, formulas that compute state, and views that filter
            the result. All of that exists in the Notion API, and all of it can
            be created headlessly.
          </p>
          <p>
            The catch is ordering. Since Notion split databases from data
            sources, a relation property targets a{" "}
            <code>data_source_id</code>, which does not exist until the target
            database has been created. So a correct install is inherently two
            passes, and any tool that shows you a single{" "}
            <code>POST /v1/databases</code> per table is not telling you the
            whole story.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {[
              { n: 1, t: "Create the container page", d: "POST /v1/pages: everything else nests inside it, so the whole system can be deleted or duplicated as one unit." },
              { n: 2, t: "Create every database with its base properties", d: "POST /v1/databases: title, text, number, select, status, date, people, unique_id. Relations, rollups and any formula that reads them are deliberately left out." },
              { n: 3, t: "Read back the data source ids", d: "GET /v1/databases/{id}: each new database arrives with a default data source, and its id is what relations must reference." },
              { n: 4, t: "Patch in the dependent properties", d: "PATCH /v1/data_sources/{id}: now relations resolve, rollups can name a relation property, and formulas can reference both." },
              { n: 5, t: "Create the views", d: "POST /v1/views: board groups, timeline dates, chart axes, calendar ranges, form questions. Available since Notion-Version 2026-03-11." },
              { n: 6, t: "Seed rows and append documentation", d: "POST /v1/pages for seed data, then PATCH /v1/blocks/{id}/children in chunks of 100, the hard limit on children per request, and on nesting depth per request." },
            ].map((s) => (
              <div key={s.n} className="flex gap-3 rounded-xl border border-border bg-card p-3.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--notion-green)_14%,transparent)] font-mono text-[11.5px] font-bold text-[var(--tag-ink-green)]">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">{s.t}</div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <Callout tone="yellow" title="Every recipe publishes its plan before it runs">
            <code>POST /api/install</code> with <code>mode: "plan"</code> needs no
            credentials and returns the exact request sequence: method, path,
            body and a note for each one. Read it, diff it against what you
            expected, then spend a token. Nothing is hidden behind an
            OAuth handshake.
          </Callout>
          <Callout tone="red" title="And the four things it cannot do">
            No <code>button</code> block type exists in the public API. Database
            automations have no endpoint. Recurring templates are a Business+
            feature with no endpoint. Dashboard view layouts are read-only after
            creation. Recipes install everything around these gaps and then give
            you the click path, with the reason it is manual.
          </Callout>
        </Section>

        {/* ===================== CONFIG ===================== */}
        <Section id="config" label="the contract" title="The configuration contract">
          <p>
            Every widget implements the same four rules. If you are writing your
            own, copy them. They are what makes a widget configurable from a
            URL, from a downloaded file, and from an API call without three
            different code paths.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Read baked-in config first", 'If a <script id="bk-config" type="application/json"> tag exists, parse it. This is the download and API-install path, where there is no URL.'],
              ["Overlay the query string", "new URLSearchParams(location.search) wins over baked-in values. This is the /embed path, and it lets one file serve many configurations."],
              ["Whitelist declared parameters", "Unknown keys are dropped, never passed through. Values are coerced to the declared type: number, boolean, color, date, select, string."],
              ["Two universal parameters", 'theme (auto | light | dark) and accent (any CSS colour) exist on every widget, so a whole dashboard can be re-skinned from one place.'],
            ].map(([t, d], i) => (
              <div key={String(t)} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] font-semibold text-primary tnum">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13.5px] font-semibold tracking-[-0.008em] text-foreground">
                    {String(t)}
                  </span>
                </div>
                <p className="mt-1.5 pl-[26px] text-[12.5px] leading-[1.65] text-ink-soft">{String(d)}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-3">
            <pre className="code-block overflow-auto pr-12">
              <code>{`// the loader every widget ships with
const baked = JSON.parse(
  document.getElementById("bk-config")?.textContent ?? "{}"
);
const qs = new URLSearchParams(location.search);
const cfg = { ...baked };
for (const [k, v] of qs) cfg[k] = v;

const num  = (k, d) => Number.isFinite(+cfg[k]) ? +cfg[k] : d;
const bool = (k, d) => cfg[k] === undefined ? d : ["true","1"].includes(String(cfg[k]));`}</code>
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton compact value={`const baked = JSON.parse(document.getElementById("bk-config")?.textContent ?? "{}");\nconst qs = new URLSearchParams(location.search);\nconst cfg = { ...baked };\nfor (const [k, v] of qs) cfg[k] = v;`} />
            </div>
          </div>
        </Section>

        {/* ===================== LIMITS ===================== */}
        <Section id="limits" label="constraints" title="Where each channel breaks">
          <p>
            The failure modes are the useful part. Everything below has been
            verified against the Notion API reference and the HTML block
            documentation, not assumed.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-left">
                  <th className="px-3.5 py-2.5 font-semibold">Failure</th>
                  <th className="px-3.5 py-2.5 font-semibold text-[var(--tag-ink-blue)]">Embed URL</th>
                  <th className="px-3.5 py-2.5 font-semibold text-[var(--tag-ink-purple)]">HTML block</th>
                  <th className="px-3.5 py-2.5 font-semibold text-[var(--tag-ink-green)]">Native recipe</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Host goes down", "Block renders blank", "Unaffected", "Unaffected"],
                  ["No internet at render time", "Fails", "Works", "Works"],
                  ["Reads your Notion data", "No", "No", "Yes. It is the data"],
                  ["State shared with teammates", "No (localStorage)", "No (localStorage)", "Yes (database rows)"],
                  ["Needs an integration token", "No", "Only to install by API", "Yes"],
                  ["Works on the Free plan", "Yes", "Yes", "Yes (API included)"],
                  ["Editable after install", "We ship updates", "Re-upload the file", "Edit like any database"],
                  ["Rate-limited", "Our fair use", "No", "Notion: ~3 req/s average"],
                  ["100-block append limit", "n/a", "n/a", "Applies. We chunk"],
                  ["2-level nesting limit", "n/a", "n/a", "Applies per request"],
                ].map((row, i) => (
                  <tr key={i} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-raised/50")}>
                    <td className="px-3.5 py-2 font-medium">{row[0]}</td>
                    {row.slice(1).map((cell, j) => (
                      <td
                        key={j}
                        className={cn(
                          "px-3.5 py-2 text-muted-foreground",
                          /^No|^Fails|^blank/i.test(cell) && "text-[var(--tag-ink-red)]/90",
                          /^Yes|^Works|^Unaffected/i.test(cell) && "text-foreground"
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ===================== CHOOSE ===================== */}
        <Section id="choose" label="decision guide" title="Which one should I use?">
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {DECISION_ROWS.map(([q, a, why], i) => (
              <div key={i} className={cn("grid gap-1 border-b border-border px-3.5 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-3", i % 2 === 1 && "bg-raised/50")}>
                <div className="text-[13.5px] font-medium">{q}</div>
                <div className="sm:text-right">
                  <span
                    className={cn(
                      "inline-block rounded-full border px-2 py-px text-[11.5px] font-semibold",
                      a === "Embed URL" && "border-[var(--notion-blue)]/40 bg-[var(--notion-blue)]/10 text-[var(--tag-ink-blue)]",
                      a === "HTML block" && "border-[var(--notion-purple)]/40 bg-[var(--notion-purple)]/10 text-[var(--tag-ink-purple)]",
                      a === "Native recipe" && "border-[var(--notion-green)]/40 bg-[var(--notion-green)]/10 text-[var(--tag-ink-green)]",
                      !["Embed URL", "HTML block", "Native recipe"].includes(a) && "border-border-strong bg-secondary text-foreground"
                    )}
                  >
                    {a}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground sm:col-span-2">{why}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2.5 rounded-xl border border-border-strong bg-card p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">Still not sure?</div>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Every component page shows all three channels side by side, with
                the plan for the API path already computed.
              </p>
            </div>
            <Link
              href="/components"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 text-[13.5px] font-semibold text-background transition-opacity hover:opacity-88"
            >
              Browse components
              <IconArrowRight size={14} />
            </Link>
          </div>
        </Section>
      </div>
    </PageTransition>
  );
}

/* ------------------------------------------------------------------ */

function Section({
  id,
  label,
  title,
  accent,
  children,
}: {
  id: string;
  /** What this section is, in Notion's mono label voice. */
  label: string;
  title: string;
  /** Colour-codes the three delivery channels; a graphic, so 3:1 applies. */
  accent?: string;
  children: ReactNode;
}) {
  const rule = accent ?? "var(--color-primary)";
  return (
    <section id={id} className="scroll-mt-20 border-b border-border py-14 last:border-0">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="h-[18px] w-[3px] shrink-0 rounded-full"
          style={{ background: rule }}
        />
        <span className="label-mono" style={{ color: rule }}>
          {label}
        </span>
      </div>
      <h2 className="font-display mt-3 text-h3 text-foreground">{title}</h2>
      <div className="mt-4 flex flex-col gap-3.5 [&_p]:max-w-2xl [&_p]:text-pretty [&_p]:text-[15px] [&_p]:leading-[1.75] [&_p]:text-muted-foreground [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:bg-secondary [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:py-px [&_code:not(pre_code)]:font-mono [&_code:not(pre_code)]:text-[13px] [&_code:not(pre_code)]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function Steps({ items }: { items: { t: string; d: string; code?: string }[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-2.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-border bg-card p-3.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[11.5px] font-bold">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold">{s.t}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{s.d}</p>
            {s.code && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-raised px-2.5 py-1.5">
                <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-foreground">{s.code}</code>
                <CopyButton compact value={s.code} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "blue" | "red" | "yellow" | "green";
  title: string;
  children: ReactNode;
}) {
  const color = {
    blue: "var(--notion-blue)",
    red: "var(--notion-red)",
    yellow: "var(--notion-yellow)",
    green: "var(--notion-green)",
  }[tone];
  const emoji = { blue: "💡", red: "⚠️", yellow: "🔧", green: "✅" }[tone];
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: `color-mix(in oklab, ${color} 32%, transparent)`,
        background: `color-mix(in oklab, ${color} 5%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2 text-[13.5px] font-semibold">
        <span>{emoji}</span>
        {title}
      </div>
      <div className="mt-1.5 text-[13px] leading-[1.7] text-muted-foreground [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-foreground">
        {children}
      </div>
    </div>
  );
}

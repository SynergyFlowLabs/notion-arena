import Link from "next/link";
import { COMPONENTS, STATS } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";
import { HeroDashboard } from "@/components/site/hero-dashboard";
import { ComponentCard } from "@/components/component-card";
import { Faq } from "@/components/site/faq";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FEATURED = [
  "pomodoro-timer",
  "kpi-strip",
  "habit-grid",
  "countdown",
  "eisenhower-matrix",
  "quote-card",
]
  .map((slug) => COMPONENTS.find((c) => c.slug === slug))
  .filter(Boolean) as typeof COMPONENTS;

const CHANNELS = [
  {
    n: "01",
    title: "Embed URL",
    tag: "works on every plan",
    color: "var(--notion-blue)",
    body: "Every widget is served as a configured HTML document at /embed/<slug>. Type /embed in Notion, paste the link, resize the block. It loads our host, so it picks up fixes and new parameters without you touching anything.",
    steps: ["/embed", "Paste URL", "Embed link"],
    limits: "Needs the network. Data lives with us.",
  },
  {
    n: "02",
    title: "HTML block",
    tag: "native, offline, yours",
    color: "var(--notion-purple)",
    body: "Notion 3.6 added a real HTML block — the same one /html creates and the one Notion MCP uses. We download the identical file with your configuration baked in, because the sandbox has no URL to read parameters from. Upload it and the block never phones home again.",
    steps: ["/html", "Upload", "Done"],
    limits: "No network inside the sandbox. Frozen at the version you took.",
  },
  {
    n: "03",
    title: "Native recipe",
    tag: "real databases, real formulas",
    color: "var(--notion-green)",
    body: "A CRM is not an iframe. Recipes are deterministic Notion API calls that build databases with relations, rollups and Formula 2.0 properties, then views through the new Views API, then documentation pages as real block trees. Plus the exact click path for the four things no API can do.",
    steps: ["POST /v1/databases", "PATCH data_sources", "POST /v1/views"],
    limits: "Needs an integration token and page access.",
  },
];

export default function Home() {
  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-dotgrid opacity-[0.55] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card/80 px-2.5 py-1 text-[12px] text-muted-foreground backdrop-blur">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--notion-green)] opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[var(--notion-green)]" />
                </span>
                <span className="font-medium text-foreground">Notion-Version 2026-03-11</span>
                <span className="h-3 w-px bg-border" />
                Views API · HTML blocks · data sources
              </div>

              <h1 className="mt-5 text-balance text-[42px] font-semibold leading-[1.04] tracking-[-0.038em] sm:text-[60px]">
                Notion gave you blocks.
                <br />
                <span className="text-primary">We give you components.</span>
              </h1>

              <p className="mt-5 max-w-lg text-pretty text-[16px] leading-[1.65] text-muted-foreground sm:text-[17px]">
                {STATS.total} ready-to-install components for Notion dashboards —{" "}
                {STATS.widgets} interactive widgets that run inside a page and{" "}
                {STATS.native} database systems that install through the API.
                Preview them live, configure them, copy the snippet. The way
                shadcn/ui works for React, for your workspace.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Link
                  href="/components"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-[14.5px] font-semibold text-background shadow-xs transition-all hover:opacity-88 active:scale-[0.98]"
                >
                  Browse the catalog
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/components/pomodoro-timer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 text-[14.5px] font-medium transition-colors hover:bg-secondary"
                >
                  <span className="size-2 rounded-full bg-[var(--notion-red)]" />
                  Try the Pomodoro
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check /> No Notion connection needed for widgets
                </span>
                <span className="flex items-center gap-1.5">
                  <Check /> Works on the Free plan
                </span>
                <span className="flex items-center gap-1.5">
                  <Check /> Every widget downloadable
                </span>
              </div>
            </div>

            <div className="lg:pt-2">
              <HeroDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* ============================ PROBLEM ============================ */}
      <section className="border-b border-border bg-raised">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <h2 className="text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[34px]">
              A dashboard is not a page with a heading
            </h2>
            <p className="mt-4 max-w-md text-pretty text-[15px] leading-[1.7] text-muted-foreground">
              Notion's native blocks are excellent for documents and weak for
              interfaces. There is no timer. No progress ring. No countdown. No
              sparkline. No heatmap. No kanban you can drag inside an embed. You
              end up with a beautiful page that does not <em>tell you anything</em>{" "}
              at a glance.
            </p>
            <p className="mt-3 max-w-md text-pretty text-[15px] leading-[1.7] text-muted-foreground">
              The usual workaround is a screenshot, a third-party embed you do
              not control, or a Notion Apps project that costs more than your
              whole team. None of them feel like Notion.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                bad: true,
                title: "What Notion gives you",
                items: ["Paragraph, heading, callout, toggle", "Database views you cannot script", "Embeds that depend on someone else's uptime", "Buttons — but only by hand, one at a time"],
              },
              {
                bad: false,
                title: "What a dashboard needs",
                items: ["A clock, a ring, a strip of numbers that update", "State that survives a reload", "One file you can hand to a client", "Installable from a prompt, not a click-path PDF"],
              },
            ].map((col) => (
              <div
                key={col.title}
                className={cn(
                  "rounded-xl border bg-card p-4",
                  col.bad ? "border-border" : "border-primary/35 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
                )}
              >
                <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <span
                    className={cn(
                      "grid size-[18px] place-items-center rounded-full text-[10px] font-bold",
                      col.bad
                        ? "bg-secondary text-muted-foreground"
                        : "bg-primary/12 text-primary"
                    )}
                  >
                    {col.bad ? "–" : "✓"}
                  </span>
                  {col.title}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.items.map((it) => (
                    <li key={it} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-border-strong" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ CHANNELS ============================ */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-primary">
              Three delivery channels
            </p>
            <h2 className="mt-2 text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[34px]">
              One artifact, three ways into Notion
            </h2>
            <p className="mt-3 text-pretty text-[15px] leading-[1.7] text-muted-foreground">
              The same widget source serves the hosted embed and the downloaded
              HTML block, so they can never drift apart. Recipes take the third
              path, because a CRM was never going to be an iframe.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {CHANNELS.map((ch) => (
              <article
                key={ch.n}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg"
              >
                <div
                  className="absolute inset-x-0 top-0 h-px opacity-70"
                  style={{ background: `linear-gradient(90deg, transparent, ${ch.color}, transparent)` }}
                />
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[12px] font-bold" style={{ color: ch.color }}>
                    {ch.n}
                  </span>
                  <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{ch.title}</h3>
                </div>
                <span className="mt-1 w-fit rounded-full border border-border bg-secondary px-2 py-px text-[11px] text-muted-foreground">
                  {ch.tag}
                </span>
                <p className="mt-3 flex-1 text-[13.5px] leading-[1.7] text-muted-foreground">
                  {ch.body}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-1">
                  {ch.steps.map((s, i) => (
                    <span key={s} className="flex items-center gap-1">
                      <code className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10.5px] text-foreground">
                        {s}
                      </code>
                      {i < ch.steps.length - 1 && <span className="text-[10px] text-muted-foreground">→</span>}
                    </span>
                  ))}
                </div>
                <p className="mt-3 border-t border-border pt-3 text-[11.5px] leading-relaxed text-muted-foreground/85">
                  <span className="font-medium text-foreground">Trade-off:</span> {ch.limits}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ FEATURED ============================ */}
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-xl">
              <h2 className="text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
                These are running right now
              </h2>
              <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-muted-foreground">
                Not screenshots. Each card below is the real widget, rendered in
                a sandboxed iframe, ticking and counting while you read this.
              </p>
            </div>
            <Link
              href="/components"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3.5 text-[13.5px] font-medium transition-colors hover:bg-background"
            >
              All {STATS.total} components
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((c) => (
              <ComponentCard key={c.slug} c={c} />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-all hover:-translate-y-px hover:border-border-strong hover:text-foreground"
              >
                <span aria-hidden>{cat.emoji}</span>
                {cat.name}
                <span className="font-mono text-[10.5px] opacity-60">
                  {COMPONENTS.filter((c) => c.category === cat.slug).length}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ REGISTRY ============================ */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-[1200px] items-start gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-primary">
              For agents and developers
            </p>
            <h2 className="mt-2 text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[34px]">
              A registry your agent can install from
            </h2>
            <p className="mt-3 text-pretty text-[15px] leading-[1.7] text-muted-foreground">
              Notion MCP and the Developer Platform made workspace-building an
              agent task. Agents need a manifest to work from, so we publish
              every component in the shadcn{" "}
              <code className="rounded bg-secondary px-1 py-px font-mono text-[13px]">registry-item</code>{" "}
              schema — with the HTML inlined, not linked.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {[
                "List everything from /r/index.json in one request",
                "Fetch a single component and get the full source inline",
                "POST /api/install with mode: plan to get the exact request sequence before you spend a token",
                "Self-contained HTML: no CDNs, no webfonts, no build step",
              ].map((f) => (
                <li key={f} className="flex gap-2.5 text-[14px] leading-relaxed text-muted-foreground">
                  <span className="mt-1 text-primary"><Check /></span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/registry"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 text-[14px] font-medium transition-colors hover:bg-secondary"
            >
              Open the registry
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-border-strong bg-card shadow-lg">
              <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-3 py-2">
                <span className="font-mono text-[11px] text-muted-foreground">claude-code · mcp config</span>
                <div className="ml-auto">
                  <CopyButton
                    compact
                    value={`{
  "mcpServers": {
    "blocksmith": {
      "registries": {
        "@blocksmith": "${"https://blocksmith.app"}/r/{name}.json"
      }
    }
  }
}`}
                  />
                </div>
              </div>
              <pre className="code-block overflow-auto border-0 rounded-none bg-transparent p-3.5 text-[12px]">
                <code>{`{
  "mcpServers": {
    "blocksmith": {
      "registries": {
        "@blocksmith": "https://blocksmith.app/r/{name}.json"
      }
    }
  }
}`}</code>
              </pre>
            </div>

            <div className="overflow-hidden rounded-xl border border-border-strong bg-card shadow-lg">
              <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-3 py-2">
                <span className="font-mono text-[11px] text-muted-foreground">GET /r/index.json</span>
                <span className="ml-auto rounded border border-border bg-background px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                  {STATS.total} items
                </span>
              </div>
              <pre className="code-block overflow-auto border-0 rounded-none bg-transparent p-3.5 text-[12px]">
                <code>{`{
  "$schema": "https://blocksmith.app/r/schema.json",
  "name": "@blocksmith",
  "version": "1.0.0",
  "registryDependencies": [],
  "items": [
    {
      "name": "pomodoro-timer",
      "type": "registry:component",
      "title": "Pomodoro timer",
      "description": "A focus timer with session tracking…",
      "categories": ["time"],
      "meta": { "kind": "widget", "tier": "free", "delivery": ["embed","html-block","download"] },
      "files": [{ "path": "pomodoro-timer.html", "type": "registry:file", "target": "…" }]
    }
    // …
  ]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ HONESTY ============================ */}
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--notion-red)]">
              What this cannot do
            </p>
            <h2 className="mt-2 text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
              The limitations, before you install anything
            </h2>
            <p className="mt-3 text-pretty text-[15px] leading-[1.7] text-muted-foreground">
              Every page in this catalog states what its components can and
              cannot do. Notion's sandbox and API have real edges, and discovering
              them after building a template for a client is expensive.
            </p>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-2">
            {[
              {
                t: "HTML blocks are sandboxed",
                rows: [
                  ["Interactive JS, CSS, canvas, WebAudio", "yes"],
                  ["localStorage — per browser, not synced to teammates", "partial"],
                  ["Reading the Notion page it sits on", "no"],
                  ["Writing back to Notion, or any external API", "no"],
                  ["Editing the code in place — you re-upload", "no"],
                ],
                note: "This is why our widgets take configuration as URL parameters or baked-in JSON, and why every data-driven component exists as a native recipe too.",
              },
              {
                t: "The API has four real gaps",
                rows: [
                  ["Databases, properties, relations, rollups, formulas", "yes"],
                  ["Views — table, board, chart, dashboard, since 2026-03-11", "yes"],
                  ["Button blocks — no button type in the public API", "no"],
                  ["Database automations — no endpoint at all", "no"],
                  ["Recurring templates — Business+ feature, no endpoint", "no"],
                  ["Dashboard view layouts — read-only after creation", "no"],
                ],
                note: "Recipes install everything installable, then give you the exact click path and the reason for each manual step.",
              },
            ].map((panel) => (
              <div key={panel.t} className="rounded-xl border border-border bg-card">
                <h3 className="border-b border-border px-4 py-3 text-[14.5px] font-semibold">{panel.t}</h3>
                <div className="divide-y divide-border">
                  {panel.rows.map(([label, state]) => (
                    <div key={String(label)} className="flex items-start gap-2.5 px-4 py-2.5">
                      <span
                        className={cn(
                          "mt-px grid size-[16px] shrink-0 place-items-center rounded-full text-[9.5px] font-bold",
                          state === "yes" && "bg-[color-mix(in_oklab,var(--notion-green)_16%,transparent)] text-[var(--notion-green)]",
                          state === "partial" && "bg-[color-mix(in_oklab,var(--notion-yellow)_20%,transparent)] text-[var(--notion-yellow)]",
                          state === "no" && "bg-[color-mix(in_oklab,var(--notion-red)_14%,transparent)] text-[var(--notion-red)]"
                        )}
                      >
                        {state === "yes" ? "✓" : state === "partial" ? "~" : "✕"}
                      </span>
                      <span className="text-[13px] leading-relaxed text-muted-foreground">{String(label)}</span>
                    </div>
                  ))}
                </div>
                <p className="border-t border-border bg-raised px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  {panel.note}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link href="/docs/sandbox" className="text-[13px] font-medium text-primary hover:underline">
              HTML block sandbox guide →
            </Link>
            <span className="text-border">|</span>
            <Link href="/docs/api-limits" className="text-[13px] font-medium text-primary hover:underline">
              API limits, cited →
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ PRICING ============================ */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[34px]">
              Free to use. Pro when it is worth it.
            </h2>
            <p className="mt-3 text-pretty text-[15px] leading-[1.7] text-muted-foreground">
              {STATS.free} of {STATS.total} components are free forever, including
              the HTML downloads. No account, no watermark, no attribution
              requirement.
            </p>
          </div>

          <div className="mx-auto mt-9 grid max-w-4xl gap-4 lg:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                cadence: "forever",
                cta: "Browse components",
                href: "/components?tier=free",
                highlight: false,
                items: [
                  `${STATS.free} components, widgets and recipes`,
                  "Embed URLs, no account",
                  "Full HTML download of every free widget",
                  "Registry read access for agents",
                  "Install-plan viewer — see every API call",
                ],
              },
              {
                name: "Pro",
                price: "$9",
                cadence: "per month",
                cta: "See what Pro adds",
                href: "/pricing",
                highlight: true,
                badge: "Free during beta",
                items: [
                  `All ${STATS.total} components`,
                  "Pro widgets: kanban, Gantt, org chart, whiteboard, mood",
                  "Native recipe installation through the API",
                  "Commercial use in templates you sell",
                  "Private registry mirror + versioned URLs",
                  "New components as they ship",
                ],
              },
              {
                name: "Teams",
                price: "$29",
                cadence: "per month",
                cta: "Talk to us",
                href: "/pricing",
                highlight: false,
                badge: "Waitlist",
                items: [
                  "Everything in Pro, 5 seats",
                  "Workspace-wide install with one token",
                  "Shared configuration presets",
                  "Custom-branded widgets on your domain",
                  "Priority support",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-xl border bg-card p-5",
                  plan.highlight
                    ? "border-primary/45 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_18%,transparent),0_16px_40px_-24px_rgba(35,131,226,0.5)]"
                    : "border-border"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-5 rounded-full border border-border-strong bg-background px-2 py-px text-[10.5px] font-semibold text-muted-foreground">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-[32px] font-semibold leading-none tracking-[-0.03em]">{plan.price}</span>
                  <span className="text-[12.5px] text-muted-foreground">{plan.cadence}</span>
                </div>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {plan.items.map((it) => (
                    <li key={it} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                      <span className="mt-[3px] text-primary"><Check /></span>
                      {it}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={cn(
                    "mt-5 inline-flex h-10 items-center justify-center rounded-xl text-[13.5px] font-semibold transition-all",
                    plan.highlight
                      ? "bg-foreground text-background hover:opacity-88"
                      : "border border-border-strong bg-background hover:bg-secondary"
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-center text-[12.5px] leading-relaxed text-muted-foreground">
            Pricing is a placeholder until the catalog is proven out. Pro is free
            during the beta and nobody who signed up early gets surprised by a
            charge later.
          </p>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
              Questions worth asking before you install
            </h2>
          </div>
          <div className="mt-8">
            <Faq />
          </div>
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-dotgrid opacity-[0.5] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_100%,black,transparent)]" />
        <div className="relative mx-auto w-full max-w-[1200px] px-4 py-20 text-center sm:px-6">
          <Badge variant="outline" className="mx-auto">
            <span className="size-1.5 rounded-full bg-[var(--notion-green)]" />
            {STATS.total} components · {STATS.widgets} live widgets · {STATS.native} installable systems
          </Badge>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
            Build the dashboard you kept sketching
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-[15.5px] leading-[1.7] text-muted-foreground">
            Copy an embed URL, or download a single HTML file and upload it to
            Notion. Either way it is on your page in under a minute.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/components"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-[14.5px] font-semibold text-background shadow-xs transition-all hover:opacity-88 active:scale-[0.98]"
            >
              Open the catalog
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-11 items-center rounded-xl border border-border-strong bg-card px-4 text-[14.5px] font-medium transition-colors hover:bg-secondary"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

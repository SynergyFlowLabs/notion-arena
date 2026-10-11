import Link from "next/link";
import type { Metadata } from "next";
import { COMPONENTS, STATS } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";
import { CATEGORY_ICONS, IconArrowRight, IconCheck, IconCheckCircle, IconCode, IconLink, IconTerminal, IconWrench, IconXCircle } from "@/components/icons";
import { ComponentCard } from "@/components/component-card";
import { HeroDashboard } from "@/components/site/hero-dashboard";
import { Faq } from "@/components/site/faq";
import { Button } from "@/components/ui/button";
import { NotionTag, notionInk } from "@/components/ui/notion-tag";

export const metadata: Metadata = {
  title: "Blocksmith — the component registry for Notion",
  description:
    "Feature-rich components Notion doesn't ship: interactive widgets that run as /embed URLs or native HTML blocks, and database systems that install through the Notion API. Browse, copy, install.",
};

/** The three channel cards, on the dark band. */
const CHANNELS = [
  {
    key: "embed",
    icon: IconLink,
    name: "Embed URL",
    lede: "Paste one URL into Notion's Embed block.",
    body: "Every widget is served from /embed/<slug> with a frame-ancestors * policy, so it renders on any Notion plan. Configuration lives in the query string, which means a configured widget is a single shareable link.",
    mono: "/embed/pomodoro-timer?work=25&accent=%23e03e3e",
    tint: "var(--tint-sky)",
    ink: "var(--tint-sky-ink)",
  },
  {
    key: "html-block",
    icon: IconCode,
    name: "HTML block",
    lede: "Upload the file and Notion renders it inline.",
    body: "Each widget is one self-contained .html file — inline CSS and JS, no network calls. The File Upload API turns it into a native HTML block that loads instantly and keeps working if this site goes away.",
    mono: "POST /v1/file_uploads → embed.file_upload",
    tint: "var(--tint-mint)",
    ink: "var(--tint-mint-ink)",
  },
  {
    key: "recipe",
    icon: IconTerminal,
    name: "Native recipe",
    lede: "Real databases, installed through the API.",
    body: "A recipe is a deterministic sequence of Notion API calls plus the steps no API can do for you. Read the plan before you run it: exact request count, endpoints, payload shapes, and every manual step.",
    mono: "POST /api/install { mode: \"plan\" }",
    tint: "var(--tint-lavender)",
    ink: "var(--tint-lavender-ink)",
  },
];

/** Notion genuinely cannot do these. Sourced in /docs/api-limits. */
const GAPS = [
  {
    n: "Button blocks are response-only",
    d: "You can read a button through the API; you cannot create one. Every “press this” interaction has to be built as a widget or left as a manual click.",
    ref: "/docs/api-limits",
  },
  {
    n: "Automations cannot be created by API",
    d: "Database automations are configured in the UI only. A recipe can build the schema an automation needs, then hand you the exact click-path to finish it.",
    ref: "/docs/recipes",
  },
  {
    n: "No recurring or native charts",
    d: "Recurring tasks and charts on your own data have to be expressed with formulas, rollups and views — or drawn by a widget that owns its rendering.",
    ref: "/components?category=time",
  },
  {
    n: "A synced block is one block deep",
    d: "Synced blocks mirror their original, but you cannot nest them arbitrarily. Reusable dashboard furniture has to be assembled page by page.",
    ref: "/docs/sandbox",
  },
];

const STEPS = [
  {
    k: "01",
    t: "Pick a component",
    d: "Filter by category, by delivery channel, or by whether it needs to be interactive. Every card runs the real file — what you see is what gets installed.",
    href: "/components",
    cta: "Browse the catalog",
  },
  {
    k: "02",
    t: "Configure it",
    d: "Change colours, labels, targets and data. The preview re-renders as you type and the URL updates, so a configured widget is just a link you can save.",
    href: "/how-it-works#config",
    cta: "See how configuration works",
  },
  {
    k: "03",
    t: "Put it in Notion",
    d: "Copy the embed URL, download the HTML file, or read the install plan for a native recipe. Three channels, one component.",
    href: "/how-it-works",
    cta: "Compare the channels",
  },
];

const REGISTRY_ROWS = [
  { ep: "GET", path: "/r/index.json", what: "Every component, metadata only" },
  { ep: "GET", path: "/r/schema.json", what: "The registry item schema" },
  { ep: "GET", path: "/r/<name>.json", what: "One component, file contents inlined" },
  { ep: "GET", path: "/embed/<slug>", what: "The widget, ready to iframe" },
  { ep: "GET", path: "/api/widget/<slug>", what: "Raw .html file, attachment" },
  { ep: "POST", path: "/api/install", what: "Plan an install, or run one" },
];

export default function HomePage() {
  const featured = [
    "kpi-strip",
    "habit-grid",
    "crm-pipeline",
    "gantt-timeline",
    "pomodoro-timer",
    "roi-calculator",
  ]
    .map((s) => COMPONENTS.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <>
      {/* ══ HERO — paper canvas, left-aligned, one deep shadow ═══════ */}
      <section className="relative overflow-hidden bg-background">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-x-12 gap-y-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:pt-20 lg:pb-24">
          <div className="reveal max-w-[34rem]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono rounded-[5px] bg-primary-wash px-2 py-1 text-primary-deep">
                components/{STATS.total}
              </span>
              <span className="label-mono rounded-[5px] border border-border bg-card px-2 py-1 text-ink-soft">
                notion-version 2026-03-11
              </span>
            </div>

            <h1 className="font-display mt-5 text-[2.5rem] font-bold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[3.25rem] lg:text-display lg:leading-[1] lg:tracking-[-0.0332em]">
              Notion gives you
              <br className="hidden sm:block" /> a page and a database.
              <br className="hidden sm:block" /> This is the rest.
            </h1>

            <p className="mt-5 max-w-[30rem] text-lede text-ink-soft">
              A registry of components Notion does not ship: {STATS.widgets}{" "}
              interactive widgets that run inside a page, and {STATS.native}{" "}
              database systems that install through the API.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-11 px-5 text-[15px] sm:w-auto">
                <Link href="/components">Browse {STATS.total} components</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5 text-[15px] sm:w-auto">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>

            {/* three honest facts, hairline-separated rather than dot-joined */}
            <ul className="mt-8 flex flex-col gap-2.5 border-t border-border pt-6 sm:flex-row sm:gap-6">
              {[
                `${STATS.free} free, no account`,
                "Runs offline in Notion",
                "MIT unless marked Pro",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                  <IconCheck size={14} className="shrink-0 text-notion-green" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal reveal-2">
            <HeroDashboard />
          </div>
        </div>
      </section>

      {/* ══ CHANNELS — dark band interrupting the canvas ════════════ */}
      <section className="band">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="label-mono text-band-muted">three ways in</p>
              <h2 className="font-display mt-3 text-h2 text-band-foreground">
                One component, three delivery channels
              </h2>
            </div>
            <p className="max-w-sm text-[14.5px] leading-relaxed text-band-muted">
              Widgets ship as one self-contained file that serves both the embed
              and the HTML block. Recipes are API calls plus documented
              click-paths.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.key}
                  className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span
                    className="grid size-10 place-items-center rounded-lg"
                    style={{ background: c.tint, color: c.ink }}
                  >
                    <Icon size={20} />
                  </span>

                  <h3 className="mt-4 text-[19px] font-semibold leading-snug tracking-[-0.014em] text-band-foreground">
                    {c.name}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] font-medium text-band-foreground/75">
                    {c.lede}
                  </p>
                  <p className="mt-3 flex-1 text-[13.5px] leading-[1.65] text-band-muted">
                    {c.body}
                  </p>

                  <code
                    translate="no"
                    className="mt-5 block overflow-x-auto rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11.5px] whitespace-nowrap text-band-foreground/85"
                  >
                    {c.mono}
                  </code>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-[13.5px] text-band-muted">
            Not sure which one you need?{" "}
            <Link
              href="/how-it-works#choose"
              className="font-medium text-band-foreground underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/70"
            >
              There is a decision guide for that
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ══ FEATURED — pastel cards, live previews ══════════════════ */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-mono text-ink-faint">featured</p>
              <h2 className="font-display mt-3 text-h2 text-foreground">
                Running, not screenshotted
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                Every preview below is the actual file you would install, in an
                iframe. Hover one to interact with it.
              </p>
            </div>
            <Link
              href="/components"
              className="group inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-primary transition-colors hover:text-primary-deep"
            >
              All {STATS.total} components
              <IconArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <ComponentCard key={c.slug} c={c} live />
            ))}
          </div>

          {/* categories, as a hairline-separated index rather than a card grid */}
          <nav aria-label="Categories" className="mt-14 border-t border-border pt-8">
            <h2 className="label-mono text-ink-faint">browse by category</h2>
            <ul className="mt-4 grid gap-x-6 gap-y-px sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.slug as keyof typeof CATEGORY_ICONS];
                return (
                  <li key={cat.slug}>
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="group flex items-center gap-3 border-b border-border py-3 transition-colors hover:border-border-strong"
                    >
                      {Icon ? (
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
                          style={{ background: cat.tint, color: notionInk(cat.color) }}
                        >
                          <Icon size={17} />
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-medium text-foreground">
                          {cat.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">
                          {cat.blurb}
                        </span>
                      </span>
                      <IconArrowRight
                        size={15}
                        className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      {/* ══ THE GAPS — why this exists ══════════════════════════════ */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="label-mono text-ink-faint">the gap</p>
              <h2 className="font-display mt-3 text-h2 text-foreground">
                Four things Notion will not let you build
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                Every native recipe in this catalog cites the specific limitation
                it works around. These are not opinions about Notion — they are
                documented behaviour of the public API, and each one links to the
                source.
              </p>
              <Link
                href="/docs/api-limits"
                className="group mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-primary transition-colors hover:text-primary-deep"
              >
                Read the full limitation index
                <IconArrowRight
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {GAPS.map((g) => (
                <li key={g.n} className="flex flex-col bg-card p-5">
                  <span className="flex items-start gap-2.5">
                    <IconXCircle size={17} className="mt-px shrink-0 text-destructive" />
                    <span className="text-[15px] font-semibold leading-snug tracking-[-0.008em] text-foreground">
                      {g.n}
                    </span>
                  </span>
                  <p className="mt-2.5 flex-1 pl-[27px] text-[13.5px] leading-[1.65] text-ink-soft">
                    {g.d}
                  </p>
                  <Link
                    href={g.ref}
                    className="mt-3.5 inline-flex w-fit items-center gap-1 pl-[27px] font-mono text-[11px] text-ink-faint transition-colors hover:text-primary"
                  >
                    {g.ref.replace(/^\//, "")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — a genuine sequence, so numbering is earned ══ */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <p className="label-mono text-ink-faint">workflow</p>
          <h2 className="font-display mt-3 max-w-2xl text-h2 text-foreground">
            From browsing to installed in three steps
          </h2>

          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.k}
                className="relative flex flex-col rounded-xl border border-border bg-card p-6"
              >
                {/* the connector is the structure, not a decoration */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -right-4 hidden h-px w-4 bg-border-strong lg:block"
                  />
                )}
                <span className="font-mono text-[12px] font-semibold text-primary tnum">
                  {s.k}
                </span>
                <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-[-0.012em] text-foreground">
                  {s.t}
                </h3>
                <p className="mt-2.5 flex-1 text-[14px] leading-[1.65] text-ink-soft">
                  {s.d}
                </p>
                <Link
                  href={s.href}
                  className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary transition-colors hover:text-primary-deep"
                >
                  {s.cta}
                  <IconArrowRight
                    size={15}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ REGISTRY — the developer surface ════════════════════════ */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid w-full max-w-[1240px] gap-x-12 gap-y-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <p className="label-mono text-ink-faint">machine-readable</p>
            <h2 className="font-display mt-3 text-h2 text-foreground">
              A registry an agent can read
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              The catalog is published as JSON in the shadcn registry format, so a
              script or a coding agent can discover components, read their
              parameters, and pull raw file contents without scraping a page.
            </p>

            <pre className="code-block mt-6" translate="no">
{`// components.json
{
  "registries": {
    "@blocksmith": "https://blocksmith.app/r/{name}.json"
  }
}`}
            </pre>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/registry">
                  <IconTerminal size={15} />
                  Open the registry
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/docs">
                  <IconWrench size={15} />
                  Read the docs
                </Link>
              </Button>
            </div>
          </div>

          {/* endpoint table — mono, tabular, hairline rows */}
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex items-center gap-2 border-b border-border bg-raised px-4 py-2.5">
              <IconCode size={15} className="text-ink-faint" />
              <span className="label-mono text-ink-soft">endpoints</span>
              <span className="ml-auto font-mono text-[10.5px] text-ink-faint">
                application/json · CORS *
              </span>
            </div>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Blocksmith registry and API endpoints</caption>
              <tbody>
                {REGISTRY_ROWS.map((r) => (
                  <tr key={r.path} className="border-b border-border last:border-0">
                    <td className="w-[52px] py-2.5 pl-4 align-top">
                      <span
                        className={
                          r.ep === "POST"
                            ? "rounded-[4px] bg-tint-lavender px-1.5 py-0.5 font-mono text-[10px] font-semibold text-tint-lavender-ink"
                            : "rounded-[4px] bg-tint-mint px-1.5 py-0.5 font-mono text-[10px] font-semibold text-tint-mint-ink"
                        }
                      >
                        {r.ep}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 align-top">
                      <code translate="no" className="font-mono text-[12.5px] text-foreground">
                        {r.path}
                      </code>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">
                        {r.what}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════════════════════ */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="label-mono text-ink-faint">pricing</p>
            <h2 className="font-display mt-3 text-h2 text-foreground">
              Free to browse, free to embed
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              {STATS.free} of {STATS.total} components are free under MIT,
              including every embed URL. Pro adds the rest of the catalog and
              API-driven installs.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                note: "Forever",
                tint: "var(--tint-stone)",
                ink: "var(--tint-stone-ink)",
                featured: false,
                items: [
                  `${STATS.free} components under MIT`,
                  "Embed URLs and HTML downloads",
                  "Registry read access",
                  "Install plan viewer",
                ],
                cta: { label: "Browse free components", href: "/components?tier=free" },
              },
              {
                name: "Pro",
                price: "$9",
                note: "per month, per person",
                tint: "var(--tint-sky)",
                ink: "var(--tint-sky-ink)",
                featured: true,
                items: [
                  `All ${STATS.total} components`,
                  "API recipe installs",
                  "Commercial use in sold templates",
                  "Free during beta",
                ],
                cta: { label: "See everything Pro unlocks", href: "/pricing" },
              },
              {
                name: "Teams",
                price: "$29",
                note: "per month, 5 seats",
                tint: "var(--tint-lavender)",
                ink: "var(--tint-lavender-ink)",
                featured: false,
                items: [
                  "Everything in Pro",
                  "Workspace-wide install",
                  "Shared configuration presets",
                  "Custom-branded widgets",
                ],
                cta: { label: "Read the Teams details", href: "/pricing#teams" },
              },
            ].map((t) => (
              <div
                key={t.name}
                className={
                  t.featured
                    ? "flex flex-col rounded-xl border-2 border-primary bg-card p-6"
                    : "flex flex-col rounded-xl border border-border bg-card p-6"
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-[5px] px-2 py-0.5 text-[12px] font-semibold"
                    style={{ background: t.tint, color: t.ink }}
                  >
                    {t.name}
                  </span>
                  {t.featured && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground">
                      Most chosen
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-[2.5rem] font-bold leading-none tracking-[-0.03em] text-foreground tnum">
                    {t.price}
                  </span>
                  <span className="text-[13px] text-ink-faint">{t.note}</span>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-border pt-5">
                  {t.items.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px] leading-snug text-ink-soft">
                      <IconCheck size={14} className="mt-0.5 shrink-0 text-notion-green" />
                      {i}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={t.featured ? "default" : "outline"}
                  className="mt-6 h-10 w-full text-[14.5px]"
                >
                  <Link href={t.cta.href}>{t.cta.label}</Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[13px] text-ink-faint">
            Pricing is provisional while Blocksmith is in beta. No billing is
            wired up yet, and nothing here charges you.{" "}
            <Link href="/pricing" className="font-medium text-primary underline underline-offset-4 hover:text-primary-deep">
              Full comparison on the pricing page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ══ PULL QUOTE — serif, once, per the type system ═══════════ */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-[820px] px-4 py-20 sm:px-6">
          <blockquote className="text-quote font-serif text-foreground">
            <p className="leading-[1.45]">
              “Notion gives you a page, a database, and a button you cannot create
              from the API. Everything in this catalog exists because of a gap
              exactly that specific.”
            </p>
          </blockquote>
          <p className="mt-6 flex items-center gap-2.5 text-[13px] text-ink-faint">
            <IconArrowRight size={14} className="text-primary" />
            <Link href="/docs/api-limits" className="font-mono text-[12px] text-primary underline underline-offset-4 hover:text-primary-deep">
              docs/api-limits
            </Link>
            <span>— where each limitation is sourced</span>
          </p>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════════════ */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <p className="label-mono text-ink-faint">questions</p>
              <h2 className="font-display mt-3 text-h2 text-foreground">
                What people ask before installing
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
                Short answers here. The long ones, with sources, are in the docs.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <NotionTag color="blue" icon={IconCheckCircle}>
                  Works on the Free plan
                </NotionTag>
                <NotionTag color="green">No network calls</NotionTag>
                <NotionTag color="purple">MIT licensed</NotionTag>
              </div>
            </div>
            <Faq />
          </div>
        </div>
      </section>

      {/* ══ CLOSING CTA — the one centred moment ════════════════════ */}
      <section className="band">
        <div className="mx-auto w-full max-w-[760px] px-4 py-24 text-center sm:px-6">
          <h2 className="font-display text-h1 text-band-foreground">
            Put something in your Notion today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-band-muted">
            {STATS.free} components are free and need no account. Copy an embed
            URL, or download the file and own it outright.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5 text-[15px] sm:w-auto">
              <Link href="/components?tier=free">Browse free components</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 border-white/20 bg-transparent px-5 text-[15px] text-band-foreground hover:border-white/40 hover:bg-white/10 hover:text-band-foreground sm:w-auto"
            >
              <Link href="/registry">Read the registry JSON</Link>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {["No account", "No card", `${STATS.total} components indexed`].map((f, i) => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-band-muted">
                {i > 0 && <span aria-hidden className="h-3 w-px bg-white/20" />}
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

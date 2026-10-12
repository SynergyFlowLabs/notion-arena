import Link from "next/link";
import type { Metadata } from "next";
import { COMPONENTS, STATS } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/types";
import { CATEGORY_ICONS, IconArrowRight, IconCheck, IconCheckCircle, IconCode, IconLink, IconTerminal, IconWrench, IconXCircle } from "@/components/icons";
import { ChannelBlockArt, ChannelEmbedArt, ChannelRecipeArt } from "@/components/illustrations";
import { ComponentCard } from "@/components/component-card";
import { HeroDashboard } from "@/components/site/hero-dashboard";
import { Faq } from "@/components/site/faq";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { NotionTag, notionInk } from "@/components/ui/notion-tag";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Notion Arena: the component registry for Notion",
  description:
    "Feature-rich components Notion doesn't ship: interactive widgets that run as /embed URLs or native HTML blocks, and database systems that install through the Notion API. Browse, copy, install.",
};

/** The three ways to drop a component into Notion. */
const CHANNELS = [
  {
    key: "embed",
    icon: IconLink,
    Art: ChannelEmbedArt,
    name: "Paste a link",
    lede: "Copy one URL, paste it into Notion's Embed block.",
    body: "No install, no upload, no account. Just paste the link on any Notion plan (even the free one) and the widget shows up, live and interactive. You can change colours and settings right in the URL.",
    mono: "/embed/pomodoro-timer?work=25&accent=%23e03e3e",
    tint: "var(--tint-sky)",
    ink: "var(--tint-sky-ink)",
  },
  {
    key: "html-block",
    icon: IconCode,
    Art: ChannelBlockArt,
    name: "Drop a file",
    lede: "Download one .html file and drag it onto a page.",
    body: "The widget lives inside your Notion workspace forever — no loading from our server, no downtime if this site disappears. Everything is self-contained in that one file and works fully offline.",
    mono: "one-file.html · drag & drop",
    tint: "var(--tint-mint)",
    ink: "var(--tint-mint-ink)",
  },
  {
    key: "recipe",
    icon: IconTerminal,
    Art: ChannelRecipeArt,
    name: "Install a system",
    lede: "For things that need real databases, like a CRM or a tracker.",
    body: "We give you a step-by-step plan: what to click, what we create for you through the Notion API, and the one or two manual steps Notion doesn't let us do automatically. You approve each step before it runs.",
    mono: "one-click install → ready-to-use database",
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
    d: "Recurring tasks and charts on your own data have to be expressed with formulas, rollups and views, or drawn by a widget that owns its rendering.",
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
    t: "Pick a component",
    d: "Filter by category, by delivery channel, or by whether it needs to be interactive. Every card runs the real file. What you see is what gets installed.",
    href: "/components",
    cta: "Browse components",
  },
  {
    t: "Configure it",
    d: "Change colours, labels, targets and data. The preview re-renders as you type and the URL updates, so a configured widget is just a link you can save.",
    href: "/how-it-works#config",
    cta: "See how configuration works",
  },
  {
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
    <PageTransition>
 {/* HERO : paper canvas, left-aligned headline + hand-drawn illustration */}
      <section className="relative overflow-hidden bg-background">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-y-10 px-4 pt-14 pb-20 sm:px-6 md:flex-row md:items-center md:gap-x-10 md:pt-20 md:pb-24 lg:gap-x-14 lg:pt-24 lg:pb-28">
          <div className="reveal reveal-1 w-full max-w-[34rem] md:w-[45%] md:max-w-none md:shrink-0">
            {/* Handwritten eyebrow badge — reads as a margin note, not a pill */}
            <div className="flex items-start">
              <span className="label-hand" aria-label={`${STATS.total} components in the registry`}>
                components / {STATS.total}
              </span>
            </div>

            <h1 className="font-display mt-7 text-[2.25rem] font-bold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[3.25rem] md:text-[2.6rem] lg:text-[3.75rem] lg:leading-[1.02] lg:tracking-[-0.035em]">
              Notion gives you a page{" "}
              <span className="whitespace-nowrap">and a database.</span>
              <br className="hidden sm:block" />
              <span className="text-foreground">This is the rest.</span>
            </h1>

            <p className="mt-5 max-w-[32rem] text-[1.05rem] leading-[1.6] text-ink-soft sm:text-lede">
              An open registry of {STATS.total} components Notion doesn&apos;t ship{" "}
              — {STATS.widgets} interactive widgets that run inside any page, plus{" "}
              {STATS.native} database systems that install straight through the API.
              Browse, preview, copy, done.
            </p>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 px-6 text-[15px] font-semibold sm:w-auto">
                <Link href="/components">
                  Browse components
                  <span className="ml-1.5" aria-hidden="true">→</span>
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-[15px] font-medium sm:w-auto">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>

          <div className="reveal reveal-2 flex w-full flex-1 items-center justify-center md:min-w-0 md:justify-end">
            <HeroDashboard />
          </div>
        </div>
      </section>

      {/* trust rail: a quiet divider under the hero that reads like a
          small-type promise bar, not a bulleted checklist. */}
      <section className="border-y border-border bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-3.5 sm:px-6">
          <div className="flex flex-col items-center justify-center gap-y-1.5 text-[12.5px] text-ink-faint sm:flex-row sm:flex-wrap sm:gap-x-6">
            <span className="flex items-center gap-1.5">
              <IconCheck size={13} className="shrink-0 text-notion-green" aria-hidden="true" />
              <strong className="font-semibold text-ink-soft">{STATS.free} free</strong>
              <span className="hidden sm:inline">· no account, no card</span>
            </span>
            <span className="hidden h-3 w-px bg-border-strong sm:inline-block" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <IconCheck size={13} className="shrink-0 text-notion-green" aria-hidden="true" />
              Runs offline inside Notion
            </span>
            <span className="hidden h-3 w-px bg-border-strong sm:inline-block" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <IconCheck size={13} className="shrink-0 text-notion-green" aria-hidden="true" />
              MIT licensed unless marked Pro
            </span>
            <span className="hidden h-3 w-px bg-border-strong sm:inline-block" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <IconCheck size={13} className="shrink-0 text-notion-green" aria-hidden="true" />
              Works with Claude Code, Cursor & any MCP client
            </span>
          </div>
        </div>
      </section>

 {/* CHANNELS : light paper, line-art cards in the hero's B&W language */}
      <section className="relative overflow-hidden bg-card">
        <div className="relative mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="label-mono text-ink-faint">three ways in</p>
              <h2 className="font-display mt-3 text-h2 text-foreground">
                One component, three ways to put it in Notion
              </h2>
            </div>
            <p className="max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
              Pick whichever fits how you work. All three show up as a normal
              block inside your page — no embed watermarks, no login required
              for the free stuff.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((c, i) => {
              const Icon = c.icon;
              const Art = c.Art;
              return (
                <div
                  key={c.key}
                  className="group flex flex-col rounded-2xl border border-border bg-background p-6 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.2)] dark:bg-card/60"
                >
                  {/* B&W line art in the hero illustration language */}
                  <div className="-mx-2 mb-4 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-[#faf9f7] dark:bg-black/30">
                    <Art className="h-full w-full text-foreground dark:text-band-foreground" />
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-8 place-items-center rounded-lg"
                      style={{ background: c.tint, color: c.ink }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                      Step {i + 1}
                    </span>
                  </div>

                  <h3 className="mt-3 text-[19px] font-semibold leading-snug tracking-[-0.014em] text-foreground">
                    {c.name}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] font-medium text-foreground/80">
                    {c.lede}
                  </p>
                  <p className="mt-3 flex-1 text-[13.5px] leading-[1.65] text-ink-soft">
                    {c.body}
                  </p>

                  <div className="mt-5 rounded-lg border border-border bg-secondary/60 px-3 py-2 font-mono text-[11.5px] text-ink-soft">
                    {c.mono}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-[13.5px] text-ink-faint">
            Not sure which one you need?{" "}
            <Link
              href="/how-it-works#choose"
              className="font-medium text-foreground underline underline-offset-4 decoration-border-strong transition-colors hover:text-primary hover:decoration-primary"
            >
              There&apos;s a short guide for that
            </Link>
            .
          </p>
        </div>
      </section>

 {/* FEATURED : pastel cards, live previews */}
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

 {/* THE GAPS : why this exists */}
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
                it works around. These are not opinions about Notion: they are
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

 {/* HOW IT WORKS : a genuine sequence, so numbering is earned */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6">
          <p className="label-mono text-ink-faint">workflow</p>
          <h2 className="font-display mt-3 max-w-2xl text-h2 text-foreground">
            From browsing to installed in three steps
          </h2>

          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.t}
                className="relative flex flex-col rounded-xl border border-border bg-card p-6"
              >
                {/* the connector is the structure, not a decoration */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -right-4 hidden h-px w-4 bg-border-strong lg:block"
                  />
                )}
                <h3 className="text-[18px] font-semibold leading-snug tracking-[-0.012em] text-foreground">
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

 {/* REGISTRY : the developer surface */}
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

            <div className="relative mt-6">
              <pre className="code-block overflow-auto pr-12" translate="no">
{`// components.json
{
  "registries": {
    "@notion-arena": "https://notionarena.vercel.app/r/{name}.json"
  }
}`}
              </pre>
              <div className="absolute right-2 top-2">
                <CopyButton compact value={`// components.json\n{\n  "registries": {\n    "@notion-arena": "https://notionarena.vercel.app/r/{name}.json"\n  }\n}`} />
              </div>
            </div>

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

 {/* endpoint table : mono, tabular, hairline rows */}
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex items-center gap-2 border-b border-border bg-raised px-4 py-2.5">
              <IconCode size={15} className="text-ink-faint" />
              <span className="label-mono text-ink-soft">endpoints</span>
              <span className="ml-auto font-mono text-[10.5px] text-ink-faint">
                application/json · CORS *
              </span>
            </div>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Notion Arena registry and API endpoints</caption>
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

 {/* PRICING */}
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
                      Recommended
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
            Pricing is provisional while Notion Arena is in beta. No billing is
            wired up yet, and nothing here charges you.{" "}
            <Link href="/pricing" className="font-medium text-primary underline underline-offset-4 hover:text-primary-deep">
              Full comparison on the pricing page
            </Link>
            .
          </p>
        </div>
      </section>

 {/* PULL QUOTE : serif, once, per the type system */}
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
            <span>, where each limitation is sourced</span>
          </p>
        </div>
      </section>

 {/* FAQ */}
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

 {/* CLOSING CTA : the one centred moment */}
      <section className="relative overflow-hidden border-t border-border bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_6%,transparent)_0%,transparent_70%)] blur-2xl" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[760px] px-4 py-24 text-center sm:px-6">
          <h2 className="font-display text-h1 text-foreground">
            Put something in your Notion today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-ink-soft">
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
              className="h-11 px-5 text-[15px] sm:w-auto"
            >
              <Link href="/registry">Read the registry JSON</Link>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {["No account", "No card", `${STATS.total} components indexed`].map((f, i) => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-ink-faint">
                {i > 0 && <span aria-hidden className="h-3 w-px bg-border-strong" />}
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageTransition>
  );
}

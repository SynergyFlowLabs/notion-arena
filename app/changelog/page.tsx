import type { Metadata } from "next";
import Link from "next/link";
import { COMPONENTS, STATS } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "What changed in Blocksmith, and which Notion API version it targets. Every entry says what shipped and what it depends on.",
};

type Entry = {
  version: string;
  date: string;
  title: string;
  kind: "release" | "platform" | "fix";
  body: string[];
  components?: string[];
  dependency?: string;
};

const ENTRIES: Entry[] = [
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "First public catalog",
    kind: "release",
    body: [
      `${STATS.widgets} widgets and ${STATS.native} native recipes published, ${STATS.free} of them free.`,
      "Three delivery channels working end to end: hosted /embed URLs, downloadable HTML blocks, and API-driven recipe installation.",
      "shadcn/ui-compatible registry at /r/index.json, /r/{name}.json and /r/schema.json, with widget HTML inlined rather than linked.",
      "POST /api/install with a plan mode that requires no credentials and returns the full ordered request sequence before anything touches your workspace.",
      "Every widget implements the same configuration contract: baked-in JSON, query-string overlay, declared-parameter whitelist, and universal theme and accent controls.",
    ],
    dependency: "Notion-Version 2026-03-11",
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Ten offline tools across time, learning, and operations",
    kind: "release",
    body: [
      "Time tools: Stopwatch Timer, World Clock Board, Year Progress, Date Difference Calculator, and Moon Phase.",
      "Learning tools: Reading Progress Tracker and Spaced Repetition Deck, with browser-local progress and schedules.",
      "Operations tools: Monthly Budget Planner, Inventory Counter, and Local Intake Form. Budget and stock edits remain in this browser; the form prepares copyable JSON and sends nothing.",
      "All ten are self-contained and offline. Use Notion databases or forms when data needs team sync, an audit trail, or a shared destination.",
    ],
    components: ["stopwatch", "world-clock", "year-progress", "date-calculator", "moon-phase", "reading-tracker", "spaced-repetition", "budget-planner", "inventory-tracker", "local-intake-form"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Month Calendar",
    kind: "release",
    body: [
      "An offline, read-only month grid with previous and next navigation, a jump-to-today control, selectable dates, and an agenda panel.",
      "Optional dated notes are supplied in widget config. The calendar does not read or write Notion data, sync with external calendars, or send network requests.",
      "Use a Notion database calendar for collaborative schedules. Keep private event details out of public embed URLs.",
    ],
    components: ["month-calendar"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Wellbeing and study widgets",
    kind: "release",
    body: [
      "Water Intake Tracker: one-tap daily logging with a goal ring, undo, date rollover, and browser-local state.",
      "Breathing Timer: box, 4 7 8, and equal-breathing patterns with pause, resume, reduced-motion support, and no sound.",
      "Flashcards: configurable question-and-answer decks, active-recall progress, optional shuffle, and browser-local mastery state.",
      "All three are self-contained, work offline, and do not write to Notion or sync local progress across devices.",
    ],
    components: ["water-tracker", "breathing-timer", "flashcards"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Visual components",
    kind: "release",
    body: [
      "Whiteboard: pan, zoom, freehand, shapes, sticky notes, and SVG export. State persists locally under blocksmith.whiteboard.v1.",
      "Org chart: delimited-string data model, collapsible branches, JSON and SVG export.",
      "Both export through the clipboard and always log the payload as a fallback, because clipboard writes need a user gesture and some WebViews block them.",
    ],
    components: ["whiteboard", "org-chart"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Planning components",
    kind: "release",
    body: [
      "Mini kanban with drag between columns and localStorage persistence.",
      "Gantt timeline with day-level positioning, dependency-free layout and a today marker.",
      "Eisenhower matrix with a seedable quadrant model via URI-encoded JSON.",
    ],
    components: ["mini-kanban", "gantt-timeline", "eisenhower-matrix"],
  },
  {
    version: "platform",
    date: "2026-03-11",
    title: "Notion ships HTML blocks and the Views API",
    kind: "platform",
    body: [
      "HTML blocks become installable through the API: reserve a file upload, send the bytes, append an embed block referencing the upload id.",
      "POST /v1/views lands, making board groups, timeline dates, chart axes, calendar ranges and form questions creatable from code for the first time.",
      "heading_4 and tab blocks are added; position replaces after for child placement; notifications gain a silent mode; database objects gain a typed database_type.",
      "This is the version every request in Blocksmith pins, and the reason native recipes can provision a workspace end to end rather than stopping at the databases.",
    ],
    dependency: "developers.notion.com/page/changelog",
  },
  {
    version: "platform",
    date: "2026-01-01",
    title: "Notion adds dashboard view caps, confetti and AI formulas",
    kind: "platform",
    body: [
      "Dashboard views gain a widget cap per view, which is why recipes create each chart as its own view rather than assuming an unlimited grid.",
      "Dashboard layouts remain read-only through the API: you can create the view and its widgets, but Notion composes the arrangement.",
      "Native button and automation coverage still has no public endpoint, so recipes continue to ship those as documented manual steps.",
    ],
  },
];

const KIND_STYLE: Record<Entry["kind"], { label: string; className: string }> = {
  release: {
    label: "Release",
    className: "border-[var(--notion-green)]/40 bg-[var(--notion-green)]/10 text-[var(--tag-ink-green)]",
  },
  platform: {
    label: "Notion platform",
    className: "border-[var(--notion-blue)]/40 bg-[var(--notion-blue)]/10 text-[var(--tag-ink-blue)]",
  },
  fix: {
    label: "Fix",
    className: "border-[var(--notion-yellow)]/40 bg-[var(--notion-yellow)]/12 text-[var(--tag-ink-yellow)]",
  },
};

export default function ChangelogPage() {
  const recent = [...COMPONENTS]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <PageTransition>
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[900px] px-4 pb-10 pt-14 sm:px-6">
          <p className="label-mono text-primary">
            Changelog
          </p>
          <h1 className="font-display mt-4 text-h2 text-foreground sm:text-h1">
            What shipped, and what it depends on
          </h1>
          <p className="mt-5 max-w-2xl text-lede text-ink-soft">
            Two kinds of entry: things we changed, and things Notion changed that
            we build on. The second kind matters more: a component library for
            Notion is only as stable as the API version it pins.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[12px] text-muted-foreground">
            pinned: <span className="font-semibold text-foreground">Notion-Version 2026-03-11</span>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[900px] px-4 pb-20 sm:px-6">
        <ol className="mt-10 flex flex-col">
          {ENTRIES.map((e, i) => (
            <li key={`${e.version}-${e.date}-${e.title}`} className="relative flex gap-4 pb-9">
              {/* rail */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-background",
                    e.kind === "release" && "bg-[var(--notion-green)]",
                    e.kind === "platform" && "bg-[var(--notion-blue)]",
                    e.kind === "fix" && "bg-[var(--tag-ink-yellow)]"
                  )}
                />
                {i < ENTRIES.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded border px-1.5 py-px text-[10.5px] font-semibold", KIND_STYLE[e.kind].className)}>
                    {KIND_STYLE[e.kind].label}
                  </span>
                  <code className="font-mono text-[11.5px] text-muted-foreground">v{e.version}</code>
                  <time dateTime={e.date} className="font-mono text-[11.5px] text-muted-foreground">
                    {e.date}
                  </time>
                </div>
                <h2 className="mt-1.5 text-h5 text-foreground">{e.title}</h2>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {e.body.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[13.5px] leading-[1.7] text-muted-foreground">
                      <span className="mt-[9px] size-1 shrink-0 rounded-full bg-border-strong" />
                      <span className="min-w-0">{b}</span>
                    </li>
                  ))}
                </ul>
                {e.components && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {e.components.map((slug) => {
                      const c = COMPONENTS.find((x) => x.slug === slug);
                      return (
                        <Link
                          key={slug}
                          href={`/components/${slug}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                        >
                          <span aria-hidden>{c?.emoji}</span>
                          {c?.name ?? slug}
                        </Link>
                      );
                    })}
                  </div>
                )}
                {e.dependency && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-raised px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                    depends on: {e.dependency}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-h6 text-foreground">Recently updated components</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Generated from the catalog, so it cannot drift from what the
              components page shows.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((c) => (
              <li key={c.slug} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[16px]">{c.emoji}</span>
                <Link href={`/components/${c.slug}`} className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:text-primary hover:underline">
                  {c.name}
                </Link>
                <code className="shrink-0 rounded border border-border bg-secondary px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
                  v{c.version}
                </code>
                <time dateTime={c.updatedAt} className="shrink-0 font-mono text-[11.5px] text-muted-foreground">
                  {c.updatedAt}
                </time>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-xl border border-dashed border-border-strong bg-raised p-5 text-center">
          <h2 className="text-h6 text-foreground">Nothing here is fabricated</h2>
          <p className="mx-auto mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
            There are no install counts, star counts or customer logos on this
            site, because there is nothing real to put there yet. When there is,
            it will appear here with a source.
          </p>
        </section>
      </div>
    </PageTransition>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { COMPONENTS } from "@/lib/catalog";
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
    title: "Twelve offline widgets for planning, people, and operations",
    kind: "release",
    body: [
      "Personal tools: Weekly Planner, Media Watchlist, and Family Calendar. Tasks, titles, and dates stay in this browser; there are no reminders, catalog lookups, playback, or calendar sync.",
      "Team and project tools: Team Directory, Team Announcements, SOP Runbook, Product Roadmap, and Weekly Status Report. These are local references and drafts, not a team system of record, distribution service, validated procedure, or linked issue tracker.",
      "Business tools: Request Queue, Campaign Planner, Interview Scorecard, and Quote Builder. Requests are not routed or approved; campaigns are not published or measured; scorecards calculate no overall score or recommendation; quote arithmetic is not tax or invoice advice.",
      "All twelve additions are free, offline, and browser-local, bringing the catalog to 107 components: 96 widgets and 11 native recipes. Local storage is not encrypted; use a shared system when collaboration, permissions, audit history, or official records are required.",
    ],
    components: ["weekly-planner", "media-watchlist", "family-calendar", "team-directory", "team-announcements", "sop-runbook", "product-roadmap", "weekly-status-report", "request-queue", "campaign-planner", "interview-scorecard", "quote-builder"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "First public catalog",
    kind: "release",
    body: [
      "Initial catalog: 39 components, including 28 widgets and 11 native recipes; 28 were free.",
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
    title: "Ten more taxonomy widgets for time, learning, and operations",
    kind: "release",
    body: [
      "Time tools: Event Count-Up and Interval Timer; location display: Sunrise & Sunset, calculated approximately from configured coordinates, date, and time zone.",
      "Personal tools: Daily Routine Checklist and Workout Set Tracker, with browser-local state; the Manual Currency Converter uses a rate entered by the user, not a live feed.",
      "Learning tools: Vocabulary Trainer and Citation Builder. Citation output is a quick draft and should be checked against the required style guide.",
      "Operations tools: Local Ticket Queue and Local Asset Checkout. Their state stays in this browser and provides no team sync, permissions, or audit trail.",
      "This brings the catalog to 49 components: 38 widgets and 11 native recipes. All ten additions are free, self-contained, and offline. Use a Notion database or a connected service when data needs shared access, a system of record, or external freshness.",
    ],
    components: ["count-up", "interval-timer", "routine-checklist", "workout-tracker", "currency-converter", "sunrise-sunset", "vocabulary-trainer", "citation-builder", "ticket-queue", "asset-checkout"],
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
    version: "1.0.0",
    date: "2026-10-11",
    title: "Ten more offline widgets for personal planning and everyday tools",
    kind: "release",
    body: [
      "Personal tools: Ambient Noise Generator uses locally synthesized audio after a user gesture; Subscription Tracker stores a manual list in this browser and has no provider or cancellation integration.",
      "Calculators: Bill Split Calculator applies the entered tax and tip percentages to the subtotal; Weighted Grade Calculator reports a weighted estimate for entered course components; Sleep Duration Calculator performs time arithmetic only.",
      "Writing and home planning: Word Counter keeps draft text in memory only; Weekly Meal Planner and Grocery List save their entries locally without Notion sync or nutrition advice.",
      "Travel and work: Trip Itinerary keeps date-and-time stops in this browser; Billable Time Tracker stores sessions locally and shows a rough rate estimate, not an audited timesheet or invoice.",
      "All ten additions are free, self-contained, and offline, bringing the catalog to 59 components: 48 widgets and 11 native recipes. Use a Notion database or connected service when records need shared access, permissions, or a system of record.",
    ],
    components: ["white-noise", "subscription-tracker", "bill-splitter", "grade-calculator", "word-counter", "meal-planner", "grocery-list", "trip-itinerary", "billable-time-tracker", "sleep-duration"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Twelve offline components for home, finance, study, and reference",
    kind: "release",
    body: [
      "Home and travel: Packing List, Household Chore Checklist, Pet Care Checklist, Plant Care Log, and Home Maintenance Log. Their entries remain in this browser, not in a shared household workspace.",
      "Pet, plant, and maintenance widgets are personal checklists or logs, not veterinary, plant-care, repair, or safety guidance.",
      "Finance: Expense Tracker totals entered expenses for the current month; Savings Goal Tracker, Net Worth Snapshot, and Manual Portfolio Tracker calculate from figures entered by the user. No bank connection, live prices, or financial advice.",
      "Study and reference: Class Timetable, Bookmark Library, and Reading List are local-only. Bookmarks accept http and https URLs, fetch no previews, and open only after a click; schedules and reading metadata are not externally verified.",
      "All twelve additions are free, self-contained, and offline, bringing the catalog to 71 components: 60 widgets and 11 native recipes. Use Notion databases when the records need team access, permissions, or sync.",
    ],
    components: ["packing-list", "chore-checklist", "pet-care-checklist", "plant-care-log", "home-maintenance-log", "expense-tracker", "savings-goal", "net-worth-snapshot", "portfolio-tracker", "class-timetable", "bookmark-library", "reading-list"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Twelve more offline tools for learning, planning, and visualization",
    kind: "release",
    body: [
      "Learning and reference: Assignment Tracker, Exam Planner, Study Session Log, Research Log, Glossary Builder, and Daily Journal. Coursework, notes, and journal text remain in browser-local storage; journal content is not encrypted, so avoid sensitive details.",
      "Meeting and project planning: Meeting Agenda, Decision Log, Action Item Tracker, and Project Risk Register. Entries are local drafts without team collaboration, reminders, approvals, or an audit trail; risk scores are simple qualitative priorities, not forecasts or professional evaluations.",
      "Visualization: Chart Builder plots manually entered values, and Concept Map Builder draws a small one-level personal diagram. Research links are user-entered http or https URLs with no fetching or previews.",
      "All twelve additions are free and offline, bringing the catalog to 83 components: 72 widgets and 11 native recipes. Use a Notion database when records need shared access, collaboration, or sync.",
    ],
    components: ["assignment-tracker", "exam-planner", "study-session-log", "research-log", "glossary-builder", "daily-journal", "meeting-agenda", "decision-log", "action-item-tracker", "risk-register", "chart-builder", "concept-map-builder"],
  },
  {
    version: "1.0.0",
    date: "2026-10-11",
    title: "Twelve offline tools for research and creative production",
    kind: "release",
    body: [
      "Research and writing: Course Notes, Literature Review Matrix, Lab Notebook, Protocol Checklist, Idea Inbox, Manuscript Progress Tracker, Chapter Outliner, Character and Setting Bible, and Submission Tracker. Notes and outlines stay in browser-local storage, which is not encrypted; the research tools do not verify sources or create regulated records.",
      "Podcasting: Podcast Episode Planner, Guest Prep Sheet, and Episode Production Checklist. Guest links are user-entered http or https URLs and are not fetched; nothing is published or sent.",
      "All twelve additions are free and offline, bringing the catalog to 95 components: 84 widgets and 11 native recipes. Manuscript Progress stores counts only, not manuscript text; use shared Notion databases when collaboration or permissions are needed.",
    ],
    components: ["course-notes", "literature-review-matrix", "lab-notebook", "protocol-checklist", "idea-inbox", "manuscript-progress", "chapter-outliner", "character-bible", "submission-tracker", "podcast-episode-planner", "guest-prep-sheet", "episode-production-checklist"],
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

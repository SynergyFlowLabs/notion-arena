"use client";

import { cn } from "@/lib/utils";
import { InitialsAvatar } from "@/components/avatar";
import { WidgetFrame } from "@/components/widget-frame";
import { planInstall, RECIPES } from "@/lib/recipes";

/**
 * The hero: a real Notion page surface with live components running inside it.
 *
 * Every widget pane is an iframe of the actual file a user would embed, so the
 * hero is proof rather than illustration. The surface is a picture of Notion
 * rather than of this site, so it carries its own themed token family
 * (`--mock-*`): a light page in light mode, Notion's dark page in dark mode,
 * and the iframes are told which theme the surface is in so they can never
 * disagree with the page they sit on.
 *
 * It carries the system's only deep shadow; everything else is flat with
 * hairline borders.
 */

/** Derived, so the label can never disagree with the real plan. */
const CRM_REQUESTS = planInstall(RECIPES["crm-pipeline"]).totalRequests;

const FRAMES: { slug: string; title: string; h: number; span: string; q?: string }[] = [
  { slug: "flip-clock", title: "Flip clock", h: 132, span: "sm:col-span-2" },
  {
    slug: "countdown",
    title: "Countdown",
    h: 132,
    span: "",
    q: "?label=Q4%20launch&to=2026-12-31&accent=%23d9730d&compact=true",
  },
  { slug: "kpi-strip", title: "KPI strip", h: 152, span: "sm:col-span-3" },
  {
    slug: "goal-ring",
    title: "Goal ring",
    h: 196,
    span: "sm:col-span-2",
    q: "?label=Q4%20revenue&value=68&target=100&unit=k&milestones=Kickoff,Beta,GA,Scale",
  },
  {
    slug: "pomodoro-timer",
    title: "Pomodoro",
    h: 196,
    span: "",
    q: "?work=25&short=5&label=Deep%20work&accent=%23e03e3e",
  },
];

export function HeroDashboard() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-border bg-[var(--mock-page)] shadow-mockup">
        {/* Notion window topbar */}
        <div className="flex h-9 items-center gap-2 border-b border-[var(--mock-line)] bg-[var(--mock-chrome)] px-3">
          <span className="size-2.5 rounded-full bg-[#e03e3e]/60" />
          <span className="size-2.5 rounded-full bg-[#dfab01]/60" />
          <span className="size-2.5 rounded-full bg-[#0f7b6c]/60" />

          {/* breadcrumbs, in Notion's app voice */}
          <div className="ml-2 flex min-w-0 items-center gap-1 text-[12px] text-[var(--mock-ink-soft)]">
            <span className="shrink-0">Foundry Labs</span>
            <span aria-hidden className="opacity-70">/</span>
            <span className="shrink-0">Engineering</span>
            <span aria-hidden className="opacity-70">/</span>
            <span className="truncate font-medium text-[var(--mock-ink)]">Q4 Dashboard</span>
          </div>

          <div className="ml-auto flex items-center gap-2 text-[var(--mock-ink-soft)]">
            <span className="hidden font-mono text-[10px] sm:inline">⌘K</span>
            {/* Generated branded avatars: a stable hash of the name picks the
                tint and block arrangement, so these match the ones an author
                would get elsewhere on the site. */}
            <span className="flex -space-x-1.5">
              {["Mira Kovač", "Jonas Rey", "Ada Okonkwo"].map((name) => (
                <span key={name} className="rounded-[6px] ring-2 ring-[var(--mock-chrome)]">
                  <InitialsAvatar name={name} size={18} />
                </span>
              ))}
            </span>
            <span className="rounded-[4px] border border-[var(--mock-line)] px-1.5 py-px text-[10px] font-medium">
              Share
            </span>
          </div>
        </div>

        {/* page body */}
        <div className="bg-[var(--mock-page)] px-4 py-4 sm:px-6 sm:py-5">
          {/* cover strip */}
          <div
            className="-mx-4 -mt-4 mb-4 h-14 sm:-mx-6 sm:-mt-5"
            style={{ background: "var(--mock-cover)" }}
          />

          <div className="-mt-9 flex items-end gap-2.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-[6px] bg-[var(--mock-page)] text-[24px] shadow-[var(--mock-icon-shadow)]">
              📊
            </span>
          </div>

          <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.021em] text-[var(--mock-ink)]">
            Q4 Dashboard
          </h2>

          {/* property rows, exactly how a Notion page header reads */}
          <dl className="mt-2.5 flex flex-col gap-1 text-[12.5px]">
            {[
              ["Owner", <span key="v" className="inline-flex items-center gap-1.5"><InitialsAvatar name="Mira Kovač" size={17} /><span className="text-[var(--mock-ink)]">Mira Kovač</span></span>],
              ["Status", <span key="v" className="inline-flex items-center rounded-[4px] bg-[var(--mock-tag-bg)] px-1.5 py-px text-[11.5px] font-medium text-[var(--mock-tag-ink)]">● On track</span>],
              ["Quarter", <span key="v" className="text-[var(--mock-ink)]">Oct 1 → Dec 31, 2026</span>],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center gap-2">
                <dt className="w-[68px] shrink-0 text-[var(--mock-ink-soft)]">{String(k)}</dt>
                <dd className="min-w-0">{v}</dd>
              </div>
            ))}
          </dl>

          <hr className="my-4 border-[var(--mock-line)]" />

          {/* the widget grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {FRAMES.map((f) => (
              <div
                key={f.slug}
                className={cn(
                  "overflow-hidden rounded-[6px] border border-[var(--mock-line)] bg-[var(--mock-card)]",
                  f.span
                )}
              >
                <WidgetFrame
                  src={`/embed/${f.slug}${f.q ?? ""}`}
                  title={f.title}
                  height={f.h}
                  loading="eager"
                  tabIndex={-1}
                  className="pointer-events-none select-none bg-[var(--mock-card)]"
                />
              </div>
            ))}

            {/* a native database block, so both halves of the product show */}
            <div className="overflow-hidden rounded-[6px] border border-[var(--mock-line)] bg-[var(--mock-card)] sm:col-span-3">
              <div className="flex items-center gap-2 border-b border-[var(--mock-line)] bg-[var(--mock-chrome)] px-2.5 py-1.5">
                <span className="text-[13px]">💼</span>
                <span className="text-[12.5px] font-semibold text-[var(--mock-ink)]">Pipeline</span>
                <span className="rounded-[4px] border border-[var(--mock-line)] bg-[var(--mock-card)] px-1.5 py-px font-mono text-[9.5px] text-[var(--mock-ink-soft)]">
                  board · native
                </span>
                <span className="ml-auto text-[11.5px] text-[var(--mock-ink-soft)] tnum">12 deals</span>
              </div>
              <NativeBoard />
            </div>
          </div>
        </div>
      </div>

      {/* two quiet annotations, in mono: functional, not decorative */}
      <div className="pointer-events-none absolute -left-2 top-[38%] hidden rounded-[6px] border border-border bg-card px-2 py-1 font-mono text-[10.5px] text-ink-soft shadow-pop lg:block">
        <span className="text-notion-green">●</span> live widget, not an image
      </div>
      <div className="pointer-events-none absolute -right-3 bottom-16 hidden rounded-[6px] border border-border bg-card px-2 py-1 font-mono text-[10.5px] text-ink-soft shadow-pop lg:block">
        <span className="text-notion-purple">●</span> board below: {CRM_REQUESTS} API calls
      </div>
    </div>
  );
}

function NativeBoard() {
  const cols = [
    {
      name: "Qualified",
      ink: "var(--tag-ink-blue)",
      dot: "var(--notion-blue)",
      tint: "var(--tag-bg-blue)",
      cards: [
        { t: "Kestrel Labs · Starter", v: "$9.6k", p: "40%" },
        { t: "Meridian Freight", v: "$22k", p: "35%" },
      ],
    },
    {
      name: "Proposal out",
      ink: "var(--tag-ink-yellow)",
      dot: "var(--tag-ink-yellow)",
      tint: "var(--tag-bg-yellow)",
      cards: [
        { t: "Northwind · Platform", v: "$48k", p: "60%", hot: true },
        { t: "Halcyon Studio", v: "$14k", p: "55%" },
      ],
    },
    {
      name: "Negotiation",
      ink: "var(--tag-ink-orange)",
      dot: "var(--notion-orange)",
      tint: "var(--tag-bg-orange)",
      cards: [{ t: "Aurelia Health", v: "$180k", p: "20%" }],
    },
    {
      name: "Won",
      ink: "var(--tag-ink-green)",
      dot: "var(--notion-green)",
      tint: "var(--tag-bg-green)",
      cards: [
        { t: "Pinegrove Co-op", v: "$31k", p: "100%" },
        { t: "Tessellate", v: "$7.2k", p: "100%" },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-4">
      {cols.map((col) => (
        <div key={col.name} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <span className="size-1.5 rounded-full" style={{ background: col.dot }} />
            <span className="truncate text-[10.5px] font-semibold text-[var(--mock-ink)]">
              {col.name}
            </span>
            <span className="ml-auto text-[10px] text-[var(--mock-ink-soft)] tnum">{col.cards.length}</span>
          </div>
          {col.cards.map((card) => (
            <div
              key={card.t}
              className="rounded-[5px] border border-[var(--mock-line)] bg-[var(--mock-page)] px-1.5 py-1.5"
              style={card.hot ? { borderColor: "color-mix(in oklab, var(--notion-yellow) 55%, transparent)" } : undefined}
            >
              <div className="truncate text-[10.5px] font-medium leading-tight text-[var(--mock-ink)]">
                {card.t}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="font-mono text-[9.5px] text-[var(--mock-ink-soft)] tnum">{card.v}</span>
                <span
                  className="ml-auto rounded-[3px] px-1 font-mono text-[9px] tnum"
                  style={{ background: col.tint, color: col.ink }}
                >
                  {card.p}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

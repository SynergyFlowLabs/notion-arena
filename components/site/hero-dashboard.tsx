import { cn } from "@/lib/utils";

/**
 * The hero visual: a Notion-shaped dashboard assembled from five real
 * components. Every pane is a live iframe of the actual widget — the same file
 * a user would embed — so the hero is proof rather than illustration.
 */

const FRAMES: { slug: string; title: string; h: number; span: string; q?: string }[] = [
  { slug: "flip-clock", title: "Flip clock", h: 150, span: "sm:col-span-2" },
  { slug: "countdown", title: "Countdown", h: 150, span: "", q: "?label=Q4%20launch&to=2026-12-31&accent=%23d9730d&compact=true" },
  { slug: "kpi-strip", title: "KPI strip", h: 168, span: "sm:col-span-3" },
  { slug: "goal-ring", title: "Goal ring", h: 210, span: "sm:col-span-2", q: "?label=Q4%20revenue&value=68&target=100&unit=k&milestones=Kickoff,Beta,GA,Scale" },
  { slug: "pomodoro-timer", title: "Pomodoro", h: 210, span: "", q: "?work=25&short=5&label=Deep%20work&accent=%23e03e3e" },
];

function Frame({ slug, title, h, q = "" }: { slug: string; title: string; h: number; q?: string }) {
  return (
    <iframe
      src={`/embed/${slug}${q}`}
      title={title}
      loading="eager"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      scrolling="no"
      tabIndex={-1}
      style={{ height: h }}
      className="pointer-events-none block w-full border-0 bg-white select-none dark:bg-[#191919]"
    />
  );
}

export function HeroDashboard() {
  return (
    <div className="relative">
      {/* window chrome */}
      <div className="overflow-hidden rounded-2xl border border-border-strong bg-card shadow-[0_1px_2px_rgba(15,15,15,0.04),0_32px_64px_-32px_rgba(15,15,15,0.35)]">
        {/* title bar */}
        <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-3.5 py-2">
          <span className="size-2.5 rounded-full bg-[#e03e3e]/70" />
          <span className="size-2.5 rounded-full bg-[#dfab01]/70" />
          <span className="size-2.5 rounded-full bg-[#0f7b6c]/70" />
          <div className="ml-2 flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span className="truncate">Workspace</span>
            <span aria-hidden>/</span>
            <span className="truncate font-medium text-foreground">Q4 Dashboard</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden rounded border border-border bg-background px-1.5 py-px font-mono text-[10px] text-muted-foreground sm:inline">
              /embed
            </span>
            <span className="hidden rounded border border-border bg-background px-1.5 py-px font-mono text-[10px] text-muted-foreground md:inline">
              /html
            </span>
          </div>
        </div>

        {/* notion page body */}
        <div className="bg-background px-3 py-4 sm:px-5 sm:py-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[22px]">📊</span>
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-foreground">Q4 Dashboard</h2>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {FRAMES.map((f) => (
              <div
                key={f.slug}
                className={cn(
                  "overflow-hidden rounded-lg border border-border bg-background",
                  f.span
                )}
              >
                <Frame slug={f.slug} title={f.title} h={f.h} q={f.q} />
              </div>
            ))}

            {/* a native block pane, to show both halves of the product */}
            <div className="overflow-hidden rounded-lg border border-border bg-background sm:col-span-3">
              <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-2.5 py-1.5">
                <span className="text-[13px]">💼</span>
                <span className="text-[12px] font-semibold">Pipeline</span>
                <span className="rounded border border-border bg-background px-1.5 py-px font-mono text-[9.5px] text-muted-foreground">
                  native · board view
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">12 deals</span>
              </div>
              <NativeBoardMock />
            </div>
          </div>
        </div>
      </div>

      {/* floating labels */}
      <div className="pointer-events-none absolute -left-3 top-24 hidden rotate-[-4deg] rounded-lg border border-border-strong bg-background px-2.5 py-1.5 text-[11.5px] font-medium shadow-lg lg:block">
        <span className="text-[var(--notion-green)]">●</span> live widget, not an image
      </div>
      <div className="pointer-events-none absolute -right-4 bottom-28 hidden rotate-[3deg] rounded-lg border border-border-strong bg-background px-2.5 py-1.5 text-[11.5px] font-medium shadow-lg lg:block">
        <span className="text-[var(--notion-purple)]">●</span> installed with 41 API calls
      </div>
    </div>
  );
}

function NativeBoardMock() {
  const cols = [
    {
      name: "Qualified",
      color: "var(--notion-blue)",
      cards: [
        { t: "Kestrel Labs — Starter", v: "$9.6k", p: "40%" },
        { t: "Meridian Freight", v: "$22k", p: "35%" },
      ],
    },
    {
      name: "Proposal out",
      color: "var(--notion-yellow)",
      cards: [
        { t: "Northwind — Platform", v: "$48k", p: "60%", hot: true },
        { t: "Halcyon Studio", v: "$14k", p: "55%" },
      ],
    },
    {
      name: "Negotiation",
      color: "var(--notion-orange)",
      cards: [{ t: "Aurelia Health", v: "$180k", p: "20%" }],
    },
    {
      name: "Won",
      color: "var(--notion-green)",
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
            <span className="size-1.5 rounded-full" style={{ background: col.color }} />
            <span className="truncate text-[10.5px] font-semibold text-muted-foreground">{col.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/70">{col.cards.length}</span>
          </div>
          {col.cards.map((card) => (
            <div
              key={card.t}
              className={cn(
                "rounded-md border border-border bg-card px-1.5 py-1.5",
                card.hot && "border-[var(--notion-yellow)]/50"
              )}
            >
              <div className="truncate text-[10.5px] font-medium leading-tight">{card.t}</div>
              <div className="mt-1 flex items-center gap-1">
                <span className="font-mono text-[9.5px] text-muted-foreground">{card.v}</span>
                <span
                  className="ml-auto rounded px-1 font-mono text-[9px]"
                  style={{
                    background: `color-mix(in oklab, ${col.color} 16%, transparent)`,
                    color: col.color,
                  }}
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

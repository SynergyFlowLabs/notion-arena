import { cn } from "@/lib/utils";
import { planInstall, RECIPES } from "@/lib/recipes";

/**
 * The hero: a real Notion page surface with live components running inside it.
 *
 * Every widget pane is an iframe of the actual file a user would embed, so the
 * hero is proof rather than illustration. It carries the system's only deep
 * shadow — everything else on the site is flat with hairline borders.
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
      className="pointer-events-none block w-full select-none border-0 bg-white"
    />
  );
}

export function HeroDashboard() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-mockup">
        {/* ── Notion window topbar ─────────────────────────────── */}
        <div className="flex h-9 items-center gap-2 border-b border-[rgba(13,13,12,0.08)] bg-[#fbfbfa] px-3">
          <span className="size-2.5 rounded-full bg-[#e03e3e]/60" />
          <span className="size-2.5 rounded-full bg-[#dfab01]/60" />
          <span className="size-2.5 rounded-full bg-[#0f7b6c]/60" />

          {/* breadcrumbs, in Notion's app voice */}
          <div className="ml-2 flex min-w-0 items-center gap-1 text-[12px] text-app-ink/75">
            <span className="shrink-0">Acme</span>
            <span aria-hidden className="text-app-ink/60">/</span>
            <span className="shrink-0">Engineering</span>
            <span aria-hidden className="text-app-ink/60">/</span>
            <span className="truncate font-medium text-app-ink">Q4 Dashboard</span>
          </div>

          <div className="ml-auto flex items-center gap-2 text-app-ink/75">
            <span className="hidden font-mono text-[10px] sm:inline">⌘K</span>
            <span className="flex -space-x-1.5">
              {["MK", "JR", "AO"].map((s, i) => (
                <span
                  key={s}
                  className="grid size-[18px] place-items-center rounded-full border border-white text-[8px] font-semibold text-white"
                  style={{ background: ["#0b6e99", "#6940a5", "#0f7b6c"][i] }}
                >
                  {s}
                </span>
              ))}
            </span>
            <span className="rounded-[4px] border border-[rgba(13,13,12,0.12)] px-1.5 py-px text-[10px] font-medium text-app-ink/80">
              Share
            </span>
          </div>
        </div>

        {/* ── page body ────────────────────────────────────────── */}
        <div className="bg-white px-4 py-4 sm:px-6 sm:py-5">
          {/* cover strip */}
          <div
            className="-mx-4 -mt-4 mb-4 h-14 sm:-mx-6 sm:-mt-5"
            style={{
              background:
                "linear-gradient(103deg, #eaf3fb 0%, #f1eefb 42%, #fbf4e3 100%)",
            }}
          />

          <div className="-mt-9 flex items-end gap-2.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-[6px] bg-white text-[24px] shadow-[0_1px_3px_rgba(13,13,12,0.12)]">
              📊
            </span>
          </div>

          <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.021em] text-app-ink">
            Q4 Dashboard
          </h2>

          {/* property rows, exactly how a Notion page header reads */}
          <dl className="mt-2.5 flex flex-col gap-1 text-[12.5px]">
            {[
              ["Owner", <span key="v" className="inline-flex items-center gap-1.5"><span className="grid size-[17px] place-items-center rounded-full bg-[#0b6e99] text-[8px] font-semibold text-white">MK</span><span className="text-app-ink">Mira Kovač</span></span>],
              ["Status", <span key="v" className="inline-flex items-center rounded-[4px] bg-[#ebf5f0] px-1.5 py-px text-[11.5px] font-medium text-[#14715f]">● On track</span>],
              ["Quarter", <span key="v" className="text-app-ink">Oct 1 → Dec 31, 2026</span>],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center gap-2">
                <dt className="w-[68px] shrink-0 text-app-ink/75">{String(k)}</dt>
                <dd className="min-w-0">{v}</dd>
              </div>
            ))}
          </dl>

          <hr className="my-4 border-[rgba(13,13,12,0.09)]" />

          {/* the widget grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {FRAMES.map((f) => (
              <div
                key={f.slug}
                className={cn(
                  "overflow-hidden rounded-[6px] border border-[rgba(13,13,12,0.1)] bg-white",
                  f.span
                )}
              >
                <Frame slug={f.slug} title={f.title} h={f.h} q={f.q} />
              </div>
            ))}

            {/* a native database block, so both halves of the product show */}
            <div className="overflow-hidden rounded-[6px] border border-[rgba(13,13,12,0.1)] bg-white sm:col-span-3">
              <div className="flex items-center gap-2 border-b border-[rgba(13,13,12,0.08)] bg-[#fbfbfa] px-2.5 py-1.5">
                <span className="text-[13px]">💼</span>
                <span className="text-[12.5px] font-semibold text-app-ink">Pipeline</span>
                <span className="rounded-[4px] border border-[rgba(13,13,12,0.12)] bg-white px-1.5 py-px font-mono text-[9.5px] text-app-ink/75">
                  board · native
                </span>
                <span className="ml-auto text-[11.5px] text-app-ink/75 tnum">12 deals</span>
              </div>
              <NativeBoard />
            </div>
          </div>
        </div>
      </div>

      {/* two quiet annotations, in mono — functional, not decorative */}
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
        { t: "Kestrel Labs — Starter", v: "$9.6k", p: "40%" },
        { t: "Meridian Freight", v: "$22k", p: "35%" },
      ],
    },
    {
      name: "Proposal out",
      ink: "var(--tag-ink-yellow)",
      dot: "var(--tag-ink-yellow)",
      tint: "var(--tag-bg-yellow)",
      cards: [
        { t: "Northwind — Platform", v: "$48k", p: "60%", hot: true },
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
            <span className="truncate text-[10.5px] font-semibold text-app-ink/85">
              {col.name}
            </span>
            <span className="ml-auto text-[10px] text-app-ink/75 tnum">{col.cards.length}</span>
          </div>
          {col.cards.map((card) => (
            <div
              key={card.t}
              className="rounded-[5px] border border-[rgba(13,13,12,0.1)] bg-white px-1.5 py-1.5"
              style={card.hot ? { borderColor: "color-mix(in oklab, var(--notion-yellow) 55%, transparent)" } : undefined}
            >
              <div className="truncate text-[10.5px] font-medium leading-tight text-app-ink">
                {card.t}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="font-mono text-[9.5px] text-app-ink/75 tnum">{card.v}</span>
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

import type { Metadata } from "next";
import Link from "next/link";
import { STATS, COMPONENTS } from "@/lib/catalog";
import { Faq } from "@/components/site/faq";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Blocksmith pricing. Free components with no account, Pro for the full catalog and API installs. Pro is free during the beta.",
};

const FREE_LIST = COMPONENTS.filter((c) => c.tier === "free");
const PRO_LIST = COMPONENTS.filter((c) => c.tier === "pro");

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Everything you need to put a working widget on a Notion page.",
    cta: "Browse free components",
    href: "/components?tier=free",
    highlight: false,
    items: [
      [`${STATS.free} components`, true],
      ["Embed URLs, no account", true],
      ["Full HTML download of every free widget", true],
      ["Registry read access for agents", true],
      ["Install-plan viewer", true],
      ["Commercial use of what you download", true],
      ["Pro widgets", false],
      ["API-driven recipe installation", false],
      ["Private registry mirror", false],
    ] as [string, boolean][],
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "per month",
    blurb: "The full catalog, plus installation through the Notion API.",
    cta: "Start free during the beta",
    href: "#",
    highlight: true,
    badge: "Free during beta",
    items: [
      [`All ${STATS.total} components`, true],
      ["Pro widgets: kanban, Gantt, org chart, whiteboard, mood", true],
      ["Native recipe installation through the API", true],
      ["Commercial use in templates you sell", true],
      ["Versioned, pinned download URLs", true],
      ["New components as they ship", true],
      ["Private registry mirror", false],
      ["Multiple seats", false],
      ["Custom branding on your domain", false],
    ] as [string, boolean][],
  },
  {
    name: "Teams",
    price: "$29",
    cadence: "per month",
    blurb: "For consultants and agencies building workspaces for clients.",
    cta: "Join the waitlist",
    href: "#",
    highlight: false,
    badge: "Waitlist",
    items: [
      ["Everything in Pro", true],
      ["5 seats included", true],
      ["Workspace-wide install with one token", true],
      ["Shared configuration presets", true],
      ["Custom-branded widgets on your domain", true],
      ["Private registry mirror", true],
      ["Priority support", true],
      ["Unlimited seats", false],
      ["On-prem hosting", false],
    ] as [string, boolean][],
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1100px] px-4 pb-12 pt-14 text-center sm:px-6">
          <p className="label-mono text-primary">
            Pricing
          </p>
          <h1 className="font-display mt-4 text-h1 text-foreground sm:text-hero sm:leading-[1.04] sm:tracking-[-0.025em]">
            {STATS.free} components are free. They stay free.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lede text-ink-soft">
            No account to copy an embed URL. No account to download the HTML. No
            watermark, no attribution requirement, no “free trial that expires
            into a blank block”. Pro pays for the components that take real work
            to build and for installation through the API.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--notion-green)]/35 bg-[color-mix(in_oklab,var(--notion-green)_7%,transparent)] px-3 py-1.5 text-[13px] text-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--notion-green)] opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--notion-green)]" />
            </span>
            Pro is free during the beta. Nobody who starts now gets charged later without notice.
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-20 sm:px-6">
        {/* plans */}
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-xl border bg-card p-5",
                plan.highlight
                  ? "border-primary/45 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_18%,transparent),0_20px_48px_-28px_rgba(35,131,226,0.55)]"
                  : "border-border"
              )}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-5 rounded-full border border-border-strong bg-background px-2 py-px text-[10.5px] font-semibold text-muted-foreground">
                  {plan.badge}
                </span>
              )}
              <h2 className="text-h6 text-foreground">{plan.name}</h2>
              <p className="mt-1 min-h-[38px] text-[12.5px] leading-snug text-muted-foreground">{plan.blurb}</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[36px] font-semibold leading-none tracking-[-0.035em]">{plan.price}</span>
                <span className="text-[12.5px] text-muted-foreground">{plan.cadence}</span>
              </div>
              <Link
                href={plan.href}
                className={cn(
                  "mt-5 inline-flex h-10 items-center justify-center rounded-xl text-[13.5px] font-semibold transition-colors duration-150",
                  plan.highlight
                    ? "bg-foreground text-background hover:opacity-88"
                    : "border border-border-strong bg-background hover:bg-secondary"
                )}
              >
                {plan.cta}
              </Link>
              <ul className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
                {plan.items.map(([label, included]) => (
                  <li key={label} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-px grid size-[15px] shrink-0 place-items-center rounded-full text-[9px] font-bold",
                        included
                          ? "bg-[color-mix(in_oklab,var(--notion-green)_16%,transparent)] text-[var(--tag-ink-green)]"
                          : "bg-secondary text-muted-foreground/60"
                      )}
                    >
                      {included ? "✓" : "–"}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] leading-snug",
                        included ? "text-muted-foreground" : "text-muted-foreground/55 line-through decoration-border-strong"
                      )}
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* what is in each tier */}
        <section className="mt-16">
          <h2 className="font-display text-h4 text-foreground">Exactly what is in each tier</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            No hidden gating. This list is generated from the catalog, so it
            cannot drift from what you actually see on the components page.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <h3 className="text-[14px] font-semibold">Free</h3>
                <span className="ml-auto rounded-full border border-border bg-secondary px-2 py-px font-mono text-[11px] text-muted-foreground">
                  {FREE_LIST.length}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {FREE_LIST.map((c) => (
                  <li key={c.slug} className="flex items-center gap-2.5 px-4 py-2">
                    <span className="text-[15px]">{c.emoji}</span>
                    <Link href={`/components/${c.slug}`} className="min-w-0 flex-1 truncate text-[13px] hover:text-primary hover:underline">
                      {c.name}
                    </Link>
                    <span className="shrink-0 font-mono text-[10.5px] uppercase text-muted-foreground/70">
                      {c.kind === "widget" ? "widget" : "recipe"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-primary/35 bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <h3 className="text-[14px] font-semibold">Pro</h3>
                <span className="ml-auto rounded-full border border-primary/40 bg-primary/10 px-2 py-px font-mono text-[11px] text-primary">
                  {PRO_LIST.length}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {PRO_LIST.map((c) => (
                  <li key={c.slug} className="flex items-center gap-2.5 px-4 py-2">
                    <span className="text-[15px]">{c.emoji}</span>
                    <Link href={`/components/${c.slug}`} className="min-w-0 flex-1 truncate text-[13px] hover:text-primary hover:underline">
                      {c.name}
                    </Link>
                    <span className="shrink-0 font-mono text-[10.5px] uppercase text-muted-foreground/70">
                      {c.kind === "widget" ? "widget" : "recipe"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* why */}
        <section className="mt-16">
          <h2 className="font-display text-h4 text-foreground">Why the line falls there</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                t: "Widgets are split by build cost, not by usefulness",
                d: "A pomodoro timer and a whiteboard are both genuinely useful. One is a few hundred lines and a ring; the other is a canvas engine with pan, zoom, shapes, sticky notes and SVG export. The pricing follows the effort, not a judgement about which matters more.",
              },
              {
                t: "Recipes are split by whether they are a system",
                d: "OKR, meeting notes, content calendar and job tracker are free — they are structures most people would build anyway. CRM, sprint tracking, invoicing, PARA and the client portal are Pro: they are multi-database systems with rollups, formulas and views that take real modelling.",
              },
              {
                t: "Downloads are never paywalled mid-flight",
                d: "If you downloaded a widget on the free tier, it keeps working. Nothing checks in, nothing expires, nothing renders a paywall inside a block you already installed.",
              },
              {
                t: "The API costs us something, so it is Pro",
                d: "Installing a recipe runs dozens of authenticated requests against Notion on your behalf, and hosting embed URLs is a real bandwidth cost at scale. Those are the two things Pro pays for.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-[14px] font-semibold">{c.t}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.7] text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* alternatives */}
        <section className="mt-16">
          <h2 className="font-display text-h4 text-foreground">Compared with the alternatives</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            Not a claim that these are bad products — they solve different
            problems. This is what you are actually choosing between.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-left">
                  <th className="px-3.5 py-2.5 font-semibold">Approach</th>
                  <th className="px-3.5 py-2.5 font-semibold">Typical cost</th>
                  <th className="px-3.5 py-2.5 font-semibold">What you get</th>
                  <th className="px-3.5 py-2.5 font-semibold">What you give up</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Blocksmith", "$0–9/mo", "Widgets in three delivery channels, installable database recipes, a machine-readable registry", "Widgets cannot read your Notion data — that is a Notion limit, not ours"],
                  ["Widget galleries", "Free / donation", "Dozens of hosted embed widgets", "Embed-only: no offline HTML block, no API install, no database recipes"],
                  ["Paid block bundles", "$149–$449 one-off", "A large pack of hand-built Notion templates and synced blocks", "A one-time purchase you update by hand; nothing scriptable"],
                  ["Notion Apps / Super", "$20–$100/mo", "Turn a database into a real web app or site", "A separate product outside Notion, and a subscription that scales with traffic"],
                  ["Build it yourself", "Your time", "Exactly what you want", "The sandbox rules, the two-pass data-source problem, and the four API gaps — learned the hard way"],
                ].map((row, i) => (
                  <tr key={i} className={cn("border-b border-border last:border-0 align-top", i % 2 === 1 && "bg-raised/50", i === 0 && "bg-primary/[0.04]")}>
                    <td className="px-3.5 py-2.5 font-semibold">{row[0]}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-muted-foreground">{row[1]}</td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{row[2]}</td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* faq */}
        <section className="mt-16">
          <h2 className="font-display text-h4 text-foreground">Questions</h2>
          <div className="mt-4">
            <Faq />
          </div>
        </section>

        <section className="mt-14 rounded-xl border border-border-strong bg-card p-5 text-center">
          <h2 className="font-display text-h4 text-foreground">Start with the free tier</h2>
          <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
            {STATS.free} components, no account, no card. If one of them solves
            your problem, that is the end of the transaction.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/components?tier=free"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-[14px] font-semibold text-background transition-opacity hover:opacity-88"
            >
              Browse free components
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-10 items-center rounded-xl border border-border-strong bg-background px-4 text-[14px] font-medium transition-colors hover:bg-secondary"
            >
              Read how it works first
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPONENTS, componentsByCategory } from "@/lib/catalog";
import { CATEGORIES, type CategorySlug } from "@/lib/types";
import { ComponentCard } from "@/components/component-card";
import { ThemedIllustration } from "@/components/illustrations";
import { PageTransition } from "@/components/page-transition";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return { title: "Category not found" };
  return {
    title: `${cat.name} components`,
    description: cat.blurb,
  };
}

/** What a category actually needs from Notion: the honest framing per group. */
const CATEGORY_NOTES: Record<CategorySlug, { problem: string; answer: string }> = {
  dashboards: {
    problem:
      "A dashboard's job is to answer a question in under two seconds. Notion's own Dashboard view can aggregate database numbers, but it cannot show a clock, a ring, a countdown or a strip of trend arrows. Those need pixels Notion does not draw.",
    answer:
      "Every component here is a widget, not a recipe: a self-contained HTML document that renders numbers you pass in, and that you can resize by dragging the block edge.",
  },
  time: {
    problem:
      "Notion has dates and durations, but no sense of now. There is no timer, no elapsed counter, no live countdown, because a block cannot tick without JavaScript running inside the page.",
    answer:
      "Widgets run real JS in a sandboxed iframe, so they can use requestAnimationFrame, the Web Audio API and setInterval. State persists in localStorage per browser, which is right for a personal timer and wrong for a shared log.",
  },
  trackers: {
    problem:
      "Trackers split into two different needs: something you tick off privately, and something your team can see. Notion does the second one natively and the first one badly.",
    answer:
      "Private trackers ship as widgets with localStorage. Shared trackers ship as native recipes with real databases, status properties and chart views, because a heatmap your colleague cannot see is not a tracker.",
  },
  planning: {
    problem:
      "Notion's Timeline and Board views are database-bound: they only work on rows, they only show properties, and you cannot drop a card onto a quarter that has no row.",
    answer:
      "Personal planners, checklists, and manual roadmaps are offline widgets with browser-local state. Structured, collaborative planning (such as sprints and content pipelines) is a recipe when it needs shared records, relations, or rollups.",
  },
  business: {
    problem:
      "This is the category where an iframe is actively the wrong answer. A pipeline, an invoice or an OKR tree needs relations, rollups, formulas and views that your whole team queries.",
    answer:
      "Native recipes create real databases for workflows that need shared records, relations, and team views. Standalone widgets here are personal draft queues, planning aids, scorecards, and calculators only; they stay local and are not an approval, hiring, publishing, or accounting system.",
  },
  visuals: {
    problem:
      "Notion's visual vocabulary stops at emoji, icons, covers and callouts. There is no drawing surface, no diagram primitive, no way to render a hierarchy as boxes and lines.",
    answer:
      "These are canvas-backed widgets. They export (SVG, JSON or clipboard) so what you draw can leave the sandbox, because the sandbox itself cannot write back to Notion.",
  },
  docs: {
    problem:
      "Documentation systems are mostly structure: the right databases, the right relations, the right template bodies, repeated consistently for months.",
    answer:
      "Recipes build that structure with real block trees (headings, toggles, callouts, synced blocks, column lists) so the workspace arrives already written rather than empty and hopeful.",
  },
  automations: {
    problem:
      "Buttons and database automations are Notion's answer to workflow, and neither can be created through the API. There is no button block type in the public reference, and no automation endpoint at all.",
    answer:
      "The recipe installs every database, property and view the automations depend on, then gives you the exact click path for each button and each rule, with the reason it has to be manual, quoted from the API reference.",
  },
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();

  const items = componentsByCategory(cat.slug);
  const widgets = items.filter((c) => c.kind === "widget");
  const natives = items.filter((c) => c.kind === "native");
  const note = CATEGORY_NOTES[cat.slug];

  return (
    <PageTransition>
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-9 pt-8 sm:px-6">
          <div className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <Link href="/components" className="hover:text-foreground">Components</Link>
            <span aria-hidden>/</span>
            <span className="text-foreground">{cat.name}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-[26px] shadow-xs">
              {cat.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-h2 text-foreground sm:text-hero sm:leading-[1.04] sm:tracking-[-0.025em]">
                {cat.name}
              </h1>
              <p className="mt-4 max-w-2xl text-lede text-ink-soft">
                {cat.blurb}
              </p>
            </div>
            {cat.slug === "planning" && (
              <ThemedIllustration
                name="planning"
                alt="Paper-like planner, checklist, and milestone map in a Notion-inspired illustration"
                className="hidden h-[120px] w-[180px] shrink-0 lg:block"
              />
            )}
            <div className="flex shrink-0 gap-2">
              {[
                ["components", items.length],
                ["widgets", widgets.length],
                ["recipes", natives.length],
              ].map(([label, n]) => (
                <div key={String(label)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-center">
                  <div className="text-[18px] font-semibold leading-tight tabular-nums">{n}</div>
                  <div className="label-mono text-ink-faint">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-8 sm:px-6">
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <div>
            <h2 className="label-mono text-[var(--tag-ink-red)]">
              Why Notion falls short here
            </h2>
            <p className="mt-2 text-[13.5px] leading-[1.7] text-muted-foreground">{note.problem}</p>
          </div>
          <div>
            <h2 className="label-mono text-[var(--tag-ink-green)]">
              How we handle it
            </h2>
            <p className="mt-2 text-[13.5px] leading-[1.7] text-muted-foreground">{note.answer}</p>
          </div>
        </div>

        {widgets.length > 0 && (
          <>
            <h2 className="mt-10 text-h5 text-foreground">
              Widgets <span className="ml-1 font-mono text-[12px] font-normal text-muted-foreground">{widgets.length}</span>
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {widgets.map((c) => (
                <ComponentCard key={c.slug} c={c} />
              ))}
            </div>
          </>
        )}

        {natives.length > 0 && (
          <>
            <h2 className="mt-10 text-h5 text-foreground">
              Native recipes <span className="ml-1 font-mono text-[12px] font-normal text-muted-foreground">{natives.length}</span>
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {natives.map((c) => (
                <ComponentCard key={c.slug} c={c} />
              ))}
            </div>
          </>
        )}

        <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <span className="mr-1 text-[12.5px] text-muted-foreground">Other categories:</span>
          {CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
            >
              <span aria-hidden>{c.emoji}</span>
              {c.name}
              <span className="font-mono text-[10.5px] opacity-60">
                {COMPONENTS.filter((x) => x.category === c.slug).length}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}

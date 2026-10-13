import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { withCanonical } from "@/lib/seo";
import { COMPONENTS, getComponent } from "@/lib/catalog";
import { CATEGORIES, categoryOf, isWidget } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { NotionTag } from "@/components/ui/notion-tag";
import { Configurator } from "@/components/detail/configurator";
import { RecipePanel } from "@/components/detail/recipe-panel";
import { ComponentCard } from "@/components/component-card";
import { getRecipe } from "@/lib/recipes";
import { htmlBlockInstallSnippet } from "@/lib/widget";
import { IconArrowRight, IconCheck, IconClose, IconDatabase, IconFrame } from "@/components/icons";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";

export function generateStaticParams() {
  return COMPONENTS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComponent(slug);
  if (!c) return { title: "Component not found" };
  return withCanonical(`/components/${slug}`, {
    title: c.name,
    description: `${c.tagline} ${c.description.slice(0, 120)}`,
    openGraph: { title: `${c.name} · Notion Arena`, description: c.tagline, type: "article" },
  });
}

const CAPABILITY_ROWS: {
  key: keyof import("@/lib/types").CatalogComponent["capabilities"];
  label: string;
  yes: string;
  no: string;
}[] = [
  { key: "interactive", label: "Interactive", yes: "Runs JS inside the block", no: "Static structure" },
  { key: "offlineSafe", label: "Offline-safe", yes: "No network calls, ever", no: "Needs a live connection" },
  { key: "persistsLocally", label: "Remembers state", yes: "localStorage, per browser", no: "Stateless" },
  { key: "writesToNotion", label: "Writes to your workspace", yes: "Creates real Notion objects", no: "Cannot read or write Notion data" },
  { key: "needsNetwork", label: "Needs the network", yes: "Loads from our host", no: "Fully self-contained" },
];

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getComponent(slug);
  if (!c) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const cat = categoryOf(c.category);
  const widget = isWidget(c) ? c : null;
  const recipe = !widget ? getRecipe((c as any).recipe) : null;

  const related = COMPONENTS.filter((x) => x.slug !== c.slug && x.category === c.category).slice(0, 3);
  const moreRelated = related.length
    ? related
    : COMPONENTS.filter((x) => x.slug !== c.slug && x.kind === c.kind).slice(0, 3);

  return (
    // Keyed so navigating between two components (the "pairs well with" row)
    // remounts the page and fires enter/exit; the router would otherwise
    // reconcile this same-route dynamic segment in place and animate nothing.
    <PageTransition key={c.slug}>
      {/* breadcrumb */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-1.5 px-4 py-2.5 text-[12.5px] text-ink-faint sm:px-6">
          <Link href="/" transitionTypes={["nav-back"]} className="transition-colors duration-150 hover:text-foreground">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link
            href="/components"
            transitionTypes={["nav-back"]}
            className="transition-colors duration-150 hover:text-foreground"
          >
            Components
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/categories/${cat.slug}`} className="transition-colors hover:text-foreground">{cat.name}</Link>
          <span aria-hidden>/</span>
          <span className="truncate text-foreground">{c.name}</span>
        </div>
      </div>

      {/* header */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-9 pt-8 sm:px-6">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl"
              style={{ background: cat.tint, color: `var(--tag-ink-${cat.color})` }}
            >
              <span className="text-[24px] leading-none">{c.emoji}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <NotionTag color={cat.color}>{cat.emoji} {cat.name}</NotionTag>
                <Badge variant={c.tier === "pro" ? "pro" : "free"}>{c.tier === "pro" ? "Pro" : "Free"}</Badge>
                <Badge variant="outline">
                  {c.kind === "widget" ? <IconFrame size={12} /> : <IconDatabase size={12} />}
                  {c.kind === "widget" ? "Widget" : "Native recipe"}
                </Badge>
                {c.badge === "new" && <Badge variant="new">New</Badge>}
                {c.badge === "popular" && <Badge variant="primary">Popular</Badge>}
                {c.badge === "staff-pick" && <Badge variant="pro">Staff pick</Badge>}
              </div>
              <h1 className="font-display mt-3 text-h3 text-foreground sm:text-h2">
                {c.name}
              </h1>
              <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                {c.tagline}
              </p>
            </div>
            <dl className="grid shrink-0 grid-cols-3 gap-0 overflow-hidden rounded-lg border border-border bg-card text-[11.5px]">
              <div className="flex flex-col gap-0.5 border-r border-border px-3 py-2">
                <dt className="font-mono uppercase tracking-wider text-ink-faint">Version</dt>
                <dd className="font-mono font-semibold text-foreground tabular-nums">v{c.version}</dd>
              </div>
              <div className="flex flex-col gap-0.5 border-r border-border px-3 py-2">
                <dt className="font-mono uppercase tracking-wider text-ink-faint">Updated</dt>
                <dd className="font-mono font-medium text-foreground tabular-nums">{c.updatedAt}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2">
                <dt className="font-mono uppercase tracking-wider text-ink-faint">Plan</dt>
                <dd className="font-medium text-foreground">{c.plan}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1240px] px-4 py-9 sm:px-6">
        {widget ? (
          <Configurator
            widget={widget}
            origin={origin}
            downloadUrl={`${origin}/api/widget/${widget.slug}`}
            htmlSnippet={htmlBlockInstallSnippet(widget.slug, {})}
            apiSnippet={`curl -X POST ${origin}/api/install \\
  -H 'content-type: application/json' \\
  -d '{
    "component": "${widget.slug}",
    "mode": "html-block",
    "token": "ntn_••••••••",
    "parentPageId": "••••••••-••••-••••-••••-••••••••••••",
    "config": { ${widget.params.slice(0, 3).map((p) => `"${p.key}": ${JSON.stringify(p.default)}`).join(", ")} }
  }'

# mode "embed" appends an /embed block pointing at the hosted URL instead`}
          />
        ) : recipe ? (
          <RecipePanel recipe={recipe} origin={origin} />
        ) : (
          <p className="text-sm text-ink-soft">This component has no definition yet.</p>
        )}

        {/* description + features */}
        <section className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h2 className="text-h3 text-foreground">About this component</h2>
            <p className="mt-3 max-w-2xl text-pretty text-[15px] leading-[1.7] text-ink-soft">
              {c.description}
            </p>

            <h3 className="mt-8 text-[15px] font-semibold tracking-[-0.01em] text-foreground">What it does</h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {c.features.map((f) => (
                <li key={f} className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
                  <span className="mt-[3px] grid size-[18px] shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--notion-green)_16%,transparent)] text-[var(--tag-ink-green)]">
                    <IconCheck size={10} strokeWidth={3} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 text-[15px] font-semibold tracking-[-0.01em] text-foreground">Where people put it</h3>
            <div className="mt-3 flex flex-col gap-2">
              {c.useCases.map((u) => (
                <div key={u} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
                  <span className="mt-0.5 text-ink-faint">↳</span>
                  <span className="text-[13.5px] leading-relaxed text-ink-soft">{u}</span>
                </div>
              ))}
            </div>
          </div>

          {/* capability card */}
          <aside className="min-w-0">
            <div className="lg:sticky lg:top-20 space-y-3">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border bg-raised px-3.5 py-2.5">
                  <h3 className="text-[13px] font-semibold text-foreground">Capabilities</h3>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                    What this component can and cannot do inside Notion. No
                    marketing words.
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {CAPABILITY_ROWS.map((row) => {
                    const on = c.capabilities[row.key];
                    return (
                      <div key={row.key} className="flex items-start gap-2.5 px-3.5 py-2.5">
                        <span
                          className={cn(
                            "mt-px grid size-[16px] shrink-0 place-items-center rounded-full text-[10px] font-bold",
                            on
                              ? "bg-[color-mix(in_oklab,var(--notion-green)_16%,transparent)] text-[var(--tag-ink-green)]"
                              : "bg-secondary text-ink-faint"
                          )}
                        >
                          {on ? (
                            <>
                              <IconCheck size={10} />
                              <span className="sr-only">Yes</span>
                            </>
                          ) : (
                            <>
                              <IconClose size={9} />
                              <span className="sr-only">No</span>
                            </>
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-foreground">{row.label}</div>
                          <div className="text-[11.5px] leading-snug text-ink-soft">
                            {on ? row.yes : row.no}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5">
                <h3 className="text-[12px] font-semibold text-foreground">Delivery channels</h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {c.delivery.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                      <span className="size-1.5 rounded-full bg-foreground" />
                      <code className="font-mono text-[11.5px] text-foreground">{d}</code>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5">
                <h3 className="text-[12px] font-semibold text-foreground">Tags</h3>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/components?q=${encodeURIComponent(t)}`}
                      className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-ink-faint transition-colors hover:border-border-strong hover:text-foreground"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* related */}
        {moreRelated.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h3 text-foreground">Pairs well with</h2>
              <Link
                href={`/categories/${cat.slug}`}
                className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground underline-offset-4 transition-colors hover:underline"
              >
                All in {cat.name}
                <IconArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {moreRelated.map((r) => (
                <ComponentCard key={r.slug} c={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}

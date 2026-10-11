import Link from "next/link";
import type { CatalogComponent } from "@/lib/types";
import { categoryOf, isWidget } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { NotionTag, notionInk } from "@/components/ui/notion-tag";
import { InView } from "@/components/in-view";
import { CATEGORY_ICONS, IconArrowRight } from "@/components/icons";
import { ComponentPreviewTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";

/**
 * Static stand-in for native recipes: a miniature Notion database, drawn rather
 * than screenshotted, in the category's property colour.
 */
function RecipeMock({ c }: { c: CatalogComponent }) {
  const cat = categoryOf(c.category);
  const features = c.features.slice(0, 4);
  const widths = [62, 38, 78, 26, 52];

  return (
    <div
      className="flex h-[168px] w-full flex-col gap-2 p-3"
      style={{ background: cat.tint }}
    >
      {/* database chrome */}
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] leading-none">{c.emoji}</span>
        <span className="truncate text-[11px] font-semibold text-foreground/80">
          {c.name}
        </span>
        <span className="ml-auto rounded-[4px] border border-foreground/12 bg-card/70 px-1 py-px font-mono text-[9px] text-ink-soft">
          board
        </span>
      </div>

      {/* table body */}
      <div className="flex flex-1 gap-2 overflow-hidden rounded-[6px] border border-foreground/10 bg-card p-2">
        <div className="flex w-[80px] shrink-0 flex-col gap-1.5 border-r border-border pr-2">
          {features.map((f) => (
            <span
              key={f}
              className="truncate text-[9.5px] leading-tight text-ink-soft"
              title={f}
            >
              {f}
            </span>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          {widths.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="h-[7px] rounded-[2px]"
                style={{
                  width: `${w}%`,
                  background: `color-mix(in oklab, var(--notion-${cat.color}) ${
                    [52, 30, 66, 22, 44][i]
                  }%, transparent)`,
                }}
              />
              <span
                className="ml-auto size-[7px] shrink-0 rounded-[2px]"
                style={{
                  background: `color-mix(in oklab, var(--notion-${cat.color}) ${
                    i % 2 ? 24 : 55
                  }%, transparent)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* endpoints it will call */}
      <div className="flex items-center gap-1">
        <span className="rounded-[4px] border border-foreground/10 bg-card/70 px-1.5 py-px font-mono text-[9px] text-ink-soft">
          POST /v1/databases
        </span>
        <span className="rounded-[4px] border border-foreground/10 bg-card/70 px-1.5 py-px font-mono text-[9px] text-ink-soft">
          POST /v1/views
        </span>
      </div>
    </div>
  );
}

export function ComponentCard({
  c,
  live = true,
}: {
  c: CatalogComponent;
  /** Mount a real iframe preview for widgets. */
  live?: boolean;
}) {
  const cat = categoryOf(c.category);
  const widget = isWidget(c) ? c : null;
  const CatIcon = CATEGORY_ICONS[c.category as keyof typeof CATEGORY_ICONS];
  // Relative src: the iframe is same-origin with the catalog page, and an
  // absolute URL computed on the server would point at the wrong host.
  const src = widget ? `/embed/${widget.slug}` : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        // Flat by design: hover darkens the hairline and the title ink. No lift,
        // no shadow stack: Notion's cards do not move.
        "transition-[border-color] duration-150 hover:border-border-strong"
      )}
    >
      <Link
        href={`/components/${c.slug}`}
        // Hierarchical: catalog -> detail. The slide direction says "deeper".
        transitionTypes={["nav-forward"]}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-offset-2"
        aria-label={`${c.name}: ${c.tagline}`}
      />

      <div className="relative border-b border-border bg-raised">
        <ComponentPreviewTransition slug={c.slug}>
        {widget && live && src ? (
          <InView
            className="block"
            fallback={
              <div
                className="grid w-full place-items-center"
                style={{ height: 168, background: cat.tint }}
              >
                <span className="text-[30px] leading-none opacity-80">{c.emoji}</span>
              </div>
            }
          >
            <div className="relative overflow-hidden" style={{ height: 168 }}>
              <iframe
                src={src}
                title={`${c.name} preview`}
                loading="lazy"
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                scrolling="no"
                tabIndex={-1}
                className="pointer-events-none absolute top-1/2 left-1/2 border-0 bg-white dark:bg-[#191919]"
                style={{
                  width: 520,
                  height: Math.min(widget.height, 336),
                  transform: "translate(-50%,-50%) scale(0.5)",
                }}
              />
            </div>
          </InView>
        ) : (
          <RecipeMock c={c} />
        )}

        </ComponentPreviewTransition>
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          {c.badge === "new" && <Badge variant="new">New</Badge>}
          {c.badge === "popular" && <Badge variant="primary">Popular</Badge>}
          {c.badge === "staff-pick" && <Badge variant="pro">Staff pick</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start gap-2.5">
          {CatIcon ? (
            <span
              className="mt-px grid size-7 shrink-0 place-items-center rounded-[6px]"
              style={{ background: cat.tint, color: notionInk(cat.color) }}
            >
              <CatIcon size={15} />
            </span>
          ) : (
            <span className="mt-px text-[17px] leading-none">{c.emoji}</span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold tracking-[-0.011em] text-card-foreground transition-colors group-hover:text-primary">
              {c.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.5] text-ink-soft">
              {c.tagline}
            </p>
          </div>
          <IconArrowRight
            size={15}
            className="mt-1 shrink-0 text-ink-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-2.5">
          <NotionTag color={cat.color}>{cat.name.split(" ")[0]}</NotionTag>
          <Badge variant={c.tier === "pro" ? "pro" : "free"}>
            {c.tier === "pro" ? "Pro" : "Free"}
          </Badge>
          <Badge variant="outline">{c.kind === "widget" ? "Widget" : "Native"}</Badge>
          <span className="ml-auto font-mono text-[10.5px] text-ink-faint tnum">
            v{c.version}
          </span>
        </div>
      </div>
    </article>
  );
}

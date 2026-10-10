import Link from "next/link";
import type { CatalogComponent } from "@/lib/types";
import { categoryOf, isWidget } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { NotionTag } from "@/components/ui/notion-tag";
import { InView } from "@/components/in-view";
import { cn } from "@/lib/utils";

/** Static stand-in shown until the iframe mounts, and for native recipes. */
function RecipeMock({ c }: { c: CatalogComponent }) {
  const cat = categoryOf(c.category);
  const features = c.features.slice(0, 3);
  return (
    <div className="flex h-[168px] w-full flex-col gap-2 bg-[linear-gradient(180deg,var(--color-secondary)_0%,var(--color-background)_100%)] p-3.5">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[var(--notion-green)]" />
        <span className="size-2 rounded-full bg-[var(--notion-yellow)]" />
        <span className="size-2 rounded-full bg-[var(--notion-red)]" />
        <span className="ml-1.5 truncate text-[10.5px] font-medium text-muted-foreground">
          {c.name} · Notion database
        </span>
      </div>
      <div className="flex flex-1 gap-1.5 overflow-hidden rounded-md border border-border bg-background p-2">
        <div className="flex w-[86px] shrink-0 flex-col gap-1 border-r border-border pr-1.5">
          {features.map((f) => (
            <span key={f} className="truncate text-[9.5px] leading-tight text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <span
                className="h-2 rounded-sm"
                style={{
                  width: `${[58, 40, 72, 30][i]}%`,
                  background: `color-mix(in oklab, var(--notion-${cat.color}) ${[45, 28, 60, 20][i]}%, transparent)`,
                }}
              />
              {i % 2 === 0 && (
                <span className="ml-auto size-1.5 rounded-full bg-[var(--notion-gray)]/40" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
        <span className="rounded border border-border bg-secondary px-1 py-px font-medium">
          POST /v1/databases
        </span>
        <span className="rounded border border-border bg-secondary px-1 py-px font-medium">
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
  /** mount a real iframe preview for widgets */
  live?: boolean;
}) {
  const cat = categoryOf(c.category);
  const widget = isWidget(c) ? c : null;
  // Relative src: the iframe is same-origin with the catalog page, and an
  // absolute URL computed on the server would point at the wrong host.
  const src = widget ? `/embed/${widget.slug}` : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_2px_4px_rgba(15,15,15,0.04),0_12px_32px_-16px_rgba(15,15,15,0.24)]"
      )}
    >
      <Link href={`/components/${c.slug}`} className="absolute inset-0 z-10" aria-label={c.name}>
        <span className="sr-only">View {c.name}</span>
      </Link>

      <div className="relative border-b border-border bg-secondary/40">
        {widget && live && src ? (
          <InView
            className="block"
            fallback={
              <div
                className="flex w-full items-center justify-center bg-[linear-gradient(180deg,var(--color-secondary)_0%,var(--color-background)_100%)]"
                style={{ height: 168 }}
              >
                <span className="text-3xl opacity-70">{c.emoji}</span>
              </div>
            }
          >
            <div className="relative" style={{ height: 168 }}>
              <iframe
                src={src}
                title={`${c.name} preview`}
                loading="lazy"
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                scrolling="no"
                tabIndex={-1}
                className="pointer-events-none absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 border-0 bg-white dark:bg-[#191919]"
                style={{
                  width: 520,
                  height: Math.min(widget.height, 336),
                  transform: "translate(-50%,-50%) scale(0.5)",
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
            </div>
          </InView>
        ) : (
          <RecipeMock c={c} />
        )}

        <div className="absolute right-2 top-2 z-20 flex gap-1">
          {c.badge === "new" && <Badge variant="new">New</Badge>}
          {c.badge === "popular" && <Badge variant="primary">Popular</Badge>}
          {c.badge === "staff-pick" && <Badge variant="pro">Staff pick</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start gap-2">
          <span className="mt-px text-[17px] leading-none">{c.emoji}</span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-card-foreground">
              {c.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
              {c.tagline}
            </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
          <NotionTag color={cat.color}>
            {cat.emoji} {cat.name.split(" ")[0]}
          </NotionTag>
          <Badge variant={c.tier === "pro" ? "pro" : "free"}>
            {c.tier === "pro" ? "Pro" : "Free"}
          </Badge>
          <Badge variant="outline">{c.kind === "widget" ? "Widget" : "Native"}</Badge>
          <span className="ml-auto text-[11px] text-muted-foreground/80">v{c.version}</span>
        </div>
      </div>
    </article>
  );
}

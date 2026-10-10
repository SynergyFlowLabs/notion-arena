"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COMPONENTS } from "@/lib/catalog";
import { CATEGORIES, type CategorySlug } from "@/lib/types";
import { ComponentCard } from "@/components/component-card";
import { cn } from "@/lib/utils";

type Kind = "all" | "widget" | "native";
type Tier = "all" | "free" | "pro";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "updated", label: "Recently updated" },
  { id: "name", label: "A–Z" },
] as const;

const BADGE_RANK: Record<string, number> = { "staff-pick": 0, popular: 1, new: 2 };

function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-all",
        active
          ? "border-foreground/25 bg-foreground text-background shadow-xs"
          : "border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("text-[10.5px] tabular-nums", active ? "opacity-70" : "opacity-55")}>
          {count}
        </span>
      )}
    </button>
  );
}

export function CatalogBrowser() {
  const router = useRouter();
  const sp = useSearchParams();

  const [query, setQuery] = React.useState(sp.get("q") ?? "");
  const [kind, setKind] = React.useState<Kind>((sp.get("kind") as Kind) ?? "all");
  const [tier, setTier] = React.useState<Tier>((sp.get("tier") as Tier) ?? "all");
  const [cats, setCats] = React.useState<CategorySlug[]>(
    (sp.get("category")?.split(",").filter(Boolean) as CategorySlug[]) ?? []
  );
  const [interactiveOnly, setInteractiveOnly] = React.useState(sp.get("interactive") === "1");
  const [live, setLive] = React.useState(sp.get("live") === "1");
  const [sort, setSort] = React.useState<(typeof SORTS)[number]["id"]>(
    (sp.get("sort") as any) ?? "featured"
  );

  // Debounce the URL so typing does not spam history entries.
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (kind !== "all") params.set("kind", kind);
    if (tier !== "all") params.set("tier", tier);
    if (cats.length) params.set("category", cats.join(","));
    if (interactiveOnly) params.set("interactive", "1");
    if (live) params.set("live", "1");
    if (sort !== "featured") params.set("sort", sort);
    const qs = params.toString();
    const t = setTimeout(() => router.replace(qs ? `/components?${qs}` : "/components", { scroll: false }), 220);
    return () => clearTimeout(t);
  }, [query, kind, tier, cats, interactiveOnly, live, sort, router]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = COMPONENTS.filter((c) => {
      if (kind !== "all" && c.kind !== kind) return false;
      if (tier !== "all" && c.tier !== tier) return false;
      if (cats.length && !cats.includes(c.category)) return false;
      if (interactiveOnly && !c.capabilities.interactive) return false;
      if (live && c.kind !== "widget") return false;
      if (!q) return true;
      const hay = [c.name, c.tagline, c.description, c.category, ...c.tags, ...c.features, ...c.useCases]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((token) => hay.includes(token));
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      const ra = a.badge ? BADGE_RANK[a.badge] ?? 9 : 9;
      const rb = b.badge ? BADGE_RANK[b.badge] ?? 9 : 9;
      if (ra !== rb) return ra - rb;
      return a.kind === b.kind ? 0 : a.kind === "widget" ? -1 : 1;
    });
    return list;
  }, [query, kind, tier, cats, interactiveOnly, live, sort]);

  const counts = React.useMemo(
    () => ({
      widget: COMPONENTS.filter((c) => c.kind === "widget").length,
      native: COMPONENTS.filter((c) => c.kind === "native").length,
      free: COMPONENTS.filter((c) => c.tier === "free").length,
      pro: COMPONENTS.filter((c) => c.tier === "pro").length,
    }),
    []
  );

  const active =
    !!query || kind !== "all" || tier !== "all" || cats.length > 0 || interactiveOnly || live;

  function clear() {
    setQuery("");
    setKind("all");
    setTier("all");
    setCats([]);
    setInteractiveOnly(false);
    setLive(false);
    setSort("featured");
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6">
      {/* search + sort */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components, tags, use cases…"
              aria-label="Search components"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13.5px] text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  sort === s.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <FilterChip active={kind === "all"} onClick={() => setKind("all")} count={COMPONENTS.length}>
            All
          </FilterChip>
          <FilterChip active={kind === "widget"} onClick={() => setKind("widget")} count={counts.widget}>
            Widgets
          </FilterChip>
          <FilterChip active={kind === "native"} onClick={() => setKind("native")} count={counts.native}>
            Native recipes
          </FilterChip>
          <span className="mx-1 h-4 w-px bg-border" />
          <FilterChip active={tier === "free"} onClick={() => setTier("free")} count={counts.free}>
            Free
          </FilterChip>
          <FilterChip active={tier === "pro"} onClick={() => setTier("pro")} count={counts.pro}>
            Pro
          </FilterChip>
          <span className="mx-1 h-4 w-px bg-border" />
          <FilterChip active={interactiveOnly} onClick={() => setInteractiveOnly((v) => !v)}>
            Interactive
          </FilterChip>
          {active && (
            <button
              type="button"
              onClick={clear}
              className="ml-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* categories */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const on = cats.includes(cat.slug);
          const n = COMPONENTS.filter((c) => c.category === cat.slug).length;
          return (
            <FilterChip
              key={cat.slug}
              active={on}
              count={n}
              onClick={() => setCats((prev) => (on ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]))}
            >
              <span aria-hidden>{cat.emoji}</span>
              {cat.name}
            </FilterChip>
          );
        })}
      </div>

      <p className="mt-4 text-[12.5px] text-muted-foreground" role="status" aria-live="polite">
        {results.length} component{results.length === 1 ? "" : "s"}
        {active ? " matching your filters" : " in the registry"}
      </p>

      {results.length ? (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
            <ComponentCard key={c.slug} c={c} />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong bg-raised px-6 py-16 text-center">
          <span className="text-3xl">🔍</span>
          <h3 className="text-[15px] font-semibold">Nothing matches that</h3>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Try a broader search, or clear the filters. If a component you need
            is missing, it is probably on the roadmap — tell us which.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-1 rounded-lg border border-border-strong bg-background px-3 py-1.5 text-[13px] font-medium hover:bg-secondary"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

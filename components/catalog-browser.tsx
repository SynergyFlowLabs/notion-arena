"use client";

import * as React from "react";
import { startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COMPONENTS } from "@/lib/catalog";
import { CATEGORIES, type CategorySlug } from "@/lib/types";
import { ComponentCard } from "@/components/component-card";
import { CATEGORY_ICONS, IconClose, IconSearch } from "@/components/icons";
import { EmptyCatalogArt } from "@/components/illustrations";
import { cn } from "@/lib/utils";

type Kind = "all" | "widget" | "native";
type Tier = "all" | "free" | "pro";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "updated", label: "Recently updated" },
  { id: "name", label: "A-Z" },
] as const;

const BADGE_RANK: Record<string, number> = { "staff-pick": 0, popular: 1, new: 2 };

function FilterChip({
  active,
  onClick,
  children,
  count,
  icon: Icon,
  tint,
  ink,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  /** Branded category glyph, where the chip represents a category. */
  icon?: (props: { size?: number; className?: string }) => React.ReactNode;
  tint?: string;
  ink?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium",
        "transition-[background-color,border-color,color] duration-150",
        active
          ? "border-[color-mix(in_oklab,var(--primary)_38%,transparent)] bg-primary-wash text-primary-deep"
          : "border-border bg-card text-ink-soft hover:border-border-strong hover:text-foreground"
      )}
    >
      {Icon ? (
        <span
          className="grid size-[18px] shrink-0 place-items-center rounded-[4px]"
          style={{
            background: active ? "transparent" : tint,
            color: active ? undefined : ink,
          }}
        >
          <Icon size={12} />
        </span>
      ) : null}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "font-mono text-[10.5px] tnum",
            active ? "text-primary-deep/75" : "text-ink-faint"
          )}
        >
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
    const t = setTimeout(
      () =>
        startTransition(() => {
          router.replace(qs ? `/components?${qs}` : "/components", { scroll: false });
        }),
      220
    );
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
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6">
      {/* search + sort */}
      <div
        style={{ viewTransitionName: "catalog-bar" }}
        className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components, tags, use cases…"
              aria-label="Search components"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "h-9 w-full rounded-lg border border-border bg-card py-0 pl-9 pr-8 text-[13.5px] text-foreground",
                "placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150",
                // A text field should show its ring on focus, not only on
                // keyboard focus: the user is always about to type.
                "focus:border-primary focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)] focus:outline-none",
                "[&::-webkit-search-cancel-button]:appearance-none"
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-[6px] text-ink-faint transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              >
                <IconClose size={13} />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Sort components"
            className="flex items-center gap-0.5 rounded-lg border border-border bg-raised p-0.5"
          >
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                aria-pressed={sort === s.id}
                className={cn(
                  "rounded-[6px] px-2.5 py-1.5 text-[12.5px] font-medium",
                  "transition-[background-color,color] duration-150",
                  sort === s.id
                    ? "bg-card text-foreground shadow-[var(--shadow-inset)]"
                    : "text-ink-soft hover:text-foreground"
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
          const Icon = CATEGORY_ICONS[cat.slug as keyof typeof CATEGORY_ICONS];
          return (
            <FilterChip
              key={cat.slug}
              active={on}
              count={n}
              icon={Icon}
              tint={cat.tint}
              ink={`var(--tag-ink-${cat.color})`}
              onClick={() => setCats((prev) => (on ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]))}
            >
              {cat.name}
            </FilterChip>
          );
        })}
      </div>

      <p
        className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-soft"
        role="status"
        aria-live="polite"
      >
        <span className="font-mono text-[12px] text-foreground tnum">
          {String(results.length).padStart(2, "0")}
        </span>
        component{results.length === 1 ? "" : "s"}
        {active ? " matching your filters" : " in the registry"}
        {active && (
          <button
            type="button"
            onClick={clear}
            className="ml-1 inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[12px] font-medium text-primary transition-colors duration-150 hover:bg-primary-wash hover:text-primary-deep"
          >
            <IconClose size={11} />
            Clear filters
          </button>
        )}
      </p>

      {results.length ? (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
            <ComponentCard key={c.slug} c={c} />
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong bg-raised px-6 py-16 text-center">
          <EmptyCatalogArt className="h-28 w-[210px] text-ink-faint" />
          <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.011em] text-foreground">
            Nothing matches those filters
          </h3>
          <p className="max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
            Broaden the search, or reset to the full catalog of{" "}
            {COMPONENTS.length} components. If something you need is missing, it
            is probably on the roadmap.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13.5px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-deep"
          >
            <IconClose size={13} />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

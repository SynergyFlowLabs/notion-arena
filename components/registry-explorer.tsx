"use client";

import * as React from "react";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

type Item = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  categories?: string[];
  meta?: Record<string, unknown>;
  files?: { path: string; type: string; target?: string }[];
};

export function RegistryExplorer({ origin }: { origin: string }) {
  const [index, setIndex] = React.useState<Item[] | null>(null);
  const [selected, setSelected] = React.useState<string>("pomodoro-timer");
  const [detail, setDetail] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    fetch("/r/index.json")
      .then((r) => r.json())
      .then((j) => setIndex(j.items ?? []))
      .catch(() => setError("Could not reach /r/index.json from your browser."));
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError("");
    fetch(`/r/${selected}.json`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        setDetail(JSON.stringify(await r.json(), null, 2));
      })
      .catch((e) => setError(`GET /r/${selected}.json failed (${e.message}).`))
      .finally(() => setLoading(false));
  }, [selected]);

  const filtered = (index ?? []).filter((i) =>
    q ? (i.name + " " + (i.title ?? "") + " " + (i.description ?? "")).toLowerCase().includes(q.toLowerCase()) : true
  );

  const bytes = new TextEncoder().encode(detail).length;

  return (
    <div className="overflow-hidden rounded-xl border border-border-strong bg-card shadow-lg">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/50 px-3 py-2">
        <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", index ? "bg-[var(--notion-green)]" : "bg-[var(--notion-yellow)]")} />
          GET /r/{selected}.json
        </span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground">
          {loading ? "fetching…" : detail ? `${(bytes / 1024).toFixed(1)} KB · live` : ""}
          {detail && <CopyButton compact value={detail} />}
        </span>
      </div>

      <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
        {/* item list */}
        <div className="border-b border-border bg-raised/40 md:border-b-0 md:border-r">
          <div className="p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter items…"
              aria-label="Filter registry items"
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-[12.5px] placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18"
            />
          </div>
          <div className="max-h-[420px] overflow-auto px-1 pb-2">
            {index === null && (
              <p className="px-2 py-3 text-[12px] text-muted-foreground">Loading index…</p>
            )}
            {filtered.map((i) => (
              <button
                key={i.name}
                type="button"
                onClick={() => setSelected(i.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                  selected === i.name ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{i.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1 py-px font-mono text-[9px] uppercase",
                    (i.meta as any)?.kind === "widget"
                      ? "bg-[color-mix(in_oklab,var(--notion-purple)_14%,transparent)] text-[var(--notion-purple)]"
                      : "bg-[color-mix(in_oklab,var(--notion-green)_14%,transparent)] text-[var(--notion-green)]"
                  )}
                >
                  {(i.meta as any)?.kind === "widget" ? "html" : "api"}
                </span>
              </button>
            ))}
            {index && filtered.length === 0 && (
              <p className="px-2 py-3 text-[12px] text-muted-foreground">No items match “{q}”.</p>
            )}
          </div>
        </div>

        {/* json */}
        <div className="min-w-0 bg-[var(--color-raised)]">
          {error && (
            <p className="m-3 rounded-lg border border-[var(--notion-red)]/30 bg-[color-mix(in_oklab,var(--notion-red)_6%,transparent)] px-3 py-2 text-[12.5px] text-foreground">
              {error}
            </p>
          )}
          <pre className="code-block max-h-[460px] overflow-auto rounded-none border-0 bg-transparent text-[11.5px]">
            <code>{detail || (loading ? "…" : "")}</code>
          </pre>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/40 px-3 py-2 text-[11.5px] text-muted-foreground">
        <span>
          {index ? `${index.length} items` : "—"} · schema{" "}
          <a href="/r/schema.json" className="font-mono text-primary hover:underline">
            /r/schema.json
          </a>
        </span>
        <span className="ml-auto font-mono">
          application/json · Access-Control-Allow-Origin: *
        </span>
      </div>
    </div>
  );
}

import Link from "next/link";
import { CATEGORIES } from "@/lib/types";
import { STATS } from "@/lib/catalog";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="grid size-14 place-items-center rounded-xl border border-border bg-card text-[26px] shadow-xs">
        🔍
      </div>
      <p className="mt-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary">
        404 · object_not_found
      </p>
      <h1 className="mt-2 text-balance text-[34px] font-semibold leading-[1.1] tracking-[-0.035em]">
        This block does not exist
      </h1>
      <p className="mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
        The Notion API returns{" "}
        <code className="rounded bg-secondary px-1 py-px font-mono text-[13px]">object_not_found</code>{" "}
        when you ask for something you cannot see — including things that exist
        but are not shared with your integration. Same idea here.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href="/components"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-[14px] font-semibold text-background transition-opacity hover:opacity-88"
        >
          Browse {STATS.total} components
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-xl border border-border-strong bg-card px-4 text-[14px] font-medium transition-colors hover:bg-secondary"
        >
          Back home
        </Link>
      </div>

      <div className="mt-10 w-full rounded-xl border border-border bg-raised p-4 text-left">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Popular destinations
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { href: "/components/pomodoro-timer", label: "Pomodoro timer" },
            { href: "/components/crm-pipeline", label: "CRM pipeline" },
            { href: "/components/habit-grid", label: "Habit grid" },
            { href: "/components/whiteboard", label: "Whiteboard" },
            { href: "/how-it-works", label: "How it works" },
            { href: "/registry", label: "Registry" },
            { href: "/docs/api-limits", label: "API limits" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="rounded-lg px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              {c.emoji} {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

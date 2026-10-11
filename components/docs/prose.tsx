import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";
import { IconExternal } from "@/components/icons";

/* A small set of server-rendered primitives so every docs page reads the same. */

export function DocPage({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageTransition>
    <article className="min-w-0">
      <header className="border-b border-border pb-6">
        <p className="label-mono text-primary">{eyebrow}</p>
        <h1 className="font-display mt-3 text-h3 text-foreground sm:text-h2">{title}</h1>
        <div className="mt-4 max-w-2xl text-lede text-ink-soft">{lede}</div>
      </header>
      <div className="mt-8 flex flex-col gap-9">{children}</div>
    </article>
    </PageTransition>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="font-display scroll-mt-24 text-h4 text-foreground"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-h5 scroll-mt-24 text-foreground">{children}</h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-2xl text-pretty text-[15px] leading-[1.75] text-ink-soft [&_a]:text-primary [&_a]:underline [&_a]:decoration-[color-mix(in_oklab,var(--primary)_35%,transparent)] [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:hover:text-primary-deep [&_a]:hover:decoration-primary-deep [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
      {children}
    </p>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="flex max-w-2xl flex-col gap-2 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-foreground">
      {children}
    </ul>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[14.5px] leading-[1.7] text-ink-soft">
      <span
        aria-hidden
        className="mt-[9px] size-1 shrink-0 rounded-full bg-border-strong"
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function Note({
  tone = "blue",
  title,
  children,
}: {
  tone?: "blue" | "red" | "yellow" | "green" | "gray";
  title: string;
  children: ReactNode;
}) {
  // Both values come from the audited tag pairs, so the note's ink always
  // clears 4.5:1 on its own surface in either theme.
  const color = `var(--tag-ink-${tone})`;
  const surface = `var(--tag-bg-${tone})`;
  const emoji = { blue: "💡", red: "⚠️", yellow: "🔧", green: "✅", gray: "📎" }[tone];
  return (
    <div
      className="max-w-2xl rounded-xl border p-4"
      style={{
        borderColor: `color-mix(in oklab, ${color} 26%, transparent)`,
        background: surface,
      }}
    >
      <div
        className="flex items-center gap-2 text-[13.5px] font-semibold"
        style={{ color }}
      >
        <span aria-hidden>{emoji}</span>
        {title}
      </div>
      <div className="mt-2 text-[13.5px] leading-[1.7] text-ink-soft [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-card/70 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-foreground">
        {children}
      </div>
    </div>
  );
}

export function Code({
  code,
  lang = "bash",
  filename,
  maxHeight = 460,
}: {
  code: string;
  lang?: string;
  filename?: string;
  maxHeight?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {filename && (
        <div className="flex items-center gap-2 border-b border-border bg-raised px-3 py-1.5">
          <span translate="no" className="font-mono text-[11px] text-ink-soft">
            {filename}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="rounded-[5px] border border-border bg-card px-1.5 py-px font-mono text-[10px] text-ink-faint">
              {lang}
            </span>
            <CopyButton compact value={code} />
          </span>
        </div>
      )}
      <div className="relative">
        {!filename && (
          <div className="absolute top-2 right-2 z-10">
            <CopyButton compact value={code} />
          </div>
        )}
        <pre className="code-block overflow-auto rounded-none border-0 bg-transparent pr-12" style={{ maxHeight }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function Table({
  head,
  rows,
  widths,
}: {
  head: ReactNode[];
  rows: ReactNode[][];
  widths?: (string | undefined)[];
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Scrollable table"
      className="overflow-x-auto rounded-xl border border-border focus-visible:outline-offset-2"
    >
      <table className="w-full min-w-[520px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-raised text-left">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-3.5 py-2.5 text-[12.5px] font-semibold text-foreground"
                style={{ width: widths?.[i] }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn("border-b border-border last:border-0 align-top", i % 2 === 1 && "bg-raised/50")}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-3.5 py-2.5 leading-relaxed",
                    j === 0 ? "font-medium text-foreground" : "text-ink-soft",
                    "[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-foreground"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YesNo({ v }: { v: boolean | "partial" }) {
  return (
    <span
      className={cn(
        "inline-grid size-[18px] place-items-center rounded-[5px] text-[10px] font-bold",
        v === true && "bg-tag-bg-green text-tag-ink-green",
        v === "partial" && "bg-tag-bg-yellow text-tag-ink-yellow",
        v === false && "bg-tag-bg-red text-tag-ink-red"
      )}
      aria-label={v === true ? "supported" : v === "partial" ? "partially supported" : "not supported"}
    >
      {v === true ? "✓" : v === "partial" ? "~" : "✕"}
    </span>
  );
}

export function Cite({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-primary underline decoration-[color-mix(in_oklab,var(--primary)_35%,transparent)] underline-offset-2 transition-colors duration-150 hover:text-primary-deep hover:decoration-primary-deep"
    >
      {children}
      <IconExternal size={11} className="shrink-0 self-start opacity-70" />
    </a>
  );
}

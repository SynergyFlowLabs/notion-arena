import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

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
    <article className="min-w-0">
      <header className="border-b border-border pb-6">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-balance text-[30px] font-semibold leading-[1.12] tracking-[-0.032em] sm:text-[36px]">
          {title}
        </h1>
        <div className="mt-3 max-w-2xl text-pretty text-[15px] leading-[1.7] text-muted-foreground">{lede}</div>
      </header>
      <div className="mt-8 flex flex-col gap-9">{children}</div>
    </article>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-[21px] font-semibold tracking-[-0.025em]">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-[16px] font-semibold tracking-[-0.015em]">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-2xl text-pretty text-[14.5px] leading-[1.75] text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
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
    <li className="flex gap-2.5 text-[14px] leading-[1.7] text-muted-foreground">
      <span className="mt-[9px] size-1 shrink-0 rounded-full bg-border-strong" />
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
  const color = {
    blue: "var(--notion-blue)",
    red: "var(--notion-red)",
    yellow: "var(--notion-yellow)",
    green: "var(--notion-green)",
    gray: "var(--notion-gray)",
  }[tone];
  const emoji = { blue: "💡", red: "⚠️", yellow: "🔧", green: "✅", gray: "📎" }[tone];
  return (
    <div
      className="max-w-2xl rounded-xl border p-3.5"
      style={{
        borderColor: `color-mix(in oklab, ${color} 32%, transparent)`,
        background: `color-mix(in oklab, ${color} 5%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
        <span aria-hidden>{emoji}</span>
        {title}
      </div>
      <div className="mt-1.5 text-[13.5px] leading-[1.7] text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-foreground">
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
          <span className="font-mono text-[11px] text-muted-foreground">{filename}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="rounded border border-border bg-background px-1.5 py-px font-mono text-[10px] text-muted-foreground">
              {lang}
            </span>
            <CopyButton compact value={code} />
          </span>
        </div>
      )}
      <div className="relative">
        {!filename && (
          <div className="absolute right-2 top-2 z-10">
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
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead>
          <tr className="border-b border-border bg-secondary/60 text-left">
            {head.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5 font-semibold" style={{ width: widths?.[i] }}>
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
                    j === 0 ? "font-medium text-foreground" : "text-muted-foreground",
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
        "inline-grid size-[17px] place-items-center rounded-full text-[9.5px] font-bold",
        v === true && "bg-[color-mix(in_oklab,var(--notion-green)_16%,transparent)] text-[var(--notion-green)]",
        v === "partial" && "bg-[color-mix(in_oklab,var(--notion-yellow)_22%,transparent)] text-[var(--notion-yellow)]",
        v === false && "bg-[color-mix(in_oklab,var(--notion-red)_14%,transparent)] text-[var(--notion-red)]"
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
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  );
}

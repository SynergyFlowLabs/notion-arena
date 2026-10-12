"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";

/**
 * A small code snippet block used on marketing pages (/mcp, /skills, /pricing).
 * Inline: rounded-lg, mono, soft paper tint, with a copy button pinned to the
 * top-right. Docs pages use <Code> from @/components/docs/prose which carries
 * filename and lang tags — this is the lighter cousin for places where the
 * code block is the CTA itself (install commands, copy-paste prompts).
 */
export function Snippet({
  code,
  lang,
  className,
  maxHeight = 320,
  size = "md",
}: {
  code: string;
  lang?: string;
  className?: string;
  maxHeight?: number;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          {lang ?? "code"}
        </span>
        <CopyButton compact value={code} label="Copy" />
      </div>
      <pre
        className={cn(
          "overflow-auto px-4 py-3 font-mono leading-relaxed text-foreground",
          size === "sm" ? "text-[12px]" : "text-[12.5px]"
        )}
        style={{ maxHeight }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

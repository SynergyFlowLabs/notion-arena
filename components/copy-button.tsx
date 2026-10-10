"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className,
  onCopy,
  compact = false,
}: {
  value: string | (() => string | Promise<string>);
  label?: string;
  copiedLabel?: string;
  className?: string;
  onCopy?: () => void;
  compact?: boolean;
}) {
  const [state, setState] = React.useState<"idle" | "copied" | "error">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function copy() {
    try {
      const text = typeof value === "function" ? await value() : value;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setState("copied");
      onCopy?.();
    } catch {
      setState("error");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background text-[12px] font-medium text-muted-foreground transition-all hover:border-border-strong hover:text-foreground active:scale-[.98]",
        compact ? "size-7" : "h-8 px-2.5",
        state === "copied" && "border-[var(--notion-green)] text-[var(--notion-green)]",
        state === "error" && "border-[var(--notion-red)] text-[var(--notion-red)]",
        className
      )}
    >
      {state === "copied" ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {!compact && (
        <span>{state === "copied" ? copiedLabel : state === "error" ? "Failed" : label}</span>
      )}
    </button>
  );
}

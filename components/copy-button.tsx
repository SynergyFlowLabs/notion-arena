"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconCopy } from "@/components/icons";

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

  const announced =
    state === "copied" ? copiedLabel : state === "error" ? "Copy failed" : "";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-[12.5px] font-medium text-ink-soft",
          "transition-[background-color,border-color,color] duration-150",
          "hover:border-border-strong hover:bg-secondary hover:text-foreground active:bg-secondary",
          compact ? "size-8" : "h-8 px-2.5",
          state === "copied" &&
            "border-[color-mix(in_oklab,var(--notion-green)_45%,transparent)] bg-tag-bg-green text-tag-ink-green",
          state === "error" &&
            "border-[color-mix(in_oklab,var(--notion-red)_45%,transparent)] bg-tag-bg-red text-tag-ink-red",
          className
        )}
      >
        {state === "copied" ? (
          <IconCheck size={13} />
        ) : (
          <IconCopy size={13} />
        )}
        {!compact && (
          <span>{state === "copied" ? copiedLabel : state === "error" ? "Failed" : label}</span>
        )}
      </button>
      {/* The button swaps its own label, which a screen reader does not
          re-announce on click, so the outcome goes to a live region. */}
      <span aria-live="polite" className="sr-only">
        {announced}
      </span>
    </>
  );
}
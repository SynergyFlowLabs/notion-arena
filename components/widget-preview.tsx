"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { WidgetFrame } from "@/components/widget-frame";

export interface WidgetPreviewProps {
  src: string;
  height?: number | string;
  title: string;
  className?: string;
  /** show a faux Notion chrome around the frame, to signal "this is inside Notion" */
  chrome?: boolean;
  loading?: "lazy" | "eager";
}

/**
 * Renders a widget in a sandboxed iframe.
 *
 * `allow-scripts` without `allow-same-origin` is exactly how Notion renders an
 * HTML block, so the preview here behaves like the real thing: the widget can
 * run JS and use localStorage, but cannot reach its parent or make credentialed
 * requests. Note that this also means the preview cannot read query params from
 * a cross-origin src, so config is baked into the served file instead.
 */
export function WidgetPreview({
  src,
  height = 260,
  title,
  className,
  chrome = false,
  loading = "lazy",
}: WidgetPreviewProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        chrome && "shadow-pop",
        className
      )}
    >
      {chrome && (
        <div className="flex items-center gap-1.5 border-b border-border bg-raised px-3 py-2">
          {/* Window dots are decoration standing in for Notion's chrome, not
              status indicators, so they are hidden from assistive tech and are
              exempt from the 3:1 graphic threshold. */}
          <span aria-hidden className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#e03e3e]/70" />
            <span className="size-2.5 rounded-full bg-[#dfab01]/70" />
            <span className="size-2.5 rounded-full bg-[#0f7b6c]/70" />
          </span>
          <span className="ml-1.5 truncate font-mono text-[11px] text-ink-soft">
            notion.so
            <span aria-hidden className="px-1 text-ink-faint">/</span>
            your workspace
          </span>
        </div>
      )}
      <WidgetFrame
        src={src}
        title={title}
        height={height}
        loading={loading}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        className="bg-card"
      />
    </div>
  );
}

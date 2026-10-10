"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
        "overflow-hidden rounded-xl border border-border bg-background",
        chrome && "shadow-[0_1px_3px_rgba(15,15,15,0.06),0_8px_28px_-12px_rgba(15,15,15,0.18)]",
        className
      )}
    >
      {chrome && (
        <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-3 py-2">
          <span className="size-2.5 rounded-full bg-[#e03e3e]/70" />
          <span className="size-2.5 rounded-full bg-[#dfab01]/70" />
          <span className="size-2.5 rounded-full bg-[#0f7b6c]/70" />
          <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">
            notion.so · your workspace
          </span>
        </div>
      )}
      <iframe
        src={src}
        title={title}
        loading={loading}
        sandbox="allow-scripts allow-popups allow-forms allow-modals"
        referrerPolicy="no-referrer"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
        className="block w-full border-0 bg-white dark:bg-[#191919]"
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/components/use-resolved-theme";

export interface WidgetFrameProps {
  src: string;
  title: string;
  height?: number | string;
  className?: string;
  loading?: "lazy" | "eager";
  sandbox?: string;
  tabIndex?: number;
  style?: React.CSSProperties;
}

/**
 * A widget iframe that always agrees with the visitor's theme.
 *
 * Renders as a plain same-origin iframe with `allow-scripts allow-same-origin`
 * so the widget can run inline JS (timers, localStorage, WebAudio for chimes)
 * but cannot navigate the top frame or trigger downloads/popups unless the
 * caller grants those permissions.
 *
 * Note: `scrolling="no"` and `referrerPolicy` are intentionally left off the
 * default — different browsers disagree on how they interact with sandboxed
 * iframes (some lock content to 0x0 or stall the document load).
 */
export function WidgetFrame({
  src,
  title,
  height = 260,
  className,
  loading = "lazy",
  sandbox = "allow-scripts allow-same-origin",
  tabIndex,
  style,
}: WidgetFrameProps) {
  const theme = useResolvedTheme();
  const url = React.useMemo(() => {
    const joiner = src.includes("?") ? "&" : "?";
    return `${src}${joiner}theme=${theme}`;
  }, [src, theme]);

  return (
    <iframe
      src={url}
      title={title}
      loading={loading}
      // A relaxed, production-safe sandbox: scripts + same-origin (so localStorage
      // works and the document has a real origin) but no top-navigation,
      // pointer-lock, or downloads unless explicitly added at the call-site.
      sandbox={sandbox}
      tabIndex={tabIndex}
      // Allow the iframe to size to the given height naturally; the widget's
      // own `overflow:hidden` on <body> clips anything that overflows.
      allow=""
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        // iframes default to a built-in 2px inset border; override explicitly
        // so the bg-color fills the entire rect (otherwise dark-mode inverts
        // can leave a hairline and JS errors during load paint a white strip).
        border: 0,
        ...style,
      }}
      className={cn("block w-full", className)}
    />
  );
}

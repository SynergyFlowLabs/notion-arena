"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/components/use-resolved-theme";

export interface WidgetFrameProps {
  /** Path to the embed route, with or without an existing query string. */
  src: string;
  title: string;
  height?: number | string;
  className?: string;
  loading?: "lazy" | "eager";
  /** Extra sandbox permissions beyond the Notion-equivalent set. */
  sandbox?: string;
  tabIndex?: number;
  /** Merged over the computed height, for positioned or scaled previews. */
  style?: React.CSSProperties;
}

/**
 * A widget iframe that always agrees with the visitor's theme.
 *
 * Widgets default to `theme=auto`, which follows the widget's own
 * `prefers-color-scheme`. Inside the site that is usually right, but a manual
 * theme override (light site on a dark system, or vice versa) would leave the
 * widget disagreeing with the surface around it. So the resolved site theme is
 * appended as an explicit parameter, and re-appended on every toggle.
 *
 * The sandbox is `allow-scripts` without `allow-same-origin`, exactly how
 * Notion renders an HTML block: the widget can run and can keep localStorage,
 * but cannot reach this page or carry credentials.
 */
export function WidgetFrame({
  src,
  title,
  height = 260,
  className,
  loading = "lazy",
  sandbox = "allow-scripts",
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
      sandbox={sandbox}
      referrerPolicy="no-referrer"
      scrolling="no"
      tabIndex={tabIndex}
      style={{ height: typeof height === "number" ? `${height}px` : height, ...style }}
      className={cn("block w-full border-0", className)}
    />
  );
}

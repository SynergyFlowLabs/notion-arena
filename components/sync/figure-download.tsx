"use client";

import { useResolvedTheme } from "@/components/use-resolved-theme";

/**
 * Download the figure as a PNG, in the theme the visitor is looking at.
 *
 * Inline SVG is the readable form; the PNG is the form that survives a paste
 * into a deck, a Notion page or a pull request. Both come out of the same
 * string, and the exporter is `scripts/export-diagrams.mjs`.
 */
export function FigureDownload({ id }: { id: string }) {
  const theme = useResolvedTheme();
  const file = theme === "dark" ? `${id}-dark.png` : `${id}.png`;
  return (
    <a
      href={`/diagrams/${file}`}
      download={`${id}-${theme}.png`}
      className="label-mono inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-ink-soft transition-colors hover:border-border-strong hover:text-foreground"
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="size-3 fill-none stroke-current"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 1.5v6M3.5 5 6 7.5 8.5 5M2 9.5h8" />
      </svg>
      PNG, {theme}
    </a>
  );
}

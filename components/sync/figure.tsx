import { DIAGRAMS } from "@/lib/diagrams";
import { cn } from "@/lib/utils";

/**
 * One sync figure, inline.
 *
 * The figure is the same string the PNG exporter rasterises, so the page and
 * the downloadable file can never disagree. It is drawn with `var(--token)`
 * fills rather than baked colours, which means a single copy re-themes itself
 * with the page: no second asset, and no flash of the wrong theme while a
 * client component works out which one is on.
 *
 * The SVG carries its own title, subtitle and source receipt, so the page adds
 * no caption of its own.
 */
export function SyncFigure({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const fig = DIAGRAMS.find((f) => f.id === id);
  if (!fig) throw new Error(`unknown diagram: ${id}`);
  return (
    <figure
      className={cn("max-w-none", className)}
      // Safe by construction: the string is built by lib/diagrams.ts from
      // escaped text, never from user input.
      data-figure={fig.id}
      dangerouslySetInnerHTML={{ __html: fig.svg }}
    />
  );
}

/** The same figure wrapped in a link, for prose that cites it by name. */
export function FigureRef({ id }: { id: string }) {
  const fig = DIAGRAMS.find((f) => f.id === id);
  if (!fig) throw new Error(`unknown diagram: ${id}`);
  const n = String(DIAGRAMS.findIndex((f) => f.id === id) + 1).padStart(2, "0");
  return (
    <a href={`/docs/sync/diagrams#${id}`} className="whitespace-nowrap">
      figure {n}
    </a>
  );
}

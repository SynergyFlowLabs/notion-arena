import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { NotionColor } from "@/lib/types";

/**
 * Notion's property tags: a pale tint of the property colour with a darker ink
 * on top, small radius, no border. These are the only pill-adjacent shapes in
 * the system, and they stay tight rather than fully round.
 *
 * The pairs come from `--tag-bg-*` / `--tag-ink-*` in globals.css, where every
 * combination was solved to clear 4.5:1 on its own tint *and* on the page
 * canvas in both themes. Notion's raw property values cannot be used as ink —
 * its yellow reaches only 1.94:1 as text — so they stay fills and dots.
 */
const COLOR_CLASSES: Record<NotionColor, string> = {
  gray: "bg-tag-bg-gray text-tag-ink-gray",
  brown: "bg-tag-bg-brown text-tag-ink-brown",
  orange: "bg-tag-bg-orange text-tag-ink-orange",
  yellow: "bg-tag-bg-yellow text-tag-ink-yellow",
  green: "bg-tag-bg-green text-tag-ink-green",
  blue: "bg-tag-bg-blue text-tag-ink-blue",
  purple: "bg-tag-bg-purple text-tag-ink-purple",
  pink: "bg-tag-bg-pink text-tag-ink-pink",
  red: "bg-tag-bg-red text-tag-ink-red",
};

/**
 * The matching ink for a property colour, for use as an inline `style` value
 * (icons and marks that sit on a tint). Passing the colour *name* to `color:`
 * would silently resolve to the CSS keyword — `blue`, `pink`, `gray` — so this
 * always returns the tested variable.
 */
export function notionInk(color: NotionColor) {
  return `var(--tag-ink-${color})`;
}

export function NotionTag({
  color = "gray",
  icon: Icon,
  children,
  className,
}: {
  color?: NotionColor;
  icon?: (props: { size?: number; className?: string }) => ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[5px] px-1.5 py-px text-[11.5px] font-medium leading-5",
        COLOR_CLASSES[color],
        className
      )}
    >
      {Icon ? <Icon size={12} className="shrink-0" /> : null}
      {children}
    </span>
  );
}

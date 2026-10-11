import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Badges are the one place the system allows a near-pill radius, and they stay
 * tight: 5px, pale property tint, full-colour ink. Never a filled chromatic
 * block — that role belongs to the single blue CTA.
 */
const VARIANTS = {
  default: "border-border-strong bg-secondary text-secondary-foreground",
  primary: "border-transparent bg-primary-wash text-primary-deep",
  pro: "border-transparent bg-[color-mix(in_oklab,var(--notion-purple)_14%,transparent)] text-[color-mix(in_oklab,var(--notion-purple)_88%,var(--foreground))]",
  free: "border-transparent bg-[color-mix(in_oklab,var(--notion-green)_14%,transparent)] text-[color-mix(in_oklab,var(--notion-green)_90%,var(--foreground))]",
  new: "border-transparent bg-[color-mix(in_oklab,var(--notion-orange)_16%,transparent)] text-[color-mix(in_oklab,var(--notion-orange)_90%,var(--foreground))]",
  outline: "border-border-strong bg-transparent text-ink-soft",
} as const;

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-px text-[11px] font-semibold leading-[17px] tracking-[-0.005em] whitespace-nowrap",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

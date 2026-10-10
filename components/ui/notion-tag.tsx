import { cn } from "@/lib/utils";
import type { NotionColor } from "@/lib/types";

const COLOR_CLASSES: Record<NotionColor, string> = {
  gray: "bg-[color-mix(in_oklab,var(--notion-gray)_16%,transparent)] text-[var(--notion-gray)]",
  brown: "bg-[color-mix(in_oklab,var(--notion-brown)_16%,transparent)] text-[var(--notion-brown)]",
  orange: "bg-[color-mix(in_oklab,var(--notion-orange)_16%,transparent)] text-[var(--notion-orange)]",
  yellow: "bg-[color-mix(in_oklab,var(--notion-yellow)_20%,transparent)] text-[var(--notion-yellow)]",
  green: "bg-[color-mix(in_oklab,var(--notion-green)_16%,transparent)] text-[var(--notion-green)]",
  blue: "bg-[color-mix(in_oklab,var(--notion-blue)_16%,transparent)] text-[var(--notion-blue)]",
  purple: "bg-[color-mix(in_oklab,var(--notion-purple)_16%,transparent)] text-[var(--notion-purple)]",
  pink: "bg-[color-mix(in_oklab,var(--notion-pink)_16%,transparent)] text-[var(--notion-pink)]",
  red: "bg-[color-mix(in_oklab,var(--notion-red)_16%,transparent)] text-[var(--notion-red)]",
};

export function NotionTag({
  color = "gray",
  children,
  className,
}: {
  color?: NotionColor;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-px text-[11.5px] font-medium leading-5",
        COLOR_CLASSES[color],
        className
      )}
    >
      {children}
    </span>
  );
}

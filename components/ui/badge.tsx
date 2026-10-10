import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "border-border-strong bg-secondary text-secondary-foreground",
  primary: "border-transparent bg-primary/12 text-primary",
  pro: "border-transparent bg-[color-mix(in_oklab,var(--notion-purple)_14%,transparent)] text-[var(--notion-purple)]",
  free: "border-transparent bg-[color-mix(in_oklab,var(--notion-green)_14%,transparent)] text-[var(--notion-green)]",
  new: "border-transparent bg-[color-mix(in_oklab,var(--notion-orange)_16%,transparent)] text-[var(--notion-orange)]",
  outline: "border-border-strong bg-transparent text-muted-foreground",
} as const;

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-4 tracking-tight whitespace-nowrap",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

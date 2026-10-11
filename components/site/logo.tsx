import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
  inverted = false,
}: {
  compact?: boolean;
  className?: string;
  /** For use on a dark campaign band, where the mark reverses. */
  inverted?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid size-[26px] shrink-0 place-items-center rounded-[7px] transition-colors",
          inverted
            ? "bg-band-foreground text-band"
            : "bg-foreground text-background"
        )}
      >
        <LogoMark size={17} />
      </span>
      {!compact && (
        <span
          className={cn(
            "text-[16px] font-semibold tracking-[-0.021em]",
            inverted ? "text-band-foreground" : "text-foreground"
          )}
        >
          Notion Arena
        </span>
      )}
    </span>
  );
}

export function WordmarkLink({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Notion Arena home"
      className="rounded-lg focus-visible:outline-offset-4"
    >
      <Logo inverted={inverted} />
    </Link>
  );
}

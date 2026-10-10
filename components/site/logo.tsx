import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative grid size-[26px] place-items-center rounded-[7px] bg-[#37352f] text-white dark:bg-white dark:text-[#191919]">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.6" y="1.6" width="5.4" height="5.4" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="1.6" width="5.4" height="5.4" rx="1.3" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
          <rect x="1.6" y="9" width="5.4" height="5.4" rx="1.3" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
          <rect x="9" y="9" width="5.4" height="5.4" rx="1.3" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
          Blocksmith
        </span>
      )}
    </span>
  );
}

export function WordmarkLink() {
  return (
    <Link href="/" aria-label="Blocksmith home">
      <Logo />
    </Link>
  );
}

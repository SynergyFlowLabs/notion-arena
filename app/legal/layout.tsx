import type { ReactNode } from "react";
import Link from "next/link";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-14 sm:px-6">
      <nav className="mb-8 flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">Legal</span>
        <span className="ml-auto flex gap-2">
          <Link href="/legal/terms" className="rounded-lg border border-border bg-card px-2 py-1 hover:border-border-strong hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="rounded-lg border border-border bg-card px-2 py-1 hover:border-border-strong hover:text-foreground">
            Privacy
          </Link>
        </span>
      </nav>
      <div className="[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
  );
}

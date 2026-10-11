"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/site/logo";
import { IconClose, IconGithub, IconMenu } from "@/components/icons";

/**
 * Notion's marketing nav labels each section with a bracketed monospace
 * shortcut : `[S] Syncs`. We keep that device, and make it honest: the
 * shortcuts actually work, and are suppressed while typing or when a
 * modifier is held.
 */
const NAV = [
  { href: "/components", label: "Components", key: "c" },
  { href: "/how-it-works", label: "How it works", key: "h" },
  { href: "/registry", label: "Registry", key: "r" },
  { href: "/docs", label: "Docs", key: "d" },
  { href: "/pricing", label: "Pricing", key: "p" },
] as const;

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  // Section shortcuts, advertised by the bracketed labels in the nav.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      const hit = NAV.find((n) => n.key === e.key.toLowerCase());
      if (!hit) return;
      e.preventDefault();
      router.push(hit.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Lock scroll while the mobile sheet is open, and close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    href === pathname || pathname.startsWith(`${href}/`);

  return (
    <header
      // Pulled out of the page snapshot so the header stays pinned while the
      // page content slides beneath it. It uses backdrop-filter, which is why
      // globals.css hides its old snapshot rather than cross-fading it.
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-50 w-full bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75"
    >
      {/* The hairline is drawn by CSS scroll-driven animation, not a scroll
          listener: it fades in over the first 32px of scroll and stays. */}
      <span aria-hidden className="header-line" />
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Blocksmith home"
          className="rounded-lg shrink-0 focus-visible:outline-offset-4"
        >
          <Logo />
        </Link>

 {/* desktop nav : Inter 15/500 for the label, mono for the shortcut */}
        <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[14.5px] font-medium transition-colors",
                isActive(item.href)
                  ? "text-foreground"
                  : "text-ink-soft hover:bg-secondary hover:text-foreground"
              )}
            >
              {item.label}
              <kbd
                className={cn(
                  "hidden rounded-[4px] border px-1 font-mono text-[10px] font-medium leading-[15px] transition-colors xl:inline-block",
                  isActive(item.href)
                    ? "border-border-strong bg-secondary text-ink-faint"
                    : "border-border bg-background text-ink-faint group-hover:border-border-strong"
                )}
              >
                {item.key.toUpperCase()}
              </kbd>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <a
            href="https://github.com/SynergyFlowLabs/notion-components"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Blocksmith on GitHub"
            className="hidden size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-secondary hover:text-foreground sm:grid"
          >
            <IconGithub size={17} />
          </a>

          <ThemeToggle className="hidden sm:inline-flex" />

          <Link
            href="/components"
            className="ml-1 hidden h-8 items-center rounded-lg bg-primary px-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-deep sm:inline-flex"
          >
            Browse components
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          >
            {open ? <IconClose size={18} /> : <IconMenu size={18} />}
          </button>
        </div>
      </div>

      {/* mobile sheet */}
      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto overscroll-contain bg-card lg:hidden"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <nav aria-label="Mobile" className="mx-auto flex max-w-[1240px] flex-col gap-0.5 px-4 py-4 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[16px] font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-secondary text-foreground"
                    : "text-ink-soft hover:bg-secondary hover:text-foreground"
                )}
              >
                <span className="flex-1">{item.label}</span>
                <kbd className="rounded-[4px] border border-border bg-background px-1.5 font-mono text-[11px] text-ink-faint">
                  {item.key.toUpperCase()}
                </kbd>
              </Link>
            ))}
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-4">
              <Link
                href="/components"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground"
              >
                Browse components
              </Link>
              <a
                href="https://github.com/SynergyFlowLabs/notion-components"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Blocksmith on GitHub"
                className="grid size-10 place-items-center rounded-lg border border-border text-ink-soft"
              >
                <IconGithub size={18} />
              </a>
              <ThemeToggle className="size-10 border border-border" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

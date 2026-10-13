"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { IconCompass, IconDatabase, IconTerminal, IconWrench } from "@/components/icons";

export const DOC_NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "Start here",
    items: [
      { href: "/docs", label: "Overview" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/registry", label: "Registry" },
    ],
  },
  {
    group: "AI agents",
    items: [
      { href: "/docs/mcp", label: "MCP server" },
      { href: "/docs/skills", label: "Agent skill" },
    ],
  },
  {
    group: "Notion platform",
    items: [
      { href: "/docs/sandbox", label: "HTML block sandbox" },
      { href: "/docs/sync", label: "Two-way data sync" },
      { href: "/docs/sync/diagrams", label: "The sync in figures" },
      { href: "/docs/api-limits", label: "API limits, cited" },
    ],
  },
  {
    group: "Building",
    items: [
      { href: "/docs/authoring", label: "Authoring a widget" },
      { href: "/docs/recipes", label: "Authoring a recipe" },
    ],
  },
];

const GROUP_ICONS = {
  "Start here": IconCompass,
  "AI agents": IconTerminal,
  "Notion platform": IconDatabase,
  Building: IconWrench,
} as const;

export function DocsNav() {
  const pathname = usePathname();
  // The deepest href that matches wins, so a page and its parent are never
  // both marked current.
  const matches = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const current = DOC_NAV.flatMap((group) => group.items)
    .map((item) => item.href)
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
      {DOC_NAV.map((group) => {
        const Icon = GROUP_ICONS[group.group as keyof typeof GROUP_ICONS];
        return (
        <div key={group.group}>
          <h2 className="flex items-center gap-1.5 px-2.5 label-mono text-ink-faint">
            {Icon ? <Icon size={12} className="shrink-0" /> : null}
            {group.group}
          </h2>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/docs" ? pathname === "/docs" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg border-l-2 py-1.5 pl-2.5 pr-2 text-[13px]",
                      "transition-[background-color,border-color,color] duration-150",
                      active
                        ? "border-primary bg-primary-wash font-semibold text-primary-deep"
                        : "border-transparent text-ink-soft hover:border-border-strong hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        );
      })}
    </nav>
  );
}

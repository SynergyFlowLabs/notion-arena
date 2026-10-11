"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
    group: "Notion platform",
    items: [
      { href: "/docs/sandbox", label: "HTML block sandbox" },
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

export function DocsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
      {DOC_NAV.map((group) => (
        <div key={group.group}>
          <h2 className="px-2.5 label-mono text-ink-faint">
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
      ))}
    </nav>
  );
}

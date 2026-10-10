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
          <h2 className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
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
                      "block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
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

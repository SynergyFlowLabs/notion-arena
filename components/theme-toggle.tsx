"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { IconMoon, IconSun } from "@/components/icons";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      const stored = localStorage.getItem("notion-arena.theme");
      return stored === "dark" || stored === "light" ? stored : "system";
    } catch {
      return "system";
    }
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
      if (theme !== "system") localStorage.setItem("notion-arena.theme", theme);
      else localStorage.removeItem("notion-arena.theme");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return { theme, setTheme };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark =
    mounted &&
    (theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-pressed={mounted ? isDark : undefined}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "inline-grid size-8 place-items-center rounded-lg border border-transparent text-ink-soft",
        "transition-[background-color,border-color,color] duration-150",
        "hover:border-border hover:bg-secondary hover:text-foreground",
        className
      )}
    >
      {/* Reserve the box before hydration so the icon swap cannot shift layout. */}
      <span className="grid size-[17px] place-items-center">
        {mounted ? (
          isDark ? (
            <IconSun size={17} />
          ) : (
            <IconMoon size={17} />
          )
        ) : null}
      </span>
    </button>
  );
}

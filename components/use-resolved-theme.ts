"use client";

import * as React from "react";

/**
 * The theme the visitor is actually seeing right now: "light" or "dark".
 *
 * The site theme lives as a class on <html> (set before paint by the inline
 * script in app/layout.tsx, then owned by the toggle). Anything that has to
 * agree with the visible theme but cannot inherit CSS tokens, most of all a
 * sandboxed widget iframe, reads it from here.
 *
 * A MutationObserver on the root class list keeps it live across toggles and
 * across `prefers-color-scheme` flips while the preference is "system".
 */
export function useResolvedTheme(): "light" | "dark" {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark ? "dark" : "light";
}

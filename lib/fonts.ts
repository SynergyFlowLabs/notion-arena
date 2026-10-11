import localFont from "next/font/local";

/**
 * Notion serves a self-hosted cut of Inter ("NotionInter") plus iA Writer Mono
 * for code and label text, with Lyon Text reserved for editorial pull quotes.
 *
 * We mirror that stack with fonts we can legally self-host:
 *
 *   • Inter Variable   — the same open-source face Notion's cut is built from
 *                        (SIL OFL 1.1), variable 100–900 with the opsz axis.
 *   • IBM Plex Mono    — iA Writer Mono is derived from IBM Plex Mono, so this
 *                        is the closest freely redistributable match.
 *   • Lyon Text        — licensed from Commercial Type, so it cannot be bundled.
 *                        Georgia is the first fallback Notion itself lists.
 *
 * Everything is local: no CDN, no render-blocking third-party request, and
 * next/font preloads the files and sets font-display: swap for us.
 */
export const sans = localFont({
  src: [
    {
      path: "../fonts/InterVariable-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-notion-sans",
  display: "swap",
  fallback: [
    "Inter",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Helvetica",
    "Apple Color Emoji",
    "Arial",
    "sans-serif",
    "Segoe UI Emoji",
    "Segoe UI Symbol",
  ],
  preload: true,
});

export const mono = localFont({
  src: [
    { path: "../fonts/IBMPlexMono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexMono-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexMono-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-notion-mono",
  display: "swap",
  fallback: ["iA Writer Mono S", "Nitti", "Menlo", "Courier", "monospace"],
  preload: true,
});

/** Applied on <html>; the CSS variables do the rest. */
export const fontVariables = `${sans.variable} ${mono.variable}`;

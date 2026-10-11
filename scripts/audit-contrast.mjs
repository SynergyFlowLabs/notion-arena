#!/usr/bin/env node
/**
 * Contrast auditor for the Blocksmith token system.
 *
 * Parses app/globals.css directly, so it can never drift from the real values,
 * and checks every text/background pair the design system actually ships.
 *
 * WCAG 2.2 thresholds used:
 *   4.5:1  normal text (< 18pt / < 14pt bold)
 *   3.0:1  large text (>= 18pt or >= 14pt bold), and non-text graphics
 *
 * Usage: node scripts/audit-contrast.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

/**
 * Pull a top-level `selector { … }` block into a flat map.
 *
 * The selector must be followed by optional whitespace and `{`, so `.dark`
 * cannot match its appearance inside `@custom-variant dark (&:is(.dark *))`.
 */
function parseBlock(source, selector) {
  const re = new RegExp(`(^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "m");
  const m = re.exec(source);
  if (!m) throw new Error(`selector not found: ${selector}`);
  const start = m.index + m[0].length - 1;
  const open = start;
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(open + 1, end);
  const vars = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

const light = parseBlock(css, ":root");
const dark = parseBlock(css, ".dark");

/* ── colour maths ─────────────────────────────────────────────── */

function toRgb(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6); // #rrggbbaa -> drop alpha, caller composites
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function channel(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite `rgba(fg, alpha)` over an opaque background. */
function composite(fgHex, alpha, bgHex) {
  const f = toRgb(fgHex);
  const b = toRgb(bgHex);
  return (
    "#" +
    f
      .map((c, i) =>
        Math.round(c * alpha + b[i] * (1 - alpha))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

/** Resolve a token value that may itself be `var(--x)`. */
function resolve(value, theme) {
  let v = value;
  for (let i = 0; i < 6 && /var\(--[\w-]+\)/.test(v); i++) {
    v = v.replace(/var\((--[\w-]+)\)/g, (_, name) => theme[name] ?? "");
  }
  return v.trim();
}

/* ── the pairs the system actually ships ──────────────────────── */

const TEXT_PAIRS = [
  ["foreground", "background", "body text on the page canvas"],
  ["foreground", "card", "body text on an elevated card"],
  ["foreground", "surface-raised", "body text on an inset panel"],
  ["ink-soft", "background", "secondary text on canvas"],
  ["ink-soft", "card", "secondary text on card"],
  ["ink-faint", "background", "metadata / mono labels on canvas"],
  ["ink-faint", "card", "metadata / mono labels on card"],
  ["primary", "background", "link text on canvas"],
  ["primary", "card", "link text on card"],
  ["primary-deep", "background", "link hover on canvas"],
  ["primary-deep", "primary-wash", "link text inside a blue wash"],
  ["primary-foreground", "primary", "label on the filled CTA"],
  ["primary-foreground", "primary-deep", "label on CTA hover"],
  ["app-ink", "card", "Notion app text inside a page mockup"],
  ["mock-ink", "mock-page", "page ink inside the hero mockup"],
  ["mock-ink-soft", "mock-page", "secondary ink inside the hero mockup"],
  ["mock-tag-ink", "mock-tag-bg", "status tag inside the hero mockup"],
  ["muted-foreground", "secondary", "text on a secondary chip"],
  ["destructive", "background", "destructive text on canvas"],
  ["band-foreground", "band", "text on the dark campaign band"],
  ["band-muted", "band", "muted text on the dark campaign band"],
];

/** Every property-colour tag: ink on its own tint, and ink on the canvas. */
const TAG_COLOURS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];

/** Pastel feature-card tints paired with their own ink. */
const TINTS = [
  "peach",
  "rose",
  "mint",
  "lavender",
  "sky",
  "butter",
  "clay",
  "stone",
  "ember",
];

/* ── run ──────────────────────────────────────────────────────── */

// Sanity guard: if the two blocks parsed identically, a selector matched the
// wrong thing and every "dark" result below would be a light value in disguise.
if (light["--background"] === dark["--background"]) {
  console.error(
    `parser error: :root and .dark both resolved --background to ${light["--background"]}`
  );
  process.exit(2);
}

let failures = 0;
let checks = 0;

function check(label, fg, bg, threshold, note) {
  checks++;
  const r = ratio(fg, bg);
  const ok = r >= threshold;
  if (!ok) failures++;
  const mark = ok ? "pass" : "FAIL";
  console.log(
    `  ${mark}  ${r.toFixed(2).padStart(6)}:1  ${label.padEnd(46)} ${note ?? ""}`
  );
}

for (const [name, theme, canvasBg] of [
  ["LIGHT", light, "#f6f5f4"],
  ["DARK", dark, "#191919"],
]) {
  console.log(`\n${name} MODE — text pairs`);
  for (const [fg, bg, note] of TEXT_PAIRS) {
    const fgRaw = theme[`--${fg}`];
    const bgRaw = theme[`--${bg}`];
    if (!fgRaw || !bgRaw) {
      console.log(`  skip  ${fg}/${bg} not defined in this theme`);
      continue;
    }
    check(`${fg} on ${bg}`, resolve(fgRaw, theme), resolve(bgRaw, theme), 4.5, note);
  }

  console.log(`\n${name} MODE — property tags (ink on own tint, and on canvas)`);
  for (const c of TAG_COLOURS) {
    const ink = resolve(theme[`--tag-ink-${c}`] ?? "", theme);
    const bg = resolve(theme[`--tag-bg-${c}`] ?? "", theme);
    if (!ink || !bg) {
      console.log(`  skip  tag ${c} not defined`);
      continue;
    }
    check(`${c} tag ink on tag bg`, ink, bg, 4.5, `(${ink} / ${bg})`);
    check(`${c} tag ink on canvas`, ink, canvasBg, 4.5);
  }

  console.log(`\n${name} MODE — pastel card tints`);
  for (const t of TINTS) {
    const ink = resolve(theme[`--tint-${t}-ink`] ?? "", theme);
    const bg = resolve(theme[`--tint-${t}`] ?? "", theme);
    if (!ink || !bg) {
      console.log(`  skip  tint ${t} not defined`);
      continue;
    }
    check(`${t} tint ink on tint`, ink, bg, 4.5, `(${ink} / ${bg})`);
  }

  console.log(
    `\n${name} MODE — saturated property colours as GRAPHICS (3:1, advisory)`
  );
  console.log(
    `  note  these are fill/tint/border values. Any that fall below 3:1 must`
  );
  console.log(
    `        never be used as text or as a meaningful dot — use --tag-ink-*.`
  );
  for (const c of TAG_COLOURS) {
    const raw = resolve(theme[`--notion-${c}`] ?? "", theme);
    if (!raw) continue;
    const r = ratio(raw, canvasBg);
    const verdict = r >= 3 ? "graphic-ok" : "fill-only";
    console.log(
      `  ${verdict.padEnd(10)} ${r.toFixed(2).padStart(6)}:1  ${`${c} on canvas`.padEnd(30)}`
    );
  }

  // The hero mockup used to composite app ink at reduced alpha over a
  // hardcoded white surface, which inverted into light-on-light in dark
  // mode. It now runs on solid --mock-* tokens per theme, audited as
  // ordinary pairs in TEXT_PAIRS above, so there is nothing to composite.

  console.log(`\n${name} MODE — alpha-composited overlays on the dark band`);
  const band = resolve(theme["--band"] ?? "#191918", theme);
  const bandFg = resolve(theme["--band-foreground"] ?? "#f6f5f4", theme);
  for (const a of [0.8, 0.75, 0.7]) {
    check(
      `band-foreground at ${Math.round(a * 100)}% on band`,
      composite(bandFg, a, band),
      band,
      4.5
    );
  }
}


/* ── source lint ────────────────────────────────────────────────
   A saturated property colour used as text ink is the failure mode that is
   easiest to introduce and hardest to see, because the class looks correct.
   Enforce it across the source rather than trusting the token table. */

import { readdirSync, statSync } from "node:fs";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) yield full;
  }
}

const BANNED = [
  // raw property colour as text
  [/text-\[var\(--notion-[\w-]+\)\]/g, "saturated property colour used as text ink — use --tag-ink-*"],
  // a NotionColor *name* passed straight to CSS `color:` resolves to the CSS
  // keyword ("blue", "pink", "gray"), silently, not to Notion's value
  [/color:\s*(?:cat|c|col|component|category)\.color\s*[,}]/g, "colour NAME passed to CSS color: — use notionInk(...)"],
  // banned by the interface guidelines: unbounded transitions
  [/transition-all/g, "transition: all — name the properties explicitly"],
];

console.log("\nSOURCE LINT");
let lintHits = 0;
for (const dir of ["app", "components"]) {
  const abs = join(root, dir);
  if (!statSync(abs).isDirectory()) continue;
  for (const file of walk(abs)) {
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    for (const [re, why] of BANNED) {
      re.lastIndex = 0;
      lines.forEach((line, i) => {
        if (re.test(line)) {
          lintHits++;
          console.log(
            `  FAIL  ${file.replace(root + "/", "")}:${i + 1}  ${why}`
          );
        }
        re.lastIndex = 0;
      });
    }
  }
}
if (lintHits === 0) console.log("  pass  no banned colour or transition patterns");
failures += lintHits;

console.log(
  `\n${"─".repeat(66)}\n${checks} pairs checked, ${failures} issue(s) below threshold.\n`
);
process.exit(failures === 0 ? 0 : 1);

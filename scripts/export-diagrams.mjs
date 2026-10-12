/**
 * Rasterize the sync diagrams.
 *
 * The figures in `app/docs/sync` are inline SVG strings from `lib/diagrams.ts`.
 * This script renders the *same* strings to PNG, resolving the site's CSS
 * custom properties out of `app/globals.css` so an exported figure carries the
 * exact palette the page uses, in both themes.
 *
 *   node scripts/export-diagrams.mjs            # every figure, light and dark
 *   node scripts/export-diagrams.mjs 02-topology  # one figure, for iterating
 *   node scripts/export-diagrams.mjs --scale 3  # bigger, for print
 *
 * Output: public/diagrams/<id>.png and <id>-dark.png, at twice the authored
 * width by default, which is what a retina screen wants and what a social card
 * can be cropped from.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "diagrams");

/**
 * Pull `--token: value;` pairs out of a CSS block.
 *
 * The selector is matched at the start of a line, not anywhere in the file:
 * `@custom-variant dark (&:is(.dark *));` on line 3 would otherwise be taken
 * for the `.dark` theme block, and every dark figure would render in light
 * tokens without saying so.
 */
function parseBlock(css, selector) {
  const at = css.search(new RegExp(`(^|\\n)\\s*${selector.replace(/[.()[\]]/g, "\\$&")}\\s*\\{`));
  if (at === -1) throw new Error(`selector ${selector} not found in globals.css`);
  let depth = 0;
  let i = css.indexOf("{", at);
  const from = i;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = css.slice(from + 1, i);
  const out = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function tokens() {
  const css = await fs.readFile(path.join(root, "app", "globals.css"), "utf8");
  const light = parseBlock(css, ":root");
  const dark = { ...light, ...parseBlock(css, ".dark") };
  return { light, dark };
}

/**
 * Replace `var(--token)` with the literal value, and hard-fail on a token that
 * does not exist, because a silently unstyled figure is worse than a broken
 * build. Values that are themselves `var()` references are followed.
 */
function resolve(svg, vars, mode) {
  return svg.replace(/var\((--[a-z0-9-]+)\)/gi, (_, name) => {
    let value = vars[name];
    let guard = 0;
    while (typeof value === "string" && value.startsWith("var(") && guard++ < 6) {
      const inner = value.match(/var\((--[a-z0-9-]+)\)/);
      if (!inner) break;
      value = vars[inner[1]];
    }
    if (!value) throw new Error(`unknown token ${name} in ${mode}`);
    return value;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const scaleIdx = args.indexOf("--scale");
  const scale = scaleIdx >= 0 ? Number(args[scaleIdx + 1]) : 2;
  const only = args.filter((a) => !a.startsWith("--") && a !== String(scale));

  const { light, dark } = await tokens();
  const { DIAGRAMS } = await import(path.join(root, "lib", "diagrams.ts"));
  await fs.mkdir(outDir, { recursive: true });

  let n = 0;
  for (const fig of DIAGRAMS) {
    if (only.length && !only.some((o) => fig.id.includes(o))) continue;
    for (const mode of ["light", "dark"]) {
      const svg = resolve(fig.svg, mode === "light" ? light : dark, mode);
      const png = await sharp(Buffer.from(svg), { density: 72 * scale }).png({ compressionLevel: 9 }).toBuffer();
      const file = path.join(outDir, mode === "light" ? `${fig.id}.png` : `${fig.id}-dark.png`);
      await fs.writeFile(file, png);
      const meta = await sharp(png).metadata();
      console.log(
        `  ${path.relative(root, file).padEnd(40)} ${meta.width}x${meta.height}  ${(png.length / 1024).toFixed(0)} KB`
      );
      n++;
    }
  }
  console.log(`${n} file${n === 1 ? "" : "s"} written to public/diagrams`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

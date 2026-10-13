/**
 * Rasterize app/icon.svg into the favicon set the SEO checklist wants:
 *
 *   public/favicon.ico               (16 + 32 + 48, packed as PNG-in-ICO)
 *   public/favicon-16x16.png
 *   public/favicon-32x32.png
 *   public/android-chrome-192x192.png
 *   public/android-chrome-512x512.png
 *
 * The SVG renders its light-on-dark tile by default; its dark-scheme variant
 * lives behind a prefers-color-scheme media query, which librsvg does not
 * apply, so rasters are deterministic. Run: npm run generate:favicons
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = path.resolve(import.meta.dirname, "..");
const svg = await readFile(path.join(root, "app", "icon.svg"));

const outDir = path.join(root, "public");
await mkdir(outDir, { recursive: true });

async function render(size) {
  return sharp(svg, { density: (72 * size) / 32 })
    .resize(size, size)
    .png()
    .toBuffer();
}

const png16 = await render(16);
const png32 = await render(32);
const png48 = await render(48);
const png192 = await render(192);
const png512 = await render(512);

await writeFile(path.join(outDir, "favicon-16x16.png"), png16);
await writeFile(path.join(outDir, "favicon-32x32.png"), png32);
await writeFile(path.join(outDir, "android-chrome-192x192.png"), png192);
await writeFile(path.join(outDir, "android-chrome-512x512.png"), png512);

const ico = await pngToIco([png16, png32, png48]);
await writeFile(path.join(outDir, "favicon.ico"), ico);

for (const f of [
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
]) {
  const buf = await readFile(path.join(outDir, f));
  console.log(`${f}: ${(buf.byteLength / 1024).toFixed(1)} KB`);
}

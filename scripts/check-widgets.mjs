#!/usr/bin/env node
/**
 * Contract validator for the shipped widgets in public/widgets/.
 *
 * Each file is a product: it is served at /embed/<slug> and pasted or
 * uploaded into Notion's HTML block, where it runs with no network and no
 * address. The checks below are the contract those two homes impose, so a
 * widget cannot regress into something the sandbox cannot carry.
 *
 * Usage: node scripts/check-widgets.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "widgets");
const files = readdirSync(dir).filter((f) => f.endsWith(".html")).sort();

let issues = 0;
const rows = [];

for (const file of files) {
  const slug = file.replace(/\.html$/, "");
  const src = readFileSync(join(dir, file), "utf8");
  const problems = [];
  const need = (re, label) => {
    if (!re.test(src)) problems.push(label);
  };
  const ban = (re, label) => {
    if (re.test(src)) problems.push(label);
  };

  // exactly one inline runtime script, never a remote one
  const scripts = [...src.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
  if (scripts.length !== 1 || /src=/.test(scripts[0])) {
    problems.push(`expected exactly 1 inline script, saw ${scripts.length}`);
  }

  // offline: nothing may reach the network (SVG namespaces are strings, not fetches)
  ban(/src=["']https?:/, "remote script/resource");
  ban(/href=["']https?:/, "remote link");
  ban(/@import/, "css @import");
  ban(/\bfetch\(/, "fetch call");
  ban(/XMLHttpRequest/, "XHR call");
  ban(/url\(https?:/, "remote css url");

  // configuration contract: injected JSON block merged under the query string
  need(/getElementById\('bk-config'\)/, "no bk-config injection point");
  need(/URLSearchParams/, "no query-param overlay");
  // universal params
  need(/c\.theme\b/, "no universal theme param");
  need(/c\.accent\b/, "no universal accent param");

  // theming contract
  need(/data-theme/, "no html[data-theme] handling");
  need(/prefers-color-scheme/, "no system-scheme fallback");
  // motion + framing contract
  need(/prefers-reduced-motion/, "no reduced-motion reset");
  need(/overflow:hidden/, "body scroll not locked");
  need(/height:100%/, "no full-height frame");

  // persistence contract
  if (/localStorage/.test(src)) {
    need(/['"]blocksmith\.[a-z0-9.-]+['"]/, "state key not namespaced under blocksmith.");
  }

  // copy contract: the em/en-dash ban covers the widgets too
  ban(/—|–/, "em/en dash in widget");

  const kb = (Buffer.byteLength(src) / 1024).toFixed(1);
  rows.push(
    ` ${problems.length ? "FAIL" : " ok "}  ${file.padEnd(26)} ${String(kb).padStart(5)} KB` +
      (problems.length ? `\n        ${problems.join("; ")}` : "")
  );
  if (problems.length) issues++;
}

console.log(rows.join("\n"));
console.log(`\n${files.length} files, ${issues} with issues`);
process.exit(issues ? 1 : 0);

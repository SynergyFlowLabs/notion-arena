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
const problemsByFile = new Map();
let byFile = new Map();

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

  // persistence contract: one storage key per widget, named after its slug.
  // Two widgets sharing a key overwrite each other's records on the same host.
  const keys = [...src.matchAll(/["'](notion-arena\.[a-z0-9.-]+)["']/g)].map((m) => m[1]);
  if (keys.length) {
    need(/['"]notion-arena\.[a-z0-9.-]+['"]/, "state key not namespaced under notion-arena.");
    if (/var SPEC=/.test(src)) {
      need(new RegExp(`KEY="notion-arena\\.${slug}\\.v1"`), "SPEC widget key must be notion-arena.<slug>.v1");
    }
  }
  byFile.set(file, [...new Set(keys)]);

  // copy contract: the em/en-dash ban covers the widgets too
  ban(/—|–/, "em/en dash in widget");

  problemsByFile.set(file, problems);
}

// cross-file check: a storage key may only belong to one widget
const owners = new Map();
for (const [file, keys] of byFile) {
  for (const key of keys) {
    if (!owners.has(key)) owners.set(key, []);
    owners.get(key).push(file);
  }
}
for (const [key, keyOwners] of owners) {
  if (keyOwners.length > 1) {
    for (const file of keyOwners) {
      problemsByFile.get(file).push(`storage key ${key} also used by ${keyOwners.filter((f) => f !== file).join(", ")}`);
    }
  }
}

for (const file of files) {
  const problems = problemsByFile.get(file);
  const kb = (Buffer.byteLength(readFileSync(join(dir, file))) / 1024).toFixed(1);
  rows.push(
    ` ${problems.length ? "FAIL" : " ok "}  ${file.padEnd(34)} ${String(kb).padStart(5)} KB` +
      (problems.length ? `\n        ${[...new Set(problems)].join("; ")}` : "")
  );
  if (problems.length) issues++;
}

console.log(rows.join("\n"));
console.log(`\n${files.length} files, ${issues} with issues`);
process.exit(issues ? 1 : 0);

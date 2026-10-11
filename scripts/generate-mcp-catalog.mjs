#!/usr/bin/env node
/**
 * Generates a static catalog snapshot for the MCP server.
 * Reads lib/catalog.ts via dynamic import using tsx loader if available,
 * otherwise falls back to parsing via tsx import.
 * 
 * Output: mcp/src/data/catalog.json and mcp/src/data/catalog-lite.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mcpDataDir = path.join(root, 'mcp', 'src', 'data');

fs.mkdirSync(mcpDataDir, { recursive: true });

// We need to import the TS file. Use tsx if available, otherwise try to require via dynamic import with --import tsx
// Simplest: we spawn a child process using npx tsx to emit JSON.

import { spawnSync } from 'node:child_process';

const emitterCode = `
import { COMPONENTS } from '../lib/catalog.ts';
import { RECIPES } from '../lib/recipes/index.ts';
const out = COMPONENTS.map(c => ({
  slug: c.slug,
  name: c.name,
  emoji: c.emoji,
  tagline: c.tagline,
  description: c.description,
  category: c.category,
  kind: c.kind,
  tier: c.tier,
  tags: c.tags,
  color: c.color,
  plan: c.plan,
  version: c.version,
  updatedAt: c.updatedAt,
  badge: c.badge ?? null,
  features: c.features,
  useCases: c.useCases,
  capabilities: c.capabilities,
  file: c.kind === 'widget' ? c.file : null,
  height: c.kind === 'widget' ? c.height : c.height ?? null,
  minHeight: c.kind === 'widget' ? c.minHeight : null,
  maxHeight: c.kind === 'widget' ? c.maxHeight : null,
  params: c.kind === 'widget' ? c.params : [],
  delivery: c.delivery,
  recipe: c.kind === 'native' ? c.recipe : null,
  creates: c.kind === 'native' ? c.creates : []
}));

const recipesLite = Object.fromEntries(Object.entries(RECIPES).map(([k,v]) => [k, {
  id: v.id,
  summary: v.summary,
  databases: v.databases.map(d => ({ ref: d.ref, title: d.title, icon: d.icon, properties: Object.keys(d.properties), seedCount: d.seed?.length ?? 0 })),
  viewsCount: v.views.length,
  pagesCount: v.pages.length,
  manualCount: v.manual.length,
  manual: v.manual.map(m => ({ title: m.title, reason: m.reason }))
}]));

console.log(JSON.stringify({ components: out, recipes: recipesLite, generatedAt: new Date().toISOString(), count: out.length }, null, 2));
`;

const tmpFile = path.join(root, 'scripts', '_tmp_emitter.mts');
fs.writeFileSync(tmpFile, emitterCode);

const result = spawnSync('npx', ['tsx', tmpFile], {
  cwd: root,
  encoding: 'utf-8',
  maxBuffer: 20 * 1024 * 1024
});

fs.unlinkSync(tmpFile);

if (result.status !== 0) {
  console.error('Failed to generate catalog:');
  console.error(result.stderr);
  console.error(result.stdout);
  process.exit(1);
}

const json = JSON.parse(result.stdout);
fs.writeFileSync(path.join(mcpDataDir, 'catalog.json'), JSON.stringify(json, null, 2));

const lite = {
  generatedAt: json.generatedAt,
  count: json.count,
  components: json.components.map(c => ({
    slug: c.slug,
    name: c.name,
    emoji: c.emoji,
    tagline: c.tagline,
    category: c.category,
    kind: c.kind,
    tier: c.tier,
    tags: c.tags,
    plan: c.plan,
    badge: c.badge,
    capabilities: c.capabilities,
    delivery: c.delivery
  }))
};

fs.writeFileSync(path.join(mcpDataDir, 'catalog-lite.json'), JSON.stringify(lite, null, 2));

console.log(`✓ Generated catalog.json (${json.count} components)`);
console.log(`  -> ${path.relative(root, path.join(mcpDataDir, 'catalog.json'))}`);
console.log(`  -> ${path.relative(root, path.join(mcpDataDir, 'catalog-lite.json'))}`);

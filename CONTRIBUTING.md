# Contributing to Notion Arena

Thank you for your interest in contributing! This document covers everything you need to know to contribute widgets, recipes, fixes, documentation, or ideas.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Widget Authoring Guide](#widget-authoring-guide)
- [Native Recipe Guide](#native-recipe-guide)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Review Criteria](#review-criteria)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code. Report unacceptable behavior to conduct@synergyflowlabs.com.

---

## Ways to Contribute

| Contribution Type | Description | Difficulty |
|-------------------|-------------|------------|
| **New Widget** | Self-contained HTML component for Notion | Medium |
| **Native Recipe** | Notion API installation (databases, views, formulas) | High |
| **Bug Fix** | Fix widget behavior, catalog data, build issues | Low–Medium |
| **Documentation** | Improve README, docs, code comments | Low |
| **Feature Request** | Propose new widget/recipe via GitHub Issue | Low |
| **Design** | Icons, illustrations, UI improvements | Medium |
| **Testing** | Add test cases, improve coverage | Medium |
| **Translation** | Localize UI/widget text | Medium |

---

## Development Setup

```bash
# Prerequisites
# - Node.js 22+
# - pnpm (recommended) or npm
# - Git

# Clone your fork
git clone https://github.com/YOUR_USERNAME/notion-arena.git
cd notion-arena

# Install dependencies
npm install

# Restore skills (for development)
npx skills experimental_install -y

# Start dev server
npm run dev
# → http://localhost:3000
```

### Recommended VS Code Extensions

- TypeScript & JavaScript Language Features (built-in)
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- HTML CSS Support

---

## Widget Authoring Guide

### Widget Contract (Mandatory)

Every widget must satisfy **all four rules**:

#### Rule 1: Zero External Requests
```html
<!-- ❌ BAD - External requests -->
<link href="https://fonts.googleapis.com/..." rel="stylesheet">
<script src="https://cdn.jsdelivr.net/..."></script>
<style>@import url('...');</style>
fetch('/api/data')

<!-- ✅ GOOD - Everything inlined -->
<style>/* All CSS here */</style>
<script>/* All JS here */</script>
<!-- Icons: inline SVG or Unicode -->
```

#### Rule 2: Two Config Sources
```html
<!-- Priority 1: Baked config (for HTML block) -->
<script id="bk-config" type="application/json">
{"work":25,"short":5,"long":15,"rounds":4,"label":"Deep work","accent":"#e03e3e","theme":"auto","chime":true}
</script>

<!-- Priority 2: URL params (for embed) -->
<!-- https://site.com/embed/pomodoro-timer?work=30&theme=dark -->

<!-- Config merger (use buildConfig from lib/widget.ts) -->
<script>
const config = buildConfig(schema, document.getElementById('bk-config'), new URLSearchParams(location.search));
</script>
```

#### Rule 3: Theme & Accent on Every Widget
```html
<!-- Required params in catalog.ts -->
{ key: "theme", label: "Theme", type: "select", default: "auto", options: [
  { value: "auto", label: "Match Notion" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" }
]},
{ key: "accent", label: "Accent", type: "color", default: "#2383e2" }

<!-- CSS implementation -->
<style>
:root {
  --accent: #2383e2;
  --accent-weak: color-mix(in oklab, var(--accent) 15%, transparent);
  --accent-strong: color-mix(in oklab, var(--accent) 80%, black);
}
[data-theme="light"] { --bg: #fff; --fg: #111; }
[data-theme="dark"]  { --bg: #111; --fg: #fff; }
@media (prefers-color-scheme: dark) {
  [data-theme="auto"] { --bg: #111; --fg: #fff; }
}
html { background: var(--bg); color: var(--fg); }
</style>

<script>
// Apply theme from config
document.documentElement.dataset.theme = config.theme;
document.documentElement.style.setProperty('--accent', config.accent);
</script>
```

#### Rule 4: Namespaced State (if persisting)
```javascript
const STORAGE_KEY = 'notion-arena.my-widget.v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState;
  } catch {
    return defaultState; // Safari private mode, quota exceeded, etc.
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fail - state stays in memory
  }
}
```

### Additional Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Single scrollbar** | `body { overflow: hidden }` with `.wrap { overflow: auto; height: 100% }` |
| **Reduced motion** | `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` |
| **Clipboard fallback** | `navigator.clipboard.writeText(text).catch(() => console.log(text))` |
| **System fonts only** | `font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| **Inline SVG icons** | No external icon fonts or sprite sheets |
| **Valid HTML5** | `<!DOCTYPE html>`, proper meta tags, semantic structure |

### Widget Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Name — Notion Arena</title>
  <meta name="description" content="One-line description for embed previews">
  <!-- Baked config injected by server for HTML block -->
  <script id="bk-config" type="application/json">{}</script>
  <style>
    /* All CSS inlined here */
    :root { --accent: #2383e2; }
    * { box-sizing: border-box; }
    body { margin: 0; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
    .wrap { height: 100vh; overflow: auto; padding: 16px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- Widget content -->
  </div>
  <script>
    // Config from bk-config + URLSearchParams
    const schema = { /* param definitions */ };
    const config = buildConfig(schema, document.getElementById('bk-config'), new URLSearchParams(location.search));
    
    // Apply theme & accent
    document.documentElement.dataset.theme = config.theme;
    document.documentElement.style.setProperty('--accent', config.accent);
    
    // Widget logic here
  </script>
</body>
</html>
```

### Catalog Entry (lib/catalog.ts)

```typescript
{
  slug: "my-widget",
  name: "My Widget",
  emoji: "🎯",
  tagline: "One-line hook under 80 chars",
  description: "Full paragraph. Explain what it does, why it's useful, and any limitations. 2-4 sentences.",
  category: "time", // time | dashboards | trackers | planning | business | docs | visuals | automations
  kind: "widget",
  tier: "free", // free | pro
  tags: ["timer", "productivity", "focus"],
  color: "blue", // red | orange | yellow | green | blue | purple | pink | brown | gray
  plan: "Free",
  version: "1.0.0",
  updatedAt: "2026-10-12", // ISO date
  badge: "new", // new | popular | staff-pick (optional)
  file: "/widgets/my-widget.html",
  height: 260,
  minHeight: 200,
  maxHeight: 420,
  delivery: ["embed", "html-block", "download"],
  params: [
    { key: "work", label: "Work minutes", type: "number", default: 25, min: 1, max: 120 },
    { key: "theme", label: "Theme", type: "select", default: "auto", options: [
      { value: "auto", label: "Match Notion" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" }
    ]},
    { key: "accent", label: "Accent", type: "color", default: "#2383e2" },
  ],
  features: [
    "Specific feature 1",
    "Specific feature 2",
    "Technical detail (e.g., 'Respects prefers-reduced-motion')",
  ],
  useCases: [
    "Realistic use case 1",
    "Realistic use case 2",
  ],
  capabilities: {
    interactive: true,      // User can click/type/interact
    offlineSafe: true,      // Works without network
    persistsLocally: false, // Saves to localStorage
    writesToNotion: false,  // Modifies Notion data
    needsNetwork: false,    // Requires network at render
  },
}
```

---

## Native Recipe Guide

### Recipe Structure

```typescript
// lib/recipes/my-recipe.ts
import type { Recipe } from '../types';

export const myRecipe: Recipe = {
  slug: 'my-recipe',
  name: 'My Recipe',
  creates: [
    { icon: '🗄️', label: '2 databases', detail: 'Tasks and Projects, related' },
    { icon: '🧮', label: '3 formulas', detail: 'Progress, status, due date' },
    { icon: '📊', label: '4 views', detail: 'Board, list, calendar, chart' },
    { icon: '📄', label: '1 template', detail: 'New task with checklist' },
    { icon: '⚡', label: '2 automations', detail: 'Manual setup required' },
  ],
  features: [
    'Feature 1',
    'Feature 2',
  ],
  useCases: [
    'Use case 1',
    'Use case 2',
  ],
  // planInstall is the core - returns InstallPlan
  async planInstall(ctx) {
    // 1. Create databases with base properties
    // 2. Read back data_source_ids
    // 3. Patch relations, rollups, formulas
    // 4. Create views
    // 5. Seed rows
    // 6. Create pages
    // 7. Return plan with manual[] steps for API gaps
  },
};
```

### Two-Pass Install Pattern

```typescript
async function planInstall(ctx) {
  const plan: InstallPlan = { steps: [], manual: [] };
  
  // Pass 1: Create databases
  const tasksDb = await ctx.createDatabase({ title: 'Tasks', properties: {...} });
  const projectsDb = await ctx.createDatabase({ title: 'Projects', properties: {...} });
  
  // Pass 2: Read back data_source_ids (required for relations)
  const tasksDs = await ctx.getDataSource(tasksDb.id);
  const projectsDs = await ctx.getDataSource(projectsDb.id);
  
  // Patch relation to use data_source_id
  await ctx.patchDatabase(tasksDb.id, {
    properties: {
      Project: { type: 'relation', relation: { database_id: projectsDs.id, single_property: {} } }
    }
  });
  
  // Add manual steps for API gaps
  plan.manual.push({
    reason: 'Notion API cannot create database automations',
    action: 'Manually add automation: "When status changes to Done, set completed date"',
  });
  
  return plan;
}
```

---

## Testing Requirements

### Before Submitting PR

```bash
# Type-check (required)
npm run typecheck

# Widget contract validation (required for widget changes)
npm run check:widgets

# Contrast audit (required for UI changes)
npm run audit:contrast

# Lint
npm run lint

# Build (must pass)
npm run build

# MCP catalog regeneration (for catalog/recipe changes)
npm run generate:mcp-catalog
npm run build:mcp
```

### Manual Testing Checklist

- [ ] Widget loads in Notion embed (`/embed/slug`)
- [ ] Widget loads as HTML block (download → upload to Notion)
- [ ] Theme switching works (auto/light/dark)
- [ ] Accent color applies correctly
- [ ] Parameters from URL override baked config
- [ ] Reduced motion disables animations
- [ ] State persists in localStorage (if applicable)
- [ ] Export/import works (if applicable)
- [ ] No console errors
- [ ] Mobile responsive (Notion mobile app)
- [ ] Dark mode renders correctly

---

## Pull Request Process

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(widget): add pomodoro timer with session tracking
fix(recipe): correct relation data_source_id in CRM pipeline
docs: update widget authoring guide with new examples
chore: update dependencies
refactor(catalog): extract color constants
```

### PR Description Template

```markdown
## Summary
Brief description of changes.

## Type
- [ ] New widget
- [ ] New native recipe
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor
- [ ] Other: _____

## Related Issue
Closes #123

## Changes
- Change 1
- Change 2

## Testing
- [ ] `npm run typecheck` passes
- [ ] `npm run check:widgets` passes
- [ ] `npm run audit:contrast` passes
- [ ] `npm run build` passes
- [ ] Tested in Notion (embed + HTML block)
- [ ] Screenshots/GIFs attached

## Screenshots
<!-- Add screenshots for UI changes -->

## Checklist
- [ ] Catalog entry added/updated in `lib/catalog.ts`
- [ ] Widget follows all 4 contract rules
- [ ] Parameters declared with types, defaults, validation
- [ ] Capabilities object accurate
- [ ] CHANGELOG.md updated
```

---

## Review Criteria

### Widgets

| Criterion | Required | Notes |
|-----------|----------|-------|
| Zero external requests | ✅ | Checked by `check-widgets` |
| Two config sources | ✅ | `bk-config` + URL params |
| Theme & accent params | ✅ | In catalog + implemented |
| Namespaced state | ✅ | If `persistsLocally: true` |
| Single scrollbar | ✅ | `body { overflow: hidden }` |
| Reduced motion support | ✅ | `@media (prefers-reduced-motion)` |
| Clipboard fallback | ✅ | `console.log` fallback |
| System fonts only | ✅ | No webfonts |
| Valid catalog entry | ✅ | All fields complete |
| TypeScript types | ✅ | `npm run typecheck` passes |
| Contrast audit | ✅ | `npm run audit:contrast` passes |
| Manual Notion test | ✅ | Embed + HTML block |

### Native Recipes

| Criterion | Required | Notes |
|-----------|----------|-------|
| `planInstall()` returns valid plan | ✅ | |
| Two-pass relations handled | ✅ | data_source_id pattern |
| Manual steps documented | ✅ | Only for real API gaps |
| Creates databases/views/formulas | ✅ | At least 1 database |
| Catalog entry complete | ✅ | All fields including `recipe` |
| MCP catalog regenerates | ✅ | `npm run generate:mcp-catalog` |
| Install test passes | ✅ | `mode: "plan"` then `mode: "api"` |

---

## Release Process

1. **Merge to main** → Triggers Vercel deployment
2. **Vercel deploys** → Live at `notionarena.vercel.app`
3. **MCP catalog regenerates** → `npm run generate:mcp-catalog` runs in CI
4. **MCP package publishes** → `notion-arena-mcp` to npm (automated)
5. **Registry updates** → `/r/index.json` reflects new components immediately

### Versioning

- **Widgets/Recipes**: Semantic version in catalog entry (`version: "1.2.0"`)
- **MCP Package**: Follows catalog changes, published to npm
- **Site**: Continuous deployment, no version tags

---

## Getting Help

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Discord**: [Join our community](https://discord.gg/notion-arena) for real-time help
- **Email**: contributors@synergyflowlabs.com

---

## Recognition

Contributors are recognized in:
- GitHub contributors graph
- Release notes (for significant contributions)
- `/credits` page on the live site

Thank you for making Notion Arena better! 🎉
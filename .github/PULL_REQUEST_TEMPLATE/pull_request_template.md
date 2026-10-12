## Summary

<!-- Brief description of changes -->

## Type of Change

- [ ] New widget (`public/widgets/*.html` + `lib/catalog.ts`)
- [ ] New native recipe (`lib/recipes/*.ts` + `lib/catalog.ts`)
- [ ] Bug fix (widget/recipe/platform)
- [ ] Documentation update
- [ ] Refactor / code quality
- [ ] Build / CI / tooling
- [ ] MCP server / Skill

## Related Issue

Closes #<!-- issue number -->

## Changes Made

- 
- 

## Testing Checklist

### Required (all PRs)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

### Widget Changes
- [ ] `npm run check:widgets` passes
- [ ] `npm run audit:contrast` passes
- [ ] Tested in Notion: **Embed URL** (`/embed/<slug>`)
- [ ] Tested in Notion: **HTML Block** (download → upload)
- [ ] Theme switching works (auto/light/dark)
- [ ] Accent color applies correctly
- [ ] Parameters from URL override baked config
- [ ] Reduced motion disables animations
- [ ] State persists in localStorage (if `persistsLocally: true`)
- [ ] Export/import works (if applicable)
- [ ] No console errors

### Native Recipe Changes
- [ ] `npm run generate:mcp-catalog` passes
- [ ] `npm run build:mcp` passes
- [ ] Tested with `mode: "plan"` (dry-run, no token)
- [ ] Tested with `mode: "api"` (execute with token)
- [ ] Two-pass relation pattern used correctly
- [ ] Manual steps only for real API gaps
- [ ] Manual steps cite limitation with reference

### Documentation Changes
- [ ] README.md updated if user-facing
- [ ] CONTRIBUTING.md updated if process changes
- [ ] CHANGELOG.md updated (Unreleased section)
- [ ] Code comments added for complex logic

## Screenshots / GIFs

<!-- Drag & drop screenshots for UI changes -->

## Widget Contract Compliance (widgets only)

- [ ] **Rule 1**: Zero external requests (no CDN, webfonts, fetch, @import)
- [ ] **Rule 2**: Two config sources (bk-config + URLSearchParams via buildConfig)
- [ ] **Rule 3**: theme & accent params implemented
- [ ] **Rule 4**: Namespaced state (`notion-arena.<slug>.v1`) with try/catch
- [ ] Single scrollbar (`body { overflow: hidden }` + `.wrap`)
- [ ] Reduced motion support (`@media (prefers-reduced-motion: reduce)`)
- [ ] Clipboard fallback with `console.log`
- [ ] System fonts only
- [ ] Valid HTML5 with proper meta tags

## Catalog Entry (lib/catalog.ts)

- [ ] All required fields present
- [ ] `slug` matches file name
- [ ] `params[]` complete with types, defaults, validation
- [ ] `capabilities` object accurate
- [ ] `badge` appropriate (new/popular/staff-pick)
- [ ] `updatedAt` set to today (ISO date)

## Additional Notes

<!-- Any other information for reviewers -->
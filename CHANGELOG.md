# Changelog

All notable changes to Notion Arena are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- New widget: `daily-planner` — Time-blocked daily planner with priority tracking
- New widget: `debt-payoff-tracker` — Snowball/avalanche debt strategy planner
- New widget: `legal-matter-tracker` — Private matter index with deadlines
- New widget: `wedding-seating-planner` — Guest alias seating with RSVP tracking
- New widget: `sprint-retrospective` — Private retro board for engineering teams
- New widget: `customer-feedback-log` — Feedback inbox with sentiment tagging
- New widget: `changelog-builder` — Local release notes draft with version tracking
- New widget: `pricing-tier-calculator` — SaaS pricing tier comparison tool
- New widget: `user-story-map` — Story mapping with epic/priority/status
- New widget: `okr-weekly-checkin` — Weekly OKR confidence & blocker tracking
- New widget: `employee-onboarding-tracker` — New hire onboarding checklist
- New widget: `content-repurposing-tracker` — Source-to-format content mapping

### Changed
- Updated all category badges with new SVG icons
- Enhanced widget checklist documentation
- Improved MCP server tool descriptions

### Fixed
- Contrast issues in several widgets (audit:contrast passes)
- TypeScript strict mode compliance across codebase

---

## [0.2.0] - 2026-10-11

### Added
- **12 new widgets** (2nd major batch):
  - `daily-planner`, `debt-payoff-tracker`, `legal-matter-tracker`, `wedding-seating-planner`
  - `sprint-retrospective`, `customer-feedback-log`, `changelog-builder`, `pricing-tier-calculator`
  - `user-story-map`, `okr-weekly-checkin`, `employee-onboarding-tracker`, `content-repurposing-tracker`
- **Complete widget contract documentation** in `/docs/authoring`
- **Automated widget validation** via `scripts/check-widgets.mjs`
- **Contrast audit script** via `scripts/audit-contrast.mjs`
- **MCP server** with 10 tools for AI agents
- **Skill** for cross-agent Notion Arena workflow knowledge

### Changed
- Catalog restructured with 8 categories, 143 total components
- All widgets now enforce 4-rule contract
- Registry now shadcn-compatible with inlined sources

---

## [0.1.0] - 2026-09-15

### Added
- Initial 131 widgets across 8 categories
- 11 native recipes (CRM, Sprint Tracker, OKR System, Meeting Notes OS, Content Calendar, Invoice Generator, PARA Life OS, Habit OS, Client Portal, Job Tracker, Automation Starter)
- Three delivery channels: Embed URL, HTML Block, Native API
- shadcn-compatible registry at `/r/`
- Research documentation in `docs/RESEARCH.md`
- Vercel deployment configuration
- MCP server foundation

---

## Categories Legend

| Category | Icon | Color | Description |
|----------|------|-------|-------------|
| Time | ⏱️ | Orange | Timers, clocks, calendars, scheduling |
| Dashboards | 📊 | Blue | KPIs, metrics, progress rings, overviews |
| Trackers | 📈 | Green | Habits, health, finance, progress tracking |
| Planning | 🗓️ | Purple | Kanban, Gantt, roadmaps, itineraries |
| Business | 💼 | Brown | CRM, invoicing, sales, operations |
| Docs | 📚 | Violet | Writing, research, citations, learning |
| Visuals | 🎨 | Pink | Diagrams, whiteboards, charts |
| Automations | ⚡ | Red | Workflow automation starters |

---

## Contributors

See [GitHub Contributors](https://github.com/SynergyFlowLabs/notion-arena/graphs/contributors) for the full list.

Special thanks to all who have reported issues, suggested features, and submitted PRs!
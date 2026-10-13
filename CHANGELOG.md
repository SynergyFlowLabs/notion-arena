# Changelog

All notable changes to Notion Arena are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Added Purchase Request Tracker widget (business)
- Added Equipment Inventory Log widget (business)
- Added Approvals Request Log widget (business)
- Added Helpdesk Intake Log widget (business)
- Added Editorial and Publishing Calendar widget (business)
- Added Podcast Show Notes Log widget (docs)
- Added Listener Feedback Log widget (docs)
- Added Construction Site Diary widget (business)
- Added Restaurant Reservation Log widget (business)
- Added Donor Relationship Log widget (business)
- Added Event Guest List and RSVP Log widget (planning)
- Added Photography Gear Database widget (trackers)

- Added Student Course Dashboard widget (docs)
- Added Dissertation Milestones Tracker widget (docs)
- Added Impact and Outcomes Log widget (docs)
- Added Board Meeting Notes widget (docs)
- Added Travel Journal widget (docs)
- Added Review and Rating Log widget (docs)
- Added Wish List and Collector Log widget (trackers)
- Added Property Listing Catalog widget (business)
- Added Property Showing Schedule widget (business)
- Added Tenant and Lease Log widget (business)
- Added Manufacturing Work Order Tracker widget (business)
- Added Shipment and Logistics Tracker widget (business)

- Added Travel Itinerary Planner widget (planning)
- Added Household Inventory Log widget (trackers)
- Added Car Maintenance and Trip Log widget (trackers)
- Added Warranty and Service Log widget (trackers)
- Added Game Collection Catalog widget (trackers)
- Added Recipe and Meal Library widget (docs)
- Added Class Homepage widget (docs)
- Added Parent Communication Log widget (docs)
- Added Tutoring Session Log widget (docs)
- Added Research Question Log widget (docs)
- Added Lab Equipment and Sample Log widget (docs)
- Added Discovery Call Pipeline widget (business)
- Added Therapist Session Administration widget (docs)
- Added Healthcare Supply Inventory widget (trackers)
- Added Healthcare Staff Training Log widget (docs)
- Added Seasonal Crop Calendar widget (planning)
- Added Harvest Timeline and Yield Log widget (planning)
- Added Wedding Budget Tracker widget (planning)
- Added Wedding Vendor Directory widget (business)
- Added Wedding Countdown widget (time)
- Added Photography Shoot Calendar widget (planning)
- Added Photography Delivery Checklist widget (planning)
- Added Family Contacts Directory widget (trackers)
- Added Visa and Country Checklist widget (planning)

### Added
- New widget: `milestone-tracker` — Dated project milestones with owners, phases, and exit criteria
- New widget: `incident-log` — Severity, owner, and a postmortem checklist per incident
- New widget: `test-run-log` — Manual pass, fail, and blocked results with a retest column
- New widget: `invoice-tracker` — Invoice status list with outstanding and past-due totals
- New widget: `leave-tracker` — Time-off requests with approved day totals
- New widget: `renewal-tracker` — Account health and renewal dates with value at risk
- New widget: `escalation-tracker` — Issue, severity, owner, and waiting-state queue
- New widget: `usability-findings` — Findings by study, participant code, and severity
- New widget: `scholarship-tracker` — Application deadlines, stages, and award values
- New widget: `attendance-register` — Per-session head counts with no names
- New widget: `collection-catalog` — Owned, wishlisted, lent, and sold collection index
- New widget: `storyboard-planner` — Shot log with shot size and estimated runtime
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
- **SEO / head metadata**: added `og:url`, `og:site_name`, `og:locale`, `twitter:site`, a per-page
  canonical URL on every route (`withCanonical` in `lib/seo.ts`), a `.ico` + PNG favicon set
  (`scripts/generate-favicons.mjs`, run `npm run generate:favicons` to regenerate), a web app
  manifest at `/site.webmanifest`, and JSON-LD structured data (Organization, WebSite,
  CollectionPage, FAQPage, ItemList). The default meta description was tightened to 149 characters
  and the home description to 150. `/embed/*`, `/c/*` and `/r/*` now send `X-Robots-Tag: noindex`
  since they are iframe transports and raw JSON, not indexable pages

### Fixed
- **Storage keys**: twelve widgets from the previous batch (`daily-planner`, `debt-payoff-tracker`, `legal-matter-tracker`,
  `wedding-seating-planner`, `sprint-retrospective`, `customer-feedback-log`, `changelog-builder`, `pricing-tier-calculator`,
  `user-story-map`, `okr-weekly-checkin`, `employee-onboarding-tracker`, `content-repurposing-tracker`) all wrote to the
  `vendor-register` localStorage key, so two of them on the same page could overwrite each other. Every widget now uses
  `notion-arena.<slug>.v1`, and `scripts/check-widgets.mjs` fails on a key that does not match its file name or that a
  second widget also claims
- **pomodoro-timer**: the countdown, progress ring, phase label and page title now
  update every tick while the timer is running, instead of only when you pressed
  a button. Timing is wall-clock based (a fixed phase end timestamp, read back
  with `Date.now()`), so it stays accurate in a background Notion tab and
  resyncs the moment the block is visible again. The ring also now drains from
  full as the phase runs, matching the documented behaviour, the session dots
  reset with each long break, and `+1m` extends a phase that is already running
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
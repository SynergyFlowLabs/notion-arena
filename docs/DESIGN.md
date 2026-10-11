# Blocksmith design plan

Working notes for the visual redesign. Written before the build, per the
`frontend-design` skill's process: plan → review against the brief → build →
critique. Revised sections say what changed and why.

## Brief

Make Blocksmith read as a first-party Notion surface: its design system, branded
icons, avatars, colours, contrast and typographic voice. Not "a SaaS site that
mentions Notion" — a site that looks like it belongs next to notion.com.

**Subject grounding.** The most characteristic thing in this product's world is a
Notion page being assembled out of blocks. So the hero is not a headline over a
gradient wash — it is a live Notion page surface with real components running
inside it. That is the memorable element, and per the restraint principle
everything around it stays quiet.

**Audience.** Notion power users, template sellers, and developers/agents
installing components from code.

**Primary job.** Prove the components are real and installable, then get one of
three actions: copy an embed URL, download an HTML file, or read an install plan.

---

## Tokens

All values live in `app/globals.css`.

### Colour

Notion's marketing surface is a warm paper canvas, not white, and its ink is
`rgba(0,0,0,.95)` rather than pure black. Both matter — cool greys and pure black
are what make a Notion-alike read as an imitation.

| Role | Token | Light | Dark |
|---|---|---|---|
| Page canvas | `--background` | `#f6f5f4` paper | `#191919` |
| Elevated surface | `--card` | `#ffffff` | `#202020` |
| Inset panel | `--surface-raised` | `#fbfbfa` | `#1f1f1f` |
| Ink | `--foreground` | `#0d0d0c` | `#e6e6e4` |
| Secondary ink | `--ink-soft` | `#5f5e5a` | `#b6b5b1` |
| Metadata | `--ink-faint` | `#8b8a86` | `#8b8a86` |
| Hairline | `--border` | `#e6e4df` | `#2f2f2f` |
| **Action blue** | `--primary` | `#0075de` | `#529cca` |
| Blue hover | `--primary-deep` | `#005fad` | `#6fb0dc` |
| Dark band | `--band` | `#191918` | `#101010` |
| Deep navy band | `--midnight` | `#02093a` | `#050b26` |
| Secondary brand | `--periwinkle` | `#455dd3` | `#8ea0ee` |

**One saturated colour.** `#0075de` is the only chromatic action colour. No second
button hue, no gradient buttons. Periwinkle appears in illustration and campaign
moments only, never on a control.

**Pastel tints** (`--tint-peach/rose/mint/lavender/sky/butter/clay/stone`, each
with a paired `-ink`) are lifted from Notion's own database property colours.
They carry meaning — a card's tint says which part of the product it belongs to —
rather than decorating.

**App ink** (`--app-ink: #37352f`) is Notion's *application* text colour, kept
separate because it is correct inside page mockups and wrong on the marketing
canvas.

### Type

Self-hosted, no CDN: Inter Variable (the face Notion's own "NotionInter" cut is
built from, SIL OFL) and IBM Plex Mono (iA Writer Mono, which Notion uses for
code and labels, is derived from IBM Plex Mono). Lyon Text is licensed from
Commercial Type and cannot be bundled, so Georgia stands in — it is the first
fallback Notion itself lists.

Scale is Notion's: tracking tightens as size grows.

| Role | Size / line-height | Tracking | Weight |
|---|---|---|---|
| `display` | 64 / 1.0 | −0.0332em | 700 |
| `hero` | 54 / 1.04 | −0.025em | 700 |
| `h1` | 48 / 1.08 | −0.022em | 700 |
| `h2` | 40 / 1.12 | −0.02em | 700 |
| `h3` | 32 / 1.25 | −0.015em | 700 |
| `h4` | 24 / 1.3 | −0.01em | 600 |
| `h5` | 20 / 1.35 | −0.005em | 600 |
| `lede` | 18 / 1.55 | 0 | 400 |
| `body` | 16 / 1.5 | 0 | 400 |
| `small` | 14 / 1.45 | 0 | 400 |
| `caption` | 12 / 1.4 | +0.02em | 500 |
| `label` | 11 / 1.3 mono | +0.06em | 500 |
| `quote` | 22 / 1.27 serif | 0 | 400 |

OpenType discipline: `ss01` + `lnum` + `locl` on display and headings (Inter's
curved-tail alternates — the softer, more humanist cut); `tnum` on every data
surface (pricing, counters, request counts).

### Radius — two values, plus pills

Notion's geometry is rectangular-sober. **12px** for cards, images and product
mockups. **8px** for buttons, inputs and controls. **9999px** exclusively for
badges and tags — buttons are never pills.

### Shadow — exactly one

Notion is flat: 1px hairline borders carry structure, not shadows. The system
defines one deep shadow (`--shadow-mockup`) and it is reserved for the hero
product mockup. `--shadow-pop` is for transient overlays only.

---

## Layout

Left-aligned editorial rhythm. Notion does not centre its headlines; alignment is
part of the voice. Centre alignment is used once, for the closing CTA.

```
┌──────────────────────────────────────────────────────────┐
│ nav   paper/white · 1px bottom hairline · h-14           │
│       [logo]  Components [C]  How it works [H]  …  CTA   │
├──────────────────────────────────────────────────────────┤
│ HERO   paper #f6f5f4                                     │
│        ┌─────────────────┐   ┌──────────────────────┐    │
│        │ mono eyebrow    │   │  Notion page chrome  │    │
│        │ display 64/700  │   │  ┌────┬────┬────┐    │    │
│        │ lede 18         │   │  │live│live│live│    │    │
│        │ [CTA] [quiet]   │   │  │wgt │wgt │wgt │    │    │
│        │ ✓ ✓ ✓           │   │  └────┴────┴────┘    │    │
│        └─────────────────┘   └──────────────────────┘    │
│                              ↑ the ONE deep shadow       │
├──────────────────────────────────────────────────────────┤
│ DARK BAND #191918 — the three delivery channels          │
├──────────────────────────────────────────────────────────┤
│ FEATURED  paper · pastel-tinted cards · live previews    │
├──────────────────────────────────────────────────────────┤
│ REGISTRY  paper · code panel · mono endpoint table       │
├──────────────────────────────────────────────────────────┤
│ LIMITS    paper · two-column capability matrix           │
├──────────────────────────────────────────────────────────┤
│ PRICING   paper · one card outlined in blue              │
├──────────────────────────────────────────────────────────┤
│ QUOTE     Georgia, once, 22px                            │
├──────────────────────────────────────────────────────────┤
│ CTA       centred — the only centred moment              │
├──────────────────────────────────────────────────────────┤
│ FOOTER    dark band · 4 link columns + stats             │
└──────────────────────────────────────────────────────────┘
```

Section rhythm: 80px vertical gaps between major sections on desktop, 56px on
mobile — Notion's spacing, which is what gives the page its unhurried feel.

---

## Principles

1. **Flat colour and hairlines.** 1px `#e6e4df` borders carry structure. No
   gradient washes, no glass, no shadow stack on cards.
2. **One saturated colour.** `#0075de` means "you can act here". Nothing else
   competes with it.
3. **Warm, never cool.** Every neutral carries a yellow-brown undertone. Cool grey
   is the fastest way to lose the Notion feel.
4. **Dark bands interrupt the canvas.** Used for the channels section and the
   footer, to create the stage-transition contrast Notion relies on.
5. **Motion is one orchestrated moment.** A single hero reveal sequence on load.
   Nothing animates on scroll; cards do not lift on hover — their border darkens.
6. **Mono labels are functional.** They mark shortcuts, versions, endpoints and
   request counts — things that genuinely are code. Never a decorative eyebrow.
7. **Tints carry meaning.** A card's pastel maps to a part of the product or a
   Notion property colour, not to a gradient the designer liked.
8. **Spend the boldness once.** The hero mockup is the memorable thing. Everything
   else is disciplined.

---

## Anti-tell revisions

The `frontend-design` skill lists the traits that make a page read as generated.
Audit of the previous build, and what changed:

| Tell found in v1 | Revision |
|---|---|
| Headline with one clause in `text-primary` | Single-colour headline. Emphasis comes from Inter 700 at −0.033em, not from hue. |
| Tracked-out ALL-CAPS sans eyebrow above every heading | Mono `label-mono`, 11px/500/+0.06em, mixed case — Notion's actual label style. |
| Meta strings joined with middle dots (`A · B · C`) | Replaced with discrete mono chips and hairline-separated definition lists. |
| `bg-dotgrid` / radial gradient washes as decoration | Removed. Flat paper canvas; structure comes from 1px hairlines. |
| Uniform rounded cards, one radius, same soft shadow | Two radii with roles, flat cards, varied treatment: pastel tints, borderless panels, dark bands. |
| `hover:-translate-y-0.5` + shadow on every card | Removed. Hover darkens the border and shifts ink colour only. |
| Per-section fade-and-slide-up entrances | Removed. One hero reveal sequence, staggered 60/140/220ms. |
| `→` character appended to button and link text | Removed from buttons. Card links use a drawn SVG arrow, which is what Notion's feature cards actually do. |
| Tinted near-black standing in for black | Kept deliberately — `#0d0d0c` *is* Notion's value (`rgba(0,0,0,.95)` composited), so here it is a choice, not a tell. |

## Quality floor

Responsive to 360px. Visible `:focus-visible` rings everywhere. Global
`prefers-reduced-motion` kill-switch in `globals.css`. Contrast checked against
WCAG AA on both canvases. `overscroll-behavior` set for precise pointers only, so
touch devices keep pull-to-refresh. No `transition: all`. Semantic elements before
ARIA.

## Branded assets

- **Icons** (`components/icons.tsx`) — 24px grid, 1.6px stroke, round caps and
  joins, `currentColor`. Filled shapes are reserved for one job: marking state.
  Eight distinctive category glyphs plus the brand mark.
- **Avatars** (`components/avatar.tsx`) — generated, not illustrated. A stable djb2
  hash of the seed picks a tint pair and one of six block arrangements on a 3×3
  grid. Pure SVG, no raster assets, identical on server and client.
- **Logo mark** — an anvil-shaped block mid-assembly: two stacked planes and a
  struck corner. A component being forged into a page.

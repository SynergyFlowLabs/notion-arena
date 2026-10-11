# Notion Arena design plan

Working notes for the visual redesign. Written before the build, per the
`frontend-design` skill's process: plan → review against the brief → build →
critique. Revised sections say what changed and why.

## Brief

Make Notion Arena read as a first-party Notion surface: its design system, branded
icons, avatars, colours, contrast and typographic voice. Not "a SaaS site that
mentions Notion": a site that looks like it belongs next to notion.com.

**Subject grounding.** The most characteristic thing in this product's world is a
Notion page being assembled out of blocks. So the hero is not a headline over a
gradient wash: it is a live Notion page surface with real components running
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
`rgba(0,0,0,.95)` rather than pure black. Both matter: cool greys and pure black
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
They carry meaning (a card's tint says which part of the product it belongs to)
rather than decorating.

**App ink** (`--app-ink: #37352f`) is Notion's *application* text colour, kept
separate because it is correct inside page mockups and wrong on the marketing
canvas.

### Type

Self-hosted, no CDN: Inter Variable (the face Notion's own "NotionInter" cut is
built from, SIL OFL) and IBM Plex Mono (iA Writer Mono, which Notion uses for
code and labels, is derived from IBM Plex Mono). Lyon Text is licensed from
Commercial Type and cannot be bundled, so Georgia stands in: it is the first
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
curved-tail alternates, the softer, more humanist cut); `tnum` on every data
surface (pricing, counters, request counts).

### Radius: two values, plus pills

Notion's geometry is rectangular-sober. **12px** for cards, images and product
mockups. **8px** for buttons, inputs and controls. **9999px** exclusively for
badges and tags; buttons are never pills.

### Shadow: exactly one

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
│ DARK BAND #191918: the three delivery channels          │
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
│ CTA       centred: the only centred moment              │
├──────────────────────────────────────────────────────────┤
│ FOOTER    dark band · 4 link columns + stats             │
└──────────────────────────────────────────────────────────┘
```

Section rhythm: 80px vertical gaps between major sections on desktop, 56px on
mobile: Notion's spacing, which is what gives the page its unhurried feel.

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
   Nothing animates on scroll; cards do not lift on hover; their border darkens.
6. **Mono labels are functional.** They mark shortcuts, versions, endpoints and
   request counts: things that genuinely are code. Never a decorative eyebrow.
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
| Tracked-out ALL-CAPS sans eyebrow above every heading | Mono `label-mono`, 11px/500/+0.06em, mixed case: Notion's actual label style. |
| Meta strings joined with middle dots (`A · B · C`) | Replaced with discrete mono chips and hairline-separated definition lists. |
| `bg-dotgrid` / radial gradient washes as decoration | Removed. Flat paper canvas; structure comes from 1px hairlines. |
| Uniform rounded cards, one radius, same soft shadow | Two radii with roles, flat cards, varied treatment: pastel tints, borderless panels, dark bands. |
| `hover:-translate-y-0.5` + shadow on every card | Removed. Hover darkens the border and shifts ink colour only. |
| Per-section fade-and-slide-up entrances | Removed. One hero reveal sequence, staggered 60/140/220ms. |
| `→` character appended to button and link text | Removed from buttons. Card links use a drawn SVG arrow, which is what Notion's feature cards actually do. |
| Tinted near-black standing in for black | Kept deliberately: `#0d0d0c` *is* Notion's value (`rgba(0,0,0,.95)` composited), so here it is a choice, not a tell. |

## Quality floor

Responsive to 360px. Visible `:focus-visible` rings everywhere. Global
`prefers-reduced-motion` kill-switch in `globals.css`. Contrast checked against
WCAG AA on both canvases. `overscroll-behavior` set for precise pointers only, so
touch devices keep pull-to-refresh. No `transition: all`. Semantic elements before
ARIA.

## Branded assets

- **Icons** (`components/icons.tsx`): 24px grid, 1.6px stroke, round caps and
  joins, `currentColor`. Filled shapes are reserved for one job: marking state.
  Eight distinctive category glyphs plus the brand mark.
- **Avatars** (`components/avatar.tsx`): generated, not illustrated. A stable djb2
  hash of the seed picks a tint pair and one of six block arrangements on a 3×3
  grid. Pure SVG, no raster assets, identical on server and client.
- **Logo mark**: an anvil-shaped block mid-assembly: two stacked planes and a
  struck corner. A component being forged into a page.

---

## Motion

One orchestrated entrance on the hero, plus native View Transitions for the
navigations that actually communicate something. No animation library: the
browser's `document.startViewTransition`, via React's `<ViewTransition>`.

Implemented in the skill's priority order (`react-view-transitions`):

| Priority | Where | What it says |
|---|---|---|
| 1 shared element | catalog card preview ↔ detail page preview | "same thing, gone deeper" |
| 2 Suspense reveal | `/components` skeleton → grid | "the data arrived" |
| 4 state change | n/a | deliberately unused; nothing appears/disappears as a primary action |
| 5 route change | directional slide for catalog↔detail, crossfade elsewhere | "going deeper" vs "moving sideways" |

Directional slides are **reserved for hierarchical navigation**. Lateral moves
between top-level sections get a quiet crossfade, sliding from Pricing to Docs
would assert a spatial relationship that does not exist.

Details that matter and are easy to get wrong:

- The detail page's `<ViewTransition>` is **keyed on the slug**, because
  same-route dynamic segments reconcile in place and would otherwise animate
  nothing when you jump across the "pairs well with" row.
- The list-side shared element carries `default="none"`, or every filter and
  sort would crossfade all 131 cards at once.
- Persistent chrome (header, footer, the catalog's sticky bar) is isolated with
  `view-transition-name`. The header and bar use `backdrop-filter`, so their old
  snapshots are hidden rather than cross-faded: that is the documented
  workaround for the flash backdrop-filter causes.
- The root is kept **live** (`::view-transition-old(root) { display: none }`) so
  unnamed content keeps rendering and stays interactive instead of freezing
  behind a stale snapshot.
- **Deliberately skipped:** list-identity reorder animation. The catalog filters
  131 components client-side and instantly; a 400ms move on every keystroke would read
  as latency, not polish. The skill's own test is "if you can't articulate what
  it communicates, don't add it."

Everything collapses to zero under `prefers-reduced-motion`, and browsers
without the API skip it entirely.

## The OG image

`app/opengraph-image.tsx` renders the share card at build time with
`next/og`, so the counts and palette are read from the catalog and cannot drift
, the same derive-don't-hardcode rule as the rest of the site. The metadata
declares `twitter:card = summary_large_image`, so an image has to exist; before
this it did not.

Two satori constraints shaped it: it cannot decode WOFF2
(`Unsupported OpenType signature wOF2`), hence the `.woff` siblings in `fonts/`,
and it collapses the height of a multi-line text box, which is why the lede is
two explicit single-line rows. The rendered output is checked visually in this
repo's history: a picture beats a guess.

## Dark mode, everywhere

The site theme and the product theme are two different clocks, and the bug
that produced this section was letting one drive the other. The hero's Notion
mockup painted its page canvas with `--background`, so in dark mode the
"paper" page went dark while the type sitting on it stayed ink-on-paper; and
the widget iframes inside it received no theme at all, so light widgets sat on
a dark page. The fix is a three-part contract:

- **Mockup tokens.** A `--mock-*` family (`--mock-bg`, `--mock-fg`,
  `--mock-surface`, `--mock-border`, `--mock-muted`, `--mock-accent`) paints
  anything that is *depicted* rather than *chrome*: the page canvas, sidebar,
  block rows and avatars of the hero mockup. Light mode gives them paper
  values, dark mode gives them Notion's dark editor values, and nothing
  outside a mockup may read them.
- **Resolved theme.** `components/use-resolved-theme.ts` reduces
  `light | dark | auto` plus `prefers-color-scheme` to one word, so client
  components know what the visitor actually sees rather than what they asked
  for.
- **WidgetFrame.** Every widget iframe on the site goes through
  `components/widget-frame.tsx`, which appends `theme=<resolved>` (and
  `accent=`) to the embed URL and defaults the sandbox to `allow-scripts`.
  The widgets already honour `theme=auto|light|dark`; the site simply stopped
  forgetting to ask. Detail pages, the configurator, catalog cards and the
  hero all render through it, so there is no raw iframe left to drift.

## Generated artwork, in both themes

Two families, both built to work in both themes.

- **Vectors** live in `components/illustrations.tsx`: eight inline SVG
  compositions on a shared 240×160 sheet (channel embed, HTML block, recipe,
  registry flow, sandbox flow, empty catalog, not found, dot grid). Stroke is
  `currentColor` at the house 1.6px and fills read the `--tint-*` tokens, so a
  vector re-themes with the page for free. The one exception is the dark
  campaign band, which stays dark in both themes; `.band-art` in
  `globals.css` pins the light pastel values for artwork placed inside it.
  Each eleventh-pass standalone widget also carries an original inline SVG
  mark, drawn with its theme-aware ink so the downloaded file stays self-contained.
- **Rasters** live in `public/illustrations/` as composition-matched pairs,
  `<name>-light.png` and `<name>-dark.png`. The light master is painted on
  the paper canvas in the house editorial style (1.5px ink outlines, signal
  blue, four pastel tints, no lettering); the dark twin is then edited from
  that same master with a recolour instruction, so composition and linework
  stay identical while the canvas, outlines and tints move to their dark
  values. `components/illustrations.tsx` exports `ThemedIllustration`, which
  swaps the pair on the `dark` class, so artwork never sits on a canvas it was
  not painted for. Headers (how it works, docs, pricing, the planning
  category, the business category, and the knowledge-workflows category page) use the pairs;
  the dark band uses single dark-canvas pieces.

What the artwork never does: carry text (the model's lettering is the tell),
state a number the catalog owns, or stand where a live widget would prove
more.

## Branded assets, in use

The first pass wrote `components/avatar.tsx` and never imported it, and left
eleven icons with no call site. Both are now resolved:

- **Avatars** render in the hero's Notion mockup, replacing four ad-hoc initial
  spans, so workspace avatars come from the same generated system everywhere.
- **Icons**: zero hand-rolled `<svg>` remain outside the icon set and the avatar
  generator. Six icons that had no home were deleted: a speculative icon set is
  a maintenance liability, and `IconChevron` came back when the recipe panel's
  disclosure markers turned out to need it. The kind badge carries
  `IconFrame` vs `IconDatabase`, because a widget is an iframe and a recipe is a
  database, and that distinction is the whole product.

## The skills audit pass

After the redesign landed, the installed skill set grew a second family:
`leonxlnx/taste-skill` (94k stars, 589k+ installs for `design-taste-frontend`),
installed per the `find-skills` workflow alongside the Vercel and Anthropic
skills. Five of its skills were read in full and run as an audit over the
shipped site: `redesign-existing-projects`, `design-taste-frontend`,
`high-end-visual-design`, `minimalist-ui` and `imagegen-frontend-web`.

What the audit changed:

- **Em-dash and en-dash ban.** The taste-skill family bans both characters
  anywhere a reader can see them. Every user-visible string in `app/`,
  `components/`, `lib/`, the widgets and the repo docs was rewritten to
  commas, colons, parentheses or full stops; ranges (`1-10`, `$0-9/mo`) use
  hyphens. The rendered HTML of all fifteen content pages now contains zero
  of either character.
- **Hero stack discipline.** The hero carried two mono chips and a trust
  strip under the CTAs. One chip remains (`components/71`, real data), and
  the three honest facts moved to a hairline strip below the hero, where
  they read as page content instead of hero clutter.
- **Numbered step markers.** The `01 02 03` mono numbers on the landing
  sequence are a section-numbering tell; the ordered list and its connector
  hairlines carry the sequence now.
- **One label per CTA intent.** "Get started" (header) and "Browse the
  catalog" (steps) both meant browse, so every browse-intent link now says
  "Browse components"; the free-tier variant stays "Browse free components".
- **Scroll listener removed.** The header's hairline used to come from a
  `window.scroll` handler. It is now a CSS scroll-driven animation
  (`.header-line`, `animation-timeline: scroll(root)`), with a static
  hairline under `@supports not (animation-timeline: scroll())`.
- **State glyphs became branded icons.** The `✓ / ~ / ✕` text glyphs in the
  capability matrices, pricing table and docs `YesNo` chips are now
  `IconCheck`, `IconAlert` and `IconClose` from the brand set, with `sr-only`
  text where the glyph was the only signal.
- **Favicon.** The site had none. `app/icon.svg` is the LogoMark on its ink
  tile with literal colours (a standalone file cannot inherit CSS custom
  properties), and `app/apple-icon.png` is a hand-rasterised 180px sibling.
  The SVG carries an embedded `prefers-color-scheme: dark` block, so the tile
  flips to the dark canvas on its own; a standalone file has no other way to
  hear the visitor's theme.

What the audit deliberately did not change, and why:

- **Inter stays.** Three of these skills ban Inter as an LLM default. Notion
  self-hosts Inter as NotionInter; on a site mirroring Notion, Inter is the
  brand voice, not a default. The skills' own override clause covers this.
- **The branded SVG icon set stays.** `design-taste-frontend` says never
  hand-roll icons and reach for Phosphor or Radix instead; the user brief
  asked for branded icons, and `redesign-existing-projects` asks for a
  custom set with one standardised stroke. One family, 1.6px, currentColor.
- **Recipe emoji stay.** Recipe declarations carry `icon: { type: "emoji" }`
  because that is Notion's own page and database icon mechanism; the recipe
  panel shows them to preview the installed Notion surface. They are product
  data, not site iconography.
- **Generated imagery, user reversal of the earlier image ban.** The first
  audit kept the site image-free; the user later explicitly reversed that
  override and requested generated images, vectors, SVGs and icons for both
  themes. The image-free instruction no longer constrains asset creation. A
  separate product-proof guard still applies: generated art never replaces
  live widgets. The hero keeps real widgets in iframes; section art, including
  the planning and business illustration pairs, carries tone rather than proof.
  See "Generated artwork, in both themes" below.
- **The dark band stays.** A full-bleed `#191918` band interrupting the paper
  canvas would read as a copy-paste accident on a generic page; on Notion's
  own site it is a campaign device, and here it is committed to once,
  full-bleed, with its own type and tint treatment.

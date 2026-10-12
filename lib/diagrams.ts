/**
 * Diagrams for the two-way sync documentation.
 *
 * Why the drawings live here as strings rather than as JSX in a component:
 *
 * 1. **What you look at is what ships.** The page renders these strings, and
 *    `scripts/export-diagrams.mjs` rasterizes the same strings, so a figure in
 *    the docs and its exported PNG cannot drift apart.
 * 2. **One language.** Every figure is drawn from the primitives below, in the
 *    site's own tokens, so light and dark mode come for free and no figure
 *    invents its own palette.
 * 3. **Honesty.** Every number in these figures is measured, and the footer
 *    says where it came from. A diagram that asserts something the code does
 *    not do is worse than no diagram.
 *
 * House rules for anything added here:
 *   - Colour carries meaning, never decoration. Blue is Arena's machinery,
 *     green is what lands in the user's workspace, amber is deferred or
 *     offline, red is a refusal, grey is context.
 *   - A hairline separates zones. No drop shadows, no gradients: Notion is
 *     flat, and so is this.
 *   - Solid means it happens. Dashed means it happens conditionally. Dotted is
 *     a note about ordering.
 *   - Label with real identifiers from the codebase (row keys, route paths,
 *     property names), never with a paraphrase of them.
 */

export const SANS =
  "Inter Variable, Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
export const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/** The site's tokens, named for what they mean in a diagram. */
export const C = {
  ink: "var(--foreground)",
  soft: "var(--ink-soft)",
  faint: "var(--ink-faint)",
  card: "var(--card)",
  raised: "var(--surface-raised)",
  paper: "var(--background)",
  line: "var(--border)",
  lineStrong: "var(--border-strong)",
  ours: "var(--primary)",
  oursDeep: "var(--primary-deep)",
  oursWash: "var(--primary-wash)",
  landed: "var(--tint-mint-ink)",
  landedWash: "var(--tint-mint)",
  held: "var(--tint-butter-ink)",
  heldWash: "var(--tint-butter)",
  refused: "var(--tint-ember-ink)",
  refusedWash: "var(--tint-ember)",
  note: "var(--tint-lavender-ink)",
  noteWash: "var(--tint-lavender)",
  quiet: "var(--tint-stone-ink)",
  quietWash: "var(--tint-stone)",
} as const;

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Rough advance-width, in pixels, for laying out chips and centring labels.
 * Inter and Plex Mono are close enough to these ratios that the only thing a
 * small error costs is a pixel or two of padding.
 */
export function measure(text: string, size: number, mono = false): number {
  if (mono) return text.length * size * 0.6;
  let wide = 0;
  for (const ch of String(text)) {
    if (/[MW@%]/.test(ch)) wide += 0.9;
    else if (/[ilj.,:'|!\[\]()]/.test(ch)) wide += 0.3;
    else if (/[A-Z0-9]/.test(ch)) wide += 0.62;
    else wide += 0.53;
  }
  return wide * size;
}

export function t(
  x: number,
  y: number,
  text: string,
  o: {
    size?: number;
    weight?: number;
    fill?: string;
    anchor?: "start" | "middle" | "end";
    mono?: boolean;
    opacity?: number;
    lh?: number;
  } = {}
): string {
  const {
    size = 12,
    weight = 400,
    fill = C.ink,
    anchor = "start",
    mono = false,
    opacity,
    lh = 1.4,
  } = o;
  const lines = String(text).split("\n");
  const body = lines
    .map((line, i) =>
      i === 0
        ? esc(line)
        : `<tspan x="${x}" dy="${(size * lh).toFixed(2)}">${esc(line)}</tspan>`
    )
    .join("");
  return (
    `<text x="${x}" y="${y}" font-family="${mono ? MONO : SANS}" font-size="${size}"` +
    ` font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"` +
    (opacity === undefined ? "" : ` opacity="${opacity}"`) +
    `>${body}</text>`
  );
}

/** Greedy wrap on words. Returns lines; the caller decides the y. */
export function wrap(text: string, size: number, maxWidth: number, mono = false): string[] {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next, size, mono) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A wrapped paragraph that reports the height it used, so figures can stack
 * blocks without guessing and without leaving holes where a line did not wrap.
 */
export function block(
  x: number,
  y: number,
  text: string,
  maxWidth: number,
  o: {
    size?: number;
    weight?: number;
    fill?: string;
    mono?: boolean;
    anchor?: "start" | "middle";
    lh?: number;
  } = {}
): { svg: string; h: number } {
  const { size = 12, lh = 1.42 } = o;
  const lines = wrap(text, size, maxWidth, o.mono);
  const svg = lines
    .map((line, i) => t(x, y + i * size * lh, line, o as never))
    .join("");
  return { svg, h: (lines.length - 1) * size * lh };
}

export function box(o: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  fill?: string;
  stroke?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}): string {
  const { x, y, w, h, r = 10, fill = "none", stroke = C.line, width = 1, dash, opacity } = o;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"` +
    (stroke === "none" ? "" : ` stroke="${stroke}" stroke-width="${width}"`) +
    (dash ? ` stroke-dasharray="${dash}"` : "") +
    (opacity === undefined ? "" : ` opacity="${opacity}"`) +
    `/>`
  );
}

export function chipW(label: string, size = 11, mono = false): number {
  return Math.round(measure(label, size, mono) + 18);
}

export function chip(
  x: number,
  y: number,
  label: string,
  o: {
    size?: number;
    fill?: string;
    ink?: string;
    mono?: boolean;
    stroke?: string;
    h?: number;
    weight?: number;
  } = {}
): string {
  const {
    size = 11,
    fill = C.quietWash,
    ink = C.quiet,
    mono = false,
    stroke,
    h = 20,
    weight = 500,
  } = o;
  const w = chipW(label, size, mono);
  return (
    box({ x, y, w, h, r: h / 2, fill, stroke: stroke ?? "none" }) +
    t(x + w / 2, y + h / 2 + size * 0.36, label, { size, weight, fill: ink, mono, anchor: "middle" })
  );
}

/** Right-align a chip inside a box, which is where status belongs. */
export function chipRight(
  boxX: number,
  boxW: number,
  y: number,
  label: string,
  o: Parameters<typeof chip>[3] = {}
): string {
  const w = chipW(label, o.size ?? 11, o.mono ?? false);
  return chip(boxX + boxW - 12 - w, y, label, o);
}

/**
 * Arrowheads, one per connector colour.
 *
 * An SVG id is document-global, and several of these figures sit on one page,
 * so every marker is namespaced by the figure id. The tone names the meaning
 * rather than the colour.
 */
export type Tone = "ours" | "landed" | "held" | "refused" | "quiet";

const TONES: Record<Tone, string> = {
  ours: C.ours,
  landed: C.landed,
  held: C.held,
  refused: C.refused,
  quiet: C.lineStrong,
};

export function toneColor(tone: Tone): string {
  return TONES[tone];
}

export function markerDefs(id: string): string {
  return (
    `<defs>` +
    (Object.keys(TONES) as Tone[])
      .map(
        (tone) =>
          `<marker id="${id}-${tone}" viewBox="0 0 10 10" refX="8.2" refY="5"` +
          ` markerWidth="6" markerHeight="6" orient="auto-start-reverse">` +
          `<path d="M1 1.6 8.6 5 1 8.4" fill="none" stroke="${TONES[tone]}" stroke-width="1.5"` +
          ` stroke-linecap="round" stroke-linejoin="round"/></marker>`
      )
      .join("") +
    `</defs>`
  );
}

export function link(o: {
  id: string;
  d: string;
  tone?: Tone;
  width?: number;
  dash?: string;
  head?: boolean;
  opacity?: number;
}): string {
  const { id, d, tone = "quiet", width = 1.4, dash, head = true, opacity } = o;
  return (
    `<path d="${d}" fill="none" stroke="${toneColor(tone)}" stroke-width="${width}"` +
    (dash ? ` stroke-dasharray="${dash}"` : "") +
    (head ? ` marker-end="url(#${id}-${tone})"` : "") +
    ` stroke-linecap="round" stroke-linejoin="round"` +
    (opacity === undefined ? "" : ` opacity="${opacity}"`) +
    ` />`
  );
}

/** A filled dot, for timelines. */
export function dot(x: number, y: number, r: number, fill: string, ring = C.card): string {
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ring}" stroke-width="2"/>`
  );
}

/* ------------------------------------------------------------------ */
/* The figure shell                                                    */
/* ------------------------------------------------------------------ */

export interface FigureInput {
  id: string;
  width?: number;
  height: number;
  title: string;
  sub?: string;
  /** where the numbers came from */
  source?: string;
  children: string;
}

/** One figure = one card that reads the same in the browser and as a PNG. */
export function figure(input: FigureInput): string {
  const W = input.width ?? 720;
  const pad = 22;
  const meta = input.sub ? wrap(input.sub, 12.5, W - pad * 2 - 8).length : 0;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${input.height}" width="${W}" height="${input.height}" role="img" aria-label="${esc(input.title)}">`,
    markerDefs(input.id),
    box({ x: 0.5, y: 0.5, w: W - 1, h: input.height - 1, r: 14, fill: C.card, stroke: C.line }),
    t(pad, 32, input.title, { size: 15.5, weight: 600, fill: C.ink }),
    input.sub ? block(pad, 52, input.sub, W - pad * 2 - 8, { size: 12.5, fill: C.soft }).svg : "",
    input.children,
    input.source
      ? t(pad, input.height - 13, input.source, { size: 10.5, fill: C.faint, mono: true })
      : "",
    `</svg>`,
  ].join("\n");
}

/** The y where a figure's drawing area starts. */
export function contentTop(sub?: string, width = 720): number {
  const meta = sub ? wrap(sub, 12.5, width - 52).length : 0;
  return sub ? 52 + meta * 17.75 + 18 : 50;
}

/* ------------------------------------------------------------------ */
/* 1. Where a component's state lives today                            */
/* ------------------------------------------------------------------ */

const SUB1 =
  "A component already holds the user's data. It holds a different copy on every device, and inside Notion it holds it in storage the browser is allowed to refuse.";

const F1 = (() => {
  const W = 720;
  const top = contentTop(SUB1, W);
  let rows = "";

  const label = top;
  rows += t(22, label, "Three devices, three separate copies", { size: 11.5, weight: 600, fill: C.soft });
  const devices: [string, string, string, "landed" | "refused"][] = [
    ["This laptop", "3 expenses saved", "expense-tracker.html, saved", "landed"],
    ["Phone", "empty", "same component, a new key space", "refused"],
    ["Work laptop", "empty", "and one more again", "refused"],
  ];
  const cardW = 274;
  const cardH = 62;
  devices.forEach((d, i) => {
    const y = top + 14 + i * 72;
    const [wash, ink] = d[3] === "landed" ? [C.landedWash, C.landed] : [C.refusedWash, C.refused];
    rows += box({ x: 22, y, w: cardW, h: cardH, r: 10, fill: C.raised, stroke: C.line });
    rows +=
      i === 0
        ? `<path d="M38 ${y + 20}h22v14H38z" fill="none" stroke="${C.soft}" stroke-width="1.4" stroke-linejoin="round"/><path d="M34 ${y + 37}h30" stroke="${C.soft}" stroke-width="1.4" stroke-linecap="round"/>`
        : i === 1
          ? `<rect x="41" y="${y + 18}" width="15" height="22" rx="3" fill="none" stroke="${C.soft}" stroke-width="1.4"/><path d="M46 ${y + 36}h5" stroke="${C.soft}" stroke-width="1.4" stroke-linecap="round"/>`
          : `<rect x="38" y="${y + 20}" width="21" height="16" rx="3" fill="none" stroke="${C.soft}" stroke-width="1.4"/><path d="M45 ${y + 34}h7" stroke="${C.soft}" stroke-width="1.4" stroke-linecap="round"/>`;
    rows += t(70, y + 22, d[0], { size: 12, weight: 600 });
    rows += chipRight(22, cardW, y + 11, d[1], { size: 10, fill: wash, ink, h: 18, weight: 600 });
    rows += t(70, y + 42, wrap(d[2], 10, cardW - 70)[0], { size: 10, fill: C.faint, mono: true });
  });
  rows += t(22 + cardW / 2, top + 14 + 3 * 72 + 2, "nothing crosses", {
    size: 10,
    fill: C.refused,
    anchor: "middle",
    mono: true,
  });

  /* right: inside Notion */
  const px = 312;
  const panelW = 386;
  const panelTop = top - 6;
  const panelH = 234;
  rows += box({ x: px, y: panelTop, w: panelW, h: panelH, r: 12, fill: C.paper, stroke: C.line });
  rows += t(px + 16, panelTop + 22, "Inside the Notion page", { size: 12.5, weight: 600 });
  rows += t(px + 16, panelTop + 39, "the same frame, either channel", { size: 10, fill: C.faint, mono: true });

  const cardY = panelTop + 50;
  rows += box({ x: px + 16, y: cardY, w: panelW - 32, h: 78, r: 10, fill: C.card, stroke: C.line });
  rows += t(px + 30, cardY + 22, "localStorage", { size: 12.5, weight: 600, mono: true });
  rows += t(px + 30, cardY + 42, "notion-arena.expense-tracker.v1", { size: 10.5, fill: C.soft, mono: true });
  rows += chip(px + 30, cardY + 50, "third-party storage", { size: 10, fill: C.refusedWash, ink: C.refused, h: 18 });
  rows += t(px + 176, cardY + 64, "every write sits in try/catch", { size: 10, fill: C.faint });

  const verdicts: [string, string, "refused" | "held" | "ours"][] = [
    ["Safari", "an opaque origin, so every write throws", "refused"],
    ["Chrome", "partitioned per site: the data is not the page's", "held"],
    ["The widget", "reports success either way, because it caught it", "ours"],
  ];
  verdicts.forEach((v, i) => {
    const y = cardY + 102 + i * 26;
    const ink = v[2] === "refused" ? C.refused : v[2] === "held" ? C.held : C.ours;
    rows += t(px + 16, y, v[0], { size: 11.5, weight: 600, fill: ink });
    rows += t(px + 84, y, v[1], { size: 10.5, fill: C.soft });
  });

  /* the measurement */
  const barY = Math.max(top + 14 + 3 * 72 + 16, panelTop + panelH + 18);
  rows += box({ x: 22, y: barY, w: 676, h: 58, r: 10, fill: C.oursWash, stroke: "none" });
  const stats: [string, string][] = [
    ["192", "widgets in public/widgets"],
    ["166", "declare a persistence key"],
    ["111", "listen for storage events"],
    ["0", "call fetch or postMessage"],
  ];
  stats.forEach((s, i) => {
    const x = 42 + i * 168;
    rows += t(x, barY + 27, s[0], { size: 15, weight: 600, fill: C.oursDeep });
    rows += t(x, barY + 44, s[1], { size: 9.5, fill: C.oursDeep, mono: true });
  });

  return figure({
    id: "f1",
    width: W,
    height: barY + 58 + 28,
    title: "Where a component's state lives today",
    sub: SUB1,
    source: "counted across the 192 files in public/widgets, 2026-10",
    children: rows,
  });
})();

/* ------------------------------------------------------------------ */
/* 2. One instance, two renderers, one system of record                 */
/* ------------------------------------------------------------------ */

const SUB2 =
  "The embed calls home on every render. The file Notion runs cannot reach the network at all, so it queues instead, and Arena rewrites the file when the data moves.";

const F2 = (() => {
  const W = 720;
  const top = contentTop(SUB2, W);
  const gap = 52;
  const L1 = 92;
  const L2 = 112;
  const L3 = 132;
  const y1 = top;
  const y2 = y1 + L1 + gap;
  const y3 = y2 + L2 + gap;
  let rows = "";

  rows += box({ x: 22, y: y1, w: 676, h: L1, r: 12, fill: C.paper, stroke: C.line });
  rows += t(40, y1 + 22, "Your page in Notion", { size: 12.5, weight: 600 });
  rows += t(186, y1 + 22, "the page owns the frame, and the frame is the sandbox", { size: 10.5, fill: C.faint });

  const cardY = y1 + 34;
  const cardH = 46;
  const cardW = 300;
  rows += box({ x: 40, y: cardY, w: cardW, h: cardH, r: 10, fill: C.card, stroke: C.ours, width: 1.2 });
  rows += t(54, cardY + 20, "embed block", { size: 11.5, weight: 600, mono: true, fill: C.oursDeep });
  rows += t(54, cardY + 36, "/embed/habit-grid?i=inst_8f2a&k=sk_…", { size: 10, fill: C.soft, mono: true });
  rows += chipRight(40, cardW, cardY + 7, "network", {
    size: 9.5,
    fill: C.oursWash,
    ink: C.oursDeep,
    mono: true,
    h: 16,
  });

  rows += box({ x: 380, y: cardY, w: cardW, h: cardH, r: 10, fill: C.card, stroke: C.held, width: 1.2 });
  rows += t(394, cardY + 20, "HTML block", { size: 11.5, weight: 600, mono: true, fill: C.held });
  rows += t(394, cardY + 36, "habit-grid-2a9c.html, a file we can rewrite", { size: 10, fill: C.soft, mono: true });
  rows += chipRight(380, cardW, cardY + 7, "no network", {
    size: 9.5,
    fill: C.heldWash,
    ink: C.held,
    mono: true,
    h: 16,
  });

  rows += box({ x: 22, y: y2, w: 676, h: L2, r: 12, fill: C.oursWash, stroke: C.ours, width: 1.2 });
  rows += t(40, y2 + 24, "Arena", { size: 13, weight: 600, fill: C.oursDeep });
  rows += t(96, y2 + 24, "the only party holding a Notion token", { size: 10.5, fill: C.oursDeep, opacity: 0.9 });
  const cells: [string, string][] = [
    ["bindings index", "1 instance, 1 data source"],
    ["sealed credentials", "AES-256-GCM at rest"],
    ["change log, receipts", "op ids, so replays are no-ops"],
    ["sync engine", "one rate-limit bucket per connection"],
  ];
  cells.forEach((cell, i) => {
    const x = 40 + i * 164;
    rows += box({ x, y: y2 + 36, w: 156, h: 62, r: 9, fill: C.card, stroke: "none" });
    rows += t(x + 12, y2 + 56, cell[0], { size: 11, weight: 600, fill: C.oursDeep });
    rows += block(x + 12, y2 + 74, cell[1], 132, { size: 9.5, fill: C.soft, lh: 1.35 }).svg;
  });

  rows += box({ x: 22, y: y3, w: 676, h: L3, r: 12, fill: C.paper, stroke: C.line });
  rows += t(40, y3 + 22, "Your workspace", { size: 12.5, weight: 600 });
  rows += t(172, y3 + 22, "the rows are the state; Arena only caches them", { size: 10.5, fill: C.faint });

  const dbX = 40;
  const dbY = y3 + 34;
  const dbW = 360;
  rows += box({ x: dbX, y: dbY, w: dbW, h: 80, r: 9, fill: C.card, stroke: C.line });
  rows += `<path d="M${dbX} ${dbY + 22}h${dbW}" stroke="${C.line}" stroke-width="1"/>`;
  const cols: [string, number][] = [
    ["Habit", 12],
    ["Date", 92],
    ["Level", 176],
    ["Arena key", 234],
  ];
  cols.forEach(([c, dx]) => rows += t(dbX + dx, dbY + 15, c, { size: 9.5, weight: 600, fill: C.soft }));
  const sample: string[][] = [
    ["water", "2026-10-11", "5", "water|2026-10-11"],
    ["water", "2026-10-12", "3", "water|2026-10-12"],
    ["read", "2026-10-12", "1", "read|2026-10-12"],
  ];
  sample.forEach((r, i) => {
    const y = dbY + 36 + i * 13;
    r.forEach((c, j) =>
      rows += t(dbX + cols[j][1], y, c, { size: j === 3 ? 8.5 : 9.5, fill: j === 3 ? C.faint : C.soft, mono: true })
    );
  });
  rows += t(dbX, dbY + 96, "Habit Heatmap log, one database per binding", { size: 9.5, fill: C.faint, mono: true });

  rows += box({ x: 424, y: dbY, w: 128, h: 50, r: 9, fill: C.landedWash, stroke: "none" });
  rows += t(436, dbY + 20, "webhook", { size: 11, weight: 600, fill: C.landed, mono: true });
  rows += t(436, dbY + 36, "ids only, HMAC-SHA256", { size: 9, fill: C.landed });

  rows += box({ x: 564, y: dbY, w: 118, h: 50, r: 9, fill: C.card, stroke: C.refused, dash: "4 3" });
  rows += t(576, dbY + 20, "403", { size: 11, weight: 600, fill: C.refused, mono: true });
  rows += t(576, dbY + 36, "the Free plan's cap", { size: 9, fill: C.soft });

  rows += block(424, dbY + 70, "Publish: the file is re-rendered and PATCHed into the block, so the offline reader refreshes in place.", 258, {
    size: 9.5,
    fill: C.faint,
    lh: 1.35,
  }).svg;

  const mid1 = y1 + L1 + gap / 2;
  rows += link({ id: "f2", d: `M250 ${y1 + L1 - 6}V${mid1 + 6}`, tone: "ours", width: 1.6 });
  rows += t(262, mid1 - 4, "fetch + SSE", { size: 10.5, weight: 600, fill: C.oursDeep });
  rows += t(262, mid1 + 9, "key in the URL, never a cookie", { size: 9.5, fill: C.soft });

  rows += link({ id: "f2", d: `M530 ${y1 + L1 - 6}V${mid1 + 6}`, tone: "held", width: 1.6, dash: "5 4" });
  rows += t(556, mid1 - 4, "no network in the sandbox", { size: 10.5, weight: 600, fill: C.held });
  rows += t(556, mid1 + 9, "writes wait in an outbox", { size: 9.5, fill: C.soft });
  rows += `<path d="M523 ${mid1 - 6}l14 12M537 ${mid1 - 6}l-14 12" stroke="${C.held}" stroke-width="1.6" stroke-linecap="round"/>`;

  const mid2 = y2 + L2 + gap / 2;
  rows += link({ id: "f2", d: `M300 ${y2 + L2 - 6}V${mid2 + 6}`, tone: "ours", width: 1.6 });
  rows += t(312, mid2 - 4, "Notion API writes", { size: 10.5, weight: 600, fill: C.oursDeep });
  rows += t(312, mid2 + 9, "the outbox drains, one row at a time", { size: 9.5, fill: C.soft });

  rows += link({ id: "f2", d: `M520 ${y3 - 6}V${mid2 - 6}`, tone: "landed", width: 1.6 });
  rows += t(532, mid2 - 4, "the webhook says a row moved", { size: 10.5, weight: 600, fill: C.landed });
  rows += t(532, mid2 + 9, "ids only, so the engine re-reads", { size: 9.5, fill: C.soft });

  const noteY = y3 + L3 + 16;
  rows += box({ x: 22, y: noteY, w: 676, h: 38, r: 10, fill: C.raised, stroke: "none" });
  rows += t(40, noteY + 24, "Two renderers, one instance: the same id, the same document, the same key.", { size: 11, fill: C.soft });

  return figure({
    id: "f2",
    width: W,
    height: noteY + 38 + 26,
    title: "One instance, two renderers, one system of record",
    sub: SUB2,
    source: "routes, limits and payload shapes as implemented in app/api/sync/** and lib/sync/**",
    children: rows,
  });
})();

/* ------------------------------------------------------------------ */
/* 3. What happens when someone clicks a cell                           */
/* ------------------------------------------------------------------ */

const SUB3 =
  "The widget saves exactly the way it always has. Everything after that is the runtime, one POST, and a commit every other renderer can see.";

const F3 = (() => {
  const W = 720;
  const top = contentTop(SUB3, W);
  let rows = "";
  const lanes: [string, string, string][] = [
    ["browser", "The widget saves its own way", "localStorage.setItem('notion-arena.habit-grid.v1', …)"],
    ["browser", "The runtime diffs it", "path water.2026-10-12, value 3, and it mints one op id"],
    ["browser", "The write is batched", "450 ms of quiet, then POST /api/sync/instances/{id}/sync"],
    ["Arena", "Operations apply to rows", "1 created, 1 updated, 0 deleted in Habit Heatmap log"],
    ["Arena", "Only changed properties are written", "toPropertyPayload uses the data source's own types"],
    ["Arena", "The commit is what others see", "rev 5, and the op id is receipted against a replay"],
    ["everyone", "Renderers pull the delta", "SSE within about 1.5 s, a 20 s poll as the fallback"],
  ];
  const rowH = 46;
  lanes.forEach((lane, i) => {
    const y = top + i * rowH;
    if (i % 2 === 0) rows += box({ x: 22, y: y - 14, w: 676, h: rowH, r: 8, fill: C.raised, stroke: "none" });
    rows += `<circle cx="44" cy="${y + 6}" r="10" fill="${C.card}" stroke="${C.line}"/>`;
    rows += t(44, y + 10, String(i + 1), { size: 10.5, weight: 600, fill: C.soft, anchor: "middle" });
    rows += t(66, y + 3, lane[1], { size: 12, weight: 600 });
    rows += chip(66 + measure(lane[1], 12) + 10, y - 8, lane[0], {
      size: 9.5,
      mono: true,
      fill: lane[0] === "Arena" ? C.oursWash : C.quietWash,
      ink: lane[0] === "Arena" ? C.oursDeep : C.quiet,
      h: 16,
    });
    rows += t(66, y + 20, lane[2], { size: 10.5, fill: C.faint, mono: true });
    if (i < lanes.length - 1) {
      rows += `<path d="M44 ${y + 18}v${rowH - 24}" stroke="${C.lineStrong}" stroke-width="1" stroke-dasharray="1.5 3"/>`;
    }
  });
  const footY = top + lanes.length * rowH + 6;
  rows += box({ x: 22, y: footY, w: 676, h: 58, r: 10, fill: C.heldWash, stroke: "none" });
  rows += t(40, footY + 22, "Offline, steps 2 and 3 become a queue", { size: 11.5, weight: 600, fill: C.held });
  rows += t(40, footY + 40, "ops keep their ids, a sync code carries them to a renderer that can reach us, and the replay is a no-op", {
    size: 10.5,
    fill: C.soft,
  });

  return figure({
    id: "f3",
    width: W,
    height: footY + 58 + 26,
    title: "What happens when someone clicks a cell",
    sub: SUB3,
    source: "lib/bridge/client.js and lib/sync/engine.ts: syncInstance",
    children: rows,
  });
})();

/* ------------------------------------------------------------------ */
/* 4. A click, and the row it becomes                                   */
/* ------------------------------------------------------------------ */

const SUB4 =
  "One cell in the widget and one row in the table are the same fact. This is the work lib/sync/mapping.ts does, and the shape of the change that goes back to every renderer.";

const F4 = (() => {
  const W = 720;
  const top = contentTop(SUB4, W);
  let rows = "";
  const H = 300;
  const lane = { x1: 22, w1: 178, x2: 232, w2: 204, x3: 468, w3: 230 };

  /* the widget */
  rows += box({ x: lane.x1, y: top, w: lane.w1, h: H, r: 12, fill: C.paper, stroke: C.line });
  rows += t(lane.x1 + 14, top + 22, "The widget", { size: 11.5, weight: 600 });
  rows += t(lane.x1 + 14, top + 38, "state, as it saves it", { size: 9.5, fill: C.faint, mono: true });

  const cell = 18;
  const gapc = 3;
  const gridX = lane.x1 + 14;
  const gridY = top + 52;
  const levels = [
    [0, 0, 1, 2, 1, 3, 2],
    [1, 2, 3, 1, 4, 2, 1],
    [0, 1, 2, 3, 2, 4, 3],
    [1, 3, 2, 4, 3, 5, 3],
    [0, 1, 1, 2, 3, 2, 1],
  ];
  levels.forEach((rowVals, r) => {
    rowVals.forEach((v, c) => {
      const isClick = r === 3 && c === 6;
      const ramp = [C.raised, C.oursWash, C.oursWash, "var(--primary-brand)", C.ours, C.oursDeep];
      rows += box({
        x: gridX + c * (cell + gapc),
        y: gridY + r * (cell + gapc),
        w: cell,
        h: cell,
        r: 4,
        fill: isClick ? C.ours : ramp[v],
        stroke: isClick ? C.oursDeep : v >= 4 ? C.ours : C.line,
        width: isClick ? 1.6 : 1,
      });
    });
  });
  const labelY = gridY + 5 * (cell + gapc) + 18;
  rows += t(gridX, labelY, "water · 2026-10-12", { size: 10, fill: C.soft, mono: true });
  rows += t(gridX, labelY + 16, "set to 3", { size: 10, fill: C.oursDeep, weight: 600 });
  rows += chip(gridX, labelY + 26, "notion-arena.habit-grid.v1", { size: 8.5, mono: true, h: 18, fill: C.oursWash, ink: C.oursDeep });

  rows += `<path d="M${lane.x1 + 14} ${labelY + 58}h${lane.w1 - 28}" stroke="${C.line}" stroke-width="1"/>`;
  rows += block(lane.x1 + 14, labelY + 78, "The runtime adopted this widget's own key by patching Storage.prototype, so the widget needed no edit.", lane.w1 - 28, {
    size: 10,
    fill: C.soft,
  }).svg;

  /* the operation */
  rows += box({ x: lane.x2, y: top, w: lane.w2, h: H, r: 12, fill: C.card, stroke: C.line });
  rows += t(lane.x2 + 14, top + 22, "One operation", { size: 11.5, weight: 600 });
  rows += t(lane.x2 + 14, top + 38, "what crosses the network", { size: 9.5, fill: C.faint, mono: true });
  const opLines: [string, string][] = [
    ["id", "op_7f2a9c81"],
    ["path", "water.2026-10-12"],
    ["value", "3"],
    ["at", "1786012345678"],
    ["baseRev", "5"],
  ];
  opLines.forEach(([k, v], i) => {
    const y = top + 60 + i * 20;
    rows += t(lane.x2 + 14, y, k, { size: 9.5, fill: C.faint, mono: true });
    rows += t(lane.x2 + 78, y, v, { size: 9.5, fill: C.ink, mono: true });
  });
  rows += `<path d="M${lane.x2 + 14} ${top + 168}h${lane.w2 - 28}" stroke="${C.line}" stroke-width="1"/>`;
  rows += t(lane.x2 + 14, top + 188, "The id is minted by the client", { size: 10.5, weight: 600, fill: C.oursDeep });
  rows += block(lane.x2 + 14, top + 206, "so a retry, or a replayed sync code, cannot write the row twice.", lane.w2 - 28, {
    size: 10,
    fill: C.soft,
  }).svg;
  rows += t(lane.x2 + 14, top + 250, "The path is where it lands", { size: 10.5, weight: 600, fill: C.oursDeep });
  rows += block(lane.x2 + 14, top + 268, "in the widget's own document, derived from the business key.", lane.w2 - 28, {
    size: 10,
    fill: C.soft,
  }).svg;

  /* the row */
  rows += box({ x: lane.x3, y: top, w: lane.w3, h: H, r: 12, fill: C.paper, stroke: C.line });
  rows += t(lane.x3 + 14, top + 22, "The row in Notion", { size: 11.5, weight: 600 });
  rows += t(lane.x3 + 14, top + 38, "Habit Heatmap log", { size: 9.5, fill: C.faint, mono: true });
  const tableY = top + 52;
  rows += box({ x: lane.x3 + 14, y: tableY, w: lane.w3 - 28, h: 104, r: 8, fill: C.card, stroke: C.line });
  rows += `<path d="M${lane.x3 + 14} ${tableY + 22}h${lane.w3 - 28}" stroke="${C.line}" stroke-width="1"/>`;
  const tcols: [string, number][] = [
    ["Habit", 10],
    ["Date", 72],
    ["Level", 152],
  ];
  tcols.forEach(([c, dx]) => rows += t(lane.x3 + 14 + dx, tableY + 15, c, { size: 9.5, weight: 600, fill: C.soft }));
  const trows: string[][] = [
    ["water", "2026-10-11", "5"],
    ["water", "2026-10-12", "3"],
    ["read", "2026-10-12", "1"],
  ];
  trows.forEach((tr, i) => {
    const y = tableY + 38 + i * 20;
    if (i === 1) {
      rows += box({ x: lane.x3 + 16, y: y - 14, w: lane.w3 - 32, h: 19, r: 5, fill: C.landedWash, stroke: "none" });
      rows += box({ x: lane.x3 + 14, y: y - 14, w: 2.5, h: 19, r: 1.5, fill: C.landed, stroke: "none" });
    }
    tr.forEach((c, j) => rows += t(lane.x3 + 14 + tcols[j][1], y, c, { size: 9.5, fill: C.soft, mono: true }));
  });
  rows += t(lane.x3 + 14, tableY + 128, "Arena key", { size: 9.5, weight: 600, fill: C.soft });
  rows += t(lane.x3 + 14, tableY + 144, "water|2026-10-12", { size: 9.5, fill: C.ink, mono: true });
  rows += chip(lane.x3 + 14, tableY + 154, "rich_text, hidden in the UI", { size: 8.5, mono: true, h: 18 });
  rows += t(lane.x3 + 14, tableY + 196, "Source", { size: 9.5, weight: 600, fill: C.soft });
  rows += t(lane.x3 + 78, tableY + 196, "widget · notion", { size: 9.5, fill: C.ink, mono: true });
  rows += block(lane.x3 + 14, tableY + 214, "A person can retype the key; the engine treats their edit as the truth.", lane.w3 - 28, {
    size: 10,
    fill: C.faint,
  }).svg;

  /* connectors, in the gutters */
  const midY = top + 30;
  rows += link({ id: "f4", d: `M${lane.x1 + lane.w1 + 3} ${midY}h${lane.x2 - lane.x1 - lane.w1 - 6}`, tone: "ours", width: 1.6 });
  rows += t((lane.x1 + lane.w1 + lane.x2) / 2, midY - 9, "1 op", { size: 8.5, fill: C.oursDeep, anchor: "middle", mono: true });
  rows += link({ id: "f4", d: `M${lane.x2 + lane.w2 + 3} ${midY}h${lane.x3 - lane.x2 - lane.w2 - 6}`, tone: "landed", width: 1.6 });
  rows += t((lane.x2 + lane.w2 + lane.x3) / 2, midY - 9, "1 row", { size: 8.5, fill: C.landed, anchor: "middle", mono: true });

  /* the return trip */
  const backY = top + H + 14;
  rows += box({ x: 22, y: backY, w: 676, h: 58, r: 10, fill: C.oursWash, stroke: "none" });
  rows += t(40, backY + 22, "Coming back", { size: 11.5, weight: 600, fill: C.oursDeep });
  rows += t(122, backY + 22, "the engine sends the delta and the document, because a row is not a location", {
    size: 10.5,
    fill: C.oursDeep,
  });
  rows += t(40, backY + 42, "each renderer replaces its state; its own diff decides what to repaint, so a heatmap never has to understand a business key", {
    size: 10,
    fill: C.soft,
  });

  return figure({
    id: "f4",
    width: W,
    height: backY + 58 + 28,
    title: "A click, and the row it becomes",
    sub: SUB4,
    source: "lib/sync/mapping.ts: businessKey, pathForKey, toPropertyPayload",
    children: rows,
  });
})();

/* ------------------------------------------------------------------ */
/* 5. Two writers, one cell                                             */
/* ------------------------------------------------------------------ */

const SUB5 =
  "Who edited what while the other side was not looking. The policy is per field: the later edit wins, and the loser is written down rather than thrown away.";

const F5 = (() => {
  const W = 720;
  const top = contentTop(SUB5, W);
  let rows = "";
  const H = 340;

  rows += box({ x: 22, y: top, w: 676, h: H, r: 12, fill: C.paper, stroke: C.line });

  const cardW = 208;
  const cardH = 84;
  const cardY = top + 22;
  const xs = [40, 256, 472];

  /* the row */
  rows += box({ x: xs[0], y: cardY, w: cardW, h: cardH, r: 10, fill: C.card, stroke: C.line });
  rows += t(xs[0] + 14, cardY + 22, "Notion", { size: 11.5, weight: 600, fill: C.landed });
  rows += t(xs[0] + 14, cardY + 40, "water|2026-10-11", { size: 9.5, fill: C.faint, mono: true });
  rows += t(xs[0] + 14, cardY + 62, "Level", { size: 10, fill: C.soft, mono: true });
  rows += t(xs[0] + 62, cardY + 62, "2", { size: 11, weight: 600, fill: C.landed, mono: true });
  rows += chipRight(xs[0], cardW, cardY + 50, "the row now", { size: 9, fill: C.landedWash, ink: C.landed, h: 17 });

  /* the phone */
  rows += box({ x: xs[1], y: cardY, w: cardW, h: cardH, r: 10, fill: C.card, stroke: C.held, width: 1.2 });
  rows += t(xs[1] + 14, cardY + 22, "Your phone", { size: 11.5, weight: 600, fill: C.held });
  rows += t(xs[1] + 14, cardY + 40, "set it to 2, offline", { size: 9.5, fill: C.soft });
  rows += t(xs[1] + 14, cardY + 58, "op_4b71 · queued", { size: 9.5, fill: C.faint, mono: true });
  rows += chipRight(xs[1], cardW, cardY + 50, "10:02:14", { size: 9, mono: true, h: 17 });

  /* the laptop */
  rows += box({ x: xs[2], y: cardY, w: cardW, h: cardH, r: 10, fill: C.card, stroke: C.ours, width: 1.2 });
  rows += t(xs[2] + 14, cardY + 22, "Your laptop", { size: 11.5, weight: 600, fill: C.oursDeep });
  rows += t(xs[2] + 14, cardY + 40, "set it to 5", { size: 9.5, fill: C.soft });
  rows += t(xs[2] + 14, cardY + 58, "op_1c9a · baseRev 4", { size: 9.5, fill: C.faint, mono: true });
  rows += chipRight(xs[2], cardW, cardY + 50, "10:02:31", { size: 9, mono: true, h: 17 });

  /* both land on one key */
  const chipText = "water|2026-10-11";
  const chipWid = chipW(chipText, 10, true);
  const mergeY = cardY + cardH + 26;
  const chipX = 300;
  rows += chip(chipX, mergeY, chipText, { size: 10, mono: true, h: 22, fill: C.oursWash, ink: C.oursDeep });
  rows += t(chipX - 14, mergeY + 15, "one cell", { size: 10, fill: C.faint, anchor: "end" });
  rows += t(40, mergeY + 44, "Both writers meant this one record, and neither of them knew about the other.", {
    size: 10,
    fill: C.faint,
  });
  const dropTop = cardY + cardH + 4;
  /* the phone, straight down into the cell */
  rows += link({ id: "f5", d: `M${xs[1] + cardW / 2} ${dropTop}V${mergeY - 4}`, tone: "held", width: 1.3, dash: "4 3" });
  /* the laptop, down the right side and back into the same cell */
  rows += link({
    id: "f5",
    d: `M${xs[2] + cardW / 2} ${dropTop}V${mergeY + 11}H${chipX + chipWid + 6}`,
    tone: "ours",
    width: 1.3,
    dash: "4 3",
  });
  rows += dot(xs[1] + cardW / 2, dropTop, 3, toneColor("held"));
  rows += dot(xs[2] + cardW / 2, dropTop, 3, toneColor("ours"));

  /* the three steps */
  const steps: [string, string][] = [
    ["Order by time", "last_edited_time decides, and our own counter breaks a tie inside one round, so 2 wins"],
    ["Write once", "one row is updated: no duplicate, no second record for the same habit and day"],
    ["Keep the loser", "the value that lost goes into the append-only conflict log and shows as a notice"],
  ];
  steps.forEach((step, i) => {
    const y = mergeY + 72 + i * 40;
    rows += `<circle cx="52" cy="${y - 4}" r="9.5" fill="${C.card}" stroke="${C.line}"/>`;
    rows += t(52, y, String(i + 1), { size: 10, weight: 600, fill: C.soft, anchor: "middle" });
    rows += t(74, y, step[0], { size: 11, weight: 600 });
    rows += t(74 + 108, y, step[1], { size: 10.5, fill: C.soft });
  });

  rows += t(40, top + H - 22, "keep-both is the other policy, used for event-shaped data: two records, both kept, neither silently merged.", {
    size: 10,
    fill: C.faint,
  });

  return figure({
    id: "f5",
    width: W,
    height: top + H + 28,
    title: "Two writers, one cell",
    sub: SUB5,
    source: "lib/sync/engine.ts: materialise and the conflict policy; lib/sync/types.ts: ChangeRecord.conflict",
    children: rows,
  });
})();

/* ------------------------------------------------------------------ */
/* 6. The instance is the identity                                      */
/* ------------------------------------------------------------------ */

const SUB6 =
  "The same rows on the phone as on the laptop, with no account to create and no cookie to carry: the address of the component is the instance, and the instance carries a key.";

const F6 = (() => {
  const W = 720;
  const top = contentTop(SUB6, W);
  let rows = "";
  const H = 322;

  rows += box({ x: 22, y: top, w: 676, h: H, r: 12, fill: C.paper, stroke: C.line });

  const cx = 208;
  const cy = top + 26;
  const cw = 288;
  const ch = 150;
  rows += box({ x: cx, y: cy, w: cw, h: ch, r: 12, fill: C.card, stroke: C.ours, width: 1.2 });
  rows += t(cx + 18, cy + 26, "The instance", { size: 12.5, weight: 600, fill: C.oursDeep });
  const rowsOf: [string, string][] = [
    ["id", "inst_8f2a41c7"],
    ["component", "habit-grid"],
    ["bound to", "Habit Heatmap log"],
    ["rev", "5"],
  ];
  rowsOf.forEach(([k, v], i) => {
    rows += t(cx + 18, cy + 48 + i * 18, k, { size: 9.5, fill: C.faint, mono: true });
    rows += t(cx + 88, cy + 48 + i * 18, v, { size: 9.5, fill: C.ink, mono: true });
  });
  rows += chip(cx + 18, cy + 122, "one component, one binding", { size: 9.5, fill: C.oursWash, ink: C.oursDeep, h: 18 });

  /* left: the key travels in the address */
  rows += t(22, top + 28, "In the address", { size: 11, weight: 600, fill: C.soft });
  rows += link({ id: "f6", d: `M186 ${cy + 100}h14`, tone: "ours", width: 1.6 });
  rows += box({ x: 22, y: cy + 30, w: 164, h: 48, r: 8, fill: C.raised, stroke: "none" });
  rows += t(34, cy + 48, "?i=inst_8f2a41c7", { size: 8.5, fill: C.ink, mono: true });
  rows += t(34, cy + 62, "&k=sk_poQurl9_…", { size: 8.5, fill: C.ink, mono: true });
  rows += block(22, cy + 96, "The embed, the standalone page and the downloaded file all carry the same pair.", 164, {
    size: 10,
    fill: C.soft,
  }).svg;

  /* right: the key at rest */
  rows += t(506, top + 28, "At rest", { size: 11, weight: 600, fill: C.soft });
  rows += link({ id: "f6", d: `M492 ${cy + 84}h14`, tone: "ours", width: 1.6 });
  rows += chip(506, cy + 30, "SHA-256", { size: 9.5, fill: C.quietWash, ink: C.quiet, mono: true, h: 18 });
  rows += chip(506, cy + 54, "AES-256-GCM", { size: 9.5, fill: C.quietWash, ink: C.quiet, mono: true, h: 18 });
  rows += block(514, cy + 96, "Hashed for lookup, sealed so it can be re-shown. A Notion token never reaches a browser.", 184, {
    size: 10,
    fill: C.soft,
  }).svg;

  /* the lifecycle of the key */
  const lifeY = cy + ch + 22;
  const actions: [string, string, "landed" | "held" | "refused"][] = [
    ["Rotate", "the old URL answers 401 at once", "held"],
    ["Revoke", "410, and the key can never be shown again", "refused"],
    ["Attribute", "events carry the key prefix and a device id", "landed"],
  ];
  actions.forEach(([title, body, tone], i) => {
    const x = 40 + i * 212;
    const ink = tone === "landed" ? C.landed : tone === "held" ? C.held : C.refused;
    rows += box({ x, y: lifeY, w: 204, h: 64, r: 10, fill: C.raised, stroke: "none" });
    rows += t(x + 14, lifeY + 24, title, { size: 11.5, weight: 600, fill: ink });
    rows += block(x + 14, lifeY + 42, body, 176, { size: 10, fill: C.soft }).svg;
  });

  rows += t(40, lifeY + 88, "Every renderer of an instance shows the same rows because they share the instance, not because they share a login.", {
    size: 10.5,
    fill: C.faint,
  });

  return figure({
    id: "f6",
    width: W,
    height: top + H + 28,
    title: "The instance is the identity",
    sub: SUB6,
    source: "lib/sync/instances.ts, lib/sync/ids.ts, lib/sync/crypto.ts",
    children: rows,
  });
})();

/* ------------------------------------------------------------------ */

export const DIAGRAMS: { id: string; title: string; svg: string }[] = [
  { id: "01-where-state-lives", title: "Where a component's state lives today", svg: F1 },
  { id: "02-topology", title: "One instance, two renderers, one system of record", svg: F2 },
  { id: "03-lifecycle", title: "What happens when someone clicks a cell", svg: F3 },
  { id: "04-click-to-row", title: "A click, and the row it becomes", svg: F4 },
  { id: "05-conflict-policy", title: "Two writers, one cell", svg: F5 },
  { id: "06-identity", title: "The instance is the identity", svg: F6 },
];

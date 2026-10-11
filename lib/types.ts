/**
 * Blocksmith component model.
 *
 * A "component" is one of two things:
 *
 * 1. `widget` : a single self-contained .html file with no external
 *                 dependencies. The exact same file is delivered two ways:
 *                   • as an embed URL  -> Notion `/embed` block (iframe)
 *                   • as an HTML block -> Notion `/html` (File Upload API,
 *                                         `embed.file_upload`, sandboxed)
 *                 Because Notion's HTML-block sandbox blocks network access,
 *                 widgets must be 100% offline-capable: inline CSS/JS only,
 *                 no CDNs, no fonts, no fetch(). State is localStorage at most.
 *
 * 2. `native` : a "recipe": a deterministic set of Notion API calls that
 *                 build real Notion structure (databases, data source
 *                 properties, views incl. dashboard/chart, synced blocks,
 *                 page templates, formulas) plus the steps that the API
 *                 cannot express yet (buttons, database automations).
 */

export type ComponentKind = "widget" | "native";

export type Tier = "free" | "pro";

export type CategorySlug =
  | "dashboards"
  | "time"
  | "trackers"
  | "planning"
  | "business"
  | "visuals"
  | "docs"
  | "automations";

export type ParamType = "text" | "number" | "select" | "color" | "boolean" | "date";

export interface WidgetParam {
  /** query-string key */
  key: string;
  label: string;
  type: ParamType;
  default: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  help?: string;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  emoji: string;
  blurb: string;
  color: NotionColor;
  /**
   * A Notion property pastel, as a CSS var reference. Cards and icons use the
   * tint as background and `color` as ink, so the pairing stays legible in both
   * themes without a second lookup table.
   */
  tint: string;
}

export type NotionColor =
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface ComponentBase {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  category: CategorySlug;
  kind: ComponentKind;
  tier: Tier;
  tags: string[];
  color: NotionColor;
  /** minimum Notion plan that can use this component */
  plan: "Free" | "Plus" | "Business";
  version: string;
  updatedAt: string;
  badge?: "new" | "popular" | "staff-pick";
  features: string[];
  useCases: string[];
  /** honest capability flags, surfaced in the UI */
  capabilities: {
    interactive: boolean;
    offlineSafe: boolean;
    persistsLocally: boolean;
    writesToNotion: boolean;
    needsNetwork: boolean;
  };
}

export interface WidgetComponent extends ComponentBase {
  kind: "widget";
  /** path under /public */
  file: string;
  /** default iframe height in px */
  height: number;
  minHeight: number;
  maxHeight: number;
  params: WidgetParam[];
  /** which delivery channels this widget supports */
  delivery: ("embed" | "html-block" | "download")[];
}

export interface NativeComponent extends ComponentBase {
  kind: "native";
  /** identifier into lib/recipes */
  recipe: string;
  /** what gets created, shown as a checklist on the detail page */
  creates: { icon: string; label: string; detail: string }[];
  delivery: ("api" | "duplicate" | "guide")[];
  height?: number;
}

export type CatalogComponent = WidgetComponent | NativeComponent;

export function isWidget(c: CatalogComponent): c is WidgetComponent {
  return c.kind === "widget";
}

export const CATEGORIES: Category[] = [
  {
    slug: "dashboards",
    name: "Dashboards & KPIs",
    emoji: "📊",
    blurb: "Glanceable numbers, clocks and status panels for the top of any page.",
    color: "blue",
  tint: "var(--tag-bg-blue)",
  },
  {
    slug: "time",
    name: "Time & Focus",
    emoji: "⏱️",
    blurb: "Calendars, countdowns, clocks, Pomodoro, and breathing timers.",
    color: "orange",
  tint: "var(--tag-bg-orange)",
  },
  {
    slug: "trackers",
    name: "Trackers",
    emoji: "🔥",
    blurb: "Habits, streaks, mood and counters with heatmaps that persist locally.",
    color: "green",
  tint: "var(--tag-bg-green)",
  },
  {
    slug: "planning",
    name: "Planning & Projects",
    emoji: "🗂️",
    blurb: "Kanban, Gantt, prioritisation matrices and roadmap timelines.",
    color: "purple",
  tint: "var(--tag-bg-purple)",
  },
  {
    slug: "business",
    name: "Business & CRM",
    emoji: "💼",
    blurb: "Pipelines, sprints, OKRs, invoices and calculators for client work.",
    color: "brown",
  tint: "var(--tag-bg-brown)",
  },
  {
    slug: "visuals",
    name: "Visuals & Diagrams",
    emoji: "🎨",
    blurb: "Org charts, whiteboards and quote cards: things Notion can't draw.",
    color: "pink",
  tint: "var(--tag-bg-pink)",
  },
  {
    slug: "docs",
    name: "Docs & Systems",
    emoji: "📚",
    blurb: "Knowledge systems, study aids, meeting notes, PARA, portals and wikis.",
    color: "yellow",
  tint: "var(--tag-bg-yellow)",
  },
  {
    slug: "automations",
    name: "Buttons & Automations",
    emoji: "⚡",
    blurb: "Database automations, recurring templates and button chains.",
    color: "red",
  tint: "var(--tag-bg-red)",
  },
];

export function categoryOf(slug: CategorySlug) {
  return CATEGORIES.find((c) => c.slug === slug)!;
}

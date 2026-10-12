import type { WidgetParam } from "@/lib/types";

export type JsonFieldType = "text" | "number" | "color" | "select";

export interface JsonField {
  key: string;
  label: string;
  type: JsonFieldType;
  placeholder?: string;
  default?: string | number;
  options?: { value: string; label: string }[];
  /** Render a taller textarea (for series arrays, nested blobs, etc.). */
  multiline?: boolean;
  /** Help text shown below the field. */
  hint?: string;
  /**
   * Comma-separated list of numbers, stored in the JSON as a real number
   * array and displayed as a text field (e.g. KPI sparklines).
   */
  arrayOfNumbers?: boolean;
}

export interface JsonArraySpec {
  /** Label for a single item (e.g. "metric", "task", "person", "card"). */
  itemLabel: string;
  /** Field descriptors, in display order. */
  fields: JsonField[];
  /** Optional object used as the template when adding a new row. */
  emptyItem: Record<string, unknown>;
  /** Optional subtitle displayed above the editor (what the array does). */
  description?: string;
  /** Optional sample array to seed the editor ("Load sample" button). */
  sample?: Record<string, unknown>[];
}

/**
 * Heuristic + keyed registry. We don't change the catalog schema's "type"
 * field — widgets continue to accept a JSON string — but the configurator can
 * render a friendly row editor when it recognises a param.
 */
const SPECS: Record<string, JsonArraySpec> = {
  // KPI Strip
  "kpi-strip:data": {
    itemLabel: "metric",
    description:
      "Each metric becomes a tile. Series entries draw sparkline points (number pairs).",
    fields: [
      { key: "label", label: "Label", type: "text", placeholder: "MRR", default: "" },
      { key: "value", label: "Value", type: "number", placeholder: "0", default: 0 },
      { key: "unit", label: "Unit", type: "text", placeholder: "$", default: "" },
      { key: "delta", label: "Delta", type: "text", placeholder: "+12%", default: "" },
      { key: "target", label: "Target", type: "number", placeholder: "0", default: 0 },
      {
        key: "series",
        label: "Series (comma numbers)",
        type: "text",
        placeholder: "12,18,14,22",
        default: "",
        multiline: true,
        arrayOfNumbers: true,
        hint: "Optional. Comma-separated numbers for the sparkline.",
      },
    ],
    emptyItem: { label: "", value: 0, unit: "", delta: "", target: 0, series: "" },
    sample: [
      { label: "MRR", value: 48200, unit: "$", delta: "+8.4%", target: 60000, series: [31, 33, 34, 36, 38, 37, 40, 42, 43, 45, 46, 48.2] },
      { label: "Active users", value: 3184, unit: "", delta: "+3.1%", target: 4000, series: [2400, 2500, 2560, 2650, 2700, 2810, 2880, 2950, 3010, 3090, 3140, 3184] },
      { label: "Churn", value: 2.4, unit: "%", delta: "-0.6", target: 2, series: [3.6, 3.5, 3.4, 3.2, 3.3, 3.1, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4] },
      { label: "NPS", value: 61, unit: "", delta: "+4", target: 70, series: [44, 46, 47, 49, 50, 52, 53, 55, 56, 58, 59, 61] },
    ],
  },
  // Gantt
  "gantt-timeline:data": {
    itemLabel: "task",
    description: "Each task draws as a bar across date columns.",
    fields: [
      { key: "name", label: "Task name", type: "text", placeholder: "Design", default: "" },
      { key: "start", label: "Start date", type: "text", placeholder: "2026-01-05", default: "" },
      { key: "end", label: "End date", type: "text", placeholder: "2026-01-15", default: "" },
      { key: "progress", label: "Progress", type: "number", placeholder: "0–100", default: 0 },
      { key: "group", label: "Group lane", type: "text", placeholder: "Design", default: "" },
      { key: "color", label: "Accent", type: "color", default: "#2383e2" },
      { key: "dependsOn", label: "Depends on", type: "text", placeholder: "task index", default: "" },
    ],
    emptyItem: {
      name: "", start: "", end: "", progress: 0, group: "", color: "#2383e2", dependsOn: "",
    },
  },
  // Kanban cards
  "mini-kanban:cards": {
    itemLabel: "card",
    description: "Seed cards for the board. Columns come from the Columns field above.",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "Write changelog", default: "" },
      { key: "column", label: "Column", type: "text", placeholder: "Backlog", default: "" },
      { key: "tag", label: "Tag", type: "text", placeholder: "docs", default: "" },
    ],
    emptyItem: { title: "", column: "", tag: "" },
  },
  // Org chart / team
  "org-chart:data": {
    itemLabel: "person",
    description: "People render as nodes with reporting lines.",
    fields: [
      { key: "name", label: "Name", type: "text", placeholder: "Jamie Doe", default: "" },
      { key: "role", label: "Role", type: "text", placeholder: "PM", default: "" },
      { key: "reportsTo", label: "Reports to", type: "text", placeholder: "index or name", default: "" },
      { key: "initials", label: "Initials", type: "text", placeholder: "JD", default: "" },
      { key: "color", label: "Accent", type: "color", default: "#2383e2" },
    ],
    emptyItem: { name: "", role: "", reportsTo: "", initials: "", color: "#2383e2" },
  },
};

/** Detect a spec for a given param. Returns null if we should fall back to text/textarea. */
export function specFor(widgetSlug: string, p: WidgetParam): JsonArraySpec | null {
  const byKey = SPECS[`${widgetSlug}:${p.key}`];
  if (byKey) return byKey;
  if (!/JSON/i.test(p.label)) return null;
  // Generic fallback: a small schema with label/value when we don't know the shape.
  return {
    itemLabel: "item",
    description:
      "Add or edit entries here. Switch to the JSON tab to see or paste raw JSON.",
    fields: [
      { key: "label", label: "Label", type: "text", default: "" },
      { key: "value", label: "Value", type: "text", default: "" },
    ],
    emptyItem: { label: "", value: "" },
  };
}

/** Parse the user's JSON string into an array safely. */
export function parseJsonArray(raw: string): unknown[] {
  if (!raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Serialize rows array back into pretty JSON. */
export function serializeJsonArray(rows: unknown[]): string {
  return JSON.stringify(rows, null, 2);
}

/** Coerce a form input string into the right JS type for a field. */
export function coerceField(f: JsonField, raw: string): unknown {
  if (f.type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : f.default ?? 0;
  }
  return raw;
}

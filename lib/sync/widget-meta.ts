/**
 * What a widget file declares about itself.
 *
 * Two facts about a widget live only inside the widget, in `public/widgets/
 * <slug>.html`, and both were assumed wrongly before this file existed:
 *
 *   1. **Its persistence key.** Most widgets write `notion-arena.<slug>.v1`,
 *      and the bridge adopts that key. Ten do not: habit-grid writes
 *      `notion-arena.habits.v1`, quote-card writes `notion-arena.quote.offset`,
 *      and so on. Adopting a key the widget never touches means the server's
 *      snapshot is written to a key nobody reads: in a sandboxed frame (an
 *      HTML block with an opaque origin) the widget then renders empty while
 *      rows exist in Notion.
 *
 *   2. **Its field list**, for the 84 list widgets generated from a `SPEC`
 *      object: field keys, labels, types, select options, the title field, the
 *      status vocabulary and (for two of them) a checklist. That is precisely
 *      the metadata a record schema needs, so it is read rather than retyped.
 *
 * Reading the file at runtime is deliberate: a generated copy of this metadata
 * is a second thing to keep in sync, and the whole point of the sync layer is
 * to remove second copies. `scripts/check-components.mjs` re-reads the same
 * files and fails if a bound component's declared columns no longer match its
 * SPEC.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export interface WidgetField {
  key: string;
  label: string;
  /** the widget's own vocabulary: text | number | date | select | checkbox */
  type: string;
  options?: string[];
  max?: number;
  required?: boolean;
}

export interface WidgetSpec {
  slug: string;
  title: string;
  description: string;
  fields: WidgetField[];
  titleField: string;
  /** `{label, options, default, done}` or `{field, values, default, colors}` */
  status?: {
    label?: string;
    field?: string;
    options?: string[];
    values?: string[];
    default?: string;
    done?: string[];
  };
  /** fixed checklist labels, when the widget has one */
  checks?: string[] | null;
  defaultStatus?: string;
}

const root = process.cwd();
const widgetsDir = path.join(root, "public", "widgets");

const specCache = new Map<string, WidgetSpec | null>();
const keyCache = new Map<string, string | null>();

function source(slug: string): string | null {
  try {
    return readFileSync(path.join(widgetsDir, `${slug}.html`), "utf8");
  } catch {
    return null;
  }
}

/** The `{ … }` that starts at `from`, respecting strings and escapes. */
function balancedObject(text: string, from: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return null;
}

/** The widget's `SPEC` object, or null when the widget is not SPEC-generated. */
export function widgetSpec(slug: string): WidgetSpec | null {
  if (specCache.has(slug)) return specCache.get(slug) ?? null;
  let out: WidgetSpec | null = null;
  const text = source(slug);
  if (text) {
    const at = text.search(/var\s+SPEC\s*=\s*\{/);
    if (at !== -1) {
      const brace = text.indexOf("{", at);
      const body = balancedObject(text, brace);
      if (body) {
        try {
          out = JSON.parse(body) as WidgetSpec;
        } catch {
          out = null;
        }
      }
    }
  }
  specCache.set(slug, out);
  return out;
}

/**
 * The storage key the widget itself reads and writes.
 *
 * Preference order, because a widget may mention more than one key in passing:
 * its own `<slug>` key, then any `notion-arena.*.v1`, then anything shaped like
 * one. `null` means the widget persists nothing, and a binding for it would be
 * a lie: the caller says so instead.
 */
export function widgetStorageKey(slug: string): string | null {
  if (keyCache.has(slug)) return keyCache.get(slug) ?? null;
  const text = source(slug);
  let out: string | null = null;
  if (text) {
    const keys = [...new Set(text.match(/notion-arena\.[a-z0-9.-]+/gi) ?? [])];
    out =
      keys.find((k) => k === `notion-arena.${slug}.v1`) ??
      keys.find((k) => /\.v1$/.test(k)) ??
      keys[0] ??
      null;
  }
  keyCache.set(slug, out);
  return out;
}

/** Keys that differ from the obvious one, for the docs and the checks. */
export function storageKeyAliases(slugs: string[]): { slug: string; adoptKey: string }[] {
  const out: { slug: string; adoptKey: string }[] = [];
  for (const slug of slugs) {
    const key = widgetStorageKey(slug);
    if (key && key !== `notion-arena.${slug}.v1`) out.push({ slug, adoptKey: key });
  }
  return out;
}

/** How the widget's own field types map onto Notion property types. */
export function notionTypeForWidgetField(type: string): "title" | "rich_text" | "number" | "date" | "select" | "checkbox" {
  switch (type) {
    case "number":
      return "number";
    case "date":
      return "date";
    case "select":
      return "select";
    case "checkbox":
      return "checkbox";
    default:
      return "rich_text";
  }
}

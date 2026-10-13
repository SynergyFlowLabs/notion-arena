/**
 * A plausible first document for any widget.
 *
 * Binding needs a document to put in the first write. When a widget has never
 * been opened in a browser there is nothing in its storage, so the question
 * "what does this widget's table look like?" has no honest answer unless we can
 * produce one — and the answer has to come from what the widget itself declares,
 * never from a guess about widgets in general.
 *
 * Three sources, in order:
 *
 *   1. The hand-written seeds in `lib/sync/components.ts`, for the ten.
 *   2. The widget's own `SPEC`, for the 84 widgets generated from one: field
 *      keys, labels, types, select options, the title field, the status
 *      vocabulary and any fixed checklist. Two rows is enough to see a table
 *      with more than one row in it.
 *   3. **Harvested**: for the hand-written long tail there is no declaration to
 *      read, so the widget itself is run headlessly with an empty storage and
 *      its own handlers pressed until it persists something
 *      (`scripts/harvest-samples.mjs`). What it writes *is* its default state —
 *      measured, not assumed — and each entry records how it was obtained.
 *
 * Everything else returns `null`, and the caller says so rather than inventing a
 * shape. That gap is real, and `scripts/check-coverage.mjs` measures it instead
 * of hiding it.
 *
 * Server-only: it reads widget files through `widget-meta`.
 */

import { boundComponent } from "./components";
import { HARVESTED } from "./samples.harvested";
import { widgetSpec, type WidgetField, type WidgetSpec } from "./widget-meta";

export interface Sample {
  /** the document the widget would have persisted */
  state: unknown;
  source: "seed" | "spec" | "harvested";
  /** how many records the document holds, for a caller that wants to say so */
  items: number;
  /** the widget's own key, so a caller can tell whether the widget has one */
  adoptKey: string | null;
}

/** Fixed dates, so a sample document is the same on every run and every machine. */
const DATES = ["2026-10-09", "2026-10-14"];

function textFor(field: WidgetField, row: number): string {
  const label = field.label?.trim() || field.key;
  // The label is what a person reads in the column header, so using it as the
  // value makes a sample table obvious rather than clever.
  return row === 0 ? `${label} one` : `${label} two`;
}

function valueFor(field: WidgetField, row: number): unknown {
  switch (field.type) {
    case "number":
      // Widgets built on inputs store numbers as strings, which is what the
      // mapping layer has to survive; a real number would test an easier case.
      return row === 0 ? "3" : "7";
    case "date":
      return DATES[row] ?? DATES[0];
    case "select":
      return field.options?.[0] ?? "One";
    case "checkbox":
      return row === 1;
    case "color":
      return "#2f6f4f";
    default:
      return textFor(field, row);
  }
}

/** Two rows, built only from what the widget declares about its own fields. */
export function specSample(slug: string, spec: WidgetSpec): unknown[] {
  const titleKey = spec.fields.some((f) => f.key === spec.titleField)
    ? spec.titleField
    : spec.fields[0]?.key;
  const statusKey = spec.status?.field ?? "status";
  const statusOptions = spec.status?.options ?? spec.status?.values;
  const statusDefault = spec.status?.default ?? statusOptions?.[0];
  // Every check, not a few: the widget's checklist is fixed, so its document
  // always carries the whole list and a sample with half of it can never round
  // trip. (Found by `check:coverage`: release-readiness-checklist came back with
  // five checks where the sample had three.)
  const checks = spec.checks?.length ? spec.checks : null;

  return [0, 1].map((row) => {
    const item: Record<string, unknown> = {
      // The widget's own id, because that is what makes two identical rows two
      // rows. A sample without one would collapse the two rows into one and
      // make the first thing a user sees a missing record.
      id: `${slug}-${row + 1}`,
    };
    for (const field of spec.fields) {
      if (field.key === titleKey) {
        item[field.key] = `${spec.title} sample ${row + 1}`;
        continue;
      }
      if (field.key === statusKey && statusOptions?.length) {
        item[field.key] = statusOptions[Math.min(row, statusOptions.length - 1)];
        continue;
      }
      item[field.key] = valueFor(field, row);
    }
    if (statusOptions?.length && statusDefault && !(statusKey in item)) item[statusKey] = statusDefault;
    if (checks) item.checks = checks.map((label, i) => ({ label, done: row === 1 ? i < 2 : i === 0 }));
    return item;
  });
}

/** The first document to bind with, or `null` when nothing honest can be made. */
export function sampleStateFor(slug: string): Sample | null {
  const bound = boundComponent(slug);
  if (bound) {
    return {
      state: bound.seed,
      source: "seed",
      items: Array.isArray(bound.seed) ? bound.seed.length : countLeaves(bound.seed),
      adoptKey: null,
    };
  }
  const spec = widgetSpec(slug);
  if (spec?.fields?.length) {
    const state = specSample(slug, spec);
    return { state, source: "spec", items: state.length, adoptKey: null };
  }
  const harvested = HARVESTED[slug];
  if (harvested && harvested.doc !== undefined && harvested.doc !== null) {
    return {
      state: harvested.doc,
      source: "harvested",
      items: Array.isArray(harvested.doc) ? harvested.doc.length : countLeaves(harvested.doc),
      adoptKey: harvested.key ?? null,
    };
  }
  return null;
}

function countLeaves(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (n, v) => n + countLeaves(v),
      0
    );
  }
  return 1;
}

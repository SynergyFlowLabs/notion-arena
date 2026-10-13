/**
 * Record schemas: how a widget's own JSON becomes rows, and back.
 *
 * Design rule from docs/DATA_SYNC_RESEARCH.md §5.3: a field either serialises
 * into a real Notion property type or the binding is refused. Nothing is
 * silently stringified into a title, because that is how "two-way sync" tools
 * quietly become one-way exports.
 *
 * Three sources of schema, in order of authority:
 *
 *   1. **Declared here** (`DECLARED`): the shapes inference cannot read. A
 *      habit heatmap is `{habit: {date: level}}`; a grocery list is keyed by a
 *      hash of its label. Seven lines each, and each one is a promise that the
 *      round trip is exact.
 *   2. **Read from the widget** (`specSchema`): 84 of the 192 widgets are
 *      generated from a `SPEC` object that already names every field, its type,
 *      its select options, the title field, the status vocabulary and any
 *      fixed checklist. That is the same metadata a record schema needs, so it
 *      is read out of the file rather than retyped here. It is still a *declared*
 *      schema in the sense that matters: nothing is guessed from a sample.
 *   3. **Inferred** (last): an array of flat records, for the long tail of
 *      widgets nobody has bound yet. It is a fallback, labelled `inferred`, and
 *      the UI says so rather than pretending the mapping is exact.
 *
 * This file is server-only: it reads widget files. `lib/sync/components.ts`
 * holds the client-safe half (labels, blurbs, seed documents).
 */

import type { FieldMap, NotionPropertyType } from "./types";
import { notionTypeForWidgetField, widgetSpec, type WidgetSpec } from "./widget-meta";

export interface RecordSchema {
  slug: string;
  /** what one item is called in the UI: "habit tick", "expense", "chore" */
  itemLabel: string;
  shape: "array" | "map" | "nested-map";
  /** items out of the widget's state document */
  read: (state: unknown) => Record<string, unknown>[];
  /** widget's state document back from items */
  write: (state: unknown, items: Record<string, unknown>[]) => unknown;
  fields: FieldMap[];
  /** what a new item looks like, used when the widget adds one in Notion */
  empty: Record<string, unknown>;
  /** true when the schema was inferred rather than declared */
  inferred: boolean;
  /**
   * Inferred, and it would drop something.
   *
   * A record with a nested object or an array inside it cannot be a row: Notion
   * has no property that holds either. Inference used to skip those fields
   * silently, which is how `flashcards` — a document of `{decks: {id: {known:
   * […], order: […]}}}` — bound to a table whose only column was `version`, and
   * whose round trip lost the decks. A caller that sees this should keep the
   * document whole (state-blob mode) or ask for a declared schema.
   */
  lossy?: boolean;
  /**
   * What identifies a row, for the one thing a user can see go wrong:
   *
   *   - `id`      the item carries a stable id minted by the widget, so two
   *               identical records are two rows, forever.
   *   - `content` the key is built from the item's own fields, so two records
   *               that agree on every key field are one row. That is a real
   *               limit and the UI states it per component rather than letting
   *               a user discover it as a lost row.
   */
  identity: "id" | "content";
}

/** The one property Notion will accept a title payload on. */
const KEY_PROP = "Arena key";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function asArray(state: unknown): Record<string, unknown>[] {
  return Array.isArray(state)
    ? (state.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[])
    : [];
}

type Declared = Omit<RecordSchema, "slug" | "inferred">;

/** An array-of-records widget: the document *is* the list. */
function arraySchema(input: {
  itemLabel: string;
  fields: FieldMap[];
  empty: Record<string, unknown>;
  identity?: "id" | "content";
  /** item -> document, when the widget stores values in another JS type */
  toDoc?: (item: Record<string, unknown>) => Record<string, unknown>;
  /** document -> item */
  toItem?: (item: Record<string, unknown>) => Record<string, unknown>;
}): Declared {
  return {
    itemLabel: input.itemLabel,
    shape: "array",
    identity: input.identity ?? "content",
    fields: input.fields,
    empty: input.empty,
    read: (state) => asArray(state).map((item) => (input.toItem ? input.toItem(item) : item)),
    write: (_state, items) => items.map((item) => (input.toDoc ? input.toDoc(item) : item)),
  };
}

/* ------------------------------------------------------------------ */
/* Declared schemas                                                    */
/* ------------------------------------------------------------------ */

const DECLARED: Record<string, Declared> = {
  /**
   * habit-grid persists `{ [habit]: { "YYYY-MM-DD": level } }`.
   *
   * As records that is one row per habit per day, which is what makes the
   * heatmap queryable: filter by habit, group by month, sum, rollup. Two ticks
   * of the same habit on the same day are the same cell in the widget, so the
   * content key is exact here rather than a compromise.
   */
  "habit-grid": {
    itemLabel: "habit tick",
    shape: "nested-map",
    identity: "content",
    read: (state) => {
      const out: Record<string, unknown>[] = [];
      const root = (state ?? {}) as Record<string, Record<string, number>>;
      for (const [habit, days] of Object.entries(root)) {
        if (!days || typeof days !== "object") continue;
        for (const [date, level] of Object.entries(days)) {
          out.push({ habit, date, level: Number(level) || 0 });
        }
      }
      return out;
    },
    write: (_state, items) => {
      const root: Record<string, Record<string, number>> = {};
      for (const item of items) {
        const habit = String(item.habit ?? "").trim();
        const date = String(item.date ?? "");
        if (!habit || !date) continue;
        root[habit] = root[habit] ?? {};
        root[habit][date] = Number(item.level ?? 1) || 1;
      }
      return root;
    },
    fields: [
      { key: "habit", prop: "Habit", type: "title", keyPart: true },
      { key: "date", prop: "Date", type: "date", keyPart: true },
      { key: "level", prop: "Level", type: "number", format: "number" },
    ],
    empty: { habit: "", date: "", level: 1 },
  },

  /**
   * expense-tracker persists an array of `{description, amount, category, date}`.
   *
   * Inference would get the types wrong in a way that is invisible until it
   * matters: `amount` arrives as a number, and a database column typed
   * `rich_text` would accept it, sort it as text, and refuse to sum it. The
   * key is description + date, which is the column pair a person would use to
   * tell two expenses apart.
   */
  "expense-tracker": arraySchema({
    itemLabel: "expense",
    identity: "content",
    fields: [
      { key: "description", prop: "Description", type: "title", keyPart: true },
      { key: "date", prop: "Date", type: "date", keyPart: true },
      { key: "amount", prop: "Amount", type: "number", format: "dollar" },
      {
        key: "category",
        prop: "Category",
        type: "select",
        options: ["Food", "Home", "Transport", "Travel", "Other"],
      },
    ],
    empty: { description: "", amount: 0, category: "Other", date: "" },
  }),

  /** chore-checklist: `{task, day, assignee, done}`. */
  "chore-checklist": arraySchema({
    itemLabel: "chore",
    fields: [
      { key: "task", prop: "Task", type: "title", keyPart: true },
      { key: "day", prop: "Day", type: "date", keyPart: true },
      { key: "assignee", prop: "Assignee", type: "rich_text" },
      { key: "done", prop: "Done", type: "checkbox" },
    ],
    empty: { task: "", day: "", assignee: "", done: false },
  }),

  /** action-item-tracker: `{task, owner, due, state}` with a three-value state. */
  "action-item-tracker": arraySchema({
    itemLabel: "action item",
    identity: "content",
    fields: [
      { key: "task", prop: "Task", type: "title", keyPart: true },
      { key: "due", prop: "Due", type: "date", keyPart: true },
      { key: "owner", prop: "Owner", type: "rich_text" },
      { key: "state", prop: "State", type: "select", options: ["Open", "In progress", "Done"] },
    ],
    empty: { task: "", owner: "", due: "", state: "Open" },
  }),

  /** bookmark-library: `{name, url, tag}`, where url is a real URL. */
  "bookmark-library": arraySchema({
    itemLabel: "bookmark",
    identity: "content",
    fields: [
      { key: "name", prop: "Name", type: "title", keyPart: true },
      // The URL is part of the key: two links can share a name, and they are
      // still two bookmarks.
      { key: "url", prop: "URL", type: "url", keyPart: true },
      { key: "tag", prop: "Tag", type: "select" },
    ],
    empty: { name: "", url: "", tag: "" },
  }),

  /**
   * daily-journal: `{date, title, body}`, one entry per date.
   *
   * The body is the reason this schema exists at all: the widget allows 3,000
   * characters and a Notion rich_text object holds 2,000, so the value is
   * written as several rich text objects in one cell (see `coerceForNotion`).
   * Before that fix a long entry was silently sliced at 1,900 characters,
   * which is exactly the failure this project exists to remove.
   */
  "daily-journal": arraySchema({
    itemLabel: "entry",
    identity: "content",
    fields: [
      { key: "date", prop: "Date", type: "date", keyPart: true },
      { key: "title", prop: "Title", type: "title" },
      { key: "body", prop: "Body", type: "rich_text" },
    ],
    empty: { date: "", title: "", body: "" },
  }),
};

/* ------------------------------------------------------------------ */
/* SPEC-generated schemas (84 list widgets)                             */
/* ------------------------------------------------------------------ */

/**
 * A row per item, fields read from the widget's own SPEC.
 *
 * Two conversions are not decoration:
 *
 *   - **Numbers.** The widget stores what its form produced, which is a string
 *     (`item[f.key] = String(value)`). Notion gets a number, because a number
 *     column is the whole point, and the document gets its string back, because
 *     the widget's own render path was written against strings.
 *   - **Checks.** A widget with a fixed checklist keeps
 *     `checks: [{label, done}]`. The label list is fixed by the SPEC, so
 *     storing only the *done* labels in a multi_select is lossless, queryable
 *     ("show me incidents whose review is scheduled") and readable as text in
 *     Notion. Boolean columns per checklist item would be five columns of
 *     mostly-false; a JSON blob would not be queryable at all.
 */
function specSchema(slug: string, spec: WidgetSpec): Declared | null {
  const fields: FieldMap[] = [];
  const titleKey = spec.fields.some((f) => f.key === spec.titleField)
    ? spec.titleField
    : spec.fields[0]?.key;

  if (titleKey) {
    const titleField = spec.fields.find((f) => f.key === titleKey);
    fields.push({
      key: titleKey,
      prop: titleField?.label?.slice(0, 60) || "Name",
      type: "title",
      // The title is what a person recognises the row by, but it is also
      // editable in two places, so it is not part of the key: renaming a row
      // in Notion must not create a second row.
      keyPart: false,
    });
  }

  for (const f of spec.fields) {
    if (f.key === titleKey) continue;
    const type = notionTypeForWidgetField(f.type) as NotionPropertyType;
    fields.push({
      key: f.key,
      prop: f.label?.slice(0, 60) || titleCase(f.key),
      type,
      ...(f.type === "number" ? { format: "number" } : {}),
      ...(f.type === "select" && f.options?.length ? { options: f.options } : {}),
    });
  }

  const statusOptions = spec.status?.options ?? spec.status?.values;
  const statusKey = spec.status?.field ?? "status";
  if (statusOptions?.length && !fields.some((f) => f.key === statusKey)) {
    fields.push({
      key: statusKey,
      prop: (spec.status?.label ?? "Status").slice(0, 60),
      // Notion's `status` property demands a group per option at creation time.
      // `select` carries the same vocabulary, filters and groups the same way,
      // and cannot be rejected for a missing group.
      type: "select",
      options: statusOptions,
    });
  }

  const checks = spec.checks?.length ? spec.checks : null;
  if (checks) {
    fields.push({ key: "checks", prop: "Checks", type: "multi_select", options: checks });
  }

  // The widget's own id, mapped onto the key column: it is what makes two
  // identical rows two rows.
  fields.push({ key: "id", prop: KEY_PROP, type: "rich_text", keyPart: true });

  const numberKeys = new Set(spec.fields.filter((f) => f.type === "number").map((f) => f.key));

  return {
    itemLabel: spec.title.replace(/\s+(Log|Tracker|Checklist|Board|Planner)$/i, "").toLowerCase() || "item",
    shape: "array",
    identity: "id",
    fields,
    empty: {
      id: "",
      ...(titleKey ? { [titleKey]: "" } : {}),
      ...Object.fromEntries(
        spec.fields
          .filter((f) => f.key !== titleKey)
          .map((f) => [f.key, f.type === "number" ? "" : f.type === "checkbox" ? false : ""])
      ),
      ...(statusOptions?.length ? { [statusKey]: spec.status?.default ?? statusOptions[0] } : {}),
      ...(checks ? { checks } : {}),
    },
    read: (state) =>
      asArray(state).map((item) => {
        const out: Record<string, unknown> = { ...item };
        if (checks) out.checks = asChecks(item.checks).filter((c) => c.done).map((c) => c.label);
        return out;
      }),
    write: (_state, items) =>
      items.map((item) => {
        const out: Record<string, unknown> = { ...item };
        for (const key of numberKeys) {
          if (out[key] === null || out[key] === undefined || out[key] === "") continue;
          out[key] = String(out[key]);
        }
        if (checks) {
          const done = new Set(
            Array.isArray(item.checks) ? (item.checks as unknown[]).map((c) => String(c)) : []
          );
          out.checks = checks.map((label) => ({ label, done: done.has(label) }));
        }
        return out;
      }),
  };
}

function asChecks(value: unknown): { label: string; done: boolean }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c) => c && typeof c === "object")
    .map((c) => ({ label: String((c as { label?: unknown }).label ?? ""), done: Boolean((c as { done?: unknown }).done) }));
}

/* ------------------------------------------------------------------ */
/* Inference (the long tail)                                           */
/* ------------------------------------------------------------------ */

const KEY_HINTS = [
  /^id$/i,
  /^key$/i,
  /^slug$/i,
  /^name$/i,
  /^title$/i,
  /^label$/i,
  /^description$/i,
  /^date$/i,
  /^day$/i,
];

function titleCase(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function inferType(samples: unknown[]): NotionPropertyType {
  const values = samples.filter((v) => v !== undefined && v !== null && v !== "");
  if (!values.length) return "rich_text";
  if (values.every((v) => typeof v === "boolean")) return "checkbox";
  if (values.every((v) => typeof v === "number" || /^-?\d+(\.\d+)?$/.test(String(v)))) return "number";
  if (values.every((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))) return "date";
  if (values.every((v) => typeof v === "string" && /^https?:\/\//.test(v))) return "url";
  return "rich_text";
}

function inferFieldsFromItems(
  items: Record<string, unknown>[],
  /** columns that repeat on every row, so they cannot identify anything */
  repeated: string[] = []
): FieldMap[] {
  const samples = new Map<string, unknown[]>();
  for (const item of items.slice(0, 25)) {
    for (const [k, v] of Object.entries(item ?? {})) {
      if (v !== null && typeof v === "object") continue; // nested objects are not properties
      const list = samples.get(k) ?? [];
      list.push(v);
      samples.set(k, list);
    }
  }
  const keys = [...samples.keys()];
  if (!keys.length) return [{ key: "value", prop: "Value", type: "title", keyPart: true }];

  const typed = keys.map((k, idx) => ({
    key: k,
    prop: titleCase(k),
    type: (idx === 0 ? "title" : inferType(samples.get(k) ?? [])) as NotionPropertyType,
  }));

  /**
   * A widget that mints its own id is identified by that id and nothing else:
   * two identical records are two records, which is what the widget itself
   * believes. Only when there is no id does the first field plus the first
   * time-like field have to stand in for one.
   */
  const idLike = typed.find((f) => /^(id|key|slug|uuid)$/i.test(f.key));
  if (idLike) {
    return typed.map((f) => ({
      ...f,
      ...(f.key === idLike.key ? { keyPart: true } : {}),
      ...(f.key === idLike.key && f.type === "rich_text" ? {} : {}),
    }));
  }

  /**
   * What identifies a record.
   *
   * The first field, plus the first time-like field. That is two fields and it
   * has to be: "Coffee" alone collides the second time someone buys coffee on
   * another day, and a widget whose records silently merge is a data-loss bug
   * wearing a sync badge. A declared schema can override this; this is only the
   * guess for the rest of the catalog, whose state is an array of flat records.
   */
  const timeLike = typed.findIndex(
    (f, idx) =>
      idx > 0 &&
      (f.type === "date" ||
        /(^|[_-])(date|day|due|when|on|at|time)([_-]|$)/i.test(f.key) ||
        KEY_HINTS.some((re) => re.test(f.key) && /date|day/i.test(f.key)))
  );

  /**
   * The first field that is the *record's* own.
   *
   * In a container document the first column is often a scalar repeated on every
   * row (`{day, items: […]}`), and a value that is the same on every row cannot
   * identify one: keying on it collapsed a four-item checklist into a single
   * row. So the key falls to the first field the record actually carries.
   */
  const firstOwn = typed.findIndex((f) => !repeated.includes(f.key));

  return typed.map((f, idx) => ({
    ...f,
    ...((idx === firstOwn || idx === timeLike) && !repeated.includes(f.key) ? { keyPart: true } : {}),
  }));
}

/**
 * A list that lives *inside* a document.
 *
 * `{items: [{…}], date: "2026-10-12", title: "Meeting"}` is the commonest shape
 * in the hand-written half of the catalog: a document with one array of records
 * and a few scalars beside it. Reading only the scalars produced a table of one
 * row called `value`, and reading only the array lost the document — both are
 * wrong, and both looked like success.
 *
 * The rule here: the array becomes the rows, the primitives beside it become
 * columns repeated on every row (so they still filter and group), and anything
 * else beside it is carried verbatim. The scalar keys never take part in a row's
 * identity, because a value repeated on every row identifies nothing.
 *
 * Found by `npm run check:coverage`: twenty widgets in the catalog have exactly
 * this shape and the inference was flattening them.
 */
function detectContainer(state: unknown): {
  key: string;
  items: Record<string, unknown>[];
  scalars: Record<string, unknown>;
  fixed: Record<string, unknown>;
} | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const entries = Object.entries(state as Record<string, unknown>);
  const lists = entries.filter(
    ([, v]) => Array.isArray(v) && (v as unknown[]).some((x) => x && typeof x === "object" && !Array.isArray(x))
  );
  if (lists.length !== 1) return null;
  const [key, list] = lists[0] as [string, unknown[]];
  const items = list.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<
    string,
    unknown
  >[];
  const scalars: Record<string, unknown> = {};
  const fixed: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    if (k === key) continue;
    if (v === null || typeof v !== "object") scalars[k] = v;
    else fixed[k] = v;
  }
  return { key, items, scalars, fixed };
}

/** Detect "array of flat records" and "record map of records". */
function detectShape(state: unknown): {
  shape: RecordSchema["shape"];
  items: Record<string, unknown>[];
  container?: { key: string; scalarKeys: string[]; fixed: Record<string, unknown> };
} {
  if (Array.isArray(state)) {
    const items = state.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<
      string,
      unknown
    >[];
    return { shape: "array", items };
  }
  if (state && typeof state === "object") {
    const values = Object.values(state as Record<string, unknown>);
    if (values.length && values.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
      // { key: {...} } -> items carry their key under `id`
      const items = Object.entries(state as Record<string, unknown>).map(([k, v]) => ({
        id: k,
        ...(v as Record<string, unknown>),
      }));
      return { shape: "map", items };
    }
    // A document with a list inside it: rows come from the list, and the
    // primitives beside it ride along on every row.
    const container = detectContainer(state);
    if (container && container.items.length) {
      const scalarKeys = Object.keys(container.scalars).filter(
        (k) => !(k in container.items[0]) && !k.startsWith("__")
      );
      const items = container.items.map((item) => {
        const merged: Record<string, unknown> = {};
        for (const k of scalarKeys) merged[k] = container.scalars[k];
        return { ...merged, ...item };
      });
      return { shape: "array", items, container: { key: container.key, scalarKeys, fixed: container.fixed } };
    }
    // A flat object is treated as a single record (useful for dashboards and
    // single-value widgets: a KPI strip is one row, not a table).
    const flat = Object.entries(state as Record<string, unknown>).filter(
      ([, v]) => v === null || typeof v !== "object"
    );
    if (flat.length) {
      return { shape: "array", items: [Object.fromEntries(flat)] };
    }
  }
  return { shape: "array", items: [] };
}

function inferredSchema(slug: string, source: unknown): RecordSchema {
  const { shape, items, container } = detectShape(source);
  const fields = inferFieldsFromItems(items, container?.scalarKeys ?? []);
  /**
   * Fields inference had to walk past. They are the reason a binding can look
   * healthy and still lose data, so they are counted rather than forgotten.
   */
  const fieldKeys = new Set(fields.map((f) => f.key));
  const droppedFields = [
    ...new Set(
      items.flatMap((item) =>
        Object.entries(item ?? {})
          .filter(([k, v]) => v !== null && typeof v === "object" && !fieldKeys.has(k))
          .map(([k]) => k)
      )
    ),
  ].filter((k) => !(container?.scalarKeys ?? []).includes(k));

  /**
   * A document can also lose data without any record being nested: a document
   * that is `{version: 1, decks: {…}}` reads as one row holding `version`, and
   * the decks — the actual content — are simply not in the table. Anything at
   * the document's own level that the rows do not represent is counted here, and
   * the only shape that represents those values is a container, which carries
   * them back verbatim.
   */
  const unrepresented = container
    ? []
    : source && typeof source === "object" && !Array.isArray(source)
      ? Object.entries(source as Record<string, unknown>)
          .filter(([, v]) => v !== null && typeof v === "object")
          .map(([k]) => k)
      : [];

  const empty: Record<string, unknown> = {};
  for (const f of fields) {
    empty[f.key] = f.type === "number" ? 0 : f.type === "checkbox" ? false : "";
  }

  return {
    slug,
    itemLabel: shape === "map" ? "entry" : "row",
    shape,
    inferred: true,
    identity: fields.some((f) => f.key === "id" && f.keyPart) ? "id" : "content",
    fields,
    empty,
    lossy: droppedFields.length + unrepresented.length > 0,
    read: (s) => {
      // The same document read again, possibly after a row changed in Notion:
      // the list is re-read from the document rather than from the sample.
      if (container) {
        const live = detectContainer(s);
        if (live) {
          return live.items.map((item) => {
            const merged: Record<string, unknown> = {};
            for (const k of container.scalarKeys) {
              const v = k in live.scalars ? live.scalars[k] : undefined;
              if (v !== undefined) merged[k] = v;
            }
            return { ...merged, ...item };
          });
        }
      }
      if (Array.isArray(s)) {
        return s.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
      }
      if (s && typeof s === "object") {
        const values = Object.values(s as Record<string, unknown>);
        if (values.length && values.every((v) => v && typeof v === "object")) {
          return Object.entries(s as Record<string, unknown>).map(([k, v]) => ({
            id: k,
            ...(v as Record<string, unknown>),
          }));
        }
        const flat = Object.entries(s as Record<string, unknown>).filter(
          ([, v]) => v === null || typeof v !== "object"
        );
        if (flat.length) return [Object.fromEntries(flat)];
      }
      return [];
    },
    write: (_s, list) => {
      if (container) {
        // Back into the document: the repeated columns come from the first row
        // that carries them, the verbatim parts go back untouched, and the rows
        // lose the columns that were only ever repeats.
        const out: Record<string, unknown> = {};
        for (const k of container.scalarKeys) {
          const hit = list.find((row) => row[k] !== undefined && row[k] !== "");
          out[k] = hit ? hit[k] : "";
        }
        for (const [k, v] of Object.entries(container.fixed)) out[k] = v;
        out[container.key] = list.map((row) => {
          const item: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            if (container.scalarKeys.includes(k)) continue;
            item[k] = v;
          }
          return item;
        });
        return out;
      }
      if (shape === "map") {
        const out: Record<string, unknown> = {};
        for (const item of list) {
          const { id, ...rest } = item as { id?: string } & Record<string, unknown>;
          if (id) out[id] = rest;
        }
        return out;
      }
      if (shape === "array" && list.length === 1 && detectShape(source).shape === "array") {
        // A single flat record: keep the object shape the widget expects when
        // its original state was an object rather than an array.
        if (!Array.isArray(source) && source && typeof source === "object") {
          const values = Object.values(source as Record<string, unknown>);
          if (!values.every((v) => v && typeof v === "object")) {
            const { id: _drop, ...rest } = list[0] as Record<string, unknown>;
            return rest;
          }
        }
      }
      return list;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

/**
 * The schema for a component: declared, read from its SPEC, or inferred.
 *
 * Never throws and never returns null: a widget we know nothing about still
 * gets a binding (an inferred one, or state-blob when its document is not a
 * list at all). What it does guarantee is that the caller can tell which of the
 * three happened, and the API surfaces that as `source`.
 */
export function schemaFor(slug: string, state: unknown, sampleForInference?: unknown): RecordSchema {
  const declared = DECLARED[slug];
  if (declared) return { slug, inferred: false, ...declared };

  const spec = widgetSpec(slug);
  if (spec?.fields?.length) {
    const generated = specSchema(slug, spec);
    if (generated) return { slug, inferred: false, ...generated };
  }

  return inferredSchema(slug, sampleForInference ?? state);
}

/** Which of the three sources a schema came from, for the UI and the checks. */
export function schemaSource(slug: string): "declared" | "spec" | "inferred" {
  if (DECLARED[slug]) return "declared";
  if (widgetSpec(slug)?.fields?.length) return "spec";
  return "inferred";
}

export const DECLARED_SLUGS = Object.keys(DECLARED);

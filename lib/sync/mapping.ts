import type { Binding, FieldMap, NotionPropertyType } from "./types";
import type { PropertySchema } from "./transport";

/**
 * The mapping layer: a widget's own JSON <-> Notion properties.
 *
 * Design rule taken from the research (§5.3): a field either serialises into a
 * real Notion property type or the binding is refused. Nothing is silently
 * stringified into a title, because that is how "two-way sync" tools quietly
 * become one-way exports.
 *
 * A second finding shapes the file: 166 of the 192 widgets already persist a
 * JSON document in `localStorage` under `notion-arena.<slug>.v1`, and the
 * overwhelming majority of them persist an **array of flat objects**. So the
 * default is inference (`schemaFor`), and the override table exists only for
 * the handful of nested shapes (habit-grid's `{habit: {date: level}}` map,
 * grocery-list's `{lists: {...}}`), which is a few lines each.
 */

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
}

/* ------------------------------------------------------------------ */
/* Declared schemas (nested shapes only)                                */
/* ------------------------------------------------------------------ */

const DECLARED: Record<string, Omit<RecordSchema, "slug" | "inferred">> = {
  /**
   * habit-grid persists `{ [habit]: { "YYYY-MM-DD": level } }`.
   * As records that is one row per habit per day, which is what makes the
   * heatmap queryable: filter by habit, group by month, sum, rollup.
   */
  "habit-grid": {
    itemLabel: "habit tick",
    shape: "nested-map",
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
};

/* ------------------------------------------------------------------ */
/* Inference                                                           */
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

function inferFieldsFromItems(items: Record<string, unknown>[]): FieldMap[] {
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
   * What identifies a record.
   *
   * The first field, plus the first time-like field. That is two fields and it
   * has to be: "Coffee" alone collides the second time someone buys coffee on
   * another day, and a widget whose records silently merge is a data-loss bug
   * wearing a sync badge. A declared schema can override this; this is only the
   * guess for the majority of the catalog, whose state is an array of flat
   * records.
   */
  const timeLike = typed.findIndex(
    (f, idx) =>
      idx > 0 &&
      (f.type === "date" ||
        /(^|[_-])(date|day|due|when|on|at|time)([_-]|$)/i.test(f.key) ||
        KEY_HINTS.some((re) => re.test(f.key) && /date|day/i.test(f.key)))
  );

  return typed.map((f, idx) => ({
    ...f,
    ...(idx === 0 || idx === timeLike ? { keyPart: true } : {}),
  }));
}

/** Detect "array of flat records" and "record map of records". */
function detectShape(state: unknown): { shape: RecordSchema["shape"]; items: Record<string, unknown>[] } {
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

export function schemaFor(slug: string, state: unknown, sampleForInference?: unknown): RecordSchema {
  const declared = DECLARED[slug];
  if (declared) return { slug, inferred: false, ...declared };

  const source = sampleForInference ?? state;
  const { shape, items } = detectShape(source);
  const fields = inferFieldsFromItems(items);
  const empty: Record<string, unknown> = {};
  for (const f of fields) {
    empty[f.key] = f.type === "number" ? 0 : f.type === "checkbox" ? false : "";
  }

  return {
    slug,
    itemLabel: shape === "map" ? "entry" : "row",
    shape,
    inferred: true,
    fields,
    empty,
    read: (s) => {
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
/* Value conversions                                                   */
/* ------------------------------------------------------------------ */

export function coerceForNotion(type: NotionPropertyType, value: unknown): unknown {
  const empty = (payload: unknown) => (value === undefined || value === null || value === "" ? null : payload);
  switch (type) {
    case "title":
    case "rich_text": {
      if (value === undefined || value === null) return { [type]: [] };
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return { [type]: text ? [{ type: "text", text: { content: text.slice(0, 1900) } }] : [] };
    }
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return { number: empty(Number.isFinite(n) ? n : 0) };
    }
    case "checkbox":
      return { checkbox: Boolean(value) };
    case "date":
      if (!value) return { date: null };
      if (typeof value === "object") return { date: value };
      return { date: { start: String(value) } };
    case "select":
    case "status":
      return { [type]: empty({ name: String(value) }) };
    case "multi_select":
      return {
        multi_select: Array.isArray(value)
          ? (value as string[]).map((name) => ({ name: String(name) }))
          : value
            ? [{ name: String(value) }]
            : [],
      };
    case "url":
    case "email":
    case "phone_number":
      // Notion rejects an empty string for these: null is the documented clear.
      return { [type]: value ? String(value) : null };
    case "people":
      return { people: Array.isArray(value) ? value.map((id) => ({ object: "user", id })) : [] };
    case "relation":
      return { relation: Array.isArray(value) ? value.map((id) => ({ id })) : [] };
    default:
      return { rich_text: value ? [{ type: "text", text: { content: String(value) } }] : [] };
  }
}

export function readProperty(type: NotionPropertyType, raw: unknown): unknown {
  const p = (raw ?? {}) as Record<string, any>;
  switch (type) {
    case "title":
    case "rich_text":
      return (p[type] ?? []).map((t: any) => t?.plain_text ?? t?.text?.content ?? "").join("");
    case "number":
      return p.number ?? null;
    case "checkbox":
      return Boolean(p.checkbox);
    case "date":
      return p.date?.start ? (p.date.end ? { start: p.date.start, end: p.date.end } : p.date.start) : "";
    case "select":
      return p.select?.name ?? "";
    case "status":
      return p.status?.name ?? "";
    case "multi_select":
      return (p.multi_select ?? []).map((o: any) => o.name);
    case "url":
    case "email":
    case "phone_number":
      return p[type] ?? "";
    case "people":
      return (p.people ?? []).map((u: any) => u?.id ?? "");
    case "relation":
      return (p.relation ?? []).map((r: any) => r?.id ?? "");
    default:
      return p.rich_text?.[0]?.plain_text ?? null;
  }
}

/**
 * The property types the *data source* actually has, by property name.
 *
 * A binding is a declaration of intent ("this field is a date"). It is not
 * authority: the user's database is. When the two disagree, the database wins,
 * and this map is how the writer finds out before it produces a payload Notion
 * will reject. The bug that motivated it is worth naming, because it is the
 * classic one in this space: a second `title` payload. A data source has exactly
 * one title property, so writing the business key as `{ title: [...] }` into a
 * `rich_text` column is not just wrong for that column, it is invalid for the
 * request, and it reads back as an empty string afterwards, which makes every
 * subsequent write look like a brand new record.
 */
export type PropertyTypes = Record<string, NotionPropertyType>;

export function resolveWriteType(
  field: FieldMap,
  types?: PropertyTypes
): NotionPropertyType {
  return (types?.[field.prop] as NotionPropertyType | undefined) ?? field.type;
}

/** The one property Notion will accept a `title` payload on. */
export function titlePropertyOf(types?: PropertyTypes): string | undefined {
  return Object.entries(types ?? {}).find(([, type]) => type === "title")?.[0];
}

/**
 * item -> Notion property payload, honouring readOnly fields and the data
 * source's own property types.
 */
export function toPropertyPayload(
  binding: Binding,
  item: Record<string, unknown>,
  types?: PropertyTypes
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const titleProp = titlePropertyOf(types);
  for (const f of binding.fields) {
    if (f.readOnly || f.prop === binding.keyProp) continue;
    // Never write a title payload anywhere but the data source's title property.
    const type = resolveWriteType(f, types);
    if (type === "title" && titleProp && f.prop !== titleProp) {
      out[f.prop] = coerceForNotion("rich_text", item[f.key]);
      continue;
    }
    out[f.prop] = coerceForNotion(type, item[f.key]);
  }

  const keyType = resolveWriteType(
    { key: "key", prop: binding.keyProp, type: "rich_text" },
    types
  );
  out[binding.keyProp] = coerceForNotion(keyType, businessKey(binding, item));
  return out;
}

/** Notion property payload -> item. */
export function fromPropertyPayload(
  binding: Binding,
  raw: Record<string, any>
): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const f of binding.fields) {
    if (f.prop === binding.keyProp) continue;
    const value = raw?.[f.prop];
    item[f.key] = value === undefined ? undefined : readProperty(f.type, value);
  }
  return item;
}

/* ------------------------------------------------------------------ */
/* Business keys                                                       */
/* ------------------------------------------------------------------ */

const KEY_SEP = "|";

export function businessKey(binding: Binding, item: Record<string, unknown>): string {
  const parts = binding.fields.filter((f) => f.keyPart);
  const chosen = parts.length ? parts : binding.fields.slice(0, 1);
  const key = chosen
    .map((f) => String(item[f.key] ?? "").trim())
    .filter(Boolean)
    .join(KEY_SEP);
  if (key) return key.slice(0, 1900);
  // Fall back to a content hash so a keyless record is still stable.
  return `anon${KEY_SEP}${JSON.stringify(item).slice(0, 120)}`;
}

/** How a business key renders as a dot path inside the widget's document. */
export const KEY_PATH_SEP = ".";

export function pathForKey(key: string): string {
  return key.split(KEY_SEP).join(KEY_PATH_SEP);
}

/**
 * How a change reaches the widget.
 *
 * A records binding maps rows to items, but a widget's document is its own
 * shape: a heatmap is `{ habit: { date: level } }`, a list is an array. Telling a
 * client "key `water|2026-10-11` changed" is not enough for it to patch its own
 * state, so the engine sends the path instead, and for the shapes where a path
 * cannot be trusted (an array, where an index shifts under a merge) it sends the
 * whole document and lets the renderer repaint.
 */
export function changePathFor(schema: RecordSchema, key: string): string {
  if (schema.shape === "array") return "__doc";
  return pathForKey(key);
}

/** Properties to declare when we provision a database for the user. */
export function propertySchemasFor(binding: Binding): Record<string, PropertySchema> {
  const out: Record<string, PropertySchema> = {};
  for (const f of binding.fields) {
    out[f.prop] = {
      type: f.type,
      ...(f.format ? { format: f.format } : {}),
    };
  }
  // The key column is rich_text unless the key *is* the title property, which is
  // the one case where a database is allowed to have it as a title.
  if (!out[binding.keyProp]) out[binding.keyProp] = { type: "rich_text" };
  if (binding.revProp) out[binding.revProp] = { type: "number" };
  if (binding.updatedProp) out[binding.updatedProp] = { type: "date" };
  return out;
}

/** Binding-shaped defaults for a component whose schema we just inferred. */
export function bindingFromSchema(opts: {
  slug: string;
  schema: RecordSchema;
  dataSourceId: string;
  databaseId?: string;
  databaseTitle: string;
  keyProp?: string;
  conflict?: Binding["conflict"];
  existingProps?: DataSourceProperties;
}): Binding {
  let fields = opts.schema.fields;
  // If the target database already has properties, prefer its own naming when a
  // property matches a field key case-insensitively. This is what lets a user
  // point a widget at a database they already built.
  if (opts.existingProps) {
    const byLower = new Map(Object.keys(opts.existingProps).map((k) => [k.toLowerCase(), k]));
    fields = fields.map((f) => {
      const hit = byLower.get(f.prop.toLowerCase());
      return hit ? { ...f, prop: hit } : { ...f, prop: f.prop };
    });
  }
  return {
    mode: "records",
    dataSourceId: opts.dataSourceId,
    databaseId: opts.databaseId,
    databaseTitle: opts.databaseTitle,
    keyProp: opts.keyProp ?? "Arena key",
    fields,
    conflict: opts.conflict ?? "keep-both",
  };
}

export type DataSourceProperties = Record<string, { type: string }>;

/** Rows for the playground table view: the user's data, as Notion would show it. */
export function displayRows(
  binding: Binding,
  items: Record<string, unknown>[]
): { columns: string[]; rows: Record<string, string>[] } {
  const columns = binding.fields.map((f) => f.prop);
  const rows = items.map((item) => {
    const row: Record<string, string> = {};
    for (const f of binding.fields) {
      const v = item[f.key];
      row[f.prop] =
        v === undefined || v === null
          ? ""
          : typeof v === "object"
            ? JSON.stringify(v)
            : String(v);
    }
    return row;
  });
  return { columns, rows };
}

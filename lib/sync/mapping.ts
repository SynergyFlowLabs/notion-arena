import type { RecordSchema } from "./schemas";
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

/**
 * The schema layer moved to `lib/sync/schemas.ts` when the number of bound
 * components grew past one: there are three sources now (declared here-adjacent
 * shapes, the fields a widget's own SPEC declares, and inference for the long
 * tail) and they belong together. This module keeps the value conversions and
 * re-exports what the engine already imports, so nothing downstream moves.
 */
export { schemaFor } from "./schemas";
export type { RecordSchema } from "./schemas";
/* ------------------------------------------------------------------ */
/* Value conversions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Notion's limit is per rich text object, not per property: a property value is
 * an array of them, and every one of them may hold 2,000 characters. Slicing
 * the value at the limit instead of chunking it silently truncated long text
 * (a 3,000-character journal entry lost a third of itself), which is the exact
 * class of bug the whole design is meant to remove. `readProperty` joins the
 * chunks back, so the round trip is exact.
 */
const RICH_TEXT_CHUNK = 2000;

function chunkRichText(text: string): { type: "text"; text: { content: string } }[] {
  if (!text) return [];
  const out: { type: "text"; text: { content: string } }[] = [];
  for (let i = 0; i < text.length; i += RICH_TEXT_CHUNK) {
    out.push({ type: "text", text: { content: text.slice(i, i + RICH_TEXT_CHUNK) } });
  }
  return out;
}

export function coerceForNotion(type: NotionPropertyType, value: unknown): unknown {
  const empty = (payload: unknown) => (value === undefined || value === null || value === "" ? null : payload);
  switch (type) {
    case "title":
    case "rich_text": {
      if (value === undefined || value === null) return { [type]: [] };
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return { [type]: chunkRichText(text) };
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
    if (f.prop === binding.keyProp) {
      /**
       * A field mapped onto the key column still gets its value back.
       *
       * The key column holds the business key, and the business key of a widget
       * that mints its own ids *is* that id. Skipping it here would return rows
       * with no `id` to a widget whose own code filters on
       * `typeof x.id === "string"`, so every row it just pulled would be
       * dropped on the floor.
       */
      if (f.keyPart) {
        const key = raw?.[f.prop];
        item[f.key] = key === undefined ? undefined : readProperty(f.type, key);
      }
      continue;
    }
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
      // Select vocabularies come from the widget's own SPEC, so a provisioned
      // table offers the same options the widget does instead of inventing
      // them one write at a time.
      ...(f.options?.length ? { options: f.options.map((name) => ({ name })) } : {}),
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

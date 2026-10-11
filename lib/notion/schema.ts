/**
 * Helpers that emit real Notion API payloads.
 *
 * Targets Notion-Version 2026-03-11, i.e. the data-source model:
 *   • databases are containers, data sources hold the schema
 *   • relations point at a data_source_id
 *   • status options carry a `group` ("To-do" | "In progress" | "Complete")
 *   • views (incl. dashboard + chart) are created through POST /v1/views
 *   • HTML blocks are `embed` blocks whose file is a `file_upload`
 *
 * Two documented gaps are modelled explicitly rather than papered over:
 * • Button properties and database automations are response-only : the API
 *     cannot create them. Recipes therefore emit `manual` steps for those.
 *   • Relation targets are unknown until the databases exist, so relations are
 *     declared by local ref and patched in a second pass.
 */

export const NOTION_VERSION = "2026-03-11";

/* ------------------------------------------------------------------ */
/* Property schemas                                                    */
/* ------------------------------------------------------------------ */

export interface Option {
  name: string;
  color?: string;
  description?: string;
}

export interface StatusOption extends Option {
  group?: "To-do" | "In progress" | "Complete";
}

export type NumberFormat =
  | "number"
  | "number_with_commas"
  | "percent"
  | "dollar"
  | "euro"
  | "pound"
  | "yen"
  | "rupee"
  | "won"
  | "yuan";

export type RollupFunction =
  | "count"
  | "count_values"
  | "empty"
  | "not_empty"
  | "unique"
  | "percent_empty"
  | "percent_not_empty"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "range"
  | "checked"
  | "unchecked"
  | "percent_checked"
  | "percent_unchecked"
  | "show_original";

export type PropertySchema = Record<string, unknown>;

export const title = (): PropertySchema => ({ title: {} });
export const text = (description?: string): PropertySchema => ({
  rich_text: {},
  ...(description ? { description } : {}),
});
export const num = (format: NumberFormat = "number", description?: string): PropertySchema => ({
  number: { format },
  ...(description ? { description } : {}),
});
export const chk = (description?: string): PropertySchema => ({
  checkbox: {},
  ...(description ? { description } : {}),
});
export const date = (description?: string): PropertySchema => ({
  date: {},
  ...(description ? { description } : {}),
});
export const url = (): PropertySchema => ({ url: {} });
export const email = (): PropertySchema => ({ email: {} });
export const phone = (): PropertySchema => ({ phone_number: {} });
export const person = (): PropertySchema => ({ people: {} });
export const filesProp = (): PropertySchema => ({ files: {} });
export const createdTime = (): PropertySchema => ({ created_time: {} });
export const createdBy = (): PropertySchema => ({ created_by: {} });
export const editedTime = (): PropertySchema => ({ last_edited_time: {} });
export const uniqueId = (prefix?: string): PropertySchema => ({
  unique_id: prefix ? { prefix } : {},
});

export const sel = (options: Option[], description?: string): PropertySchema => ({
  select: { options },
  ...(description ? { description } : {}),
});

export const multi = (options: Option[], description?: string): PropertySchema => ({
  multi_select: { options },
  ...(description ? { description } : {}),
});

/**
 * Status options accept a `group` on create. Notion resolves the option ids
 * and wires them into the To-do / In progress / Complete groups itself.
 */
export const status = (options: StatusOption[]): PropertySchema => ({
  status: { options },
});

/** Default three-step status, matches what `{ status: {} }` would produce. */
export const defaultStatus = (): PropertySchema => ({ status: {} });

/**
 * Declared by local database ref; the installer resolves it to a real
 * data_source_id after the databases exist.
 */
export const relation = (
  ref: string,
  opts: { twoWay?: boolean; syncedName?: string; description?: string } = {}
): PropertySchema & { __relationRef: string } =>
  ({
    relation: {
      type: opts.twoWay ? "dual_property" : "single_property",
      ...(opts.twoWay
        ? { dual_property: { synced_property_name: opts.syncedName ?? "" } }
        : { single_property: {} }),
    },
    __relationRef: ref,
    ...(opts.description ? { description: opts.description } : {}),
  }) as PropertySchema & { __relationRef: string };

export const rollup = (
  relationProperty: string,
  rollupProperty: string,
  fn: RollupFunction,
  description?: string
): PropertySchema => ({
  rollup: {
    relation_property_name: relationProperty,
    rollup_property_name: rollupProperty,
    function: fn,
  },
  ...(description ? { description } : {}),
});

/** Formula 2.0 expression, e.g. `dateBetween(prop("Due"), now(), "days")` */
export const formula = (expression: string, description?: string): PropertySchema => ({
  formula: { expression },
  ...(description ? { description } : {}),
});

/* ------------------------------------------------------------------ */
/* Rich text                                                           */
/* ------------------------------------------------------------------ */

export type RichText = {
  type: "text";
  text: { content: string; link?: { url: string } | null };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
};

export function t(content: string, annotations?: RichText["annotations"]): RichText {
  return { type: "text", text: { content, link: null }, ...(annotations ? { annotations } : {}) };
}

export function rich(parts: (string | RichText)[]): RichText[] {
  return parts.map((p) => (typeof p === "string" ? t(p) : p));
}

/* ------------------------------------------------------------------ */
/* Block builders                                                      */
/* ------------------------------------------------------------------ */

export type Block = Record<string, unknown> & { object: "block"; type: string };

const blk = (type: string, body: Record<string, unknown>, children?: Block[]): Block => ({
  object: "block",
  type,
  [type]: body,
  ...(children && children.length ? { children } : {}),
});

export const heading = (level: 1 | 2 | 3 | 4, content: string, opts: { color?: string; isToggleable?: boolean } = {}): Block =>
  blk(`heading_${level}`, {
    rich_text: rich([content]),
    color: opts.color ?? "default",
    is_toggleable: opts.isToggleable ?? false,
  });

export const paragraph = (parts: (string | RichText)[], color = "default"): Block =>
  blk("paragraph", { rich_text: rich(parts), color });

export const bullet = (parts: (string | RichText)[], children?: Block[]): Block =>
  blk("bulleted_list_item", { rich_text: rich(parts), color: "default" }, children);

export const numbered = (parts: (string | RichText)[], children?: Block[]): Block =>
  blk("numbered_list_item", { rich_text: rich(parts), color: "default" }, children);

export const todo = (parts: (string | RichText)[], checked = false, children?: Block[]): Block =>
  blk("to_do", { rich_text: rich(parts), checked, color: "default" }, children);

export const quote = (parts: (string | RichText)[]): Block =>
  blk("quote", { rich_text: rich(parts), color: "default" });

export const divider = (): Block => blk("divider", {});

export const breadcrumb = (): Block => blk("breadcrumb", {});

export const tableOfContents = (color = "gray"): Block => blk("table_of_contents", { color });

export const callout = (
  parts: (string | RichText)[],
  icon: string = "💡",
  color = "gray_background",
  children?: Block[]
): Block =>
  blk(
    "callout",
    { rich_text: rich(parts), icon: { type: "emoji", emoji: icon }, color },
    children
  );

export const toggle = (parts: (string | RichText)[], children: Block[]): Block =>
  blk("toggle", { rich_text: rich(parts), color: "default" }, children);

export const code = (content: string, language = "typescript"): Block =>
  blk("code", { rich_text: rich([content]), language, caption: [] });

export const equation = (expression: string): Block =>
  blk("equation", { expression });

/**
 * An HTML block. The file itself is uploaded through the File Upload API and
 * referenced by id : Notion renders it in a sandboxed iframe.
 */
export const htmlBlock = (fileUploadId: string, caption: (string | RichText)[] = []): Block =>
  blk("embed", {
    type: "file_upload",
    file_upload: { id: fileUploadId },
    caption: rich(caption),
  });

export const embedUrl = (urlStr: string, caption: (string | RichText)[] = []): Block =>
  blk("embed", { url: urlStr, caption: rich(caption) });

export const bookmark = (urlStr: string, caption: (string | RichText)[] = []): Block =>
  blk("bookmark", { url: urlStr, caption: rich(caption) });

export const columns = (...cols: Block[][]): Block =>
  blk(
    "column_list",
    {},
    cols.map((children) => blk("column", {}, children))
  );

export const syncedBlock = (children: Block[]): Block =>
  blk("synced_block", { synced_from: null }, children);

/**
 * A database page template's content. Created through the app, but expressed
 * here so the installer can build the equivalent page body and so the UI can
 * show exactly what the template contains.
 */
export const databaseTemplate = (name: string, blocks: Block[]) => ({ name, blocks });

export const simpleTable = (rows: (string | RichText)[][], hasColumnHeader = true, hasRowHeader = false): Block => {
  const width = rows[0]?.length ?? 0;
  return blk(
    "table",
    { table_width: width, has_column_header: hasColumnHeader, has_row_header: hasRowHeader },
    rows.map((cells) =>
      blk("table_row", { cells: cells.map((c) => rich([c])) })
    )
  );
};

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

export type ViewType =
  | "table"
  | "board"
  | "list"
  | "calendar"
  | "timeline"
  | "gallery"
  | "form"
  | "chart"
  | "map"
  | "dashboard";

export interface ViewSpec {
  name: string;
  type: ViewType;
  /** local ref of the data source this view is over; omit for dashboard widgets */
  on?: string;
  configuration?: Record<string, unknown>;
  filter?: Record<string, unknown>;
  sorts?: Record<string, unknown>[];
}

export const filterProperty = (
  property: string,
  op: string,
  value: unknown
): Record<string, unknown> => ({ property, [op]: value });

export const compoundFilter = (
  operator: "and" | "or",
  filters: Record<string, unknown>[]
): Record<string, unknown> => ({ [operator]: filters });

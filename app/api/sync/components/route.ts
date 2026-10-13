import { NextRequest } from "next/server";
import { json } from "@/lib/sync/http";
import { BOUND_COMPONENTS, boundComponent } from "@/lib/sync/components";
import { schemaFor, schemaSource, type RecordSchema } from "@/lib/sync/schemas";
import { businessKey } from "@/lib/sync/mapping";
import { sampleStateFor } from "@/lib/sync/samples";
import { storageKeyAliases, widgetSpec, widgetStorageKey } from "@/lib/sync/widget-meta";
import { getComponent } from "@/lib/catalog";
import { readdirSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/components
 *
 * What a binding will actually look like, derived live from the same resolver
 * the engine binds through — never a hand-written table:
 *
 *   (no params)     the ten bound components, with columns and key columns
 *   ?all=1          every widget in the catalog, one compact row each
 *   ?slug=a,b       the detailed description for those slugs, any widget
 *   ?write=1        adds the round trip: document -> items -> document
 *
 * `?write=1` is the claim that matters for two-way sync — a document that goes
 * out and comes back unchanged — and it is computed per component rather than
 * asserted once in prose. `scripts/check-components.mjs` and
 * `scripts/check-coverage.mjs` both read this endpoint, so the page a person
 * reads and the loop a script drives cannot disagree.
 */

export interface ComponentDescription {
  slug: string;
  label: string;
  category?: string;
  mode: "records" | "kv-blob";
  itemLabel: string;
  blurb?: string;
  tryThis?: string;
  /** declared | spec | inferred */
  source: string;
  shape: string;
  identity: string;
  inferred: boolean;
  /** the storage key the widget actually writes, `null` when it persists nothing */
  adoptKey: string | null;
  columns: { prop: string; key: string; type: string; keyPart: boolean; options: number }[];
  keyColumns: string[];
  seed: {
    items: number;
    unmapped: string[];
    longestText: number;
    from: "seed" | "spec" | "harvested" | "none";
    /** the document itself, only when the caller asks for it */
    doc?: unknown;
  };
  write?: { exact: boolean; keys: string[]; duplicates: number; sample: string[] };
}

/**
 * A state-blob binding is right when the document is not a list of records.
 * That is a property of the document, not a label someone puts on a component,
 * so it is decided here from the sample the widget's own declarations produce.
 */
function modeFor(slug: string, sample: { state: unknown } | null, schema: RecordSchema): {
  mode: "records" | "kv-blob";
  why: string;
} {
  if (slug === "grocery-list") return { mode: "kv-blob", why: "declared: one document, one row" };
  if (!sample) return { mode: "kv-blob", why: "no sample document to map into rows" };
  const items = schema.read(sample.state);
  /**
   * A record holding a nested value cannot become a row, and inference says so
   * rather than dropping it. Those widgets keep their documents whole: one row,
   * every field intact, and the widget still edits it from either side.
   */
  if (schema.lossy) {
    return {
      mode: "kv-blob",
      why: "records inside the document hold nested values, so rows would drop them",
    };
  }
  if (schema.fields.length && items.length) {
    return { mode: "records", why: `${items.length} record${items.length === 1 ? "" : "s"} in the sample` };
  }
  return { mode: "kv-blob", why: "the document is not a list of records" };
}

function describe(slug: string, withWrite: boolean, withSample = false): ComponentDescription | null {
  const sample = sampleStateFor(slug);
  const bound = boundComponent(slug);
  const state = sample?.state ?? null;
  const schema = schemaFor(slug, state ?? [], state);
  const { mode } = modeFor(slug, sample, schema);

  const items = mode === "records" && state !== null ? schema.read(state) : [];
  const fieldKeys = new Set(schema.fields.map((f) => f.key));
  const unmapped = [
    ...new Set(
      items.flatMap((item) => Object.keys(item).filter((k) => !fieldKeys.has(k) && !k.startsWith("__")))
    ),
  ];
  const longest = items.reduce((max, item) => {
    const size = schema.fields.reduce(
      (m, f) => Math.max(m, typeof item[f.key] === "string" ? (item[f.key] as string).length : 0),
      0
    );
    return Math.max(max, size);
  }, 0);

  /**
   * A state-blob binding has no field map: it has the columns the engine writes
   * for every blob (the key, the document, a revision, an updated stamp).
   * Reporting them keeps the page honest about what "one row" means.
   */
  const blobColumns = [
    { prop: "Arena key", key: "instance", type: "rich_text", keyPart: true, options: 0 },
    { prop: "State", key: "state", type: "rich_text", keyPart: false, options: 0 },
    { prop: "Rev", key: "rev", type: "number", keyPart: false, options: 0 },
    { prop: "Updated", key: "updated", type: "date", keyPart: false, options: 0 },
  ];

  const catalog = getComponent(slug);
  const description: ComponentDescription = {
    slug,
    label: bound?.label ?? catalog?.name ?? slug,
    category: catalog?.category,
    mode,
    itemLabel: schema.itemLabel,
    blurb: bound?.blurb,
    tryThis: bound?.tryThis,
    source: schemaSource(slug),
    shape: schema.shape,
    identity: schema.identity,
    inferred: schema.inferred,
    adoptKey: widgetStorageKey(slug),
    columns:
      mode === "kv-blob"
        ? blobColumns
        : schema.fields.map((f) => ({
            prop: f.prop,
            key: f.key,
            type: f.type as string,
            keyPart: Boolean(f.keyPart),
            options: f.options?.length ?? 0,
          })),
    keyColumns:
      mode === "kv-blob" ? ["Arena key"] : schema.fields.filter((f) => f.keyPart).map((f) => f.prop),
    seed: {
      items: mode === "kv-blob" ? 1 : items.length,
      unmapped,
      longestText: mode === "kv-blob" ? JSON.stringify(state ?? {}).length : longest,
      from: sample?.source ?? "none",
      ...(withSample && state !== null ? { doc: state } : {}),
    },
  };

  if (!withWrite || mode !== "records" || state === null) return description;

  const rewritten = schema.write(state, items);
  const keys = items.map((item) =>
    businessKey(
      { mode: "records", keyProp: "Arena key", fields: schema.fields } as never,
      item
    )
  );
  return {
    ...description,
    write: {
      exact: JSON.stringify(rewritten) === JSON.stringify(state),
      keys,
      duplicates: keys.length - new Set(keys).size,
      // The keys are what a row is identified by; showing them makes the
      // component's identity rule readable instead of theoretical.
      sample: keys.slice(0, 3),
    },
  };
}

/** Every widget on disk, which is the catalog's widget half. */
function widgetSlugs(): string[] {
  const dir = path.join(process.cwd(), "public", "widgets");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .sort();
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const withWrite = params.get("write") === "1";
  const wanted = params.get("slug");
  const all = params.get("all") === "1";
  const slugs = widgetSlugs();

  /* ---------------- every widget, one compact row each ---------------- */
  if (all) {
    const rows = slugs.map((slug) => {
      const sample = sampleStateFor(slug);
      const catalog = getComponent(slug);
      const schema = schemaFor(slug, sample?.state ?? [], sample?.state);
      return {
        slug,
        label: boundComponent(slug)?.label ?? catalog?.name ?? slug,
        category: catalog?.category,
        mode: modeFor(slug, sample, schema).mode,
        source: schemaSource(slug),
        shape: schema.shape,
        itemLabel: schema.itemLabel,
        itemColumns: schema.fields.length,
        adoptKey: widgetStorageKey(slug),
        sample: sample?.source ?? null,
        sampleItems: sample?.items ?? 0,
        bound: Boolean(boundComponent(slug)),
      };
    });
    const sampleable = rows.filter((r) => r.sample);
    const spec = slugs.filter((s) => widgetSpec(s)?.fields?.length);
    return json({
      ok: true,
      count: rows.length,
      components: rows,
      coverage: {
        widgets: slugs.length,
        stateful: slugs.filter((s) => widgetStorageKey(s)).length,
        specGenerated: spec.length,
        specWithDeclaredFields: spec.filter((s) => !schemaFor(s, [], []).inferred).length,
        aliasKeys: storageKeyAliases(slugs).length,
        sampleable: sampleable.length,
        bound: rows.filter((r) => r.bound).length,
        bySource: countBy(rows.map((r) => r.source)),
        byMode: countBy(rows.map((r) => r.mode)),
        bySample: countBy(rows.map((r) => r.sample ?? "none")),
      },
    });
  }

  /* ---------------- any slug, described the same way ---------------- */
  if (wanted) {
    const list = wanted
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => slugs.includes(s));
    const withSample = params.get("sample") === "1";
    const components = list.map((slug) => describe(slug, withWrite, withSample)).filter(Boolean);
    return json({ ok: true, components, missing: wanted.split(",").filter((s) => !slugs.includes(s.trim())) });
  }

  /* ---------------- the ten, as before ---------------- */
  const withSample = params.get("sample") === "1";
  const components = BOUND_COMPONENTS.map((c) => describe(c.slug, withWrite, withSample)).filter(Boolean);
  const stateful = slugs.filter((s) => widgetStorageKey(s));
  const spec = slugs.filter((s) => widgetSpec(s)?.fields?.length);
  const specMapped = spec.filter((s) => !schemaFor(s, [], []).inferred);
  const sampleable = slugs.filter((s) => sampleStateFor(s));

  return json({
    ok: true,
    components,
    coverage: {
      widgets: slugs.length,
      stateful: stateful.length,
      specGenerated: spec.length,
      specWithDeclaredFields: specMapped.length,
      aliasKeys: storageKeyAliases(slugs).length,
      aliases: storageKeyAliases(slugs),
      sampleable: sampleable.length,
    },
  });
}

function countBy(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

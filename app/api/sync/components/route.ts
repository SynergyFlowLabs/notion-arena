import { NextRequest } from "next/server";
import { json } from "@/lib/sync/http";
import { BOUND_COMPONENTS } from "@/lib/sync/components";
import { schemaFor, schemaSource } from "@/lib/sync/schemas";
import { businessKey } from "@/lib/sync/mapping";
import { storageKeyAliases, widgetSpec, widgetStorageKey } from "@/lib/sync/widget-meta";
import { readdirSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/components
 *
 * The ten bound components, with the schema each one will actually be bound
 * through, derived live from the same resolver the engine uses.
 *
 * This is deliberately not a hand-written table: it answers "what columns will
 * my database have, and what identifies a row" by running the real schema, the
 * real widgets and the real seed documents. `scripts/check-components.mjs`
 * asserts against this endpoint, so the page a person reads and the loop a
 * script drives cannot disagree.
 *
 * `?write=1` adds the round trip: document -> items -> document, with any
 * difference called out. That is the claim that matters for two-way sync, and
 * it is checked per component rather than asserted once in prose.
 */
export async function GET(req: NextRequest) {
  const withWrite = req.nextUrl.searchParams.get("write") === "1";

  const components = BOUND_COMPONENTS.map((c) => {
    const schema = schemaFor(c.slug, c.seed, c.seed);
    const items = c.mode === "records" ? schema.read(c.seed) : [];
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
     * A state-blob binding has no field map: it has the columns the engine
     * writes for every blob (the key, the document, a revision, an updated
     * stamp). Reporting them keeps the page honest about what "one row" means.
     */
    const blobColumns: { prop: string; key: string; type: string; keyPart: boolean; options: number }[] =
      c.mode === "kv-blob"
        ? [
            { prop: "Arena key", key: "instance", type: "rich_text", keyPart: true, options: 0 },
            { prop: "State", key: "state", type: "rich_text", keyPart: false, options: 0 },
            { prop: "Rev", key: "rev", type: "number", keyPart: false, options: 0 },
            { prop: "Updated", key: "updated", type: "date", keyPart: false, options: 0 },
          ]
        : [];

    const base = {
      slug: c.slug,
      label: c.label,
      mode: c.mode,
      itemLabel: schema.itemLabel,
      blurb: c.blurb,
      tryThis: c.tryThis,
      source: schemaSource(c.slug),
      shape: schema.shape,
      identity: schema.identity,
      inferred: schema.inferred,
      adoptKey: widgetStorageKey(c.slug),
      columns: blobColumns.length
        ? blobColumns
        : schema.fields.map((f) => ({
            prop: f.prop,
            key: f.key,
            type: f.type as string,
            keyPart: Boolean(f.keyPart),
            options: f.options?.length ?? 0,
          })),
      keyColumns: blobColumns.length ? ["Arena key"] : schema.fields.filter((f) => f.keyPart).map((f) => f.prop),
      seed: blobColumns.length
        ? { items: 1, unmapped, longestText: JSON.stringify(c.seed ?? {}).length }
        : { items: items.length, unmapped, longestText: longest },
    };

    if (!withWrite || c.mode !== "records") return base;

    const rewritten = schema.write(c.seed, items);
    const exact = JSON.stringify(rewritten) === JSON.stringify(c.seed);
    const keys = items.map((item) => businessKey({ mode: "records", keyProp: "Arena key", fields: schema.fields } as never, item));

    return {
      ...base,
      write: {
        exact,
        keys,
        duplicates: keys.length - new Set(keys).size,
        // The keys are what a row is identified by; showing them makes the
        // component's identity rule readable instead of theoretical.
        sample: keys.slice(0, 3),
      },
    };
  });

  /* How far the same machinery reaches beyond the ten, measured not claimed. */
  const dir = path.join(process.cwd(), "public", "widgets");
  const slugs = readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .sort();
  const stateful = slugs.filter((s) => widgetStorageKey(s));
  const spec = slugs.filter((s) => widgetSpec(s)?.fields?.length);
  const specMapped = spec.filter((s) => !schemaFor(s, [], []).inferred);

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
    },
  });
}

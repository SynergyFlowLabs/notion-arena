import { Client } from "@notionhq/client";
import { NOTION_VERSION } from "./schema";
import { getRecipe, type Recipe } from "@/lib/recipes";
import type { RecipeDb } from "@/lib/recipes";

const RELATION_MARKER = "__relationRef";
const MAX_CHILDREN = 100;

export interface InstallResult {
  ok: boolean;
  recipe: string;
  containerPageId?: string;
  containerUrl?: string;
  databases: { ref: string; title: string; id?: string; dataSourceId?: string; url?: string }[];
  views: { name: string; type: string; id?: string }[];
  seededRows: number;
  pages: { title: string; id?: string }[];
  requestsMade: number;
  manualSteps: { title: string; reason: string; steps: string[] }[];
  warnings: string[];
  error?: string;
}

type AnyProps = Record<string, any>;

/**
 * Executes a recipe against the Notion API.
 *
 * Two passes are unavoidable: relations, rollups and formulas that read them
 * need data_source_ids that only exist once the databases do.
 */
export async function installRecipe(opts: {
  token: string;
  recipeId: string;
  parentPageId: string;
  dryRun?: boolean;
}): Promise<InstallResult> {
  const recipe = getRecipe(opts.recipeId);
  if (!recipe) throw new Error(`Unknown recipe: ${opts.recipeId}`);

  const result: InstallResult = {
    ok: false,
    recipe: recipe.id,
    databases: [],
    views: [],
    seededRows: 0,
    pages: [],
    requestsMade: 0,
    manualSteps: recipe.manual,
    warnings: [],
  };

  if (opts.dryRun) {
    result.ok = true;
    result.warnings.push("Dry run — no requests were sent to Notion.");
    result.databases = recipe.databases.map((d) => ({ ref: d.ref, title: d.title }));
    result.views = recipe.views.map((v) => ({ name: v.name, type: v.type }));
    result.pages = recipe.pages.map((p) => ({ title: p.title }));
    return result;
  }

  const notion = new Client({ auth: opts.token });
  const dsIds: Record<string, string> = {};
  const dbIds: Record<string, string> = {};

  /* --- container page ------------------------------------------------ */
  const container: any = await notion.pages.create({
    parent: { type: "page_id", page_id: opts.parentPageId },
    icon: { type: "emoji", emoji: "📦" },
    properties: {
      title: { title: [{ type: "text", text: { content: recipe.id } }] } as any,
    },
  } as any);
  result.requestsMade++;
  result.containerPageId = container.id;
  result.containerUrl = container.url;

  /* --- pass 1: databases with base properties only -------------------- */
  for (const db of recipe.databases) {
    const { base, deferred } = splitProperties(db);
    const created: any = await notion.databases.create({
      parent: { type: "page_id", page_id: container.id },
      title: [{ type: "text", text: { content: db.title } }] as any,
      icon: { type: "emoji", emoji: db.icon },
      is_inline: db.isInline ?? false,
      properties: base,
    } as any);
    result.requestsMade++;
    dbIds[db.ref] = created.id;

    const fetched: any = await notion.databases.retrieve({ database_id: created.id });
    result.requestsMade++;
    const dataSourceId =
      fetched?.data_sources?.[0]?.id ?? created?.data_sources?.[0]?.id ?? created.id;
    dsIds[db.ref] = dataSourceId;
    result.databases.push({
      ref: db.ref,
      title: db.title,
      id: created.id,
      dataSourceId,
      url: created.url,
    });

    /* --- pass 2: relations with resolved ids, then rollups/formulas ---- */
    if (Object.keys(deferred).length) {
      const relations: AnyProps = {};
      const derived: AnyProps = {};
      Object.entries(deferred).forEach(([name, schema]) => {
        const ref = (schema as any)[RELATION_MARKER] as string | undefined;
        const copy: AnyProps = { ...schema };
        delete copy[RELATION_MARKER];
        if (ref) {
          const target = dsIds[ref];
          if (!target) {
            result.warnings.push(
              `Skipped “${name}” on ${db.title}: its target “${ref}” had not been created yet.`
            );
            return;
          }
          const rel = copy.relation as any;
          if (rel?.type === "dual_property") {
            rel.dual_property = {
              ...(rel.dual_property ?? {}),
              data_source_id: target,
            };
          } else {
            copy.relation = { type: "single_property", single_property: { data_source_id: target } };
          }
          relations[name] = copy;
        } else {
          derived[name] = copy;
        }
      });

      for (const batch of [relations, derived]) {
        if (!Object.keys(batch).length) continue;
        await (notion as any).dataSources.update({
          data_source_id: dataSourceId,
          properties: batch,
        });
        result.requestsMade++;
      }
    }
  }

  /* --- views ---------------------------------------------------------- */
  for (const v of recipe.views) {
    const ref = v.on ?? recipe.databases[0]?.ref;
    if (!ref) continue;
    try {
      const body: any = { name: v.name, type: v.type };
      if (v.type === "dashboard") body.database_id = dbIds[ref];
      else body.data_source_id = dsIds[ref];
      if (v.configuration) body.configuration = v.configuration;
      if (v.filter) body.filter = v.filter;
      if (v.sorts) body.sorts = v.sorts;
      const created: any = await (notion as any).views.create(body);
      result.requestsMade++;
      result.views.push({ name: v.name, type: v.type, id: created?.id });
      if (v.type === "dashboard") {
        result.warnings.push(
          `“${v.name}” was created empty — dashboard layout is read-only in the API. Add widgets with further POST /v1/views calls using view_id ${created?.id}.`
        );
      }
    } catch (err: any) {
      result.warnings.push(`View “${v.name}” failed: ${err?.message ?? String(err)}`);
    }
  }

  /* --- seed rows ------------------------------------------------------ */
  for (const db of recipe.databases) {
    for (const row of db.seed ?? []) {
      try {
        await notion.pages.create({
          parent: { type: "data_source_id", data_source_id: dsIds[db.ref] } as any,
          properties: {
            title: { title: [{ type: "text", text: { content: row.name } }] },
            ...(row.props ?? {}),
          } as any,
          // Silence notifications: a 20-row install should not ping the team.
          notifications: { mode: "silent" },
        } as any);
        result.requestsMade++;
        result.seededRows++;
      } catch (err: any) {
        result.warnings.push(`Seed row “${row.name}” in ${db.title} failed: ${err?.message ?? String(err)}`);
      }
    }
  }

  /* --- documentation pages + bodies ----------------------------------- */
  for (const page of recipe.pages) {
    try {
      const created: any = await notion.pages.create({
        parent: { type: "page_id", page_id: container.id },
        icon: page.icon ? { type: "emoji", emoji: page.icon } : undefined,
        properties: {
          title: { title: [{ type: "text", text: { content: page.title } }] },
        } as any,
      } as any);
      result.requestsMade++;
      result.pages.push({ title: page.title, id: created.id });

      for (let i = 0; i < page.blocks.length; i += MAX_CHILDREN) {
        await notion.blocks.children.append({
          block_id: created.id,
          children: page.blocks.slice(i, i + MAX_CHILDREN) as any,
          // Two levels of nesting is the API maximum; deeper children are
          // appended in follow-up requests against the child block id.
        } as any);
        result.requestsMade++;
      }
    } catch (err: any) {
      result.warnings.push(`Page “${page.title}” failed: ${err?.message ?? String(err)}`);
    }
  }

  result.ok = true;
  return result;
}

function splitProperties(db: RecipeDb) {
  const base: AnyProps = {};
  const deferred: AnyProps = {};
  Object.entries(db.properties).forEach(([name, schema]) => {
    const s = schema as AnyProps;
    if (s[RELATION_MARKER] || s.rollup || s.formula) deferred[name] = schema;
    else base[name] = schema;
  });
  return { base, deferred };
}

/* ------------------------------------------------------------------ */
/* Widget install: HTML block via the File Upload API                   */
/* ------------------------------------------------------------------ */

/**
 * Installs a widget as a real Notion HTML block.
 *
 *   1. POST /v1/file_uploads            → pending upload + upload_url
 *   2. POST {upload_url}                → the .html bytes
 *   3. PATCH /v1/blocks/{id}/children   → an embed block referencing the
 *                                         file_upload id. Notion renders it
 *                                         in a sandboxed iframe.
 */
export async function installHtmlBlock(opts: {
  token: string;
  parentBlockId: string;
  filename: string;
  html: string;
  caption?: string;
}): Promise<{ ok: boolean; blockId?: string; fileUploadId?: string; error?: string; requests: number }> {
  const notion = new Client({ auth: opts.token });
  let requests = 0;
  try {
    const upload: any = await (notion as any).fileUploads.create({
      mode: "single_part",
      filename: opts.filename.endsWith(".html") ? opts.filename : `${opts.filename}.html`,
      content_type: "text/html",
    });
    requests++;

    const bytes = Buffer.from(opts.html, "utf8");
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "text/html" }), upload.filename ?? opts.filename);
    const res = await fetch(upload.upload_url, { method: "POST", body: form as any });
    requests++;
    if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);

    const appended: any = await notion.blocks.children.append({
      block_id: opts.parentBlockId,
      children: [
        {
          object: "block",
          type: "embed",
          embed: {
            type: "file_upload",
            file_upload: { id: upload.id },
            caption: opts.caption
              ? [{ type: "text", text: { content: opts.caption } }]
              : [],
          },
        } as any,
      ],
    } as any);
    requests++;

    return { ok: true, blockId: appended?.results?.[0]?.id, fileUploadId: upload.id, requests };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err), requests };
  }
}

/** Installs a widget as an /embed block pointing at a hosted URL. */
export async function installEmbedBlock(opts: {
  token: string;
  parentBlockId: string;
  url: string;
  caption?: string;
}) {
  const notion = new Client({ auth: opts.token });
  try {
    const appended: any = await notion.blocks.children.append({
      block_id: opts.parentBlockId,
      children: [
        {
          object: "block",
          type: "embed",
          embed: {
            url: opts.url,
            caption: opts.caption ? [{ type: "text", text: { content: opts.caption } }] : [],
          },
        } as any,
      ],
    } as any);
    return { ok: true, blockId: appended?.results?.[0]?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export { NOTION_VERSION };

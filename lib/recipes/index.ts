import type { Recipe } from "./types";
import { crmPipeline, invoiceGenerator, jobTracker, okrSystem, sprintTracker } from "./business";
import {
  automationStarter,
  clientPortal,
  contentCalendar,
  habitOsNative,
  meetingNotesOs,
  paraLifeOs,
} from "./systems";
import { NOTION_VERSION } from "@/lib/notion/schema";

export const RECIPES: Record<string, Recipe> = {
  "crm-pipeline": crmPipeline,
  "sprint-tracker": sprintTracker,
  "okr-system": okrSystem,
  "invoice-generator": invoiceGenerator,
  "job-tracker": jobTracker,
  "meeting-notes-os": meetingNotesOs,
  "content-calendar": contentCalendar,
  "para-life-os": paraLifeOs,
  "habit-os-native": habitOsNative,
  "client-portal": clientPortal,
  "automation-starter": automationStarter,
};

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES[id];
}

export * from "./types";

/* ------------------------------------------------------------------ */
/* Install planner                                                     */
/* ------------------------------------------------------------------ */

export interface ApiCall {
  method: "POST" | "PATCH" | "GET";
  path: string;
  note: string;
  /** how many requests this line actually costs (chunked block appends, etc.) */
  count: number;
  body?: unknown;
}

export interface InstallPlan {
  notionVersion: string;
  calls: ApiCall[];
  totalRequests: number;
  manualSteps: number;
  warnings: string[];
}

const RELATION_MARKER = "__relationRef";

/**
 * Builds the exact request sequence an install performs.
 *
 * Notion's data-source model forces a two-pass approach:
 * 1. create the databases (relations stripped : their targets do not exist)
 *   2. read back each database's default data source id
 *   3. patch the relation properties in with resolved data_source_ids
 *   4. add rollups/formulas that reference those relations
 *   5. create views (each needs a data_source_id)
 *   6. seed rows, then documentation pages, then append page bodies in
 *      chunks of 100 blocks (the Append block children limit)
 */
export function planInstall(recipe: Recipe, parentPageId = "{parent_page_id}"): InstallPlan {
  const calls: ApiCall[] = [];
  const warnings: string[] = [];

  calls.push({
    method: "POST",
    path: "/v1/pages",
    note: `Create the “${recipe.id}” container page under the page you chose`,
    count: 1,
    body: {
      parent: { type: "page_id", page_id: parentPageId },
      icon: { type: "emoji", emoji: "📦" },
      properties: { title: { title: [{ text: { content: recipe.id } }] } },
    },
  });

 // Pass 1 : databases without relations
  recipe.databases.forEach((db) => {
    const clean: Record<string, unknown> = {};
    const deferred: Record<string, unknown> = {};
    Object.entries(db.properties).forEach(([name, schema]) => {
      if ((schema as Record<string, unknown>)[RELATION_MARKER]) deferred[name] = schema;
      else if ((schema as Record<string, unknown>).rollup) deferred[name] = schema;
      else if ((schema as Record<string, unknown>).formula) deferred[name] = schema;
      else clean[name] = schema;
    });

    calls.push({
      method: "POST",
      path: "/v1/databases",
      note: `Create the “${db.title}” database with ${Object.keys(clean).length} base properties`,
      count: 1,
      body: {
        parent: { type: "page_id", page_id: "{container_page_id}" },
        title: [{ type: "text", text: { content: db.title } }],
        icon: { type: "emoji", emoji: db.icon },
        is_inline: db.isInline ?? false,
        properties: clean,
      },
    });

    calls.push({
      method: "GET",
      path: `/v1/databases/{${db.ref}_database_id}`,
      note: `Read back ${db.title} to get its default data source id`,
      count: 1,
    });

    const deferredCount = Object.keys(deferred).length;
    if (deferredCount) {
      calls.push({
        method: "PATCH",
        path: `/v1/data_sources/{${db.ref}_data_source_id}`,
        note: `Add ${deferredCount} deferred properties to ${db.title}: relations (with resolved data_source_ids), then the rollups and formulas that read them`,
        count: 1,
        body: { properties: stripMarkers(deferred) },
      });
    }
  });

 // Pass 2 : views
  recipe.views.forEach((v) => {
    if (v.type === "dashboard") {
      calls.push({
        method: "POST",
        path: "/v1/views",
        note: `Create the “${v.name}” dashboard view (layout is read-only; widgets are added as further views with view_id)`,
        count: 1,
        body: {
          database_id: `{${v.on ?? recipe.databases[0]?.ref}_database_id}`,
          name: v.name,
          type: "dashboard",
        },
      });
      warnings.push(
        `“${v.name}” is created empty. Dashboard configuration is read-only in the API: each widget is its own POST /v1/views with view_id set to the dashboard. See the manual steps.`
      );
      return;
    }
    calls.push({
      method: "POST",
      path: "/v1/views",
      note: `Create the “${v.name}” ${v.type} view on ${v.on ?? recipe.databases[0]?.ref}`,
      count: 1,
      body: {
        data_source_id: `{${v.on ?? recipe.databases[0]?.ref}_data_source_id}`,
        name: v.name,
        type: v.type,
        ...(v.configuration ? { configuration: v.configuration } : {}),
        ...(v.filter ? { filter: v.filter } : {}),
        ...(v.sorts ? { sorts: v.sorts } : {}),
      },
    });
  });

 // Pass 3 : seed rows. POST /v1/pages creates exactly one page per request;
  // Notion has no bulk insert, so N rows is N requests and the plan must say so.
  recipe.databases.forEach((db) => {
    if (!db.seed?.length) return;
    calls.push({
      method: "POST",
      path: "/v1/pages",
      note: `Seed ${db.seed.length} rows into ${db.title} so the views are not empty on first open (one request per row; Notion has no bulk insert)`,
      count: db.seed.length,
    });
  });

 // Pass 4 : documentation pages + bodies
  recipe.pages.forEach((page) => {
    calls.push({
      method: "POST",
      path: "/v1/pages",
      note: `Create the “${page.title}” page`,
      count: 1,
      body: {
        parent: { type: "page_id", page_id: "{container_page_id}" },
        icon: page.icon ? { type: "emoji", emoji: page.icon } : undefined,
        properties: { title: { title: [{ text: { content: page.title } }] } },
      },
    });
    // Append block children is capped at 100 blocks and two levels of nesting.
    const chunks = Math.max(1, Math.ceil(page.blocks.length / 100));
    calls.push({
      method: "PATCH",
      path: `/v1/blocks/{${slug(page.title)}_page_id}/children`,
      note: `Append ${page.blocks.length} blocks of page body${chunks > 1 ? ` in ${chunks} chunks of ≤100` : ""}`,
      count: chunks,
      body: { children: page.blocks.slice(0, 3), notifications: { mode: "silent" } },
    });
  });

  if (recipe.manual.length) {
    warnings.push(
      `${recipe.manual.length} step${recipe.manual.length === 1 ? "" : "s"} cannot be scripted: ${recipe.manual
        .map((m) => m.title)
        .join("; ")}.`
    );
  }

  return {
    notionVersion: NOTION_VERSION,
    calls,
    totalRequests: calls.reduce((a, c) => a + c.count, 0),
    manualSteps: recipe.manual.reduce((a, m) => a + m.steps.length, 0),
    warnings,
  };
}

function stripMarkers(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  Object.entries(props).forEach(([k, v]) => {
    const copy = { ...(v as Record<string, unknown>) };
    delete copy[RELATION_MARKER];
    out[k] = copy;
  });
  return out;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

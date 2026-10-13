import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { createInstance, instanceSummary, instanceUrls, listInstances } from "@/lib/sync/instances";
import { readDocument } from "@/lib/sync/engine";
import { getComponent } from "@/lib/catalog";
import { AdapterError } from "@/lib/sync/transport";
import { fail, json } from "@/lib/sync/http";

export const dynamic = "force-dynamic";

/**
 * GET  /api/sync/instances?slug=habit-grid
 * POST /api/sync/instances
 *   {
 *     "component": "habit-grid",
 *     "connectionId": "conn_…",
 *     "binding": { "mode": "records", "dataSourceId": "ds_…" },
 *     "sampleDoc": { … }          // the widget's current localStorage document
 *   }
 *
 * The response carries the sync key **once**. After that only its hash exists
 * server-side, which is why the UI must show the URL immediately and offer a
 * rotate action rather than a "show key" action.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? undefined;
  const instances = await listInstances(slug);
  return json({ ok: true, instances });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Body must be JSON.");
  }

  const slug = String(body?.component ?? "");
  const component = getComponent(slug);
  if (!component) return fail(`Unknown component “${slug}”.`, 404);

  const connectionId = String(body?.connectionId ?? "");
  if (!connectionId) return fail("connectionId is required. Connect a workspace first.");

  try {
    const created = await createInstance({
      slug,
      name: body?.name,
      connectionId,
      config: body?.config ?? {},
      binding: {
        mode: body?.binding?.mode ?? "records",
        dataSourceId: body?.binding?.dataSourceId,
        provisionTitle: body?.binding?.provisionTitle,
        keyProp: body?.binding?.keyProp,
        stateProp: body?.binding?.stateProp,
        conflict: body?.binding?.conflict,
        pageId: body?.binding?.pageId,
        anchor: body?.binding?.anchor,
      },
      sampleDoc: body?.sampleDoc,
    });

    // First read: gives the caller a snapshot to bake into the first render and
    // proves the binding resolves before anyone pastes a URL into Notion.
    let initial: { doc: unknown; rows: number } | undefined;
    let warning: string | undefined;
    try {
      const adapter = await (await import("@/lib/sync/engine")).adapterForInstance(created.instance);
      const state = await readDocument(created.instance, adapter);
      initial = { doc: state.doc, rows: state.rows.length };
    } catch (err) {
      warning = (err as Error).message;
    }

    const instance = await instanceSummary(created.instance);
    // The event ring is global; the caller asked about one instance.
    const events = (await Store.events(24)).filter((e) => e.instanceId === instance.id).slice(0, 8);

    return json({
      ok: true,
      instance,
      syncKey: created.syncKey,
      urls: instanceUrls(created.instance, created.syncKey),
      initial,
      warnings: [...created.warnings, ...(warning ? [warning] : [])],
      events,
    });
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 400, { code: err.code, planLimit: err.planLimit });
    }
    return fail((err as Error).message, 500);
  }
}

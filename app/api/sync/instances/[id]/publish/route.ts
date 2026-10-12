import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { adapterForInstance, publishOfflineRenderer } from "@/lib/sync/engine";
import { renderDataBundle } from "@/lib/bridge";
import { authorize, fail, isResponse, json, type RouteContext } from "@/lib/sync/http";
import { AdapterError } from "@/lib/sync/transport";
import { instanceSummary, instanceUrls } from "@/lib/sync/instances";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/sync/instances/{id}/publish
 *
 *   { "parentPageId": "…", "caption": "Habit heatmap" }   install an HTML block
 *   { }                                                   refresh an existing one
 *
 * This is the endpoint that makes channel parity real (research §4): the offline
 * renderer is a file we own, so we re-render it with the current document and
 * replace the block's `file_upload` in place. An offline block is therefore a
 * cache we refresh, not a snapshot the user has to re-upload after every change.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorize(req, id);
  if (isResponse(auth)) return auth;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const adapter = await adapterForInstance(auth.instance);
    const key = auth.key;

    const publish = await publishOfflineRenderer({
      instance: auth.instance,
      adapter,
      parentPageId: body?.parentPageId,
      caption: body?.caption,
      render: (instance, doc) =>
        renderDataBundle({
          instance,
          doc,
          transport: "outbox",
          syncKey: key,
          ui: body?.ui !== false,
        }),
    });

    const fresh = (await Store.instance(id))!;
    return json({
      ok: true,
      publish,
      instance: await instanceSummary(fresh),
      urls: instanceUrls(fresh, key),
      events: (await Store.events(10)).filter((e) => e.instanceId === id),
    });
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 502, { code: err.code, planLimit: err.planLimit });
    }
    return fail((err as Error).message, 500);
  }
}

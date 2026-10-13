import { NextRequest } from "next/server";
import { Store, type SyncEvent } from "@/lib/sync/store";
import { instanceSummary, instanceUrls, revokeInstance, rotateInstanceKey } from "@/lib/sync/instances";
import { readDocument } from "@/lib/sync/engine";
import { newId } from "@/lib/sync/ids";
import { adapterForInstance } from "@/lib/sync/engine";
import { AdapterError } from "@/lib/sync/transport";
import { fail, json, type RouteContext } from "@/lib/sync/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/instances/{id}
 *   The instance, its binding, its publish state, its change log.
 *
 * PATCH /api/sync/instances/{id}
 *   { "config": { … } }              update configuration live (no re-install)
 *   { "name": "Habit heatmap" }
 *   { "action": "rotate" }           mint a new sync key, invalidate old URLs
 *   { "action": "revoke" }           kill the instance
 *   { "action": "read" }             read the current document from Notion
 *
 * Configuration changing without a reinstall is a small thing that the old
 * model could not do at all: the config lived inside the query string of the
 * URL the user had already pasted.
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const instance = await Store.instance(id);
  if (!instance) return fail("Unknown instance.", 404);
  return json({
    ok: true,
    instance: await instanceSummary(instance),
    urls: instanceUrls(instance),
    log: await Store.log(id, 60),
    events: (await Store.events(120)).filter((e: SyncEvent) => e.instanceId === id),
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const instance = await Store.instance(id);
  if (!instance) return fail("Unknown instance.", 404);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Body must be JSON.");
  }

  try {
    if (body?.action === "rotate") {
      const { syncKey } = await rotateInstanceKey(id);
      const fresh = await Store.instance(id);
      return json({
        ok: true,
        syncKey,
        urls: instanceUrls(fresh!, syncKey),
        warning: "The previous key stops working immediately. Every pasted URL must be replaced.",
      });
    }

    if (body?.action === "revoke") {
      await revokeInstance(id);
      return json({ ok: true, revoked: true });
    }

    if (body?.action === "read") {
      const adapter = await adapterForInstance(instance);
      const state = await readDocument(instance, adapter);
      return json({ ok: true, doc: state.doc, hash: state.hash, rows: state.rows.length });
    }

    const patch: Record<string, unknown> = {};
    if (body?.config && typeof body.config === "object") {
      patch.config = { ...instance.config, ...body.config };
    }
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
    if (body?.binding && typeof body.binding === "object") {
      patch.binding = { ...instance.binding, ...body.binding };
    }
    if (!Object.keys(patch).length) return fail("Nothing to update.");

    const updated = await Store.updateInstance(id, patch as never);
    await Store.pushEvents([
      {
        id: newId("evt", 6),
        at: new Date().toISOString(),
        kind: "instance.bound",
        instanceId: id,
        detail: `Updated ${Object.keys(patch).join(", ")}. Every renderer picks it up on its next read.`,
      },
    ]);
    return json({ ok: true, instance: await instanceSummary(updated!) });
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 400, { code: err.code, planLimit: err.planLimit });
    }
    return fail((err as Error).message, 500);
  }
}

/** Revocation, exposed as a delete so an operator can use curl without a body. */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const instance = await Store.instance(id);
  if (!instance) return fail("Unknown instance.", 404);
  await revokeInstance(id);
  return json({ ok: true, revoked: true });
}

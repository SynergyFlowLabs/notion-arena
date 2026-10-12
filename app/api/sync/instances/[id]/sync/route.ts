import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { syncInstance } from "@/lib/sync/engine";
import { authorize, clientLabel, fail, isResponse, json, type RouteContext } from "@/lib/sync/http";
import { AdapterError } from "@/lib/sync/transport";
import { newId } from "@/lib/sync/ids";
import type { SyncRequest } from "@/lib/sync/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/sync/instances/{id}/sync
 *
 * The one endpoint a renderer needs.
 *
 *   { "rev": 12, "ops": [{ id, key, value, del, at, baseRev }], "transport": "live" }
 *
 * Response: acknowledgements, changes since `rev` (or a full snapshot when the
 * client has no usable revision), conflicts, and the connection's remaining
 * request budget so the UI can be honest when Notion is throttling us.
 *
 * Auth is the instance sync key, not a session: the frame may be third-party,
 * and third-party cookies are blocked or partitioned in every modern browser.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorize(req, id);
  if (isResponse(auth)) return auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Body must be JSON.");
  }

  const request: SyncRequest = {
    rev: Number.isFinite(body?.rev) ? Number(body.rev) : undefined,
    ops: Array.isArray(body?.ops) ? body.ops.slice(0, 500) : [],
    limit: Number.isFinite(body?.limit) ? Math.min(Number(body.limit), 2000) : 500,
    transport: body?.transport === "outbox" ? "outbox" : "live",
  };

  try {
    const result = await syncInstance(auth.instance, request);

    // Capability reports are the cheapest way to answer the open questions in
    // docs/DATA_SYNC_RESEARCH.md §8 from real installations in the field.
    if (body?.capabilities) {
      await Store.pushEvents([
        {
          id: newId("evt", 6),
          at: new Date().toISOString(),
          kind: "pull",
          instanceId: id,
          connectionId: auth.instance.connectionId,
          detail: `${clientLabel(req)} reported: storage=${body.capabilities.storage} transport=${body.capabilities.transport} origin=${body.capabilities.origin}`,
          meta: body.capabilities,
        },
      ]);
    }

    return json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 502, {
        code: err.code,
        planLimit: err.planLimit,
      });
    }
    return fail((err as Error).message, 500);
  }
}

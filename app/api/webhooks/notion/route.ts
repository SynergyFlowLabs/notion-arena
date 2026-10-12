import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Store } from "@/lib/sync/store";
import { fanoutNotionChange } from "@/lib/sync/engine";
import { newId } from "@/lib/sync/ids";
import { fail, json } from "@/lib/sync/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/webhooks/notion
 *
 * Notion's own change feed. Three properties of it (research §2.3) decide how
 * this handler is written:
 *
 *   • The payload carries ids, not content, so every event costs a follow-up
 *     read. The handler therefore does the read once and then fans out to the
 *     instances that actually reference the entity.
 *   • Delivery is at-most-once with up to 8 retries over ~24 hours, so handling
 *     an event twice must be harmless. Nothing here is additive: it commits the
 *     row's current state against a new revision, so a replay is a no-op.
 *   • Events are aggregated and unordered. The revision counter, not arrival
 *     order, is what renderers diff against.
 *
 * Verification: `X-Notion-Signature` is HMAC-SHA256 over the raw body keyed by
 * the subscription's verification token. Verification is mandatory unless the
 * deployment explicitly opts into development mode, because the endpoint is
 * public by definition.
 */

export async function POST(req: NextRequest) {
  const raw = await req.text();
  let payload: any;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return fail("Body must be JSON.");
  }

  /* --- subscription handshake --------------------------------------- */
  if (payload?.verification_token && !payload?.type) {
    // Notion verifies by POSTing the token; a human then pastes it back into the
    // connection UI. We record it so the operator can copy it from the events
    // feed instead of hunting through logs.
    await Store.pushEvents([
      {
        id: newId("evt", 6),
        at: new Date().toISOString(),
        kind: "webhook.received",
        detail: `Verification token received: ${payload.verification_token}. Paste it into the connection's Webhooks tab to activate the subscription.`,
        meta: { verificationToken: payload.verification_token },
      },
    ]);
    return json({ ok: true, verification: "recorded" });
  }

  /* --- signature ---------------------------------------------------- */
  const secret = process.env.NOTION_WEBHOOK_SECRET;
  const devMode = process.env.NODE_ENV !== "production" || process.env.ARENA_DEV_WEBHOOKS === "1";
  const signature = req.headers.get("x-notion-signature") ?? "";

  if (secret) {
    const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    if (!ok) {
      await Store.pushEvents([
        {
          id: newId("evt", 6),
          at: new Date().toISOString(),
          kind: "webhook.ignored",
          detail: "Rejected a webhook whose signature did not verify.",
        },
      ]);
      return fail("Signature verification failed.", 401);
    }
  } else if (!devMode) {
    return fail("NOTION_WEBHOOK_SECRET is not configured; refusing unsigned events.", 503);
  }

  /* --- fan out ------------------------------------------------------ */
  const entityId = payload?.entity?.id as string | undefined;
  const entityType = (payload?.entity?.type as string | undefined) ?? "page";
  const authors = Array.isArray(payload?.authors)
    ? payload.authors.map((a: any) => `${a?.type ?? "?"}:${a?.id ?? "?"}`).slice(0, 3).join(", ")
    : "";

  if (!entityId) {
    await Store.pushEvents([
      {
        id: newId("evt", 6),
        at: new Date().toISOString(),
        kind: "webhook.ignored",
        detail: `Ignored ${payload?.type ?? "unknown event"}: no entity id.`,
      },
    ]);
    return json({ ok: true, ignored: true });
  }

  const connections = (await Store.connections()).filter((c) => !c.revokedAt && c.kind !== "mock");
  let instances = 0;
  let changes = 0;

  for (const connection of connections) {
    try {
      const result = await fanoutNotionChange({ connectionId: connection.id, entityId, entityType });
      instances += result.instances;
      changes += result.changes;
    } catch {
      /* one workspace must not stop the others */
    }
  }

  const at = new Date().toISOString();
  await Store.pushEvents([
    {
      id: newId("evt", 6),
      at,
      kind: "webhook.received",
      detail: `${payload?.type ?? "event"} on ${entityType} ${entityId}${authors ? ` by ${authors}` : ""}: ${changes} change${changes === 1 ? "" : "s"} across ${instances} instance${instances === 1 ? "" : "s"}.`,
      meta: { entityId, entityType, type: payload?.type, attempt: payload?.attempt_number },
    },
  ]);

  return json({ ok: true, instances, changes });
}

/** Notion may probe with GET while verifying a subscription in some setups. */
export async function GET() {
  return json({ ok: true, endpoint: "notion-arena webhooks", expects: "POST" });
}

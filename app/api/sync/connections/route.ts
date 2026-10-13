import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { connectMock, connectWithToken } from "@/lib/sync/instances";
import { adapterFor } from "@/lib/sync/engine";
import { AdapterError } from "@/lib/sync/transport";
import { fail, json } from "@/lib/sync/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/connections
 *   What is connected. Never includes a token or its sealed form.
 *
 * POST /api/sync/connections
 *   { "mode": "mock" }                          -> the credential-free demo workspace
 *   { "mode": "token", "token": "ntn_…", "kind": "pat" | "internal" }
 *
 * The pasted-token path is the escape hatch the user asked for: solo users,
 * self-hosters and headless scripts get a working connection without an OAuth
 * round trip, at the cost of a long-lived credential. OAuth is the default in
 * docs/SYNC_PLAN.md phase 2 and lands at the same endpoint.
 */
export async function GET() {
  const connections = await Store.connections();
  return json({
    ok: true,
    connections: connections.map((c) => ({
      id: c.id,
      kind: c.kind,
      label: c.label,
      workspaceName: c.workspaceName,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
      revokedAt: c.revokedAt,
      account: c.account,
    })),
  });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Body must be JSON.");
  }

  try {
    if (body?.mode === "mock") {
      const connection = await connectMock();
      return json({ ok: true, connection: { id: connection.id, kind: connection.kind, label: connection.label } });
    }

    if (body?.mode === "token") {
      const connection = await connectWithToken({
        token: String(body?.token ?? ""),
        kind: body?.kind === "internal" ? "internal" : "pat",
        label: body?.label,
      });
      return json({
        ok: true,
        connection: {
          id: connection.id,
          kind: connection.kind,
          label: connection.label,
          workspaceName: connection.workspaceName,
        },
      });
    }

    return fail('mode must be "mock" or "token".');
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 400, { code: err.code, planLimit: err.planLimit });
    }
    return fail((err as Error).message, 500);
  }
}

/** Kept tiny on purpose: a connection is validated by reading its own identity. */
export async function HEAD() {
  const connections = await Store.connections();
  return new Response(null, { headers: { "x-arena-connections": String(connections.length) } });
}


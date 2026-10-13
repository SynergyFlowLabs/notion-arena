import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { authorize, isResponse, type RouteContext } from "@/lib/sync/http";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/sync/instances/{id}/stream?k=…
 *
 * Server-sent events, one frame per revision bump.
 *
 * Why SSE and not a socket: the frame may be a third-party iframe inside Notion,
 * where a plain same-origin fetch is allowed but cookies are not, and where an
 * `EventSource` with the key in the query string is the smallest thing that
 * works in every browser. The payload is a revision number, not data: the client
 * then calls `/sync`, so there is exactly one code path that applies changes and
 * exactly one place where conflicts are resolved.
 *
 * The stream is deliberately short-lived (5 minutes). A renderer reconnects, and
 * Notion's own webhook delivery is measured in minutes anyway (§2.3), so a
 * longer-lived socket buys nothing and costs a connection per open Notion page.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorize(req, id);
  if (isResponse(auth)) return auth;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastRev = auth.instance.rev;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("hello", { rev: lastRev, instanceId: id, serverTime: new Date().toISOString() });

      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const current = await Store.instance(id);
          if (!current) {
            send("revoked", { reason: "instance_removed" });
            return finish();
          }
          if (current.rev !== lastRev) {
            lastRev = current.rev;
            send("rev", { rev: current.rev, at: new Date().toISOString() });
          } else {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          }
        } catch {
          /* keep the stream alive through a transient store failure */
        }
      }, 1500);

      const timeout = setTimeout(() => finish(), 5 * 60 * 1000);

      function finish() {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }

      req.signal.addEventListener("abort", finish);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      // Vercel and nginx must not buffer a stream that carries revisions.
      "x-accel-buffering": "no",
      "access-control-allow-origin": "*",
    },
  });
}

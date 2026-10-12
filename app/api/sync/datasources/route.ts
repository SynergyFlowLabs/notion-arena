import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { adapterFor } from "@/lib/sync/engine";
import { fail, json } from "@/lib/sync/http";
import { AdapterError } from "@/lib/sync/transport";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/datasources?connectionId=…&q=…
 *
 * Candidate databases to bind a component to. On a real connection this is
 * POST /v1/search filtered to data sources, which is also how a user discovers
 * "the table I already keep this in" instead of being handed a new one.
 */
export async function GET(req: NextRequest) {
  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) return fail("connectionId is required.");
  const connection = await Store.connection(connectionId);
  if (!connection) return fail("Unknown connection.", 404);

  try {
    const adapter = adapterFor(connection);
    const results = await adapter.searchDataSources(req.nextUrl.searchParams.get("q") ?? "", 25);
    return json({
      ok: true,
      connection: { id: connection.id, kind: connection.kind, label: connection.label },
      dataSources: results.map((ds) => ({
        id: ds.id,
        databaseId: ds.databaseId,
        title: ds.title,
        url: ds.url,
        properties: Object.entries(ds.properties).map(([name, schema]) => ({
          name,
          type: schema.type,
          options: schema.options?.map((o) => o.name),
        })),
      })),
    });
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 502, { code: err.code, planLimit: err.planLimit });
    }
    return fail((err as Error).message, 500);
  }
}

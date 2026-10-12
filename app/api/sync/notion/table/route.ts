import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { adapterFor } from "@/lib/sync/engine";
import { mockTableView } from "@/lib/sync/adapters/mock";
import { readProperty } from "@/lib/sync/mapping";
import { fail, json } from "@/lib/sync/http";
import { AdapterError } from "@/lib/sync/transport";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/notion/table?connectionId=…&dataSourceId=…
 *
 * The user's side of the loop, rendered.
 *
 * The playground shows this next to the widget so the claim "your clicks are
 * rows in your database" is visible rather than asserted: every number here is
 * read back out of the bound data source, never from our own log.
 */
export async function GET(req: NextRequest) {
  const connectionId = req.nextUrl.searchParams.get("connectionId");
  const dataSourceId = req.nextUrl.searchParams.get("dataSourceId");
  if (!connectionId || !dataSourceId) return fail("connectionId and dataSourceId are required.");

  const connection = await Store.connection(connectionId);
  if (!connection) return fail("Unknown connection.", 404);

  try {
    const adapter = adapterFor(connection);
    const ds = await adapter.getDataSource(dataSourceId);
    if (!ds) return fail("That database is not visible to the connection.", 404);

    if (connection.kind === "mock") {
      const view = await mockTableView(dataSourceId, 40);
      return json({ ok: true, source: "mock", ...view, databaseId: ds.databaseId });
    }

    const page = await adapter.queryRows({ dataSourceId, pageSize: 40 });
    const columns = Object.keys(ds.properties);
    return json({
      ok: true,
      source: "notion",
      databaseTitle: ds.title,
      databaseId: ds.databaseId,
      columns,
      rows: page.rows.map((row) => ({
        id: row.id,
        url: row.url,
        lastEditedTime: row.lastEditedTime,
        cells: Object.fromEntries(
          columns.map((c) => {
            const value = readProperty(
              (ds.properties[c].type ?? "rich_text") as never,
              (row.raw as Record<string, unknown>)[c]
            );
            return [c, value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)];
          })
        ),
      })),
    });
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 502, { code: err.code, planLimit: err.planLimit });
    }
    return fail((err as Error).message, 500);
  }
}

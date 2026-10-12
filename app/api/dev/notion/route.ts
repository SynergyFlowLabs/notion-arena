import { NextRequest } from "next/server";
import { Store } from "@/lib/sync/store";
import { fanoutNotionChange } from "@/lib/sync/engine";
import { mockDeleteRow, mockHumanEdit, resetMockCache } from "@/lib/sync/adapters/mock";
import { newId } from "@/lib/sync/ids";
import { fail, json } from "@/lib/sync/http";
import { AdapterError } from "@/lib/sync/transport";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev/notion  (development only)
 *
 * Simulates a person editing the bound database inside Notion, then runs the
 * webhook path against it.
 *
 * Why this exists: the real webhook cannot be exercised in development (Notion
 * refuses localhost endpoints, and the URL cannot be changed after
 * verification, research §2.3), and the webhook is the single most important
 * half of "two-way". Without this route, the only way to test Notion -> widget
 * would be a public tunnel, so the path would rot.
 *
 *   { "dataSourceId": "ds_habits", "keyProp": "Arena key",
 *     "keyValue": "Read|2026-10-12", "properties": { … } }
 *   { "dataSourceId": "ds_habits", "properties": { … } }   // a new row
 *   { "delete": "row_id" }
 *   { "reset": true }                                      // wipe the demo workspace
 *
 * Naming a key that does not exist is an error, not a new row: in the real
 * product a person cannot edit a row that is not there, and a simulator that
 * invents one hides exactly the bug it exists to catch (an unreadable business
 * key). Omit both `rowId` and `keyValue` to mean "a person added a row".
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ARENA_DEV_WEBHOOKS !== "1") {
    return fail("This route is development only.", 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Body must be JSON.");
  }

  const connectionId =
    body?.connectionId ?? (await Store.connections()).find((c) => c.kind === "mock")?.id;
  if (!connectionId) return fail("Connect a workspace first.", 400);

  const at = new Date().toISOString();

  try {
    if (body?.reset) {
      // Both layers: the store file, and the mock workspace the adapter caches
      // in memory for the life of the server process. Without the second half a
      // reset looks like it worked and half the old rows are still there.
      await Store.reset();
      resetMockCache();
      return json({ ok: true, reset: true });
    }

    if (body?.delete) {
      await mockDeleteRow(String(body.delete));
      await Store.pushEvents([
        {
          id: newId("evt", 6),
          at,
          kind: "notion.edit",
          connectionId,
          detail: "A row was trashed in the mock workspace. The engine will tombstone the key.",
        },
      ]);
      const result = await fanoutNotionChange({
        connectionId,
        entityId: String(body.delete),
        entityType: "page",
      });
      return json({ ok: true, deleted: body.delete, ...result });
    }

    const dataSourceId = String(body?.dataSourceId ?? "");
    if (!dataSourceId) return fail("dataSourceId is required.");

    const edited = await mockHumanEdit({
      dataSourceId,
      rowId: body?.rowId,
      keyProp: body?.keyProp,
      keyValue: body?.keyValue,
      properties: body?.properties ?? {},
    });

    await Store.pushEvents([
      {
        id: newId("evt", 6),
        at,
        kind: "notion.edit",
        connectionId,
        detail: `A human edited ${edited.rowId} in the mock workspace (${Object.keys(body?.properties ?? {}).join(", ") || "properties"}).`,
      },
    ]);

    // The same fan-out the real webhook route runs.
    const result = await fanoutNotionChange({
      connectionId,
      entityId: edited.rowId,
      entityType: "page",
    });

    return json({
      ok: true,
      rowId: edited.rowId,
      dataSourceId: edited.dataSourceId,
      created: edited.created,
      ...result,
    });
  } catch (err) {
    if (err instanceof AdapterError) {
      return fail(err.message, err.status ?? 400, { code: err.code });
    }
    return fail((err as Error).message, 500);
  }
}

import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /c/probe
 *
 * The capability probe, inside Arena's chrome, so the four open questions in
 * docs/DATA_SYNC_RESEARCH.md §8 can be answered without downloading anything:
 * open this URL as a Notion /embed block, and an HTML block built from
 * /api/sync/probe?download=1, then compare what each frame reports.
 */
export async function GET(req: NextRequest) {
  const target = new URL("/api/sync/probe", req.nextUrl.origin);
  return Response.redirect(target, 307);
}

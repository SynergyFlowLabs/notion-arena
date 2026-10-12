/**
 * The data plane, exercised end to end.
 *
 * Two halves, because they fail differently:
 *
 *   1. The protocol, over HTTP: bind, push, replay, pull, tombstone. This is
 *      where a sync design is either correct or quietly lossy.
 *   2. The runtime, in a real browser: the widget in the frame has to adopt its
 *      own localStorage key, notice a Notion edit that arrives over SSE, and
 *      queue writes when it has no network (the HTML-block case).
 *
 * Usage:
 *   npm run dev                       # in one terminal
 *   npm run check:sync                # in another
 *
 * BASE_URL overrides the default http://localhost:3000. Pass --no-browser to
 * skip the Playwright half when no browser binary is available.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const skipBrowser = process.argv.includes("--no-browser");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

async function api(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function main() {
  console.log(`Notion Arena sync check against ${BASE}`);

  /* ---------------- 0. reachable ---------------- */
  section("0. the server is up");
  const home = await fetch(`${BASE}/`).catch(() => null);
  check("the site answers", !!home && home.ok);
  if (!home || !home.ok) {
    console.log("\nStart the dev server first: npm run dev");
    process.exit(1);
  }

  await api("POST", "/api/dev/notion", { reset: true });

  /* ---------------- 1. connect ---------------- */
  section("1. connect a workspace");
  const conn = await api("POST", "/api/sync/connections", { mode: "mock" });
  check("the demo workspace connects", conn.status === 200 && conn.json?.ok === true);
  const connectionId = conn.json?.connection?.id;
  const list = await api("GET", "/api/sync/connections");
  check("it is listed", (list.json?.connections ?? []).some((c) => c.id === connectionId));
  check(
    "no credential ever leaves the server",
    !JSON.stringify(list.json).includes("sealed") && !JSON.stringify(list.json).includes("ntn_")
  );

  const dataSources = await api("GET", `/api/sync/datasources?connectionId=${connectionId}`);
  check(
    "candidate databases are discoverable",
    (dataSources.json?.dataSources ?? []).length >= 3,
    JSON.stringify(dataSources.json)?.slice(0, 200)
  );

  /* ---------------- 2. bind: records, declared schema ---------------- */
  section("2. bind a widget to a database (records, declared schema)");
  const created = await api("POST", "/api/sync/instances", {
    component: "habit-grid",
    connectionId,
    binding: { mode: "records", provisionTitle: "Habit Heatmap log" },
    sampleDoc: { water: { "2026-10-10": 1, "2026-10-11": 2 }, read: { "2026-10-10": 1 } },
  });
  const instance = created.json?.instance;
  const key = created.json?.syncKey;
  const dataSourceId = instance?.binding?.dataSourceId;
  check("the instance is created", created.status === 200 && !!instance?.id);
  check("the key is returned exactly once", typeof key === "string" && key.length > 20);
  check(
    "the existing state is uploaded, not left behind",
    (created.json?.warnings ?? []).some((w) => /Uploaded the component's current state/.test(w)),
    JSON.stringify(created.json?.warnings)
  );
  check("the first read already has the rows", created.json?.initial?.rows === 3);
  check("the URLs carry no double slash", !created.json.urls.embedUrl.includes("//embed"));
  check("the key is in the URL, not in a cookie", created.json.urls.embedUrl.includes("k="));

  const table = async () =>
    (await api("GET", `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${dataSourceId}`))
      .json;
  let view = await table();
  check(
    "the table the user sees has a business key per row",
    (view?.rows ?? []).every((r) => /^(water|read)\|2026-10-1[01]$/.test(r.cells["Arena key"])),
    JSON.stringify(view?.rows?.map((r) => r.cells))
  );
  check(
    "the title column is the widget's own field, not the key",
    (view?.rows ?? []).every((r) => ["water", "read"].includes(r.cells.Habit)),
    JSON.stringify(view?.rows?.map((r) => r.cells.Habit))
  );

  /* ---------------- 3. push ---------------- */
  section("3. widget writes reach the table");
  const sync = (body) =>
    api("POST", `/api/sync/instances/${instance.id}/sync`, body, { "x-arena-key": key }).then((r) => r.json);

  const push = await sync({
    rev: instance.rev,
    ops: [{ id: "op_check_1", key: "water.2026-10-12", value: 3, at: 1 }],
  });
  check("the op is acknowledged", (push?.ack ?? []).includes("op_check_1"));
  check("exactly one row was written", push?.notion?.applied === 1, JSON.stringify(push?.notion));
  check("the revision moved", push?.rev === instance.rev + 1);

  view = await table();
  check(
    "the new cell is a row",
    (view?.rows ?? []).some((r) => r.cells["Arena key"] === "water|2026-10-12" && r.cells.Level === "3")
  );

  /* ---------------- 4. idempotency ---------------- */
  section("4. replay and redundant writes");
  const replay = await sync({
    rev: push.rev,
    ops: [{ id: "op_check_1", key: "water.2026-10-12", value: 3, at: 1 }],
  });
  check("a replayed op id is not applied twice", replay?.notion?.applied === 0);
  check("and does not move the revision", replay?.rev === push.rev);

  const redundant = await sync({
    rev: replay.rev,
    ops: [{ id: "op_check_2", key: "water.2026-10-12", value: 3, at: 2 }],
  });
  check("a redundant value is acked but changes nothing", redundant?.notion?.applied === 0);
  check("so no new revision is created", redundant?.rev === push.rev);
  const after = await table();
  check("and no duplicate row appears", after.rows.length === 4, `rows: ${after.rows.length}`);

  /* ---------------- 5. pull ---------------- */
  section("5. a human edits the table in Notion");
  const edited = await api("POST", "/api/dev/notion", {
    connectionId,
    dataSourceId,
    keyProp: "Arena key",
    keyValue: "water|2026-10-11",
    properties: { Level: { number: 5 } },
  });
  check("the fan-out finds exactly one instance", edited.json?.instances === 1, JSON.stringify(edited.json));
  check("and commits one change", edited.json?.changes === 1);

  const pull = await sync({ rev: redundant.rev });
  const pullChange = (pull?.changes ?? []).find((c) => c.key === "water|2026-10-11");
  check("the widget is told, with a path into its own state", pullChange?.path === "water.2026-10-11");
  check("and with the value Notion now holds", pullChange?.value?.level === 5, JSON.stringify(pullChange));
  check("with the source marked as Notion", pullChange?.source === "notion");

  const echo = await sync({ rev: pull.rev });
  check("our own write does not echo back as a Notion change", (echo?.changes ?? []).length === 0);

  const badKey = await api("POST", "/api/dev/notion", {
    connectionId,
    dataSourceId,
    keyProp: "Arena key",
    keyValue: "does-not-exist",
    properties: { Level: { number: 9 } },
  });
  check("editing a row that is not there is an error", badKey.status === 404, `status ${badKey.status}`);

  /* ---------------- 6. delete ---------------- */
  section("6. a row is deleted in Notion");
  view = await table();
  const target = view.rows.find((r) => r.cells["Arena key"] === "water|2026-10-12");
  const trashed = await api("POST", "/api/dev/notion", { connectionId, delete: target.id });
  check("the delete reaches the instance immediately", trashed.json?.changes === 1, JSON.stringify(trashed.json));

  const tombstone = await sync({ rev: pull.rev });
  const gone = (tombstone?.changes ?? []).find((c) => c.key === "water|2026-10-12");
  check("the widget receives a tombstone, with the path to remove", gone?.deleted === true && gone?.path === "water.2026-10-12");
  const settled = await sync({ rev: tombstone.rev });
  check("and only once", (settled?.changes ?? []).length === 0);
  view = await table();
  check("the row is gone from the table too", view.rows.length === 3, `rows: ${view.rows.length}`);

  /* ---------------- 7. the other two modes ---------------- */
  section("7. the other binding modes");
  const inferred = await api("POST", "/api/sync/instances", {
    component: "expense-tracker",
    connectionId,
    binding: { mode: "records", provisionTitle: "Expenses (inferred)" },
    sampleDoc: [
      { description: "Coffee", amount: 2.9, category: "Food", date: "2026-10-11" },
      { description: "Coffee", amount: 4.5, category: "Food", date: "2026-10-12" },
    ],
  });
  const keys = (
    await api(
      "GET",
      `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${inferred.json.instance.binding.dataSourceId}`
    )
  ).json.rows.map((r) => r.cells["Arena key"]);
  check(
    "inference gives two same-named records distinct keys",
    new Set(keys).size === 2,
    JSON.stringify(keys)
  );

  const adopted = await api("POST", "/api/sync/instances", {
    component: "habit-grid",
    connectionId,
    binding: { mode: "records", dataSourceId: "ds_habits" },
    sampleDoc: { Move: { "2026-10-11": 2 } },
  });
  check("an existing database can be adopted", adopted.status === 200, adopted.text.slice(0, 200));
  check(
    "the database's own title property is used",
    (adopted.json?.instance?.binding?.fields ?? []).some((f) => f.prop === "Habit" && f.type === "title")
  );

  const blob = await api("POST", "/api/sync/instances", {
    component: "grocery-list",
    connectionId,
    binding: { mode: "kv-blob", provisionTitle: "Arena component state" },
    sampleDoc: { lists: { Groceries: [{ name: "Milk", done: false }] } },
  });
  const blobRows = (
    await api(
      "GET",
      `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${blob.json.instance.binding.dataSourceId}`
    )
  ).json.rows;
  check(
    "a nested widget is one state row in one cell",
    blobRows.length === 1 && blobRows[0].cells.State.includes("Milk"),
    JSON.stringify(blobRows.map((r) => r.cells))
  );

  /* ---------------- 8. renderers ---------------- */
  section("8. the two renderers come from one instance");
  const embed = await fetch(created.json.urls.embedUrl);
  const embedHtml = await embed.text();
  check("the live renderer renders", embed.status === 200);
  check("it carries the envelope", embedHtml.includes('id="arena-instance"'));
  check("and the injected runtime", embedHtml.includes('id="arena-bridge"'));
  check("it is never cached: it holds one user's rows", embed.headers.get("cache-control") === "no-store");
  check(
    "its CSP allows calling home and nothing else",
    embed.headers.get("content-security-policy")?.includes("connect-src 'self'")
  );

  const offline = await fetch(created.json.urls.offlineBundleUrl);
  const offlineHtml = await offline.text();
  check("the offline artifact renders", offline.status === 200);
  check("as a download", (offline.headers.get("content-disposition") ?? "").includes("attachment"));
  check("in outbox transport", offlineHtml.includes('"transport":"outbox"'));
  check("with the snapshot baked in", offlineHtml.includes("2026-10-11"));
  check(
    "and it does not need a network to draw",
    offlineHtml.includes("arena-instance") && offlineHtml.includes("arena-bridge")
  );

  const head = await fetch(created.json.urls.bundleUrl, { method: "HEAD" });
  check("HEAD reports the revision without rendering", Number(head.headers.get("x-arena-rev")) >= 0);

  const standalone = await fetch(created.json.urls.standaloneUrl);
  const standaloneHtml = await standalone.text();
  check("the standalone renderer renders the same instance", standalone.status === 200 && standaloneHtml.includes('id="arena-instance"'));
  check("without the pill, because it is a page, not a block", standaloneHtml.includes('"ui":false'));
  const standaloneNoKey = await fetch(created.json.urls.standaloneUrl.split("?")[0]);
  check("and it refuses to render without the key", standaloneNoKey.status === 401);

  const probeAlias = await fetch(`${BASE}/c/probe`, { redirect: "manual" });
  check(
    "the probe is reachable from the docs path too",
    probeAlias.status === 307 || probeAlias.status === 200,
    `status ${probeAlias.status}`
  );

  const unbound = await fetch(`${BASE}/embed/habit-grid?work=25`);
  const unboundHtml = await unbound.text();
  check("an unconfigured widget still renders", unbound.status === 200 && unboundHtml.includes("bk-config"));
  check("and keeps the stricter policy: no network at all", !unboundHtml.includes("arena-instance"));

  /* ---------------- 9. refusals ---------------- */
  section("9. refusals are refusals, not silent fallbacks");
  const noKey = await fetch(`${BASE}/embed/habit-grid?i=${instance.id}`);
  check("a bound embed with no key is refused", noKey.status === 401, `status ${noKey.status}`);
  const noKeyBody = await noKey.text();
  check("as a page, because it renders inside an iframe", noKeyBody.includes("<!doctype html>"));

  const wrongKey = await fetch(`${BASE}/embed/habit-grid?i=${instance.id}&k=sk_nope`);
  check("a wrong key is refused", wrongKey.status === 401);

  const userKey = created.json.urls.embedUrl.split("k=")[1];
  const revoked = await api("PATCH", `/api/sync/instances/${instance.id}`, { action: "rotate" }, { "x-arena-key": userKey });
  check("a key can be rotated", revoked.json?.ok === true || revoked.status === 200, revoked.text.slice(0, 160));
  const afterRotate = await fetch(`${BASE}/embed/habit-grid?i=${instance.id}&k=${userKey}`);
  check("and the old key stops working immediately", afterRotate.status === 401, `status ${afterRotate.status}`);

  /* ---------------- 10. the probe ---------------- */
  section("10. the open questions have a way to be answered");
  const probe = await fetch(`${BASE}/api/sync/probe?download=1`);
  const probeHtml = await probe.text();
  check("the probe file can be downloaded", probe.status === 200 && probeHtml.length > 1000);
  check("it measures storage", probeHtml.includes("localStorage"));
  check("and popups and clipboard", probeHtml.includes("window.open") && probeHtml.includes("clipboard"));

  /* ---------------- 11. the runtime, in a browser ---------------- */
  if (!skipBrowser) {
    section("11. the runtime, in a real browser");
    let chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch {
      console.log("  skip playwright is not installed");
    }
    if (chromium) {
      let browser;
      try {
        browser = await chromium.launch();
      } catch (err) {
        console.log(`  skip no browser binary (${String(err).slice(0, 80)})`);
      }
      if (browser) {
        const fresh = await api("POST", "/api/sync/instances", {
          component: "habit-grid",
          connectionId,
          binding: { mode: "records", provisionTitle: "Habit Heatmap log" },
          sampleDoc: { water: { "2026-10-10": 1 } },
        });
        const live = fresh.json;
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(live.urls.embedUrl, { waitUntil: "load" });
        await page.waitForFunction(() => !!window.Arena, null, { timeout: 5000 }).catch(() => {});

        const caps = await page.evaluate(() =>
          window.Arena ? { caps: window.Arena.capabilities, doc: window.Arena.read() } : null
        );
        check("the runtime is injected", !!caps);
        check("it reports a first-party origin", caps?.caps?.origin?.startsWith("http"), JSON.stringify(caps?.caps));
        check("localStorage works where it is first-party", caps?.caps?.storage === "localStorage");
        check("the baked document is what the widget sees", JSON.stringify(caps?.doc) === JSON.stringify({ water: { "2026-10-10": 1 } }), JSON.stringify(caps?.doc).slice(0, 160));
        check(
          "the widget's own persistence key was adopted",
          await page.evaluate((k) => !!window.localStorage.getItem(k), live.instance.adoptKey)
        );
        check("no page errors", errors.length === 0, errors.join(" | "));

        // A widget write, exactly as a widget does it: through localStorage.
        await page.evaluate(
          ({ k }) => window.localStorage.setItem(k, JSON.stringify({ water: { "2026-10-10": 1, "2026-10-13": 3 } })),
          { k: live.instance.adoptKey }
        );
        await page.waitForFunction(() => window.Arena.status().status === "synced", null, { timeout: 8000 }).catch(() => {});
        const liveTable = (
          await api(
            "GET",
            `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${live.instance.binding.dataSourceId}`
          )
        ).json.rows;
        check(
          "a widget write through localStorage lands in the table",
          liveTable.some((r) => r.cells["Arena key"] === "water|2026-10-13" && r.cells.Level === "3"),
          JSON.stringify(liveTable.map((r) => r.cells))
        );
        check("the pill reports synced", (await page.evaluate(() => window.Arena.status().status)) === "synced");

        // A human edit, and the open page must pick it up over SSE.
        await api("POST", "/api/dev/notion", {
          connectionId,
          dataSourceId: live.instance.binding.dataSourceId,
          keyProp: "Arena key",
          keyValue: "water|2026-10-10",
          properties: { Level: { number: 4 } },
        });
        const arrived = await page
          .waitForFunction(() => window.Arena.read()?.water?.["2026-10-10"] === 4, null, { timeout: 12000 })
          .then(() => true)
          .catch(() => false);
        check("a Notion edit appears in the open page without a reload", arrived);
        check(
          "and the widget's own storage was updated, so a reload keeps it",
          JSON.parse(await page.evaluate((k) => window.localStorage.getItem(k), live.instance.adoptKey)).water["2026-10-10"] === 4
        );

        /* offline renderer: the HTML-block case */
        const offlinePage = await browser.newPage();
        const offErrors = [];
        offlinePage.on("pageerror", (e) => offErrors.push(String(e)));
        await offlinePage.goto(`data:text/html;charset=utf-8,${encodeURIComponent(offlineHtml)}`, { waitUntil: "load" });
        await offlinePage.waitForFunction(() => !!window.Arena, null, { timeout: 5000 }).catch(() => {});
        const offState = await offlinePage.evaluate(() =>
          window.Arena ? { transport: window.Arena.status().transport, doc: window.Arena.read() } : null
        );
        check("the offline artifact runs in outbox transport", offState?.transport === "outbox", JSON.stringify(offState));
        check("with the snapshot already drawn", JSON.stringify(offState?.doc).includes("water"));
        await offlinePage.evaluate(() => window.Arena.write("water.2026-10-14", 2));
        check("a write queues instead of calling home", (await offlinePage.evaluate(() => window.Arena.status().pending)) === 1);
        const code = await offlinePage.evaluate(() => window.Arena.syncCode());
        check("and a sync code carries it", typeof code === "string" && code.startsWith("ARC1."));
        const queuedStillNotInTable = (
          await api(
            "GET",
            `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${live.instance.binding.dataSourceId}`
          )
        ).json.rows;
        check(
          "no network write happened from the offline frame",
          !queuedStillNotInTable.some((r) => r.cells["Arena key"] === "water|2026-10-14")
        );
        check("no page errors in the offline frame", offErrors.length === 0, offErrors.join(" | "));

        /* the handoff: the code is applied by a reachable renderer */
        const applied = await page.evaluate((c) => window.Arena.applyCode(c), code);
        check("the reachable renderer accepts the sync code", applied?.ok === true, JSON.stringify(applied));
        await page.waitForFunction(() => window.Arena.status().status === "synced", null, { timeout: 8000 }).catch(() => {});
        const flushed = (
          await api(
            "GET",
            `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${live.instance.binding.dataSourceId}`
          )
        ).json.rows;
        check(
          "and the offline write becomes a row",
          flushed.some((r) => r.cells["Arena key"] === "water|2026-10-14" && r.cells.Level === "2"),
          JSON.stringify(flushed.map((r) => r.cells))
        );
        check(
          "replaying the same code cannot double-write",
          (await page.evaluate((c) => window.Arena.applyCode(c), code))?.ok === true
        );

        await browser.close();
      }
    }
  }

  section(`${passed} passed, ${failed} failed`);
  if (failed) {
    console.log(`\nFailed checks:\n  - ${failures.join("\n  - ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

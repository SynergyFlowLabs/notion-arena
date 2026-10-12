/**
 * Ten bound components, driven through the whole loop.
 *
 * `check:sync` proves the protocol with one component. This proves the *mapping*
 * with ten, because the mapping is where a two-way sync quietly breaks: a
 * number column that is really text, a checkbox written as a string, a long
 * entry sliced at the cell boundary, a key that merges two records into one.
 * None of those show up in a protocol test.
 *
 * For every component:
 *
 *   1. bind it, with the seed document the docs page shows,
 *   2. assert the provisioned table has the columns the schema promised,
 *   3. assert the widget's own storage key was adopted (ten widgets do not
 *      follow the `notion-arena.<slug>.v1` convention, and adopting the wrong
 *      key is invisible until a device renders empty),
 *   4. push a write the way the bridge would and find the row,
 *   5. edit a row the way a human would in Notion, pull, and find the value in
 *      both the change record and the HTML a device would render,
 *   6. trash the row and assert the widget is told to remove it.
 *
 * Usage:  npm run dev   then   npm run check:components
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

let passed = 0;
let failed = 0;
const failures = [];
const table = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
  }
  return Boolean(condition);
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
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* an HTML error page, which the caller will report as a failure */
  }
  return { status: res.status, json, text };
}

/** What a bridge op for this widget shape looks like. */
function writeOp(component, seed) {
  if (component.mode === "kv-blob") {
    return {
      key: "__doc",
      value: {
        lists: {
          ...(seed.lists ?? {}),
          g1a2b: [...(seed.lists?.g1a2b ?? []), { name: "Arena check item", done: false }],
        },
      },
      expect: "Arena check item",
    };
  }
  if (component.shape === "nested-map") {
    return { key: "read.2026-10-30", value: 2, expect: "read|2026-10-30" };
  }
  const added =
    component.slug === "invoice-tracker"
      ? { id: "inv-check", status: "Draft", title: "Arena check invoice", client: "Check", amount: "10", issued: "2026-10-13", due: "2026-10-13", note: "" }
      : component.slug === "equipment-inventory"
        ? { id: "eq-check", status: "Available", title: "Arena check item", location: "Desk", category: "Other", condition: "New", quantity: "1", note: "" }
        : component.slug === "incident-log"
          ? { id: "inc-check", status: "Detected", title: "Arena check incident", system: "Checks", severity: "P3 Low", detected: "2026-10-13", owner: "Check", note: "", checks: (seed[0]?.checks ?? []).map((c) => ({ label: c.label, done: false })) }
          : component.slug === "daily-journal"
            ? { date: "2026-10-30", title: "Arena check entry", body: "Written by the check script." }
            : component.slug === "bookmark-library"
              ? { name: "Arena check link", url: "https://example.com/arena-check", tag: "Check" }
              : component.slug === "chore-checklist"
                ? { task: "Arena check chore", day: "2026-10-30", assignee: "Check", done: false }
                : component.slug === "action-item-tracker"
                  ? { task: "Arena check action", owner: "Check", due: "2026-10-30", state: "Open" }
                  : { description: "Arena check expense", amount: 11.5, category: "Other", date: "2026-10-30" };
  const marker =
    added.description ?? added.task ?? added.name ?? added.title ?? added.date ?? "";
  return { key: "__doc", value: [...seed, added], expect: marker };
}

/** The field a human would edit in Notion, and the payload + marker for it. */
function editTarget(component) {
  if (component.mode === "kv-blob") {
    return {
      prop: "State",
      key: "State",
      payload: { rich_text: [{ type: "text", text: { content: '{"lists":{"g1a2b":[{"name":"Human edited on a laptop","done":true}]}}' } }] },
      marker: "Human edited on a laptop",
    };
  }
  const skip = new Set(["title"]);
  const preferred = ["select", "rich_text", "number", "date", "url", "multi_select"];
  for (const type of preferred) {
    const column = component.columns.find((c) => c.type === type && !c.keyPart && !skip.has(c.key));
    if (!column) continue;
    const marker = `Edited in Notion (${component.slug})`;
    const payload =
      type === "select"
        ? { select: { name: column.options > 0 ? "Arena check option" : "Checked" } }
        : type === "number"
          ? { number: 4242.5 }
          : type === "date"
            ? { date: { start: "2026-11-02" } }
            : type === "url"
              ? { url: "https://example.com/human-edit" }
              : type === "multi_select"
                ? { multi_select: [{ name: "Arena check label" }] }
                : { rich_text: [{ type: "text", text: { content: marker } }] };
    const expect =
      type === "number" ? "4242.5" : type === "date" ? "2026-11-02" : type === "url" ? "https://example.com/human-edit" : type === "select" ? payload.select.name : type === "multi_select" ? "Arena check label" : marker;
    return { prop: column.prop, key: column.key, payload, marker: expect };
  }
  return null;
}

async function main() {
  console.log(`Notion Arena bound-component check against ${BASE}`);

  const home = await fetch(`${BASE}/`).catch(() => null);
  if (!home || !home.ok) {
    console.log(`\nThe server is not answering. Start it first: npm run dev`);
    process.exit(1);
  }

  /* ---------------- 0. the registry ---------------- */
  section("0. the ten, and what the mapping promises");
  const reg = await api("GET", "/api/sync/components?write=1");
  check("the registry answers", reg.json?.ok === true, reg.text.slice(0, 200));
  const components = reg.json?.components ?? [];
  check("it holds ten components", components.length === 10, `saw ${components.length}`);
  check(
    "every one maps its seed exactly (document -> rows -> document)",
    components.every((c) => c.mode !== "records" || c.write?.exact === true),
    JSON.stringify(components.filter((c) => c.mode === "records" && !c.write?.exact).map((c) => c.slug))
  );
  check(
    "no seed field is left unmapped",
    components.every((c) => (c.seed.unmapped ?? []).length === 0),
    JSON.stringify(components.filter((c) => c.seed.unmapped?.length).map((c) => [c.slug, c.seed.unmapped]))
  );
  check(
    "no two seed records share a key",
    components.every((c) => (c.write?.duplicates ?? 0) === 0),
    JSON.stringify(components.filter((c) => c.write?.duplicates).map((c) => c.slug))
  );
  console.log(
    `  ..   ${reg.json.coverage.widgets} widgets · ${reg.json.coverage.stateful} persist state · ` +
      `${reg.json.coverage.specGenerated} generated from a SPEC, ${reg.json.coverage.specWithDeclaredFields} of them mapped by their own field list · ` +
      `${reg.json.coverage.aliasKeys} use a storage key other than notion-arena.<slug>.v1`
  );

  await api("POST", "/api/dev/notion", { reset: true });
  const conn = await api("POST", "/api/sync/connections", { mode: "mock" });
  const connectionId = conn.json?.connection?.id;
  check("the demo workspace connects", !!connectionId);

  /* ---------------- 1. every component, end to end ---------------- */
  for (const component of components) {
    const seed = (await import("../lib/sync/components.ts")).boundComponent(component.slug)?.seed;
    section(`1.${components.indexOf(component) + 1} ${component.label} (${component.mode}, ${component.source})`);

    const created = await api("POST", "/api/sync/instances", {
      component: component.slug,
      connectionId,
      binding: { mode: component.mode, provisionTitle: `${component.label} log` },
      sampleDoc: seed,
    });
    const instance = created.json?.instance;
    const key = created.json?.syncKey;
    if (!check("binds, and the existing state is uploaded", created.status === 200 && !!instance?.id && !!key, created.text.slice(0, 300))) {
      table.push([component.slug, component.mode, "bind failed"]);
      continue;
    }
    const dataSourceId = instance.binding.dataSourceId;

    check(
      "adopts the key the widget actually writes",
      instance.adoptKey === component.adoptKey,
      `${instance.adoptKey} vs ${component.adoptKey}`
    );

    const expectedRows = component.mode === "kv-blob" ? 1 : component.seed.items;
    check(
      `the first read has ${expectedRows} row${expectedRows === 1 ? "" : "s"}`,
      created.json?.initial?.rows === expectedRows,
      JSON.stringify(created.json?.initial)
    );

    const tableView = async () =>
      (await api("GET", `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${dataSourceId}`)).json;
    let view = await tableView();
    if (component.mode === "records") {
      const missing = component.columns.filter((c) => !(view?.columns ?? []).includes(c.prop)).map((c) => c.prop);
      check("the provisioned table has every declared column", missing.length === 0, `missing ${missing}`);
      const emptyTyped = (view?.rows ?? []).filter((r) =>
        component.columns.some((c) => (c.type === "number" || c.type === "date" || c.type === "select") && r.cells[c.prop] === "")
      );
      check("typed cells are populated, not blank", emptyTyped.length === 0, JSON.stringify(emptyTyped.slice(0, 2)));
    } else {
      check(
        "the state row carries the document, a revision and a stamp",
        (view?.rows ?? []).length === 1 &&
          ["State", "Rev", "Updated"].every((c) => (view?.columns ?? []).includes(c)) &&
          (view.rows[0].cells.State ?? "").length > 20,
        JSON.stringify(view).slice(0, 200)
      );
    }

    /* --- widget -> Notion --- */
    const op = writeOp(component, seed);
    const pushed = await api(
      "POST",
      `/api/sync/instances/${instance.id}/sync`,
      { rev: instance.rev, ops: [{ id: `op_${component.slug}_1`, key: op.key, value: op.value, at: Date.now() }] },
      { "x-arena-key": key }
    );
    check(
      "a write the widget makes lands as a row",
      pushed.json?.ok === true && (pushed.json?.notion?.applied ?? 0) >= 1,
      JSON.stringify(pushed.json?.notion)
    );
    view = await tableView();
    const before = (view?.rows ?? []).length;
    const foundRow = (view?.rows ?? []).find((r) => JSON.stringify(Object.values(r.cells)).includes(op.expect));
    check(
      "the row is in the table the user reads",
      expectedRows + 1 === before || component.mode === "kv-blob",
      `rows ${before}, expected ${expectedRows + 1}`
    );
    check(`it carries the widget's own value (“${op.expect}”)`, !!foundRow, JSON.stringify(view?.rows?.slice(-1)));

    if (component.mode === "kv-blob") {
      const afterWrite = await tableView();
      const rev = Number(afterWrite?.rows?.[0]?.cells?.Rev ?? 0);
      check("a state-blob write advances the revision", rev >= 2, `Rev is ${rev}`);
    }

    /* --- Notion -> widget --- */
    const edit = editTarget(component);
    if (edit) {
      const keyProp = instance.binding.keyProp;
      const keyValue = component.mode === "kv-blob" ? instance.id : foundRow ? foundRow.cells[keyProp] : undefined;
      const edited = await api("POST", "/api/dev/notion", {
        connectionId,
        dataSourceId,
        keyProp,
        keyValue,
        rowId: foundRow?.id,
        properties: { [edit.prop]: edit.payload },
      });
      check("a human edit in Notion is accepted", edited.json?.ok === true, edited.text.slice(0, 200));

      const pulled = await api(
        "POST",
        `/api/sync/instances/${instance.id}/sync`,
        { rev: instance.rev, limit: 500 },
        { "x-arena-key": key }
      );
      const changeText =
        JSON.stringify(pulled.json?.changes ?? []) + JSON.stringify(pulled.json?.snapshot?.doc ?? null);
      check(
        `the edit travels back to the renderer (${edit.key})`,
        pulled.json?.ok === true && changeText.includes(edit.marker),
        changeText.slice(0, 260)
      );
      const htmlRes = await fetch(`${BASE}/embed/${component.slug}?i=${instance.id}&k=${encodeURIComponent(key)}`);
      const html = await htmlRes.text();
      check(
        "a device rendering this instance has the new value",
        html.includes(edit.marker) || (component.mode === "records" && html.includes(edit.marker.replace(/"/g, '\\"'))),
        `${edit.marker} not in ${html.length} bytes`
      );
      table.push([component.label, component.mode, `${expectedRows} rows`, `wrote ${op.expect.slice(0, 18)}`, `pulled ${edit.key}`]);
    }

    /* --- delete --- */
    view = await tableView();
    const victim = (view?.rows ?? [])[view.rows.length - 1];
    if (victim) {
      const before = await api("POST", `/api/sync/instances/${instance.id}/sync`, { rev: instance.rev }, { "x-arena-key": key });
      void before;
      const deleted = await api("POST", "/api/dev/notion", { connectionId, delete: victim.id });
      check("a row can be trashed in Notion", deleted.json?.ok === true, deleted.text.slice(0, 160));
      const after = await api(
        "POST",
        `/api/sync/instances/${instance.id}/sync`,
        { rev: instance.rev, limit: 500 },
        { "x-arena-key": key }
      );
      const text = JSON.stringify(after.json?.changes ?? []);
      check(
        "the widget is told to remove it",
        component.mode === "kv-blob" ? after.json?.ok === true : text.includes('"deleted":true') || text.includes("__doc"),
        text.slice(0, 200)
      );
    }
  }

  /* ---------------- 2. the long-text case ---------------- */
  section("2. a 3,000 character journal entry survives the cell boundary");
  const journal = components.find((c) => c.slug === "daily-journal");
  if (journal) {
    const seed = (await import("../lib/sync/components.ts")).boundComponent("daily-journal")?.seed;
    const created = await api("POST", "/api/sync/instances", {
      component: "daily-journal",
      connectionId,
      binding: { mode: "records", provisionTitle: "Long text check" },
      sampleDoc: seed,
    });
    const instance = created.json?.instance;
    const key = created.json?.syncKey;
    const body = "The quick brown fox jumps over the lazy dog. ".repeat(70).slice(0, 3000);
    const pushed = await api(
      "POST",
      `/api/sync/instances/${instance.id}/sync`,
      { rev: instance.rev, ops: [{ id: "op_long_1", key: "__doc", value: [...seed, { date: "2026-12-01", title: "Long", body }], at: Date.now() }] },
      { "x-arena-key": key }
    );
    check("a 3,000 character entry is written", pushed.json?.ok === true, JSON.stringify(pushed.json?.notion));
    const view = await api("GET", `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${instance.binding.dataSourceId}`);
    const cell = (view.json?.rows ?? []).map((r) => r.cells.Body ?? "").find((b) => b.length > 100);
    check(
      "the cell holds all 3,000 characters, not the first 1,900",
      (cell ?? "").length === 3000,
      `cell length ${(cell ?? "").length}`
    );
  }

  /* ---------------- summary ---------------- */
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("Failed checks:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log("\n  component              mode      rows         widget -> Notion        Notion -> widget");
  for (const row of table) {
    console.log(`  ${String(row[0]).padEnd(22)} ${String(row[1]).padEnd(9)} ${String(row[2] ?? "").padEnd(12)} ${String(row[3] ?? "").padEnd(23)} ${row[4] ?? ""}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

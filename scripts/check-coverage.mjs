/**
 * How far the mapping actually reaches across the catalog.
 *
 * `check:components` proves ten components deeply — every direction, the
 * conflict path, the tombstone, the cell boundary. This proves the other
 * question, which is breadth: for **every** widget that can produce a first
 * document, bind it, put it in a table, read it back, and compare what came out
 * with what went in.
 *
 * A widget can produce a first document when it declares one:
 *
 *   - the ten have hand-written seeds (`lib/sync/components.ts`),
 *   - the SPEC-generated family has its own field list, so two rows are built
 *     from the widget's own declarations (`lib/sync/samples.ts`).
 *
 * Everything else is reported as **unsampled**, with the reason, rather than
 * quietly bound through a shape nobody checked. The number this script exists
 * to keep honest is the gap between those two groups.
 *
 * Usage:
 *   npm run dev            then   npm run check:coverage
 *   npm run check:coverage -- --limit=20         a fast pass
 *   npm run check:coverage -- --only=a,b,c       specific widgets
 *   npm run check:coverage -- --list             the table only, no binding
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const ONLY = flag("only") ? new Set(flag("only").split(",").map((s) => s.trim())) : null;
const LIST = args.includes("--list");

let passed = 0;
let failed = 0;
const failures = [];
const rows = [];

function check(name, condition, detail) {
  if (condition) passed++;
  else {
    failed++;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
  }
  return Boolean(condition);
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
    /* an HTML error page, which the caller reports as a failure */
  }
  return { status: res.status, json, text };
}

/**
 * Equality that ignores object key order but not array order.
 *
 * Key order is not data: the read-back document lists a row's fields in column
 * order, so a first version of this check reported five components as lossy
 * when the only difference was that `id` had moved to the end. Array order *is*
 * data — a list widget renders its items in the order it holds them — so the
 * comparison stays strict there.
 */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])])
    );
  }
  return value;
}
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** The first few real differences, for a failure message that says what moved. */
function differences(a, b, path = "doc") {
  const out = [];
  const walk = (x, y, at) => {
    if (out.length >= 3) return;
    if (x === y) return;
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) out.push(`${at}: ${x.length} items became ${y.length}`);
      for (let i = 0; i < Math.min(x.length, y.length) && out.length < 3; i++) walk(x[i], y[i], `${at}[${i}]`);
      return;
    }
    if (x && y && typeof x === "object" && typeof y === "object") {
      for (const k of [...new Set([...Object.keys(x), ...Object.keys(y)])]) {
        if (out.length >= 3) return;
        if (!(k in x)) out.push(`${at}.${k}: added (${JSON.stringify(y[k])})`);
        else if (!(k in y)) out.push(`${at}.${k}: lost (was ${JSON.stringify(x[k])})`);
        else walk(x[k], y[k], `${at}.${k}`);
      }
      return;
    }
    out.push(`${at}: ${JSON.stringify(x)} became ${JSON.stringify(y)}`);
  };
  walk(a, b, path);
  return out;
}
const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);

async function main() {
  const home = await fetch(`${BASE}/`).catch(() => null);
  if (!home || !home.ok) {
    console.log(`\nThe server is not answering. Start it first: npm run dev`);
    process.exit(1);
  }

  const listing = await api("GET", "/api/sync/components?all=1");
  if (listing.json?.ok !== true) {
    console.log(`\nThe registry did not answer: ${listing.text.slice(0, 200)}`);
    process.exit(1);
  }
  const all = listing.json.components;
  const coverage = listing.json.coverage;

  console.log(`\n0. the catalog, as it is right now`);
  console.log(
    `  ..   ${coverage.widgets} widgets · ${coverage.stateful} persist state · ${coverage.specGenerated} SPEC-generated · ` +
      `${JSON.stringify(coverage.bySource)} · ${JSON.stringify(coverage.byMode)}`
  );
  console.log(
    `  ..   first document available for ${coverage.sampleable} (${JSON.stringify(coverage.bySample)}), ` +
      `so ${coverage.widgets - coverage.sampleable} are unsampled`
  );

  let targets = all.filter((r) => r.sample);
  if (ONLY) targets = all.filter((r) => ONLY.has(r.slug));
  if (LIST) {
    for (const r of targets.slice(0, LIMIT)) {
      console.log(`  ..   ${pad(r.slug, 30)} ${pad(r.source, 9)} ${pad(r.mode, 8)} ${r.itemColumns} cols`);
    }
    process.exit(0);
  }
  targets = targets.slice(0, LIMIT);

  if (!ONLY) await api("POST", "/api/dev/notion", { reset: true });
  const conn = await api("POST", "/api/sync/connections", { mode: "mock" });
  const connectionId = conn.json?.connection?.id;
  check("the demo workspace connects", !!connectionId);
  if (!connectionId) process.exit(1);

  console.log(`\n1. every widget that can be bound, bound (${targets.length})`);

  for (const entry of targets) {
    const slug = entry.slug;
    const described = (await api("GET", `/api/sync/components?slug=${slug}&write=1&sample=1`)).json
      ?.components?.[0];
    if (!described) {
      check(`${slug}: described`, false, "no description");
      rows.push([slug, entry.source, "no description"]);
      continue;
    }
    const seedDoc = described.seed.doc;
    const expectedRows = described.mode === "kv-blob" ? 1 : described.seed.items;

    const created = await api("POST", "/api/sync/instances", {
      component: slug,
      connectionId,
      binding: { mode: described.mode, provisionTitle: `${described.label} (coverage)` },
      sampleDoc: seedDoc,
    });
    const instance = created.json?.instance;
    const key = created.json?.syncKey;
    if (!instance?.id || !key) {
      check(`${slug}: binds`, false, created.text.slice(0, 220));
      rows.push([slug, entry.source, "bind failed"]);
      continue;
    }

    const problems = [];
    if (!check(`${slug}: adopts the widget's own key`, instance.adoptKey === entry.adoptKey, `${instance.adoptKey} vs ${entry.adoptKey}`))
      problems.push("key");
    if (!check(`${slug}: ${expectedRows} row${expectedRows === 1 ? "" : "s"} from the first document`, created.json.initial?.rows === expectedRows, JSON.stringify(created.json.initial)))
      problems.push("rows");

    // The document the engine read back out of the table, against the one that
    // went in. This is the whole two-way claim in one comparison.
    if (described.mode === "records") {
      const expected = described.seed.doc;
      const back = created.json.initial?.doc;
      const lossless = same(back, expected);
      const why = lossless ? null : differences(expected, back).join("; ");
      if (!check(`${slug}: the document survives the table`, lossless, why ? `in  ${JSON.stringify(expected).slice(0, 150)}\n       out ${JSON.stringify(back).slice(0, 150)}\n       ${why}` : null))
        problems.push("round trip");
    }

    // A redundant push must not add a row: that is what "the widget re-sends
    // its whole document on every change" looks like from the table's side.
    if (described.mode === "records") {
      const again = await api(
        "POST",
        `/api/sync/instances/${instance.id}/sync`,
        { rev: instance.rev, ops: [{ id: `op_${slug}_replay`, key: "__doc", value: seedDoc, at: Date.now() }] },
        { "x-arena-key": key }
      );
      const after = await api("GET", `/api/sync/notion/table?connectionId=${connectionId}&dataSourceId=${instance.binding.dataSourceId}`);
      const count = (after.json?.rows ?? []).length;
      if (!check(`${slug}: re-sending the document adds no row`, again.json?.ok === true && count === expectedRows, `${count} rows, sync ${JSON.stringify(again.json).slice(0, 140)}`))
        problems.push("duplicates");
    }

    if (!described.write?.exact && described.mode === "records") problems.push("lossy schema");

    rows.push([slug, entry.source, problems.length ? problems.join(", ") : "ok"]);
  }

  const ok = rows.filter((r) => r[2] === "ok");
  console.log(`\n  ${ok.length}/${rows.length} bound and round-tripped`);
  const bySource = {};
  for (const r of rows) {
    bySource[r[1]] = bySource[r[1]] ?? { ok: 0, total: 0 };
    bySource[r[1]].total++;
    if (r[2] === "ok") bySource[r[1]].ok++;
  }
  for (const [source, n] of Object.entries(bySource).sort()) {
    console.log(`  ..   ${pad(source, 9)} ${n.ok}/${n.total}`);
  }

  console.log("\n  widget                         source     verdict");
  for (const r of rows) console.log(`  ${pad(r[0], 30)} ${pad(r[1], 10)} ${r[2]}`);

  const unsampled = all.filter((r) => !r.sample);
  if (unsampled.length && !ONLY) {
    console.log(`\n2. unsampled: ${unsampled.length} widgets with no first document`);
    console.log(`  ..   every one of these would bind through an inferred schema today, which is`);
    console.log(`  ..   exactly the case this report refuses to call covered.`);
    const byCategory = {};
    for (const r of unsampled) byCategory[r.category ?? "?"] = (byCategory[r.category ?? "?"] ?? 0) + 1;
    console.log(`  ..   by category: ${JSON.stringify(byCategory)}`);
    console.log(`  ..   the first ten: ${unsampled.slice(0, 10).map((r) => r.slug).join(", ")}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.log(`\nfailures:\n${failures.map((f) => `  ${f}`).join("\n")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

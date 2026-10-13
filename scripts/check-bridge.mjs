/**
 * The bridge runtime, executed.
 *
 * The browser half of `check:sync` needs a Chromium binary; this does not. It
 * takes the *real* injected scripts out of a *real* rendered bundle (the
 * envelope and the runtime are extracted from the served HTML, never rewritten
 * here) and runs them in a `node:vm` context with a small DOM: a Storage whose
 * prototype can be patched, a document with one script element, a fetch that
 * records what it was asked to send.
 *
 * That is enough to test the claims a widget makes:
 *
 *   - a widget's own `localStorage.setItem` becomes an operation, with the path
 *     and value in the widget's own vocabulary;
 *   - a Notion change arrives as a path and patches both the document and the
 *     widget's storage (which is what makes a reload keep it);
 *   - with no network the write is queued, and the sync code carries it to a
 *     renderer that does have one;
 *   - replaying that code cannot double-write.
 */

import { createContext, runInContext } from "node:vm";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

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

function extract(html, id) {
  const re = new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)</script>`);
  const m = html.match(re);
  if (!m) throw new Error(`no #${id} in the rendered bundle`);
  return m[1];
}

/**
 * A DOM just real enough for the bridge. Everything it touches is a proxy that
 * swallows element methods, so a new style property in the pill does not break
 * the test, while storage, timers and fetch stay strict on purpose.
 */
function makeRuntime(html, { transport, fetchImpl }) {
  const envelope = JSON.parse(extract(html, "arena-instance"));
  const bridge = extract(html, "arena-bridge");

  const values = new Map();
  class Storage {
    get length() {
      return values.size;
    }
    key(i) {
      return [...values.keys()][i] ?? null;
    }
    getItem(k) {
      return values.has(String(k)) ? values.get(String(k)) : null;
    }
    setItem(k, v) {
      values.set(String(k), String(v));
    }
    removeItem(k) {
      values.delete(String(k));
    }
    clear() {
      values.clear();
    }
  }

  const elements = new Map();
  const node = () => {
    const target = {
      style: {},
      dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      children: [],
      textContent: "",
      innerHTML: "",
      appendChild() {},
      removeChild() {},
      remove() {},
      setAttribute() {},
      getAttribute() {
        return null;
      },
      removeAttribute() {},
      addEventListener() {},
      focus() {},
    };
    return new Proxy(target, {
      get(t, k) {
        if (k in t) return t[k];
        return undefined;
      },
      set(t, k, v) {
        t[k] = v;
        return true;
      },
    });
  };

  const calls = [];
  const document = {
    body: node(),
    head: node(),
    documentElement: node(),
    hidden: false,
    visibilityState: "visible",
    getElementById: (id) => {
      if (id === "arena-instance") return { textContent: extract(html, "arena-instance") };
      return elements.get(id) ?? null;
    },
    createElement: () => node(),
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {},
  };

  const timers = new Set();
  const win = {
    document,
    Storage,
    localStorage: new Storage(),
    sessionStorage: new Storage(),
    location: { origin: "http://localhost:3000", href: "http://localhost:3000/embed/habit-grid" },
    navigator: { userAgent: "node-vm", clipboard: undefined },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    setTimeout: (fn, ms) => {
      const t = setTimeout(fn, ms);
      timers.add(t);
      return t;
    },
    clearTimeout: (t) => {
      timers.delete(t);
      clearTimeout(t);
    },
    setInterval: (fn, ms) => {
      const t = setInterval(fn, ms);
      timers.add(t);
      return t;
    },
    clearInterval: (t) => {
      timers.delete(t);
      clearInterval(t);
    },
    fetch: (url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : null;
      calls.push({ url, body, headers: opts?.headers });
      return Promise.resolve(fetchImpl(calls.length, body));
    },
    Promise,
    JSON,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Error,
    encodeURIComponent,
    decodeURIComponent,
    btoa: (v) => Buffer.from(String(v), "binary").toString("base64"),
    atob: (v) => Buffer.from(String(v), "base64").toString("binary"),
    escape: (v) => encodeURIComponent(String(v)).replace(/[^%\w.]/g, (c) => c),
    unescape: (v) => decodeURIComponent(String(v)),
  };
  win.window = win;
  win.globalThis = win;

  const ctx = createContext(win);
  const result = runInContext(bridge, ctx, { filename: "arena-bridge.js" });

  return {
    envelope,
    arena: () => win.Arena,
    storage: win.localStorage,
    calls,
    stop: () => {
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
      timers.clear();
    },
  };
}

const ok = (payload) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => payload,
  });

async function api(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function main() {
  console.log(`Arena bridge runtime check against ${BASE}`);

  await api("POST", "/api/dev/notion", { reset: true });
  const conn = await api("POST", "/api/sync/connections", { mode: "mock" });
  const connectionId = conn.json.connection.id;
  const made = await api("POST", "/api/sync/instances", {
    component: "habit-grid",
    connectionId,
    binding: { mode: "records", provisionTitle: "Bridge check" },
    sampleDoc: { water: { "2026-10-10": 1 } },
  });
  const instance = made.json.instance;
  const syncKey = made.json.syncKey;

  const liveHtml = await (await fetch(made.json.urls.embedUrl)).text();
  const offlineHtml = await (await fetch(made.json.urls.offlineBundleUrl)).text();

  /* ---------------- the live renderer ---------------- */
  console.log("\n1. the live renderer");
  const livePosts = [];
  const live = makeRuntime(liveHtml, {
    transport: "live",
    fetchImpl: () => {
      livePosts.push(livePosts.length);
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, rev: 1, ack: [], rejected: [], changes: [], conflicts: [] }),
      };
    },
  });
  const arena = live.arena();
  check("window.Arena exists", !!arena);
  check("it reports the instance, not the browser, as identity", arena.id === instance.id);
  check("transport is live", arena.status().transport === "live", JSON.stringify(arena.status()));
  check("the baked document is in place", JSON.stringify(arena.read()) === JSON.stringify({ water: { "2026-10-10": 1 } }));
  check(
    "the widget's own key was adopted",
    live.storage.getItem(instance.adoptKey) === JSON.stringify({ water: { "2026-10-10": 1 } }),
    live.storage.getItem(instance.adoptKey)
  );

  // A widget writes exactly the way all 166 of them do: localStorage.setItem.
  live.storage.setItem(instance.adoptKey, JSON.stringify({ water: { "2026-10-10": 1, "2026-10-15": 4 } }));
  const status = arena.status();
  check("the write is seen as an operation", status.pending === 1, JSON.stringify(status));
  check("the document the widget reads back is updated", arena.read().water["2026-10-15"] === 4);

  // Now let the debounce elapse so the bridge flushes to the API.
  await new Promise((r) => setTimeout(r, 900));
  // The runtime syncs once on boot (to pull), so the interesting post is the
  // last one, not the first.
  const posted = live.calls.filter((c) => c.url.includes("/sync")).pop();
  check("the runtime posts to the instance endpoint", !!posted, JSON.stringify(live.calls.map((c) => c.url)));
  check("with the instance key, not a cookie", posted?.headers?.["x-arena-key"] === syncKey);
  const op = posted?.body?.ops?.[0];
  check(
    "the operation is a path in the widget's own state",
    posted?.body?.ops?.some((o) => o.key === "water.2026-10-15" && o.value === 4),
    JSON.stringify(posted?.body?.ops)
  );
  check(
    "and a client-minted id, for idempotent replay",
    (posted?.body?.ops ?? []).every((o) => typeof o.id === "string" && o.id.length > 6),
    JSON.stringify(posted?.body?.ops)
  );
  live.stop();

  /* ---------------- the Notion edit arriving ---------------- */
  console.log("\n2. a change arriving from Notion");
  const live2 = makeRuntime(liveHtml, {
    transport: "live",
    fetchImpl: () =>
      ok({
        ok: true,
        rev: 9,
        ack: [],
        rejected: [],
        conflicts: [],
        // What the engine really sends for a records binding: the delta for the
        // log, and the document, because an item is not a location.
        changes: [
          {
            key: "water|2026-10-10",
            path: "water.2026-10-10",
            value: { habit: "water", date: "2026-10-10", level: 4 },
            rev: 9,
            at: new Date().toISOString(),
            source: "notion",
          },
        ],
        snapshot: { hash: "stub", doc: { water: { "2026-10-10": 4 } }, count: 1 },
      }),
  });
  const arena2 = live2.arena();
  // The bridge hydrates on boot; drive one round by asking it to sync.
  await arena2.sync?.();
  await new Promise((r) => setTimeout(r, 120));
  const polled = live2.calls.length > 0;
  if (!polled) {
    // No `sync()` export: emit a local op, which also triggers a flush.
    live2.storage.setItem(instance.adoptKey, JSON.stringify({ water: { "2026-10-10": 1 } }));
    await new Promise((r) => setTimeout(r, 900));
  }
  await new Promise((r) => setTimeout(r, 400));
  check("the Notion value replaced the widget's own", arena2.read().water["2026-10-10"] === 4, JSON.stringify(arena2.read()));
  check(
    "and was written into the widget's storage, so a reload keeps it",
    JSON.parse(live2.storage.getItem(instance.adoptKey)).water["2026-10-10"] === 4,
    live2.storage.getItem(instance.adoptKey)
  );
  live2.stop();

  /* ---------------- the HTML block: no network ---------------- */
  console.log("\n3. the HTML-block case: no network");
  const offline = makeRuntime(offlineHtml, {
    transport: "outbox",
    fetchImpl: () => {
      throw new Error("an offline renderer must not call this");
    },
  });
  const arena3 = offline.arena();
  check("the artifact reports the outbox transport", arena3.status().transport === "outbox");
  check("it still draws from the baked snapshot", arena3.read().water["2026-10-10"] === 1);
  check("and it never calls fetch", offline.calls.length === 0);

  offline.storage.setItem(instance.adoptKey, JSON.stringify({ water: { "2026-10-10": 1, "2026-10-16": 2 } }));
  check("the edit is queued, not lost", arena3.status().pending === 1, JSON.stringify(arena3.status()));
  const code = arena3.syncCode();
  check("a sync code is produced", typeof code === "string" && code.startsWith("ARC1."));
  const decoded = JSON.parse(Buffer.from(code.slice(5), "base64url").toString("utf8"));
  check("it names the instance", decoded.i === instance.id);
  check("and carries the queued path", decoded.ops?.[0]?.key === "water.2026-10-16");
  check("no fetch happened", offline.calls.length === 0);
  offline.stop();

  /* ---------------- the handoff ---------------- */
  console.log("\n4. the handoff, and the second device");
  const third = makeRuntime(liveHtml, {
    transport: "live",
    // A server acks what it was sent, never ids it has not seen: the first
    // version of this stub acked the code's ids during the boot sync, which
    // removed them from the outbox before they were ever posted.
    fetchImpl: (_call, body) =>
      ok({
        ok: true,
        rev: 10,
        ack: (body?.ops ?? []).map((o) => o.id),
        rejected: [],
        changes: [],
        conflicts: [],
      }),
  });
  const arena4 = third.arena();
  const applied = arena4.applyCode(code);
  check("a reachable renderer accepts the code", applied?.ok === true, JSON.stringify(applied));
  check("and merges the value into its own state", arena4.read().water["2026-10-16"] === 2);
  await new Promise((r) => setTimeout(r, 900));
  const syncCalls = () => third.calls.filter((c) => c.url.includes("/sync"));
  const carried = syncCalls().find((c) =>
    (c.body?.ops ?? []).some((o) => o.id === decoded.ops[0].id)
  );
  check("then pushes it to the workspace", !!carried, JSON.stringify(third.calls.map((c) => c.url)));
  check("with the original operation id, so a replay cannot double-write", !!carried);

  // Idempotency is a property of the id, not of the client: the same code
  // replayed carries the same operation ids, and the server (checked in
  // check-sync) is what refuses to apply them twice.
  const beforeReplay = syncCalls().length;
  arena4.applyCode(code);
  await new Promise((r) => setTimeout(r, 900));
  const resent = syncCalls()
    .slice(beforeReplay)
    .flatMap((c) => c.body?.ops ?? []);
  check(
    "replaying the code sends the same ids, so the server can dedupe",
    resent.some((o) => o.id === decoded.ops[0].id) && resent.every((o) => typeof o.id === "string"),
    JSON.stringify(resent)
  );
  third.stop();

  /* ---------------- storage that throws ---------------- */
  console.log("\n5. a sandbox whose storage throws");
  const hostile = makeRuntime(offlineHtml, { transport: "outbox", fetchImpl: () => ok({}) });
  // Safari in a cross-origin frame throws on access, and partitioned storage can
  // throw on write. The widget's try/catch swallows it, so the bridge must too.
  Object.defineProperty(hostile.storage, "setItem", {
    value: () => {
      throw new DOMExceptionLike("The operation is insecure.");
    },
  });
  const arena5 = hostile.arena();
  // A widget's own write, which in Safari throws and is swallowed by the
  // try/catch every widget is required to have.
  try {
    hostile.storage.setItem("notion-arena.habit-grid.v1", JSON.stringify({ water: { "2026-10-17": 3 } }));
  } catch {
    /* the widget's try/catch, faithfully reproduced */
  }
  const fromMemory = arena5.write("water.2026-10-17", 3);
  check("a write still works when storage does not", arena5.read().water["2026-10-17"] === 3, JSON.stringify(fromMemory));
  check("and is queued for later", arena5.status().pending >= 1);
  hostile.stop();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.log(`\nFailed checks:\n  - ${failures.join("\n  - ")}`);
    process.exit(1);
  }
}

class DOMExceptionLike extends Error {}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

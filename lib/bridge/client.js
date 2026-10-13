/*!
 * Notion Arena data plane, injected at render time.
 *
 * This file is NOT part of any widget in public/widgets/. Widget sources stay
 * sandbox-pure (no fetch, no XHR, one inline script) so that `npm run
 * check:widgets` keeps meaning what it means. The data plane arrives as a
 * second inline script that the server injects into /embed/<slug> and into the
 * generated .html bundle that becomes a Notion HTML block.
 *
 * What it does, in order:
 *   1. Measures the environment (framed? storage? network? clipboard?).
 *   2. Adopts the widget's own persistence key (notion-arena.<slug>.v1) by
 *      patching Storage.prototype, so all 166 stateful widgets become syncable
 *      without a single change to their source.
 *   3. Paints from a baked snapshot immediately, so the first frame is correct
 *      even in a sandbox with no network and no storage.
 *   4. Reconciles: path-level diffs out, whole-document merges in.
 *   5. When there is no network, keeps an outbox and renders a sync code that
 *      another renderer of the same instance can flush.
 *
 * Contract reference: docs/SYNC_PLAN.md §6.
 */
(function () {
  "use strict";

  var envelope = readEnvelope();
  if (!envelope || !envelope.id) return;

  var KEYS = ["__doc"];
  var OUTBOX_KEY = "arena.outbox." + envelope.id;
  var DEVICE_KEY = "arena.device";
  var SYNC_KEY_RE = /^notion-arena\.[a-z0-9.-]+$/i;

  var subscribers = [];
  var state = {
    status: "boot",
    transport: envelope.transport || "live",
    rev: envelope.rev || 0,
    pending: 0,
    lastSync: 0,
    error: null,
    dirty: false,
    conflicts: 0,
  };
  var doc = envelope.baked && typeof envelope.baked === "object" ? deepClone(envelope.baked) : null;
  var outbox = [];
  var realStorage = null;
  var capabilities = probe();

  /* ---------------------------------------------------------------- */
  /* Envelope + environment                                            */
  /* ---------------------------------------------------------------- */

  function readEnvelope() {
    var el = document.getElementById("arena-instance");
    if (!el) return null;
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (e) {
      return null;
    }
  }

  function deviceId() {
    try {
      var v = realStorageGet(DEVICE_KEY);
      if (v) return v;
      var made = "dev_" + Math.random().toString(36).slice(2, 10);
      realStorageSet(DEVICE_KEY, made);
      return made;
    } catch (e) {
      return "dev_anon";
    }
  }

  var device = deviceId();

  function probe() {
    var framed = false;
    try {
      framed = window.parent && window.parent !== window;
    } catch (e) {
      framed = true;
    }
    var origin = "unknown";
    try {
      origin = String(window.location.origin || "null");
    } catch (e) {
      origin = "null";
    }

    var storage = "memory";
    var storageError = null;
    try {
      var probeKey = "arena.probe." + envelope.id;
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      storage = "localStorage";
    } catch (err) {
      try {
        window.sessionStorage.setItem("arena.probe", "1");
        window.sessionStorage.removeItem("arena.probe");
        storage = "sessionStorage";
      } catch (err2) {
        storageError = String((err && err.message) || err);
      }
    }

    var network = false;
    try {
      network = typeof fetch === "function" && envelope.transport !== "outbox";
    } catch (e) {
      network = false;
    }

    return {
      framed: framed,
      origin: origin,
      storage: storage,
      storageError: storageError,
      network: network,
      clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
      broadcastChannel: typeof BroadcastChannel === "function",
      dark:
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? true : false,
      transport: network ? "live" : "outbox",
      userAgent: navigator.userAgent.slice(0, 120),
    };
  }

  /* ---------------------------------------------------------------- */
  /* Storage: real (maybe sandboxed) + adopted proxy                   */
  /* ---------------------------------------------------------------- */

  function realStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function realStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* opaque origin, partitioned away, or full: the outbox carries it */
    }
  }

  var adopted = {};

  function adoptStorage() {
    if (!window.Storage || !window.Storage.prototype) return;
    var proto = window.Storage.prototype;
    var rawGet = proto.getItem;
    var rawSet = proto.setItem;
    var rawRemove = proto.removeItem;

    proto.getItem = function (key) {
      if (key === envelope.adoptKey && key in adopted) return adopted[key];
      return rawGet.call(this, key);
    };
    proto.setItem = function (key, value) {
      if (typeof key === "string" && SYNC_KEY_RE.test(key) && key !== envelope.adoptKey) {
        // Another Arena widget's key, or a different instance of this one on the
        // same page. It is not ours to sync, and it must behave normally.
        return rawSet.call(this, key, value);
      }
      if (typeof key === "string" && SYNC_KEY_RE.test(key)) {
        var before = adopted[key];
        var next = String(value);
        adopted[key] = next;
        state.dirty = true;
        if (before !== next) enqueueFromDoc(key, before, next);
        publish();
        return;
      }
      return rawSet.call(this, key, value);
    };
    proto.removeItem = function (key) {
      if (typeof key === "string" && SYNC_KEY_RE.test(key) && key !== envelope.adoptKey) {
        return rawRemove.call(this, key);
      }
      if (typeof key === "string" && SYNC_KEY_RE.test(key)) {
        var before = adopted[key];
        delete adopted[key];
        adopted[key] = "";
        if (before) enqueueFromDoc(key, before, "null");
        publish();
        return;
      }
      return rawRemove.call(this, key);
    };
  }

  function hydrateAdopted() {
    var stored = realStorageGet(envelope.adoptKey);
    var parsed = null;
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch (e) {
        parsed = null;
      }
    }
    // Precedence: baked snapshot (server, fresh) > this device's cache.
    if (doc === null) doc = parsed;
    if (doc === null) doc = {};
    adopted[envelope.adoptKey] = JSON.stringify(doc);
    realStorageSet(envelope.adoptKey, adopted[envelope.adoptKey]);
  }

  /* ---------------------------------------------------------------- */
  /* Diffing: widget document -> path operations                       */
  /* ---------------------------------------------------------------- */

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return value;
    }
  }

  function diffPaths(before, after, prefix, depth, out) {
    if (out.length > 400) return out;
    if (depth > 3) {
      out.push({ path: prefix || "__doc", value: after === undefined ? null : after });
      return out;
    }
    var isObj = function (v) {
      return v && typeof v === "object" && !Array.isArray(v);
    };
    if (Array.isArray(before) && Array.isArray(after)) {
      // Arrays are compared wholesale: index-level patches would fight with the
      // widget's own reordering, and a list of records is small.
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        out.push({ path: prefix, value: after });
      }
      return out;
    }
    if (isObj(before) && isObj(after)) {
      var keys = {};
      Object.keys(before).forEach(function (k) {
        keys[k] = 1;
      });
      Object.keys(after).forEach(function (k) {
        keys[k] = 1;
      });
      Object.keys(keys).forEach(function (k) {
        var b = before[k];
        var a = after[k];
        var path = prefix ? prefix + "." + k : k;
        if (a === undefined) {
          out.push({ path: path, value: null, del: true });
        } else if (isObj(a) || isObj(b)) {
          diffPaths(b || {}, a, path, depth + 1, out);
        } else if (JSON.stringify(b) !== JSON.stringify(a)) {
          out.push({ path: path, value: a });
        }
      });
      return out;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      out.push({ path: prefix || "__doc", value: after === undefined ? null : after });
    }
    return out;
  }

  function enqueueFromDoc(key, beforeJson, afterJson) {
    var before = {};
    var after = {};
    try {
      before = beforeJson ? JSON.parse(beforeJson) : {};
    } catch (e) {
      before = {};
    }
    try {
      after = afterJson ? JSON.parse(afterJson) : {};
    } catch (e) {
      after = {};
    }
    // The widget just changed its own state, so our copy of the document has to
    // change with it. Without this the next merge would compare a stale document
    // against the server's and quietly resurrect the value the widget replaced.
    doc = after;
    var ops = diffPaths(before, after, "", 0, []);
    for (var i = 0; i < ops.length; i++) {
      pushOp(ops[i].path, ops[i].del ? undefined : ops[i].value, !!ops[i].del);
    }
  }

  function pushOp(path, value, del) {
    if (!path) path = "__doc";
    outbox.push({
      id: "op_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      key: path,
      value: value,
      del: !!del,
      at: Date.now(),
      baseRev: state.rev,
      device: device,
    });
    state.pending = outbox.length;
    state.status = "pending";
    saveOutbox();
    schedule();
  }

  /* ---------------------------------------------------------------- */
  /* Outbox persistence + sync codes                                    */
  /* ---------------------------------------------------------------- */

  function saveOutbox() {
    try {
      window.localStorage.setItem(OUTBOX_KEY, JSON.stringify({ base: state.rev, ops: outbox.slice(-500) }));
    } catch (e) {
      /* memory only */
    }
  }

  function loadOutbox() {
    var raw = realStorageGet(OUTBOX_KEY);
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      outbox = Array.isArray(parsed.ops) ? parsed.ops : [];
      state.pending = outbox.length;
    } catch (e) {
      outbox = [];
    }
  }

  function b64urlEncode(str) {
    var bytes = unescape(encodeURIComponent(str));
    return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(str) {
    var padded = str.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    return decodeURIComponent(escape(atob(padded)));
  }

  function syncCode() {
    var payload = {
      v: 1,
      i: envelope.id,
      base: state.rev,
      ops: outbox.slice(-500),
      at: new Date().toISOString(),
      device: device,
    };
    return "ARC1." + b64urlEncode(JSON.stringify(payload));
  }

  function applyCode(code) {
    var body = String(code || "").trim();
    if (body.indexOf("ARC1.") === 0) body = body.slice(5);
    var parsed;
    try {
      parsed = JSON.parse(b64urlDecode(body));
    } catch (e) {
      return { ok: false, error: "That sync code could not be read." };
    }
    if (!parsed || parsed.i !== envelope.id) {
      return { ok: false, error: "That sync code belongs to a different component instance." };
    }
    var ops = Array.isArray(parsed.ops) ? parsed.ops : [];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (!op || !op.key) continue;
      if (op.del) deletePath(doc, op.key);
      else setPath(doc, op.key, op.value);
      outbox.push({
        id: op.id || "op_import_" + i,
        key: op.key,
        value: op.value,
        del: !!op.del,
        at: op.at || Date.now(),
        baseRev: parsed.base || 0,
        device: parsed.device || "import",
      });
    }
    adopted[envelope.adoptKey] = JSON.stringify(doc);
    realStorageSet(envelope.adoptKey, adopted[envelope.adoptKey]);
    state.pending = outbox.length;
    state.status = "pending";
    saveOutbox();
    notifyWidget();
    schedule();
    flush();
    return { ok: true, applied: ops.length };
  }

  /* ---------------------------------------------------------------- */
  /* Path helpers                                                      */
  /* ---------------------------------------------------------------- */

  function setPath(target, path, value) {
    if (!path || path === "__doc") {
      doc = value && typeof value === "object" ? deepClone(value) : {};
      return;
    }
    var parts = String(path).split(".").filter(Boolean);
    var node = target;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]] || typeof node[parts[i]] !== "object") node[parts[i]] = {};
      node = node[parts[i]];
    }
    if (parts.length) node[parts[parts.length - 1]] = value;
  }

  function deletePath(target, path) {
    var parts = String(path).split(".").filter(Boolean);
    var node = target;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]] || typeof node[parts[i]] !== "object") return;
      node = node[parts[i]];
    }
    if (parts.length) delete node[parts[parts.length - 1]];
  }

  function notifyWidget() {
    // Widgets do not listen for storage events (none of the 192 do), so give
    // them one anyway, plus a custom event, plus a reload as the last resort.
    try {
      window.dispatchEvent(
        new StorageEvent("storage", { key: envelope.adoptKey, newValue: adopted[envelope.adoptKey] })
      );
    } catch (e) {
      /* StorageEvent constructor is not available everywhere */
    }
    try {
      window.dispatchEvent(new CustomEvent("arena:state", { detail: { rev: state.rev } }));
    } catch (e) {
      /* ignore */
    }
    if (envelope.reloadOnRemote !== false && state.transport === "live") {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(function () {
        if (Date.now() - state.lastLocalWrite < 1500) return;
        try {
          window.location.reload();
        } catch (e) {
          /* ignore */
        }
      }, 350);
    }
  }

  var reloadTimer = null;

  /* ---------------------------------------------------------------- */
  /* Transport                                                         */
  /* ---------------------------------------------------------------- */

  var syncTimer = null;
  var inflight = false;

  function schedule(delay) {
    if (state.transport !== "live") return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(flush, delay === undefined ? 450 : delay);
  }

  function endpoint(path) {
    return envelope.api.replace(/\/$/, "") + path;
  }

  function flush() {
    if (state.transport !== "live" || inflight) return Promise.resolve(state);
    inflight = true;
    var body = {
      rev: state.rev,
      ops: outbox.slice(0, 200),
      transport: state.transport,
      capabilities: capabilities,
      device: device,
    };
    var startedPending = outbox.length;
    state.status = startedPending ? "syncing" : "pulling";
    publish();

    return fetch(endpoint("/api/sync/instances/" + envelope.id + "/sync"), {
      method: "POST",
      headers: { "content-type": "application/json", "x-arena-key": envelope.key },
      body: JSON.stringify(body),
      credentials: "omit",
      keepalive: true,
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var acked = (data.ack || []).slice();
        var rejected = [];
        if (data.rejected && data.rejected.length) {
          for (var r = 0; r < data.rejected.length; r++) {
            if (data.rejected[r] && data.rejected[r].id) rejected.push(data.rejected[r].id);
          }
          state.error = data.rejected[0].reason;
        }
        // A rejected operation is dropped, not retried: the server has already
        // said why (a malformed op, a refused field), and retrying it forever is
        // how an outbox becomes a stuck queue the user cannot clear.
        if (acked.length || rejected.length) {
          outbox = outbox.filter(function (op) {
            return acked.indexOf(op.id) === -1 && rejected.indexOf(op.id) === -1;
          });
        }
        state.rev = data.rev;
        state.lastSync = Date.now();
        state.pending = outbox.length;
        state.conflicts += (data.conflicts || []).length;
        state.status = outbox.length ? "pending" : "synced";
        applyServerChanges(data.changes || [], data.snapshot);
        saveOutbox();
        publish();
      })
      .catch(function (err) {
        state.status = "offline";
        state.error = String((err && err.message) || err);
        if (capabilities.network === false) state.transport = "outbox";
        publish();
      })
      .then(function () {
        inflight = false;
        // Anything queued while the request was in flight (a widget write, an
        // applied sync code) has to go out on its own: waiting for the next poll
        // would leave a user staring at a "1 pending" pill for twenty seconds.
        if (outbox.length && state.transport === "live" && !state.error) schedule();
      });
  }

  function applyServerChanges(changes, snapshot) {
    var changed = false;
    // Order matters: the delta first, then the document. For a records binding
    // the server sends both, and the document is the one that knows what the
    // change *means* in this widget's shape (a row is not a path). Applying the
    // delta last would write an item where the widget keeps a value.
    for (var i = 0; i < changes.length; i++) {
      var c = changes[i];
      if (c.key === "__state" || c.key === "__doc") {
        if (c.deleted) {
          doc = {};
        } else if (c.value !== undefined && JSON.stringify(c.value) !== JSON.stringify(doc)) {
          doc = deepClone(c.value);
        }
        changed = true;
        continue;
      }
      // A records change: the server has already translated the business key
      // into a path in this widget's own document (`path`), because only the
      // server knows the mapping. A tombstone is the same thing with no value.
      var at = c.path || c.key;
      if (at === "__doc") {
        if (c.deleted) doc = {};
        else if (c.value !== undefined) doc = deepClone(c.value);
        changed = true;
        continue;
      }
      var beforePatch = JSON.stringify(doc);
      if (c.deleted) deletePath(doc, at);
      else setPath(doc, at, c.value);
      if (JSON.stringify(doc) !== beforePatch) changed = true;
      continue;
    }
    if (snapshot && Object.prototype.hasOwnProperty.call(snapshot, "doc")) {
      var incoming = snapshot.doc;
      if (JSON.stringify(incoming) !== JSON.stringify(doc)) {
        doc = deepClone(incoming === undefined ? {} : incoming);
        changed = true;
      }
    }
    if (changed) {
      // Anything still in the outbox is newer than the server's answer by
      // definition (it has not been acknowledged yet), so it is re-applied on
      // top. This is the whole reason a widget can keep working offline: the
      // merge never discards a local edit that has not landed.
      if (outbox.length) {
        for (var o = 0; o < outbox.length; o++) {
          var op = outbox[o];
          if (!op || !op.key) continue;
          if (op.key === "__doc" || op.key === "__state") doc = op.del ? {} : deepClone(op.value);
          else if (op.del) deletePath(doc, op.key);
          else setPath(doc, op.key, op.value);
        }
      }
      adopted[envelope.adoptKey] = JSON.stringify(doc);
      realStorageSet(envelope.adoptKey, adopted[envelope.adoptKey]);
      notifyWidget();
    }
  }

  var stream = null;
  function subscribeStream() {
    if (state.transport !== "live" || typeof EventSource !== "function") return;
    try {
      stream = new EventSource(
        endpoint("/api/sync/instances/" + envelope.id + "/stream?k=" + encodeURIComponent(envelope.key))
      );
      stream.onmessage = function (event) {
        try {
          var payload = JSON.parse(event.data);
          if (payload.rev && payload.rev > state.rev) flush();
        } catch (e) {
          /* ignore malformed frames */
        }
      };
      stream.onerror = function () {
        if (stream) stream.close();
        stream = null;
      };
    } catch (e) {
      /* SSE unavailable: the polling fallback below still works */
    }
  }

  /* ---------------------------------------------------------------- */
  /* Status pill                                                       */
  /* ---------------------------------------------------------------- */

  var pill = null;
  function renderPill() {
    if (envelope.ui === false) return;
    if (!document.body) {
      // The bridge runs in <head>, before the widget's markup exists.
      document.addEventListener("DOMContentLoaded", function () {
        publish();
      });
      return;
    }
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "arena-status";
      pill.setAttribute("role", "status");
      pill.style.cssText =
        "position:fixed;right:6px;bottom:6px;z-index:2147483000;font:11px/1.4 ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;" +
        "background:#ffffff;color:#37352f;border:1px solid #e9e9e7;border-radius:999px;padding:2px 8px;box-shadow:0 1px 4px rgba(0,0,0,.08);" +
        "display:flex;align-items:center;gap:6px;max-width:92%;opacity:.92";
      document.body.appendChild(pill);
    }
    var dot =
      state.status === "synced"
        ? "#0f7b6c"
        : state.status === "offline" || state.status === "pending"
          ? "#d9730d"
          : "#787774";
    var label =
      state.status === "synced"
        ? "Notion synced"
        : state.status === "pending"
          ? state.pending + " pending"
          : state.status === "offline"
            ? "Offline, " + state.pending + " queued"
            : state.status === "boot"
              ? "Connecting"
              : state.status;
    pill.innerHTML =
      '<span style="width:6px;height:6px;border-radius:999px;background:' +
      dot +
      ';display:inline-block"></span><span>' +
      label +
      "</span>";
    if (state.pending > 0 && state.transport === "live") {
      var btn = document.createElement("button");
      btn.textContent = "Sync now";
      btn.style.cssText = "font:inherit;border:0;background:none;color:#2383e2;cursor:pointer;padding:0 2px";
      btn.onclick = function () {
        flush();
      };
      pill.appendChild(btn);
    }
    if (state.transport === "outbox" && state.pending > 0) {
      var code = document.createElement("button");
      code.textContent = "Get sync code";
      code.style.cssText =
        "font:inherit;border:0;background:none;color:#2383e2;cursor:pointer;padding:0 2px";
      code.onclick = function () {
        var value = syncCode();
        if (envelope.host) postToHost({ arena: "code", id: envelope.id, code: value, pending: outbox.length });
        try {
          window.prompt("Paste this code into the same component on another device, or into Arena.", value);
        } catch (e) {
          /* prompt() is blocked in sandboxed frames without allow-modals */
        }
      };
      pill.appendChild(code);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  function publish() {
    renderPill();
    for (var i = 0; i < subscribers.length; i++) {
      try {
        subscribers[i](state, doc);
      } catch (e) {
        /* a subscriber must never break the sync loop */
      }
    }
    if (envelope.host) postToHost({ arena: "status", id: envelope.id, state: state });
  }

  /* ---------------------------------------------------------------- */
  /* Host channel (Arena's own surfaces; never Notion)                 */
  /* ---------------------------------------------------------------- */

  /**
   * A question that keeps coming up: can a widget talk to the page it is on?
   * Inside Notion, no: there is no host SDK and the parent throws our messages
   * away (research §2.7). On our own surfaces (the standalone page, the
   * playground, a client's own site) yes, and it is useful: an integrator can
   * drive sync status, pull a sync code, or flush an offline outbox without
   * reimplementing any of it.
   *
   * Opt-in per render via `host: true` in the envelope, because accepting
   * commands from an arbitrary parent is a capability, not a default.
   */
  function postToHost(message) {
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage(message, "*");
    } catch (e) {
      /* ignore */
    }
  }

  function setupHostChannel() {
    if (!envelope.host) return;
    window.addEventListener("message", function (event) {
      var data = event.data;
      if (!data || data.arena !== "command") return;
      if (data.instance && data.instance !== envelope.id) return;
      if (data.command === "sync-code") {
        postToHost({ arena: "code", id: envelope.id, code: syncCode(), pending: outbox.length });
      } else if (data.command === "apply-code") {
        var result = applyCode(data.code);
        postToHost({ arena: "result", id: envelope.id, action: "apply-code", result: result });
      } else if (data.command === "flush") {
        flush().then(function () {
          postToHost({ arena: "result", id: envelope.id, action: "flush", result: { ok: true } });
        });
      } else if (data.command === "state") {
        postToHost({ arena: "state", id: envelope.id, doc: doc, state: state });
      } else if (data.command === "write") {
        if (data.del) window.Arena.remove(data.path);
        else window.Arena.write(data.path, data.value);
        postToHost({ arena: "result", id: envelope.id, action: "write", result: { ok: true } });
      }
    });
    postToHost({ arena: "ready", id: envelope.id, slug: envelope.slug, capabilities: capabilities });
  }

  window.Arena = {
    version: "1.0.0-slice",
    id: envelope.id,
    slug: envelope.slug,
    mode: envelope.mode,
    capabilities: capabilities,
    status: function () {
      return deepClone(state);
    },
    read: function () {
      return deepClone(doc);
    },
    write: function (path, value) {
      setPath(doc, path, value);
      adopted[envelope.adoptKey] = JSON.stringify(doc);
      realStorageSet(envelope.adoptKey, adopted[envelope.adoptKey]);
      state.lastLocalWrite = Date.now();
      pushOp(path, value, false);
      notifyWidget();
      return state;
    },
    remove: function (path) {
      deletePath(doc, path);
      adopted[envelope.adoptKey] = JSON.stringify(doc);
      state.lastLocalWrite = Date.now();
      pushOp(path, undefined, true);
      return state;
    },
    replaceDoc: function (next) {
      doc = deepClone(next);
      adopted[envelope.adoptKey] = JSON.stringify(doc);
      state.lastLocalWrite = Date.now();
      pushOp("__doc", doc, false);
      notifyWidget();
      return state;
    },
    subscribe: function (fn) {
      if (typeof fn !== "function") return function () {};
      subscribers.push(fn);
      fn(state, doc);
      return function () {
        subscribers = subscribers.filter(function (f) {
          return f !== fn;
        });
      };
    },
    flush: flush,
    syncCode: syncCode,
    applyCode: applyCode,
    capabilities: capabilities,
    /** Safari needs a user gesture to grant storage access to the frame. */
    requestStorageAccess: function () {
      if (!document.requestStorageAccess) return Promise.resolve(false);
      return document.requestStorageAccess().then(
        function () {
          return true;
        },
        function () {
          return false;
        }
      );
    },
  };

  /* ---------------------------------------------------------------- */
  /* Boot                                                              */
  /* ---------------------------------------------------------------- */

  adoptStorage();
  loadOutbox();
  hydrateAdopted();
  state.status = outbox.length ? "pending" : "synced";
  setupHostChannel();

  if (capabilities.broadcastChannel) {
    try {
      var channel = new BroadcastChannel("arena-sync");
      channel.onmessage = function (event) {
        if (event.data && event.data.instance === envelope.id) flush();
      };
      var originalPublish = publish;
      publish = function () {
        try {
          channel.postMessage({ instance: envelope.id, rev: state.rev });
        } catch (e) {
          /* ignore */
        }
        originalPublish();
      };
    } catch (e) {
      /* ignore */
    }
  }

  window.addEventListener("online", function () {
    state.transport = "live";
    capabilities.network = true;
    schedule(200);
  });
  window.addEventListener("offline", function () {
    state.transport = "outbox";
    capabilities.network = false;
    publish();
  });

  if (state.transport === "live") {
    subscribeStream();
    flush();
    // Safety net: if SSE is unavailable, poll on a slow interval. One poll per
    // instance per 20s stays far inside the per-connection budget.
    setInterval(function () {
      if (!stream) flush();
    }, 20000);
  } else {
    publish();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && state.transport === "live") schedule(50);
  });
})();

/**
 * What a widget persists when nobody has ever opened it.
 *
 * Half the catalog is hand-written: its state is whatever its own code builds
 * the first time it runs, and that shape exists nowhere else — not in a SPEC,
 * not in the catalog metadata. So it is measured the only way a claim about a
 * widget can be: by running the widget.
 *
 * Each file under `public/widgets/` is parsed for its inline scripts and its
 * `id="…"` elements, then executed in a `node:vm` context whose document is a
 * stub (stable nodes, real inputs with types and options, listeners recorded
 * instead of dispatched). It boots the way a browser boots it — inline script,
 * then `DOMContentLoaded` — and if nothing has been persisted by then, it
 * starts pressing things: the recorded click and submit handlers, one at a
 * time, keeping every document the widget wrote. The document that holds the
 * most records wins, because that is the one a table can be built from.
 *
 * Provenance is the point. The output records, per widget, which interaction
 * produced its document and how many were tried, so a reader can tell a
 * measured default from a guess, and `scripts/check-coverage.mjs` can re-run
 * this and fail when a widget changes shape.
 *
 * Usage:
 *   node scripts/harvest-samples.mjs              all widgets
 *   node scripts/harvest-samples.mjs --only=a,b   a few
 *   node scripts/harvest-samples.mjs --report     do not write, just print
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createContext, runInContext } from "node:vm";

const ROOT = process.cwd();
const WIDGETS = path.join(ROOT, "public", "widgets");
const OUT = path.join(ROOT, "lib", "sync", "samples.harvested.ts");

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const REPORT = args.includes("--report");
/** Internal: harvest exactly one widget in this process and print the result. */
const ONE = flag("one");
const ONLY = flag("only") ? new Set(flag("only").split(",").map((s) => s.trim())) : null;

/* ------------------------------------------------------------------ */
/* The stub document                                                   */
/* ------------------------------------------------------------------ */

/**
 * The node above the top of a detached tree.
 *
 * `el.parentNode.querySelectorAll(...)` is common enough that a null parent
 * breaks widgets, while a *self-referential* parent turns
 * `while (n.parentNode) n = n.parentNode` into a hang. One shared node whose own
 * parent is null gives both behaviours at once.
 */
let ORPHAN_ROOT = null;

/** Handler errors for the widget being harvested, module-scoped because the
 * stub nodes are built by a module-level factory and need somewhere to report. */
let handlerErrors = [];

/**
 * How a *node* finds other nodes.
 *
 * `root.querySelector('.row')` returning null is what stopped the first
 * version: widgets that find their container through the DOM and then bind
 * handlers to the rows inside it would fall over on the first bind. The lookup
 * is set per harvest and returns the same stable node for the same selector, so
 * a handler registered on a "row" can be pressed later.
 */
let LOOKUP = null;

/** A node that answers every property with something usable. */
function fuzzy(kind = "div", extra = {}) {
  const listeners = new Map();
  const target = {
    nodeType: 1,
    tagName: (kind || "div").toUpperCase(),
    id: "",
    className: "",
    style: Object.assign(
      { setProperty() {}, removeProperty() {}, getPropertyValue: () => "", cssText: "" },
      extra.style
    ),
    dataset: {},
    classList: {
      add() {}, remove() {}, toggle() {}, replace() {}, contains: () => false, item: () => null, length: 0,
    },
    children: [],
    childNodes: [],
    value: extra.value ?? "",
    checked: false,
    disabled: false,
    textContent: "",
    innerHTML: "",
    selectedIndex: 0,
    options: extra.options ?? [],
    files: [],
    ...extra,
    appendChild(child) { this.children.push(child); return child; },
    append(child) { this.children.push(child); return child; },
    prepend(child) { this.children.unshift(child); return child; },
    insertBefore(child) { this.children.unshift(child); return child; },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      return child;
    },
    remove() {},
    setAttribute(k, v) { this[k] = v; },
    removeAttribute() {},
    getAttribute: (k) => (k in extra ? extra[k] : null),
    hasAttribute: () => false,
    addEventListener(type, fn) {
      if (typeof fn !== "function") return;
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },
    removeEventListener() {},
    fire(type, event = {}) {
      const sent = {
        type,
        target: this,
        currentTarget: this,
        preventDefault() {},
        stopPropagation() {},
        ...event,
      };
      for (const fn of listeners.get(type) ?? []) {
        try {
          // `this` is the element the listener was attached to, because that is
          // what a browser does and because these handlers use it: `this.reset()`
          // after adding a row is the commonest line in the catalog.
          fn.call(this, sent);
        } catch (err) {
          // Recorded, not swallowed: a handler that throws while binding is the
          // difference between "this widget persists nothing" and "we never
          // reached the code that persists".
          if (handlerErrors.length < 4) {
            handlerErrors.push(`${type} on #${this.id || "?"}: ${err.name}: ${String(err.message).slice(0, 110)}`);
          }
        }
      }
      return (listeners.get(type) ?? []).length;
    },
    hasListener: (type) => (listeners.get(type) ?? []).length > 0,
    /** handlers assigned as properties, so the driver can press them too */
    assignedHandlers: () => [...listeners.keys()],
    listenerTypes: () => [...listeners.keys()],
    dispatchEvent() { return true },
    focus() {},
    blur() {},
    click() { this.fire("click"); },
    scrollIntoView() {},
    closest: () => ORPHAN_ROOT,
    matches: () => false,
    querySelector: (sel) => (LOOKUP ? LOOKUP(`sel:${sel}`) : null),
    querySelectorAll: (sel) => (LOOKUP ? [LOOKUP(`sel:${sel}`)] : []),
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 24, right: 320, bottom: 24, x: 0, y: 0 }),
    getContext: () => context2d(),
    toDataURL: () => "data:,",
    insertAdjacentHTML() {},
    replaceChildren() {},
    animate: () => ({ cancel() {}, finished: Promise.resolve(), onfinish: null }),
    offsetWidth: 320,
    offsetHeight: 24,
    clientWidth: 320,
    clientHeight: 24,
    scrollHeight: 100,
    width: 320,
    height: 150,
    // Nulls, not stubs. A fresh stub on every read makes
    // `while (el) el = el.nextElementSibling` run forever, which is exactly how
    // the first version of this tool hung on 41 widgets.
    ownerDocument: null,
    parentNode: null,
    parentElement: null,
    firstChild: null,
    // eslint-disable-next-line no-undef -- filled in below
    firstChildPlaceholder: null,
    lastChild: null,
    firstElementChild: null,
    lastElementChild: null,
    nextSibling: null,
    nextElementSibling: null,
    previousElementSibling: null,
    previousSibling: null,
    table: null,
    rows: null,
    cells: null,
    tBodies: null,
    play() {},
    pause() {},
    // A real form has these, and a widget that calls `form.reset()` after adding
    // a row is the commonest shape in the catalog: 20 widgets failed with
    // "this.reset is not a function" before they were stubbed.
    reset() {},
    submit() {},
    requestSubmit() {},
    checkValidity: () => true,
    reportValidity: () => true,
    setSelectionRange() {},
    select() {},
    setCustomValidity() {},
    elements: [],
  };
  if (ORPHAN_ROOT && target.parentNode === null) {
    target.parentNode = ORPHAN_ROOT;
    target.parentElement = ORPHAN_ROOT;
  }
  return new Proxy(target, {
    get(t, k) {
      if (k === Symbol.toPrimitive || k === "then" || k === "toJSON") return undefined;
      if (k in t) return t[k];
      // Anything the widget reaches for that we did not think of: a nested stub,
      // so a read never throws and a call never matters.
      return fuzzy(String(k));
    },
    set(t, k, v) {
      // `el.onclick = fn` is how half of these widgets wire their buttons
      // (rather than addEventListener), so it has to register as a listener or
      // the harvester would never press anything.
      if (typeof v === "function" && /^on[a-z]+$/.test(String(k))) {
        t.addEventListener(String(k).slice(2), v);
        return true;
      }
      t[k] = v;
      return true;
    },
    has: () => true,
  });
}

function context2d() {
  return new Proxy(
    { canvas: fuzzy("canvas"), measureText: () => ({ width: 10 }) },
    {
      get(t, k) {
        if (k in t) return t[k];
        return () => 0;
      },
      set(t, k, v) { t[k] = v; return true; },
    }
  );
}

/** The `id="…"` elements a widget's markup declares, so inputs behave like inputs. */
function declaredElements(html) {
  const out = new Map();
  for (const m of html.matchAll(/<(input|textarea|select|button|form|canvas|output|progress)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const id = /\bid\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1];
    if (!id) continue;
    const type = /\btype\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1] ?? (tag === "input" ? "text" : tag);
    const value = /\bvalue\s*=\s*["']([^"']*)["']/.exec(attrs)?.[1];
    const options = [...attrs.matchAll(/<option[^>]*value\s*=\s*["']([^"']*)["']/gi)].map((o) => o[1]);
    out.set(id, { tag, type, value, options, placeholder: /\bplaceholder\s*=\s*["']([^"']*)["']/.exec(attrs)?.[1] });
  }
  return out;
}

/** A value a widget will accept when it is asked to add something. */
function seedValue(element) {
  const type = String(element.type ?? "text").toLowerCase();
  if (type === "number" || type === "range") return String(element.value || "3");
  if (type === "date") return element.value || "2026-10-14";
  if (type === "time") return element.value || "09:30";
  if (type === "datetime-local") return element.value || "2026-10-14T09:30";
  if (type === "color") return element.value || "#2f6f4f";
  if (type === "email") return element.value || "someone@example.com";
  if (type === "url") return element.value || "https://example.com";
  if (type === "tel") return element.value || "+1 555 0100";
  if (type === "checkbox" || type === "radio") return element.value || "on";
  if (type === "select-one" || element.tag === "select") return element.options?.[0] ?? "";
  if (type === "textarea" || element.tag === "textarea") return element.value || "Written by the harvester.";
  return element.value || element.placeholder || "Arena sample";
}

/* ------------------------------------------------------------------ */
/* Running one widget                                                  */
/* ------------------------------------------------------------------ */

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(String(k)) ? this.map.get(String(k)) : null;
  }
  setItem(k, v) {
    this.map.set(String(k), String(v));
  }
  removeItem(k) {
    this.map.delete(String(k));
  }
  clear() {
    this.map.clear();
  }
  key(i) {
    return [...this.map.keys()][i] ?? null;
  }
  get length() {
    return this.map.size;
  }
}

function parseScripts(html) {
  return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(
      (m) =>
        !/\bsrc\s*=/.test(m[1]) &&
        !/type\s*=\s*["'](application\/json|text\/template|text\/x-template)/i.test(m[1])
    )
    .map((m) => m[2]);
}

function harvest(slug) {
  const html = readFileSync(path.join(WIDGETS, `${slug}.html`), "utf8");
  const declared = declaredElements(html);
  const storage = new MemoryStorage();
  const nodes = new Map();
  const created = [];

  const nodeFor = (id) => {
    if (nodes.has(id)) return nodes.get(id);
    const meta = declared.get(id);
    const node = meta
      ? fuzzy(meta.tag === "input" ? "input" : meta.tag, {
          id,
          type: meta.type,
          value: seedValue(meta),
          options: (meta.options ?? []).map((v) => ({ value: v, textContent: v, selected: false })),
        })
      : fuzzy("div", { id });
    node.ownerDocument = document;
    nodes.set(id, node);
    created.push(node);
    return node;
  };

  LOOKUP = nodeFor;
  ORPHAN_ROOT = fuzzy("root");
  ORPHAN_ROOT.parentNode = null;
  ORPHAN_ROOT.parentElement = null;

  const documentListeners = new Map();
  const document = {
    body: fuzzy("body"),
    head: fuzzy("head"),
    documentElement: fuzzy("html"),
    hidden: false,
    visibilityState: "visible",
    readyState: "loading",
    title: slug,
    getElementById: (id) => nodeFor(String(id)),
    getElementsByClassName: (cls) => [nodeFor(`cls:${cls}`)],
    getElementsByTagName: (tag) => [nodeFor(`tag:${tag}`)],
    querySelector: (sel) => nodeFor(`sel:${sel}`),
    querySelectorAll: (sel) => [nodeFor(`sel:${sel}`)],
    createElement: (tag) => fuzzy(tag),
    createElementNS: (_ns, tag) => fuzzy(tag),
    createTextNode: () => fuzzy("#text"),
    createDocumentFragment: () => fuzzy("fragment"),
    createEvent: () => ({ initEvent() {} }),
    addEventListener(type, fn) {
      const list = documentListeners.get(type) ?? [];
      list.push(fn);
      documentListeners.set(type, list);
    },
    removeEventListener() {},
    dispatchEvent() { return true },
    fire(type) {
      for (const fn of documentListeners.get(type) ?? []) {
        try {
          fn({ type, target: document, preventDefault() {}, stopPropagation() {} });
        } catch (err) {
          handlerErrors.push(`${type}: ${err.name}: ${String(err.message).slice(0, 120)}`);
        }
      }
    },
    execCommand: () => true,
    cookie: "",
    fonts: { ready: Promise.resolve() },
    activeElement: null,
    styleSheets: [],
  };

  handlerErrors = [];
  const windowListeners = new Map();
  const win = {
    document,
    localStorage: storage,
    sessionStorage: new MemoryStorage(),
    location: {
      origin: "http://localhost:3000",
      href: `http://localhost:3000/embed/${slug}`,
      search: "",
      hash: "",
      pathname: `/embed/${slug}`,
      protocol: "https:",
      host: "localhost:3000",
      reload() {},
      assign() {},
      replace() {},
      toString: () => `http://localhost:3000/embed/${slug}`,
    },
    navigator: {
      userAgent: "harvester",
      platform: "harvester",
      language: "en-US",
      languages: ["en-US"],
      onLine: true,
      maxTouchPoints: 0,
      clipboard: { writeText: async () => {} },
      share: async () => {},
      vibrate: () => true,
    },
    matchMedia: () => ({
      matches: false,
      media: "",
      addEventListener() {},
      addListener() {},
      removeEventListener() {},
      removeListener() {},
    }),
    addEventListener(type, fn) {
      const list = windowListeners.get(type) ?? [];
      list.push(fn);
      windowListeners.set(type, list);
    },
    removeEventListener() {},
    dispatchEvent() { return true },
    fire(type) {
      for (const fn of windowListeners.get(type) ?? []) {
        try {
          fn({ type, preventDefault() {}, stopPropagation() {} });
        } catch (err) {
          handlerErrors.push(`${type}: ${err.name}: ${String(err.message).slice(0, 120)}`);
        }
      }
    },
    // Timers fire, but on a budget: a clock that reschedules itself must not
    // spin this tool forever. A few hundred ticks is more than any widget needs
    // to write its first document.
    setTimeout: (fn) => {
      if (timerBudget-- <= 0) return 0;
      queueMicrotask(() => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
      return 0;
    },
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    requestIdleCallback: (fn) => {
      if (timerBudget-- <= 0) return 0;
      queueMicrotask(() => {
        try {
          fn({ timeRemaining: () => 50 });
        } catch {
          /* ignore */
        }
      });
      return 0;
    },
    cancelIdleCallback() {},
    fetch: async () => ({ ok: false, status: 0, json: async () => ({}), text: async () => "", headers: { get: () => null } }),
    alert() {},
    confirm: () => false,
    prompt: () => null,
    open: () => null,
    close() {},
    print() {},
    scrollTo() {},
    scrollBy() {},
    getComputedStyle: () => ({ getPropertyValue: () => "", length: 0 }),
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 800,
    outerWidth: 1280,
    outerHeight: 800,
    scrollY: 0,
    scrollX: 0,
    pageYOffset: 0,
    crypto: {
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) arr[i] = (i * 7 + 3) % 256;
        return arr;
      },
      randomUUID: () => "00000000-0000-4000-8000-000000000000",
    },
    performance: { now: () => 0, timeOrigin: 0 },
    schedule: async () => {},
    structuredClone,
    queueMicrotask,
    Intl,
    JSON,
    Math,
    Date,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Array,
    Object,
    String,
    Number,
    Boolean,
    BigInt,
    RegExp,
    Error,
    TypeError,
    RangeError,
    Symbol,
    Function,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    btoa: (v) => Buffer.from(String(v), "binary").toString("base64"),
    atob: (v) => Buffer.from(String(v), "base64").toString("binary"),
    console,
    URL,
    URLSearchParams,
    AbortController,
    TextEncoder,
    TextDecoder,
    Blob: class {},
    FileReader: class {},
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
    Image: class {
      constructor() {
        return fuzzy("img");
      }
    },
    Audio: class {
      play() {}
      pause() {}
    },
    Notification: class {
      static async requestPermission() {
        return "denied";
      }
    },
    SpeechSynthesisUtterance: class {},
    speechSynthesis: { speak() {}, cancel() {} },
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
      preventDefault() {}
      stopPropagation() {}
    },
    HTMLElement: class {},
    Node: class {},
    Element: class {},
    DOMException: class extends Error {},
  };
  win.window = win;
  win.globalThis = win;
  win.self = win;
  win.top = win;
  win.parent = win;
  win.frames = [];
  win.Arena = undefined;

  let timerBudget = 300;
  const ctx = createContext(win);
  const errors = [];
  let ran = 0;
  for (const [i, code] of parseScripts(html).entries()) {
    try {
      // A widget with a runaway render loop must not hang the harvest: the vm
      // kills a script that runs longer than this and we record it as an error.
      runInContext(code, ctx, { filename: `${slug}.html#script${i}`, timeout: 3000 });
      ran++;
    } catch (err) {
      const frame = (err.stack ?? "").split("\n").find((l) => l.includes(`${slug}.html`)) ?? "";
      errors.push(
        `script ${i}: ${err.name}: ${String(err.message).slice(0, 140)}${frame ? ` @ ${frame.trim().slice(0, 120)}` : ""}`
      );
      break;
    }
  }
  document.readyState = "complete";
  try {
    document.fire("DOMContentLoaded");
  } catch (err) {
    errors.push(`DOMContentLoaded: ${String(err.message).slice(0, 120)}`);
  }
  try {
    win.fire("load");
  } catch (err) {
    errors.push(`load: ${String(err.message).slice(0, 120)}`);
  }

  const snapshots = [];
  const snap = (how) => {
    for (const [key, value] of storage.map) {
      if (!/^notion-arena/.test(key)) continue;
      if (snapshots.some((s) => s.key === key && s.raw === value)) continue;
      snapshots.push({ key, raw: value, how });
    }
  };
  snap("boot");

  /**
   * `onclick="add()"` is the other half of how these widgets wire things up, and
   * it registers nothing that a listener check can see. The markup names the
   * function, the function is on the global object, and so it can simply be
   * called — skipping the names that obviously mean "throw my work away".
   */
  const inlineCalls = [
    ...new Set(
      [...html.matchAll(/\son[a-z]+\s*=\s*["']\s*([A-Za-z_$][\w$]*)\s*\(\s*\)/g)].map((m) => m[1])
    ),
  ].filter((name) => !/clear|reset|delete|remove|wipe|discard|purge|undo|logout|stop|end|close|dismiss/i.test(name));

  let interactions = 0;
  if (!snapshots.length) {
    for (const name of inlineCalls) {
      const fn = ctx[name];
      if (typeof fn !== "function" || fn.length > 0) continue;
      try {
        fn();
        snap(`inline:${name}`);
        interactions++;
      } catch {
        /* ignore */
      }
    }
  }

  /* Nothing persisted: press what the widget registered. */
  if (!snapshots.length) {
    for (const node of [document.body, document.documentElement, document, win, ...created]) {
      for (const type of ["click", "submit", "change", "input", "keydown", "blur"]) {
        if (!node.hasListener?.(type)) continue;
        if (++interactions > 80) break;
        if (type === "click" || type === "submit" || type === "blur") node.fire(type);
        else {
          // Filling the field first is the difference between "add an item" and
          // "an empty item was refused".
          node.value = seedValue(node);
          node.fire(type, type === "keydown" ? { key: "Enter", code: "Enter", keyCode: 13 } : {});
        }
        snap(`${type}:${node.id || "?"}`);
      }
      if (interactions > 60) break;
    }
  }

  /* Score what we caught: the document with the most records wins. */
  const scored = snapshots
    .map((s) => {
      let parsed;
      try {
        parsed = JSON.parse(s.raw);
      } catch {
        parsed = null;
      }
      return { ...s, parsed, score: scoreDocument(parsed) };
    })
    .sort((a, b) => b.score - a.score);

  return {
    slug,
    ran,
    scripts: parseScripts(html).length,
    errors: [...errors, ...handlerErrors.slice(0, 3)],
    interactions,
    storageWrites: [...storage.map.keys()],
    best: scored[0] ?? null,
    all: scored.slice(0, 4).map((s) => ({ how: s.how, key: s.key, score: s.score })),
  };
}

/** Records beat scalars, arrays beat maps, and something beats nothing. */
function scoreDocument(doc) {
  if (doc === null || doc === undefined) return 0;
  if (Array.isArray(doc)) {
    const records = doc.filter((x) => x && typeof x === "object").length;
    return records * 10 + doc.length;
  }
  if (typeof doc === "object") {
    let best = 0;
    for (const value of Object.values(doc)) {
      if (Array.isArray(value)) best = Math.max(best, scoreDocument(value));
    }
    const flat = Object.values(doc).filter((v) => v === null || typeof v !== "object").length;
    return best || flat;
  }
  return 0;
}

/* ------------------------------------------------------------------ */

/**
 * One widget per child process.
 *
 * A widget's own code can loop forever — a clock that reschedules itself, a
 * handler that waits for something that never happens — and a loop inside a
 * `DOMContentLoaded` handler cannot be interrupted by the vm's own timeout,
 * because by then the code is running outside the compiled script. A process
 * boundary is the only hard limit, so each widget gets one and a wall clock.
 */
const PER_WIDGET_MS = 4000;

function harvestInChild(slug) {
  const started = Date.now();
  const res = spawnSync(process.execPath, [process.argv[1], `--one=${slug}`, "--report"], {
    encoding: "utf8",
    timeout: PER_WIDGET_MS,
    maxBuffer: 8 * 1024 * 1024,
  });
  const ms = Date.now() - started;
  if (res.signal === "SIGTERM" || res.error?.code === "ETIMEDOUT") {
    return { slug, ran: 0, scripts: 0, errors: [`timed out after ${ms}ms`], interactions: 0, best: null, ms };
  }
  const line = (res.stdout ?? "").split("\n").find((l) => l.startsWith("@@JSON@@"));
  if (!line) {
    return {
      slug,
      ran: 0,
      scripts: 0,
      errors: [
        `no result (${res.status}); ${(res.stderr ?? "")
          .split("\n")
          .filter((l) => l.trim() && !l.startsWith("file:") && !/^\s*\^/.test(l))
          .slice(0, 2)
          .join(" ")
          .slice(0, 200)}`,
      ],
      interactions: 0,
      best: null,
      ms,
    };
  }
  return { ...JSON.parse(line.slice("@@JSON@@".length)), ms };
}

/**
 * Widgets that already have a first document, and therefore need no harvest:
 * the ten with hand-written seeds, and the SPEC family, whose own field list is
 * enough to build two rows. Measured, not assumed — both are read the same way
 * `lib/sync/samples.ts` reads them.
 */
function alreadySampled() {
  const components = readFileSync(path.join(ROOT, "lib", "sync", "components.ts"), "utf8");
  const seeded = new Set([...components.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
  for (const file of readdirSync(WIDGETS)) {
    const slug = file.replace(/\.html$/, "");
    if (/var\s+SPEC\s*=\s*\{/.test(readFileSync(path.join(WIDGETS, file), "utf8"))) seeded.add(slug);
  }
  return seeded;
}

const SKIP = args.includes("--all") ? new Set() : alreadySampled();

const slugs = readdirSync(WIDGETS)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replace(/\.html$/, ""))
  .sort()
  .filter((s) => !ONLY || ONLY.has(s));

const needed = slugs.filter((s) => !SKIP.has(s));
console.log(
  `${slugs.length} widgets · ${slugs.length - needed.length} already have a first document (seed or SPEC) · ` +
    `harvesting ${needed.length}${args.includes("--all") ? " (--all)" : ""}\n`
);

if (ONE) {
  const result = harvest(ONE);
  console.log(`@@JSON@@${JSON.stringify(result)}`);
  process.exit(0);
}

const results = [];
for (const slug of needed) {
  const r = harvestInChild(slug);
  results.push(r);
  const label = r.errors.length ? "threw " : r.best ? "ok    " : "empty ";
  const detail = r.best ? `${r.best.how} score ${r.best.score}` : r.errors[0] ?? "nothing persisted";
  console.log(`${label} ${slug.padEnd(32)} ${String(r.interactions).padStart(3)} tries ${String(r.ms).padStart(5)}ms  ${detail}`);
}

const withDoc = results.filter((r) => r.best);
const threw = results.filter((r) => r.errors.length);
const empty = results.filter((r) => !r.best && !r.errors.length);
console.log(
  `\n${results.length} widgets · ${withDoc.length} produced a document · ${threw.length} threw or timed out · ` +
    `${empty.length} ran but persisted nothing`
);
if (threw.length) {
  console.log(threw.slice(0, 15).map((r) => `  ${r.slug}: ${r.errors[0]}`).join("\n"));
}
if (empty.length) {
  console.log(`  persisted nothing: ${empty.slice(0, 20).map((r) => r.slug).join(", ")}`);
}

if (!REPORT) {
  const samples = Object.fromEntries(
    results
      .filter((r) => r.best && r.best.score > 0)
      .map((r) => [
        r.slug,
        { how: r.best.how, key: r.best.key, tries: r.interactions, doc: r.best.parsed },
      ])
  );
  const header = `/**
 * Widget state, harvested.
 *
 * Generated by \`node scripts/harvest-samples.mjs\` on ${new Date().toISOString().slice(0, 10)}:
 * ${results.length} widgets run headlessly in a stub document, ${withDoc.length} of them
 * produced a document. Each entry records how it was obtained — \`boot\` when the
 * widget wrote it while starting up, \`click:…\` when a handler had to be fired —
 * and how many interactions were tried before it appeared.
 *
 * This is what a widget persists the first time it runs, with nobody's data in
 * it. It is a measured default, not a guess about widgets in general, and
 * \`scripts/check-coverage.mjs\` re-harvests and fails when one stops matching.
 *
 * Do not edit by hand: the next run overwrites it.
 */

export const HARVESTED: Record<string, { how: string; key: string; tries: number; doc: unknown }> = `;
  writeFileSync(OUT, `${header}${JSON.stringify(samples, null, 2)};\n`);
  console.log(`\nwrote ${path.relative(ROOT, OUT)} (${Object.keys(samples).length} samples)`);
}

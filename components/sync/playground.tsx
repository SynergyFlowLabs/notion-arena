"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The data plane, made clickable.
 *
 * Two panes, because the whole design is "one instance, two renderers": the
 * left pane is the hosted embed (live transport, fetch plus SSE), the right pane
 * is the offline artifact rendered exactly the way Notion renders an HTML block:
 * a sandboxed frame with an opaque origin, where `localStorage` throws and the
 * baked snapshot is all the file has.
 *
 * Everything the panes do is real: the left pane talks to the sync API, the
 * engine writes rows through the workspace adapter, the table below is read back
 * out of that adapter, and the timeline is the engine's own event log.
 */

type Connection = { id: string; kind: string; label: string; workspaceName?: string };
type DataSource = { id: string; title: string; properties: { name: string; type: string }[] };
type InstanceView = {
  id: string;
  slug: string;
  name: string;
  rev: number;
  binding: {
    mode: string;
    dataSourceId: string;
    databaseTitle: string;
    keyProp: string;
    conflict: string;
    fields: { key: string; prop: string; type: string }[];
  };
  publish: { channel: string; blockId?: string; refreshes?: number; publishedRev?: number };
  stats: { writes: number; reads: number; conflicts: number };
};
type TableView = {
  databaseTitle: string;
  columns: string[];
  rows: { id: string; cells: Record<string, string>; lastEditedTime: string }[];
};
type TimelineEvent = {
  id: string;
  at: string;
  kind: string;
  detail: string;
};
/** One row of the palette: every widget in the catalog, as the registry sees it. */
type ComponentRow = {
  slug: string;
  label: string;
  category?: string;
  mode: "records" | "kv-blob";
  source: string;
  shape: string;
  itemLabel: string;
  itemColumns: number;
  adoptKey: string | null;
  /** which of the three sources produced the first document, `null` when none did */
  sample: "seed" | "spec" | "harvested" | null;
  sampleItems: number;
  bound: boolean;
};

/** What binding this component would actually create, from the same resolver the engine uses. */
type Spec = {
  slug: string;
  label: string;
  category?: string;
  mode: "records" | "kv-blob";
  itemLabel: string;
  blurb?: string;
  tryThis?: string;
  source: string;
  shape: string;
  identity: string;
  inferred: boolean;
  lossy: boolean;
  modeWhy: string;
  adoptKey: string | null;
  columns: { prop: string; key: string; type: string; keyPart: boolean; options: number }[];
  keyColumns: string[];
  seed: { items: number; unmapped: string[]; longestText: number; from: string; doc?: unknown };
  write?: { exact: boolean; keys: string[]; duplicates: number; sample: string[] };
};
/** A binding the browser made earlier in this session, or in a previous one. */
type InstanceRow = {
  id: string;
  slug: string;
  name: string;
  rev: number;
  revokedAt?: string;
  binding: { mode: string; dataSourceId: string; databaseTitle: string };
};

/**
 * The sync key, kept where the user's URLs actually live.
 *
 * The server shows a key once, on purpose: it stores a hash, and sealing the
 * plaintext is only for re-rendering a bundle, not for re-showing the user their
 * own URL. So the browser keeps the keys it was given — exactly as a person
 * keeps the URL they pasted into Notion — and an instance opened without one
 * offers a rotate, which is the documented way to get a working URL back.
 */
const KEYSTORE = "arena.playground.keys";

function keyFor(id: string): string | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEYSTORE) ?? "{}") as Record<string, string>;
    return all[id] ?? null;
  } catch {
    return null;
  }
}

function rememberKey(id: string, key: string) {
  try {
    const all = JSON.parse(localStorage.getItem(KEYSTORE) ?? "{}") as Record<string, string>;
    all[id] = key;
    localStorage.setItem(KEYSTORE, JSON.stringify(all));
  } catch {
    /* private mode: the key stays in this tab's memory instead */
  }
}

/** The two renderers' URLs, built the same way the server builds them. */
function urlsFor(slug: string, id: string, key: string) {
  const qs = new URLSearchParams({ i: id, k: key });
  const suffix = `?k=${encodeURIComponent(key)}`;
  return {
    embedUrl: `${location.origin}/embed/${slug}?${qs.toString()}`,
    standaloneUrl: `${location.origin}/c/${slug}/${id}${suffix}`,
    bundleUrl: `${location.origin}/api/sync/instances/${id}/bundle${suffix}&download=1`,
    offlineBundleUrl: `${location.origin}/api/sync/instances/${id}/bundle${suffix}&offline=1&download=1`,
  };
}

type BridgeStatus = {
  id: string;
  state: { status: string; pending: number; rev: number; transport: string; error?: string | null };
  capabilities?: { storage: string; origin: string; network: boolean; transport: string };
};

/**
 * The palette is the catalog itself, not a list kept here.
 *
 * `/api/sync/components?all=1` answers for all 192 widgets: which of them can
 * produce a first document (a hand-written seed, the widget's own SPEC, or a
 * document the harvester measured by running the widget), and for the ones that
 * cannot, that fact — rather than a button that would bind an empty table.
 *
 * The ten curated components are marked, because a curated one has a blurb and
 * something to try; they are not the only ones that work.
 */
const DEFAULT_SLUG = "habit-grid";

export function DataPlanePlayground({ initialSlug }: { initialSlug?: string } = {}) {
  const [connections, setConnections] = React.useState<Connection[]>([]);
  const [connectionId, setConnectionId] = React.useState<string>("");
  const [dataSources, setDataSources] = React.useState<DataSource[]>([]);
  /** Resolved on the server from `?component=`, so a shared link opens the right one. */
  const [slug, setSlug] = React.useState(initialSlug || DEFAULT_SLUG);
  const [target, setTarget] = React.useState<"provision" | string>("provision");
  const [instance, setInstance] = React.useState<InstanceView | null>(null);
  const [urls, setUrls] = React.useState<{ embedUrl: string; standaloneUrl: string; bundleUrl: string; offlineBundleUrl: string } | null>(null);
  const [syncKey, setSyncKey] = React.useState<string | null>(null);
  const [offlineHtml, setOfflineHtml] = React.useState<string | null>(null);
  const [table, setTable] = React.useState<TableView | null>(null);
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [log, setLog] = React.useState<{ key: string; rev: number; source: string; deleted?: boolean }[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, BridgeStatus>>({});
  const [pendingCode, setPendingCode] = React.useState<string | null>(null);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ tone: "ok" | "warn" | "bad"; text: string } | null>(null);
  const [token, setToken] = React.useState("");
  const [palette, setPalette] = React.useState<ComponentRow[]>([]);
  const [instances, setInstances] = React.useState<InstanceRow[]>([]);
  const [paletteQuery, setPaletteQuery] = React.useState("");
  const [spec, setSpec] = React.useState<Spec | null>(null);
  const booted = React.useRef(false);

  const liveRef = React.useRef<HTMLIFrameElement | null>(null);
  const offlineRef = React.useRef<HTMLIFrameElement | null>(null);

  function choose(next: string) {
    setSlug(next);
    setInstance(null);
    setUrls(null);
    setOfflineHtml(null);
    setTable(null);
    setEvents([]);
    setLog([]);
    setPendingCode(null);
    setStatuses({});
    setMessage(null);
  }

  /* --- boot: the deep link when the page could not see it server-side --- */
  React.useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (initialSlug) return;
    const wanted = new URLSearchParams(window.location.search).get("component");
    if (wanted) setSlug(wanted);
  }, [initialSlug]);

  /* --- keep the address shareable: one URL per component ----------- */
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("component") === slug) return;
    url.searchParams.set("component", slug);
    window.history.replaceState(null, "", url);
  }, [slug]);

  /* --- the palette: every widget, and whether it can be bound ------ */
  React.useEffect(() => {
    (async () => {
      const res = await fetch("/api/sync/components?all=1", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setPalette(data.components ?? []);
    })();
  }, []);

  /* --- bindings already made, so a reload does not lose the test ---- */
  const loadInstances = React.useCallback(async () => {
    const data = await fetch("/api/sync/instances", { cache: "no-store" }).then((r) => r.json());
    if (data.ok) setInstances(data.instances ?? []);
  }, []);

  React.useEffect(() => {
    void loadInstances();
  }, [loadInstances]);

  /**
   * Reopen a binding made earlier: the instance, its table, its log, and — when
   * this browser still has the key it was given — both renderers, live.
   */
  async function openInstance(row: InstanceRow) {
    setBusy(`open:${row.id}`);
    const data = await fetch(`/api/sync/instances/${row.id}`, { cache: "no-store" }).then((r) => r.json());
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: "That binding is gone. It was revoked." });
    setSlug(data.instance.slug);
    setInstance(data.instance);
    setEvents((data.events ?? []).slice(0, 14));
    setLog((data.log ?? []).slice(0, 8));
    setPendingCode(null);
    const key = keyFor(row.id);
    setSyncKey(key);
    if (key) {
      setUrls(urlsFor(data.instance.slug, row.id, key));
      const bundle = await fetch(
        `/api/sync/instances/${row.id}/bundle?k=${encodeURIComponent(key)}&offline=1&host=1&download=0`,
        { cache: "no-store" }
      ).then((r) => r.text());
      setOfflineHtml(bundle);
      setMessage({ tone: "ok", text: "Reopened. Both panes are live again." });
    } else {
      setUrls(null);
      setOfflineHtml(null);
      setMessage({
        tone: "warn",
        text: "Reopened, but this browser does not have the sync key for it — rotate to mint a new one and get a working pair of URLs.",
      });
    }
    await refresh(row.id, row.binding.dataSourceId);
  }

  async function rotate() {
    if (!instance) return;
    setBusy("rotate");
    const data = await fetch(`/api/sync/instances/${instance.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "rotate" }),
    }).then((r) => r.json());
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: data.error ?? "Could not rotate." });
    rememberKey(instance.id, data.syncKey);
    setSyncKey(data.syncKey);
    setUrls(urlsFor(instance.slug, instance.id, data.syncKey));
    const bundle = await fetch(
      `/api/sync/instances/${instance.id}/bundle?k=${encodeURIComponent(data.syncKey)}&offline=1&host=1&download=0`,
      { cache: "no-store" }
    ).then((r) => r.text());
    setOfflineHtml(bundle);
    setMessage({ tone: "warn", text: data.warning ?? "New key minted. Old URLs stop working." });
  }

  async function revoke(row: InstanceRow) {
    setBusy(`revoke:${row.id}`);
    await fetch(`/api/sync/instances/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
    setBusy(null);
    if (instance?.id === row.id) {
      setInstance(null);
      setUrls(null);
      setOfflineHtml(null);
      setTable(null);
    }
    await loadInstances();
    setMessage({ tone: "warn", text: "Revoked. The URLs for that binding stop working immediately." });
  }

  /* --- what binding this component would create, from the engine ---- */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/sync/components?slug=${encodeURIComponent(slug)}&sample=1&write=1`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!cancelled) setSpec(data.components?.[0] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /* --- boot: connections ------------------------------------------- */
  React.useEffect(() => {
    (async () => {
      const res = await fetch("/api/sync/connections", { cache: "no-store" });
      const data = await res.json();
      setConnections(data.connections ?? []);
      const mock = (data.connections ?? []).find((c: Connection) => c.kind === "mock");
      if (mock) setConnectionId(mock.id);
    })();
  }, []);

  /* --- data sources for the chosen connection ---------------------- */
  React.useEffect(() => {
    if (!connectionId) return;
    (async () => {
      const res = await fetch(`/api/sync/datasources?connectionId=${encodeURIComponent(connectionId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setDataSources(data.dataSources ?? []);
    })();
  }, [connectionId]);

  /* --- bridge host channel ----------------------------------------- */
  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.arena === "status" || data.arena === "ready") {
        setStatuses((prev) => ({ ...prev, [data.id]: data }));
      }
      if (data.arena === "code") {
        setPendingCode(data.code);
        setPendingCount(data.pending ?? 0);
        setMessage({ tone: "ok", text: "Sync code received from the offline renderer. Flush it into the live one." });
      }
      if (data.arena === "result") {
        setMessage({ tone: "ok", text: `Bridge ${data.action}: ${JSON.stringify(data.result?.applied ?? data.result ?? {})}` });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* --- polling for table + timeline -------------------------------- */
  const refresh = React.useCallback(
    async (id?: string, dataSourceId?: string) => {
      const instanceId = id ?? instance?.id;
      const ds = dataSourceId ?? instance?.binding.dataSourceId;
      if (!instanceId) return;
      if (ds && connectionId) {
        const res = await fetch(
          `/api/sync/notion/table?connectionId=${encodeURIComponent(connectionId)}&dataSourceId=${encodeURIComponent(ds)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.ok) setTable({ databaseTitle: data.databaseTitle, columns: data.columns, rows: data.rows });
      }
      const res = await fetch(`/api/sync/instances/${instanceId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setInstance(data.instance);
        setEvents((data.events ?? []).slice(0, 14));
        setLog((data.log ?? []).slice(0, 8));
      }
    },
    [connectionId, instance?.id, instance?.binding.dataSourceId]
  );

  React.useEffect(() => {
    if (!instance) return;
    const timer = setInterval(() => refresh(), 2500);
    return () => clearInterval(timer);
  }, [instance, refresh]);

  /* --- actions ------------------------------------------------------ */

  async function connectDemo() {
    setBusy("connect");
    const res = await fetch("/api/sync/connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "mock" }),
    });
    const data = await res.json();
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: data.error });
    const list = await fetch("/api/sync/connections", { cache: "no-store" }).then((r) => r.json());
    setConnections(list.connections ?? []);
    setConnectionId(data.connection.id);
    setMessage({
      tone: "ok",
      text: "Connected the demo workspace. No credentials, no network: the same adapter interface the Notion API implements.",
    });
  }

  async function connectToken() {
    setBusy("token");
    const res = await fetch("/api/sync/connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "token", token, kind: "pat" }),
    });
    const data = await res.json();
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: data.error });
    setToken("");
    const list = await fetch("/api/sync/connections", { cache: "no-store" }).then((r) => r.json());
    setConnections(list.connections ?? []);
    setConnectionId(data.connection.id);
    setMessage({ tone: "ok", text: `Connected ${data.connection.label}.` });
  }

  async function create() {
    if (!connectionId) return setMessage({ tone: "bad", text: "Connect a workspace first." });
    setBusy("create");
    setMessage(null);
    const res = await fetch("/api/sync/instances", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        component: slug,
        connectionId,
        binding:
          target === "provision"
            ? { mode: spec?.mode ?? "records", provisionTitle: `${spec?.label ?? slug} log` }
            : { mode: spec?.mode ?? "records", dataSourceId: target },
        // The document the widget would have: a hand-written seed, its own SPEC
        // fields, or what the harvester measured by running it. Binding uploads
        // it through the ordinary push path, so seeding cannot bypass the rules.
        sampleDoc: spec?.seed.doc,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: data.error });
    setInstance(data.instance);
    setUrls(data.urls);
    setSyncKey(data.syncKey);
    rememberKey(data.instance.id, data.syncKey);
    void loadInstances();
    setPendingCode(null);
    setStatuses({});
    await refresh(data.instance.id, data.instance.binding.dataSourceId);
    {
      const bundle = await fetch(
        `/api/sync/instances/${data.instance.id}/bundle?k=${encodeURIComponent(data.syncKey)}&offline=1&host=1&download=0`,
        { cache: "no-store" }
      ).then((r) => r.text());
      setOfflineHtml(bundle);
    }
    setMessage({
      tone: "ok",
      text: data.warnings?.length
        ? `Bound. ${data.warnings.join(" ")}`
        : "Bound. The embed URL below is live now; the offline artifact is rendered in the right pane.",
    });
  }

  async function publish() {
    if (!instance) return;
    setBusy("publish");
    const res = await fetch(`/api/sync/instances/${instance.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-arena-key": syncKey ?? "" },
      body: JSON.stringify({ parentPageId: "page_demo_workspace", caption: `${spec?.label ?? slug} (Arena)` }),
    });
    const data = await res.json();
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: data.error });
    setInstance(data.instance);
    await refresh();
    setMessage({
      tone: "ok",
      text:
        data.publish.refreshes > 0
          ? `Offline renderer refreshed in place (refresh #${data.publish.refreshes}). One PATCH, no layout churn.`
          : `Installed as an HTML block behind the scenes (block ${data.publish.blockId}). Click again to see the in-place refresh.`,
    });
  }

  async function simulateNotionEdit() {
    if (!instance || !connectionId) return;
    setBusy("edit");
    const payload = editPayload(instance, table);
    const res = await fetch("/api/dev/notion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connectionId, ...payload }),
    });
    const data = await res.json();
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: data.error });
    await refresh();
    setMessage({
      tone: "ok",
      text: `A human edited ${payload.keyValue ?? "the state row"} in the workspace. The fanout committed ${data.changes ?? 0} change(s) to instances bound to it.`,
    });
  }

  async function trashRow() {
    if (!table?.rows.length) return;
    const row = table.rows[table.rows.length - 1];
    setBusy("trash");
    const res = await fetch("/api/dev/notion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connectionId, delete: row.id }),
    });
    const data = await res.json();
    setBusy(null);
    if (!data.ok) return setMessage({ tone: "bad", text: data.error });
    await refresh();
    setMessage({ tone: "warn", text: "A row was trashed in Notion. The next pull tombstones the key for every renderer." });
  }

  function flushCode() {
    if (!pendingCode) return;
    const target = liveRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ arena: "command", command: "apply-code", code: pendingCode }, "*");
    setMessage({ tone: "ok", text: "Sync code handed to the live renderer. It will be pushed to Notion on the next round." });
    setPendingCode(null);
    setTimeout(() => refresh(), 1200);
  }

  const liveStatus = instance ? statuses[instance.id] : undefined;
  /**
   * The palette, filtered and ordered: everything that can be bound first, then
   * the widgets that persist nothing, which are listed rather than hidden. A
   * catalog where a third of the widgets silently do not work is a catalog
   * nobody can trust, and `npm run check:coverage` reports the same split.
   */
  const shown = React.useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    const rows = q
      ? palette.filter(
          (r) =>
            r.slug.includes(q) ||
            r.label.toLowerCase().includes(q) ||
            (r.category ?? "").includes(q)
        )
      : palette;
    return [...rows].sort((a, b) => Number(Boolean(b.sample)) - Number(Boolean(a.sample)));
  }, [palette, paletteQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. workspace */}
      <Section step="1" title="Connect a workspace" tone="primary">
        {connections.length ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {connections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConnectionId(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] transition",
                    connectionId === c.id
                      ? "border-primary bg-primary-wash text-primary-deep"
                      : "border-border text-ink-soft hover:text-foreground"
                  )}
                >
                  {c.label} · {c.kind}
                </button>
              ))}
            </div>
            {connectionId && (
              <label className="flex flex-col gap-1 text-[12px] text-ink-soft">
                Bind to
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="rounded-md border border-border bg-card px-2 py-1.5 text-[12.5px] text-foreground"
                >
                  <option value="provision">Create a new database for this component</option>
                  {dataSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      Use my existing database: {ds.title} ({ds.properties.length} columns)
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[12.5px] text-ink-soft">
              Nothing connected yet. The demo workspace needs no credentials and implements the same
              adapter interface as the Notion API, including rate limits and the Free-plan block limit.
            </p>
            <div>
              <Button onClick={connectDemo} disabled={busy === "connect"}>
                {busy === "connect" ? "Connecting…" : "Connect the demo workspace"}
              </Button>
            </div>
            <details className="text-[12.5px] text-ink-soft">
              <summary className="cursor-pointer">Or paste a Notion token (PAT or internal connection)</summary>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ntn_… or secret_…"
                  className="w-full rounded-md border border-border bg-card px-2 py-1.5 font-mono text-[12px]"
                />
                <Button onClick={connectToken} disabled={!token || busy === "token"}>
                  {busy === "token" ? "Validating…" : "Connect"}
                </Button>
              </div>
              <p className="mt-1 text-[11.5px] text-ink-faint">
                The token is validated by reading its own identity, sealed with AES-256-GCM and stored
                server-side. It is never placed in a widget URL: the widget gets a scoped instance key instead.
              </p>
            </details>
          </div>
        )}
      </Section>

      {instances.length > 0 && (
        <Section step="1b" title="Bindings in this workspace">
          <div className="flex flex-col gap-2">
            <p className="text-[12.5px] text-ink-soft">
              Every instance this cache knows about, so a reload — or a second tab — does not lose the
              thing you were testing. Opening one brings back its table, its log and both renderers.
            </p>
            <div className="flex flex-wrap gap-2">
              {instances.slice(0, 24).map((row) => (
                <span
                  key={row.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                    instance?.id === row.id ? "border-primary bg-primary-wash" : "border-border bg-card",
                    row.revokedAt && "opacity-50"
                  )}
                >
                  <button
                    onClick={() => openInstance(row)}
                    disabled={Boolean(row.revokedAt)}
                    className="text-left disabled:cursor-not-allowed"
                  >
                    <span className="block text-[12px] font-medium text-foreground">
                      {palette.find((p) => p.slug === row.slug)?.label ?? row.slug}
                    </span>
                    <span className="block font-mono text-[10.5px] text-ink-faint">
                      {row.revokedAt
                        ? "revoked"
                        : `${row.binding.mode} · rev ${row.rev} · ${row.binding.databaseTitle}`}
                    </span>
                  </button>
                  {!row.revokedAt && (
                    <button
                      onClick={() => revoke(row)}
                      title="Revoke this binding"
                      className="text-[11px] text-ink-faint transition hover:text-destructive"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* 2. component + bind */}
      <Section step="2" title="Bind a component" tone="primary">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              placeholder="Search the catalog — habit, invoice, journal, kanban…"
              className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-[12.5px] sm:max-w-sm"
            />
            <span className="label-mono text-ink-faint">
              {palette.filter((r) => r.sample).length} of {palette.length || "…"} widgets have a first
              document
            </span>
          </div>

          <div className="grid max-h-[24rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((row) => {
              const selectable = Boolean(row.sample);
              return (
                <button
                  key={row.slug}
                  disabled={!selectable}
                  onClick={() => choose(row.slug)}
                  title={selectable ? row.slug : `${row.slug}: nothing persisted to bind`}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border p-3 text-left transition",
                    row.slug === slug
                      ? "border-primary bg-primary-wash"
                      : "border-border hover:border-border-strong",
                    !selectable && "cursor-not-allowed opacity-45 hover:border-border"
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                    {row.label}
                    {row.bound && (
                      <span className="rounded-full border border-primary/40 px-1.5 py-px font-mono text-[9.5px] text-primary-deep">
                        curated
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-faint">
                    {selectable
                      ? `${row.mode} · ${row.itemColumns} column${row.itemColumns === 1 ? "" : "s"} · ${row.source}`
                      : "no first document"}
                  </span>
                  {selectable ? (
                    <span className="text-[11px] leading-snug text-ink-soft">
                      {row.mode === "kv-blob"
                        ? "one row holds the whole document"
                        : `${row.sampleItems} row${row.sampleItems === 1 ? "" : "s"} to start from`}
                    </span>
                  ) : (
                    <span className="text-[11px] leading-snug text-ink-faint">
                      persists nothing until you interact with it
                    </span>
                  )}
                </button>
              );
            })}
            {!shown.length && (
              <p className="text-[12px] text-ink-soft">
                Nothing matches “{paletteQuery}”. The catalog has {palette.length} widgets.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12.5px] font-medium text-foreground">{spec?.label ?? slug}</p>
              <span className="font-mono text-[10.5px] text-ink-faint">{slug}</span>
              {spec && (
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10.5px] text-ink-soft">
                  {spec.mode}
                </span>
              )}
              {spec?.lossy && (
                <span className="rounded-full border border-tint-butter-ink/30 bg-tint-butter px-2 py-0.5 font-mono text-[10.5px] text-tint-butter-ink">
                  nested values · bound as a state blob
                </span>
              )}
            </div>
            {spec ? (
              <p className="mt-1 text-[12px] leading-snug text-ink-soft">
                {spec.tryThis ??
                  (spec.mode === "kv-blob"
                    ? "Change something in the right-hand pane (it is the offline channel: no network, storage baked in), take the sync code it offers and hand it to the left pane. The State cell changes on the next round."
                    : `Click a cell in the right-hand pane, take its sync code and push it through the left pane: one ${spec.itemLabel} becomes one row. Then edit that row in the table below — the widget updates on the next pull, without a reload.`)}
              </p>
            ) : null}
            {spec && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="label-mono text-ink-faint">Columns</span>
                {spec.columns.map((col) => (
                  <span
                    key={col.prop}
                    className={cn(
                      "rounded-full border px-2 py-0.5 font-mono text-[10.5px]",
                      col.keyPart
                        ? "border-primary/40 bg-primary-wash text-primary-deep"
                        : "border-border text-ink-soft"
                    )}
                    title={`${col.type}${col.keyPart ? " · part of the key" : ""}${
                      col.options ? ` · ${col.options} options` : ""
                    }`}
                  >
                    {col.prop}
                    <span className="text-ink-faint"> {col.type}</span>
                  </span>
                ))}
              </div>
            )}
            {spec && (
              <p className="mt-2 text-[11.5px] leading-snug text-ink-faint">
                {spec.mode === "kv-blob"
                  ? `One row holds the whole document, with a revision and an updated stamp — ${spec.modeWhy}.`
                  : `A row is identified by ${spec.keyColumns.join(" + ")}. ${
                      spec.source === "spec"
                        ? "The columns come from the component's own field list."
                        : spec.source === "declared"
                          ? "This shape is declared: it is not a guess from a sample."
                          : "The shape is inferred from the document the widget itself wrote."
                    }`}
                {spec.seed.from !== "none" ? ` First document: ${spec.seed.from}.` : ""}
                {spec.write ? ` Round trip: ${spec.write.exact ? "exact" : "lossy"}.` : ""}
              </p>
            )}
            {spec && spec.seed.unmapped.length > 0 && (
              <p className="mt-1 text-[11.5px] leading-snug text-tint-butter-ink">
                Fields with no column: {spec.seed.unmapped.join(", ")} — they stay in the widget's own
                document but are not queryable in Notion.
              </p>
            )}
          </div>

          <div>
            <Button onClick={create} disabled={!connectionId || busy === "create" || !spec}>
              {busy === "create" ? "Binding…" : `Bind ${spec?.label ?? slug} and open both renderers`}
            </Button>
          </div>
        </div>
      </Section>

      {message && (
        <div
          className={cn(
            "rounded-lg border p-3 text-[12.5px]",
            message.tone === "ok" && "border-tint-mint-ink/20 bg-tint-mint text-tint-mint-ink",
            message.tone === "warn" && "border-tint-butter-ink/20 bg-tint-butter text-tint-butter-ink",
            message.tone === "bad" && "border-destructive/20 bg-tint-ember text-tint-ember-ink"
          )}
        >
          {message.text}
        </div>
      )}

      {/* 3. the two renderers */}
      {instance && !urls && (
        <Section step="3" title="One instance, two renderers" tone="primary">
          <div className="flex flex-col gap-3">
            <p className="text-[12.5px] text-ink-soft">
              This binding is open, but this browser does not hold its sync key — the server shows a key
              once and keeps only its hash. Rotating mints a fresh one; every URL already pasted from
              the old one stops working, which is exactly what rotation is for.
            </p>
            <div>
              <Button onClick={rotate} disabled={busy === "rotate"}>
                {busy === "rotate" ? "Rotating…" : "Rotate the sync key and open both renderers"}
              </Button>
            </div>
          </div>
        </Section>
      )}

      {instance && urls && (
        <Section step="3" title="One instance, two renderers" tone="primary">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Renderer
                title="Live renderer"
                subtitle="Hosted embed · fetch + SSE · updates in place"
                badge={liveStatus ? `${liveStatus.state.status} · rev ${liveStatus.state.rev}` : "connecting"}
                badgeTone={liveStatus?.state.status === "synced" ? "ok" : "warn"}
              >
                <iframe
                  ref={liveRef}
                  src={`${urls.embedUrl}&host=1`}
                  title="Live renderer"
                  className="h-[300px] w-full rounded-md border border-border bg-card"
                />
                <p className="mt-2 text-[11.5px] text-ink-faint">
                  This frame reports origin <code>{liveStatus?.capabilities?.origin ?? "…"}</code>, storage{" "}
                  <code>{liveStatus?.capabilities?.storage ?? "…"}</code>, transport{" "}
                  <code>{liveStatus?.capabilities?.transport ?? "…"}</code>.
                </p>
              </Renderer>

              <Renderer
                title="Offline renderer"
                subtitle="Sandboxed frame · opaque origin · no network · outbox"
                badge={pendingCount ? `${pendingCount} queued` : "baked snapshot"}
                badgeTone={pendingCount ? "warn" : "ok"}
              >
                {offlineHtml ? (
                  <iframe
                    ref={offlineRef}
                    srcDoc={offlineHtml}
                    title="Offline renderer"
                    sandbox="allow-scripts"
                    className="h-[300px] w-full rounded-md border border-border bg-card"
                  />
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[12px] text-ink-faint">
                    Rendering the bundle…
                  </div>
                )}
                <p className="mt-2 text-[11.5px] text-ink-faint">
                  Sandboxed without <code>allow-same-origin</code>, exactly like a Notion HTML block:{" "}
                  <code>localStorage</code> throws, so edits queue in the outbox until a reachable renderer
                  flushes them. Click a habit cell here, then use <em>Get sync code</em> in its pill.
                </p>
              </Renderer>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={flushCode} disabled={!pendingCode}>
                {pendingCode ? `Flush the offline outbox (${pendingCount} ops)` : "No sync code yet"}
              </Button>
              <Button variant="secondary" onClick={simulateNotionEdit} disabled={busy === "edit"}>
                {busy === "edit" ? "Editing…" : "Simulate a human edit in Notion"}
              </Button>
              <Button variant="secondary" onClick={trashRow} disabled={busy === "trash" || !table?.rows.length}>
                Trash a row in Notion
              </Button>
              <Button variant="secondary" onClick={publish} disabled={busy === "publish"}>
                {instance.publish.refreshes ? `Refresh the HTML block (#${instance.publish.refreshes + 1})` : "Install an HTML block"}
              </Button>
              <a
                href={urls.offlineBundleUrl}
                className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-ink-soft hover:text-foreground"
              >
                Download the offline .html
              </a>
            </div>

            <div className="rounded-lg border border-border bg-raised p-3">
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-ink-faint">
                The URL carries the instance, not the browser
              </p>
              <div className="flex flex-col gap-2 font-mono text-[11px] text-ink-soft">
                <CopyLine label="embed" value={urls.embedUrl} />
                <CopyLine label="standalone" value={urls.standaloneUrl} />
                <CopyLine label="offline" value={urls.offlineBundleUrl} />
              </div>
              <p className="mt-2 text-[11.5px] text-ink-faint">
                Open the standalone URL on a phone and the same rows appear: identity is in the URL, so
                nothing depends on cookies or browser storage. Key prefix{" "}
                <code>{instance.id.slice(0, 8)}</code>, sync key{" "}
                <code>{(syncKey ?? "").slice(0, 11)}…</code> (shown once; rotate or revoke from the instance API).
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* 4. the user's side */}
      {instance && table && (
        <Section step="4" title="What the user sees in Notion" tone="primary">
          <div className="flex flex-col gap-3">
            <p className="text-[12.5px] text-ink-soft">
              Read back out of <strong>{table.databaseTitle}</strong> through the workspace adapter: {table.rows.length}{" "}
              rows, {instance.binding.fields.length} mapped columns, key property{" "}
              <code>{instance.binding.keyProp}</code>, conflict policy <code>{instance.binding.conflict}</code>.
              {instance.binding.mode === "kv-blob" && " State-blob mode: one row per instance, whole document in rich_text."}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-[12px]">
                <thead className="bg-raised text-ink-soft">
                  <tr>
                    {table.columns.map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      {table.columns.map((c) => (
                        <td key={c} className="max-w-[220px] truncate px-3 py-1.5 font-mono text-[11.5px]">
                          {row.cells[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!table.rows.length && (
                    <tr>
                      <td colSpan={table.columns.length} className="px-3 py-4 text-center text-ink-faint">
                        No rows yet. Click a cell in either renderer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      {/* 5. engine trace */}
      {instance && (
        <Section step="5" title="Engine trace" tone="primary">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-raised p-3">
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-ink-faint">
                Timeline (server)
              </p>
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="whitespace-nowrap font-mono text-[10.5px] text-ink-faint">
                      {e.at.slice(11, 19)}
                    </span>
                    <span className="text-ink-soft">
                      <code className="text-[10.5px]">{e.kind}</code> {e.detail}
                    </span>
                  </li>
                ))}
                {!events.length && <li className="text-ink-faint">Nothing yet.</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-raised p-3">
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-ink-faint">
                Change log (revision {instance.rev})
              </p>
              <ul className="flex flex-col gap-1.5 font-mono text-[11.5px] text-ink-soft">
                {log.map((entry, i) => (
                  <li key={`${entry.key}-${i}`}>
                    rev {entry.rev} · {entry.source} · {entry.key}
                    {entry.deleted ? " (deleted)" : ""}
                  </li>
                ))}
                {!log.length && <li className="font-sans text-ink-faint">No changes recorded yet.</li>}
              </ul>
              <p className="mt-2 text-[11.5px] text-ink-faint">
                Writes {instance.stats.writes} · reads {instance.stats.reads} · conflicts{" "}
                {instance.stats.conflicts}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* 6. open questions */}
      <Section step="6" title="Answer the open questions on your own workspace" tone="primary">
        <div className="flex flex-col gap-3 text-[12.5px] text-ink-soft">
          <p>
            Four things cannot be settled from documentation, only from a real Notion page (research §8). The
            probe file measures the sandbox it is running in and draws the answer:
          </p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              Does an HTML block allow <code>localStorage</code>, or is the origin opaque? (Q1)
            </li>
            <li>
              Does the embed frame permit popups and clipboard writes? (Q2)
            </li>
            <li>
              Does <code>PATCH /v1/blocks/{`{id}`}</code> swap an embed&apos;s file in place? (Q3, answered by
              the refresh button above on a real connection)
            </li>
            <li>
              Does the mobile app render an HTML block where it refuses embeds? (Q4, open the page on a phone)
            </li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/sync/probe?download=1"
              className="rounded-md border border-border px-3 py-1.5 text-[12.5px] hover:text-foreground"
            >
              Download the probe .html
            </a>
            <a
              href="/api/sync/probe"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-3 py-1.5 text-[12.5px] hover:text-foreground"
            >
              Run it in a tab
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  tone?: "primary";
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-wash text-[11px] font-semibold text-primary-deep">
          {step}
        </span>
        <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Renderer({
  title,
  subtitle,
  badge,
  badgeTone,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: "ok" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-medium">{title}</p>
          <p className="text-[11.5px] text-ink-soft">{subtitle}</p>
        </div>
        <span
          className={cn(
            "whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10.5px]",
            badgeTone === "ok"
              ? "border-tint-mint-ink/30 bg-tint-mint text-tint-mint-ink"
              : "border-tint-butter-ink/30 bg-tint-butter text-tint-butter-ink"
          )}
        >
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[76px] shrink-0 font-sans text-[10.5px] uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <span className="truncate">{value}</span>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {
            /* clipboard needs a secure context and a permission */
          }
        }}
        className="ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 font-sans text-[10.5px] text-ink-soft hover:text-foreground"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

/**
 * A plausible "human edited this row in Notion" payload for the current binding.
 * Records mode flips a non-key field; blob mode rewrites the state row with one
 * extra entry, which is what a person typing into the Avalon row would produce.
 */
function editPayload(instance: InstanceView, table: TableView | null) {
  const { binding } = instance;
  if (binding.mode === "kv-blob") {
    return {
      dataSourceId: binding.dataSourceId,
      keyProp: binding.keyProp,
      keyValue: instance.id,
      properties: {
        State: {
          rich_text: [
            {
              type: "text",
              text: {
                content: JSON.stringify({
                  note: `edited in Notion at ${new Date().toISOString().slice(11, 19)}`,
                }),
              },
            },
          ],
        },
      },
    };
  }
  const keyColumn = binding.keyProp;
  const row = table?.rows.find((r) => r.cells[keyColumn]);
  const field = binding.fields.find((f) => f.prop !== keyColumn && f.type === "number") ?? binding.fields[1];
  const value =
    field?.type === "number"
      ? { number: Math.floor(Math.random() * 5) + 1 }
      : field?.type === "checkbox"
        ? { checkbox: true }
        : { rich_text: [{ type: "text", text: { content: `edited ${Date.now() % 1000}` } }] };
  return {
    dataSourceId: binding.dataSourceId,
    keyProp: keyColumn,
    keyValue: row?.cells[keyColumn],
    properties: field ? { [field.prop]: value } : {},
  };
}

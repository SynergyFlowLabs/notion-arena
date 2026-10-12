"use client";

import * as React from "react";
import type { WidgetComponent, WidgetParam } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WidgetFrame } from "@/components/widget-frame";
import { CopyButton } from "@/components/copy-button";
import { IconCheck, IconClose, IconDownload, IconExternal, IconRefresh, IconTerminal } from "@/components/icons";
import { ComponentPreviewTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { JsonParamEditor } from "@/components/ui/json-editor";
import { specFor } from "@/lib/widget-editors";
import {
  ColorField,
  Combobox,
  Input,
  Label,
  SegmentedControl,
  Slider,
  Switch,
  Textarea,
} from "@/components/ui/form";
import { TimezoneField } from "@/components/detail/timezone-field";

type Config = Record<string, string | number | boolean>;

function defaults(w: WidgetComponent): Config {
  const out: Config = {};
  w.params.forEach((p) => (out[p.key] = p.default as string | number | boolean));
  return out;
}

function queryString(w: WidgetComponent, cfg: Config) {
  const parts: string[] = [];
  w.params.forEach((p) => {
    const v = cfg[p.key];
    if (v === undefined || v === null) return;
    if (String(v) === String(p.default)) return;
    parts.push(`${encodeURIComponent(p.key)}=${encodeURIComponent(String(v))}`);
  });
  return parts.join("&");
}

function Field({
  p,
  value,
  onChange,
  widgetSlug,
}: {
  p: WidgetParam;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
  widgetSlug: string;
}) {
  const id = `f-${p.key}`;

  // Timezone fields are detected via key name / help text (text field with IANA hint).
  const isTimezone =
    (p.key === "tz" || p.key === "timezone" || /IANA/i.test(p.help ?? "")) &&
    p.type === "text";

  // JSON array-of-objects fields (e.g. KPI Strip metrics) get the structured editor.
  const jsonSpec = p.type === "text" ? specFor(widgetSlug, p) : null;

  // Boolean toggle: Switch
  if (p.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-3 py-1">
        <div className="min-w-0 flex-1">
          <Label htmlFor={id}>{p.label}</Label>
          {p.help && <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{p.help}</p>}
        </div>
        <Switch id={id} checked={!!value} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }

  // Number: custom range slider + numeric readout
  if (p.type === "number") {
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id}>{p.label}</Label>
          <code className="font-mono text-[10.5px] text-ink-faint">?{p.key}=</code>
        </div>
        <Slider
          value={Number(value)}
          min={p.min ?? 0}
          max={p.max ?? 100}
          step={p.step ?? 1}
          onChange={(v) => onChange(v)}
        />
        {p.help && <p className="text-[11.5px] leading-snug text-ink-soft">{p.help}</p>}
      </div>
    );
  }

  // Color: swatch + hex input
  if (p.type === "color") {
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id}>{p.label}</Label>
          <code className="font-mono text-[10.5px] text-ink-faint">?{p.key}=</code>
        </div>
        <ColorField id={id} value={String(value)} onChange={(v) => onChange(v)} />
        {p.help && <p className="text-[11.5px] leading-snug text-ink-soft">{p.help}</p>}
      </div>
    );
  }

  // Select: shadcn Combobox (searchable) when options count ≥ 5; otherwise SegmentedControl for 2-3 options; native-looking Select for the rest.
  if (p.type === "select" && p.options) {
    const opts = p.options;
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id}>{p.label}</Label>
          <code className="font-mono text-[10.5px] text-ink-faint">?{p.key}=</code>
        </div>
        {opts.length <= 3 && (
          <SegmentedControl
            value={String(value)}
            onChange={(v) => onChange(v)}
            options={opts.map((o) => ({ value: o.value, label: o.label }))}
          />
        )}
        {opts.length > 3 && opts.length <= 8 && (
          <div className="relative">
            <select
              id={id}
              value={String(value)}
              onChange={(e) => onChange(e.target.value)}
              className="flex h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-[13px] text-foreground transition-colors focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/5"
            >
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="m6 8 4 4 4-4"/></svg>
          </div>
        )}
        {opts.length > 8 && (
          <Combobox
            id={id}
            value={String(value)}
            onChange={(v) => onChange(v)}
            options={opts.map((o) => ({ value: o.value, label: o.label }))}
            placeholder={`Choose ${p.label.toLowerCase()}…`}
          />
        )}
        {p.help && <p className="text-[11.5px] leading-snug text-ink-soft">{p.help}</p>}
      </div>
    );
  }

  // Date: native date picker (shadcn-styled)
  if (p.type === "date") {
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id}>{p.label}</Label>
          <code className="font-mono text-[10.5px] text-ink-faint">?{p.key}=</code>
        </div>
        <Input
          id={id}
          type="date"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        {p.help && <p className="text-[11.5px] leading-snug text-ink-soft">{p.help}</p>}
      </div>
    );
  }

  // JSON array-of-objects params get the structured row editor with a Raw-JSON toggle.
  if (jsonSpec) {
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id}>{p.label}</Label>
          <code className="font-mono text-[10.5px] text-ink-faint">?{p.key}=</code>
        </div>
        <JsonParamEditor
          spec={jsonSpec}
          value={String(value)}
          onChange={(v) => onChange(v)}
        />
        {p.help && !jsonSpec.description && (
          <p className="text-[11.5px] leading-snug text-ink-soft">{p.help}</p>
        )}
      </div>
    );
  }

  // Text: long content gets Textarea; tz keys get the searchable TimezoneField; otherwise Input.
  const isLong = String(value).length > 40 || (p.help?.length ?? 0) > 60;
  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{p.label}</Label>
        <code className="font-mono text-[10.5px] text-ink-faint">?{p.key}=</code>
      </div>
      {isTimezone ? (
        <TimezoneField id={id} value={String(value)} onChange={(v) => onChange(v)} />
      ) : isLong ? (
        <Textarea
          id={id}
          value={String(value)}
          rows={Math.min(4, Math.max(2, Math.ceil(String(value).length / 40)))}
          onChange={(e) => onChange(e.target.value)}
          placeholder={p.help}
          spellCheck={false}
        />
      ) : (
        <Input
          id={id}
          type="text"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={p.help}
          spellCheck={false}
        />
      )}
      {p.help && <p className="text-[11.5px] leading-snug text-ink-soft">{p.help}</p>}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-ink-soft hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-1.5">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          {lang ?? "code"}
        </span>
        <CopyButton value={children} compact label="Copy" />
      </div>
      <pre className="code-block max-h-[320px] overflow-auto px-4 py-3 text-[12.5px]">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Configurator({
  widget,
  origin,
  downloadUrl,
  htmlSnippet,
  apiSnippet,
}: {
  widget: WidgetComponent;
  origin: string;
  downloadUrl: string;
  htmlSnippet: string;
  apiSnippet: string;
}) {
  const [cfg, setCfg] = React.useState<Config>(() => defaults(widget));
  const [tab, setTab] = React.useState<"embed" | "html" | "api">("embed");
  const [nonce, setNonce] = React.useState(0);
  const [height, setHeight] = React.useState(widget.height);
  const [showConfig, setShowConfig] = React.useState(true);
  const [rawMode, setRawMode] = React.useState(false);
  const [rawJson, setRawJson] = React.useState("");
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  const qs = queryString(widget, cfg);
  const previewSrc = `${origin}/embed/${widget.slug}${qs ? `?${qs}` : ""}${qs ? "&" : "?"}v=${nonce}`;
  const embedHref = `${origin}/embed/${widget.slug}${qs ? `?${qs}` : ""}`;
  const downloadHref = `${downloadUrl}${qs ? `?${qs}` : ""}`;

  const set = (k: string) => (v: string | number | boolean) => {
    setCfg((prev) => ({ ...prev, [k]: v }));
    setNonce((n) => n + 1);
  };

  const notepad = `/embed → paste this URL → Embed link\n\n${embedHref}`;

  const configAsJson = React.useMemo(() => {
    const obj: Record<string, string | number | boolean> = {};
    widget.params.forEach((p) => { obj[p.key] = cfg[p.key]; });
    return JSON.stringify(obj, null, 2);
  }, [widget, cfg]);

  React.useEffect(() => { if (!rawMode) setRawJson(configAsJson); }, [configAsJson, rawMode]);

  function applyRawJson() {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      const next: Config = { ...cfg };
      widget.params.forEach((p) => {
        if (parsed[p.key] === undefined) return;
        const raw = parsed[p.key];
        if (p.type === "boolean") next[p.key] = Boolean(raw);
        else if (p.type === "number") next[p.key] = Number(raw);
        else if (raw === null || raw === undefined) next[p.key] = "";
        else if (typeof raw === "string") next[p.key] = raw;
        // Arrays / objects (e.g. KPI data array) stay JSON-stringified so
        // they round-trip through the URL the same way the per-field editor
        // serializes them.
        else next[p.key] = JSON.stringify(raw);
      });
      setCfg(next);
      setNonce((n) => n + 1);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ---------------- preview ---------------- */}
      <div className="min-w-0">
        <ComponentPreviewTransition slug={widget.slug}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-pop">
          <div className="flex items-center gap-2 border-b border-border bg-raised px-3 py-2">
            {/* Decorative window chrome, not status; hidden from AT and so
                exempt from the 3:1 graphic threshold. */}
            <span aria-hidden className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#e03e3e]/70" />
            <span className="size-2.5 rounded-full bg-[#dfab01]/70" />
            <span className="size-2.5 rounded-full bg-[#0f7b6c]/70" />
            </span>
            <span className="ml-2 truncate font-mono text-[11px] text-ink-soft">
              notion.so/your-dashboard
            </span>
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setNonce((n) => n + 1)}
                title="Reload preview"
                aria-label="Reload preview"
                className="grid size-6 place-items-center rounded-[6px] text-ink-soft transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              >
                <IconRefresh size={13} />
              </button>
              <a
                href={embedHref}
                target="_blank"
                rel="noreferrer noopener"
                title="Open the widget on its own"
                className="grid size-6 place-items-center rounded-[6px] text-ink-soft transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              >
                <IconExternal size={13} />
              </a>
            </span>
          </div>
          <WidgetFrame
            key={previewSrc}
            src={previewSrc}
            title={`${widget.name} live preview`}
            height={height}
            loading="eager"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
            className="bg-card"
          />
        </div>
        </ComponentPreviewTransition>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-soft">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 font-medium text-foreground">Block height</span>
            <Slider
              value={height}
              min={widget.minHeight}
              max={widget.maxHeight}
              onChange={setHeight}
              suffix="px"
              className="max-w-[200px]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="rounded-md px-1.5 py-0.5 font-medium underline-offset-2 hover:text-foreground hover:underline lg:hidden"
          >
            {showConfig ? "Hide" : "Show"} configuration
          </button>
          <span className="ml-auto hidden items-center gap-1.5 sm:flex">
            <span className="size-1.5 rounded-full bg-notion-green" />
            runs sandboxed, no network
          </span>
        </div>

        {/* --------------- tabs --------------- */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-1 border-b border-border bg-raised p-1.5" role="tablist">
            <Tab active={tab === "embed"} onClick={() => setTab("embed")}>
              Embed URL
            </Tab>
            <Tab active={tab === "html"} onClick={() => setTab("html")}>
              HTML block
            </Tab>
            <Tab active={tab === "api"} onClick={() => setTab("api")}>
              Install via API
            </Tab>
          </div>

          <div className="p-4">
            {tab === "embed" && (
              <div className="flex flex-col gap-4">
                <ol className="flex flex-col gap-2.5">
                  {[
                    <>In Notion, type <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">/embed</code> and press Enter.</>,
                    <>Paste the URL below and click <strong className="font-semibold">Embed link</strong>.</>,
                    <>Drag the block's edge to resize. It updates live from now on.</>,
                  ].map((node, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                      <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-secondary font-mono text-[10.5px] font-semibold text-foreground">
                        {i + 1}
                      </span>
                      <span>{node}</span>
                    </li>
                  ))}
                </ol>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-foreground">Embed URL</span>
                    <CopyButton value={embedHref} label="Copy URL" />
                  </div>
                  <Code lang="url">{embedHref}</Code>
                </div>

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-foreground">
                    Or paste it straight into the page
                  </div>
                  <Code lang="notepad">{notepad}</Code>
                </div>

                <p className="rounded-lg border border-border bg-raised px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                  <strong className="font-semibold text-foreground">Works on every Notion plan.</strong>{" "}
                  No integration, no OAuth, no server. The trade-off: the widget
                  lives on our host, so it needs network access to render, and a
                  workspace serving thousands of page views a day could hit fair-use limits. For
                  offline-safe delivery, use the HTML block tab.
                </p>
              </div>
            )}

            {tab === "html" && (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  Notion 3.6 added a native{" "}
                  <strong className="font-semibold text-foreground">HTML block</strong>. You
                  upload a <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">.html</code>{" "}
                  file and Notion renders it in a sandboxed iframe, the same
                  block <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">/html</code>{" "}
                  creates and that agents create through Notion MCP. Because the
                  sandbox has no URL, your configuration is baked into the file.
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href={downloadHref}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border-strong bg-background px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-secondary"
                  >
                    <span>Download {widget.slug}.html</span>
                    <IconDownload size={14} className="shrink-0" />
                  </a>
                  <CopyButton
                    className="h-auto justify-between px-3 py-2.5 text-[13px]"
                    value={async () => {
                      const res = await fetch(downloadHref);
                      return res.text();
                    }}
                    label="Copy the full HTML source"
                  />
                </div>

                <ol className="flex flex-col gap-2.5">
                  {[
                    <>Download the configured file above.</>,
                    <>In Notion, type <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">/html</code> and choose <strong className="font-semibold">Upload</strong>.</>,
                    <>Pick the file. Notion renders it immediately, on any plan.</>,
                  ].map((node, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                      <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-secondary font-mono text-[10.5px] font-semibold text-foreground">
                        {i + 1}
                      </span>
                      <span>{node}</span>
                    </li>
                  ))}
                </ol>

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-foreground">
                    The sandbox, honestly
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-[12.5px]">
                      <tbody>
                        {[
                          ["Interactive JS, CSS, canvas, WebAudio", true, "Runs inside the block"],
                          ["localStorage", true, "Per browser only: not synced, not shared with teammates"],
                          ["Reading your Notion data", false, "The block cannot see the page it sits on"],
                          ["Writing back to Notion", false, "Blocked for security"],
                          ["External API calls / CDN fonts", false, "No network access at all"],
                          ["Editing the code in place", false, "Re-upload, or regenerate from the source"],
                        ].map(([label, ok, note]) => (
                          <tr key={String(label)} className="border-b border-border last:border-0">
                            <td className="w-6 py-2 pl-3 align-top">
                              <span className={ok ? "text-[var(--tag-ink-green)]" : "text-[var(--tag-ink-red)]"}>
                                {ok ? <IconCheck size={12} /> : <IconClose size={11} />}
                              </span>
                            </td>
                            <td className="py-2 pr-2 align-top font-medium">{String(label)}</td>
                            <td className="py-2 pr-3 align-top text-ink-soft">{String(note)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === "api" && (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  Three requests: create a file upload, send the bytes, then
                  append an{" "}
                  <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">embed</code>{" "}
                  block that references the upload. This is the same path Notion
                  MCP uses, and it works headlessly with an integration token.
                </p>
                <Code lang="http">{htmlSnippet}</Code>

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-foreground">
                    Or let Notion Arena do it
                  </div>
                  <Code lang="bash">{apiSnippet}</Code>
                </div>

                <p className="rounded-lg border border-border bg-raised px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                  Your integration must be connected to the target page first:
                  page <strong className="font-semibold text-foreground">••• → Connections</strong>{" "}
                  → add your integration. Without that, every write returns{" "}
                  <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">restricted_resource</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- config sidebar ---------------- */}
      <aside className={cn("min-w-0", !showConfig && "hidden lg:block")}>
        <div className="lg:sticky lg:top-20 space-y-3">
          {/* ---- Configure card ---- */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-raised px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[13.5px] font-semibold text-foreground">Configure</h2>
                <span className="rounded-full border border-border bg-background px-1.5 py-px font-mono text-[10px] font-medium text-ink-faint">
                  {widget.params.length} {widget.params.length === 1 ? "param" : "params"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRawMode((v) => !v)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11.5px] font-medium transition-colors",
                    rawMode
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-ink-soft hover:border-border-strong hover:bg-secondary hover:text-foreground"
                  )}
                  title="Edit raw JSON"
                >
                  <IconTerminal size={11} />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCfg(defaults(widget));
                    setNonce((n) => n + 1);
                    setJsonError(null);
                  }}
                  className="inline-flex h-7 items-center rounded-md px-2 text-[11.5px] font-medium text-ink-soft transition-colors hover:bg-secondary hover:text-foreground"
                >
                  Reset
                </button>
              </div>
            </div>

            {rawMode ? (
              <div className="flex flex-col gap-2 p-3">
                <p className="text-[11.5px] leading-relaxed text-ink-soft">
                  Edit parameters as JSON. Press <span className="font-mono">Apply</span> to update the preview.
                </p>
                <textarea
                  spellCheck={false}
                  value={rawJson}
                  onChange={(e) => { setRawJson(e.target.value); setJsonError(null); }}
                  className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11.5px] leading-relaxed text-foreground focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/5"
                />
                {jsonError && (
                  <p className="rounded-md border border-[var(--tag-ink-red)]/20 bg-[color:color-mix(in_oklab,var(--notion-red)_10%,transparent)] px-2.5 py-1.5 text-[11.5px] text-[var(--tag-ink-red)]">
                    {jsonError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setRawJson(configAsJson); setJsonError(null); }}
                    className="inline-flex h-8 items-center rounded-md px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    Revert
                  </button>
                  <Button size="sm" onClick={applyRawJson} className="h-8 px-3 text-[12px]">
                    Apply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex max-h-[520px] flex-col gap-1 overflow-auto p-3">
                {widget.params.map((p) => (
                  <Field key={p.key} p={p} value={cfg[p.key]} onChange={set(p.key)} widgetSlug={widget.slug} />
                ))}
              </div>
            )}
          </div>

          {/* ---- Changed-params summary ---- */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[12px] font-semibold text-foreground">What changes</h3>
              <span className="font-mono text-[10.5px] text-ink-faint">
                {qs ? `${qs.split("&").length} override${qs.split("&").length === 1 ? "" : "s"}` : "defaults"}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
              {qs
                ? "Every control writes to the URL, so the same file can be configured differently on every page and shared as a link."
                : "You are on the defaults. Change any control and the URL, download and install payload all update live."}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {widget.params.map((p) => {
                const changed = String(cfg[p.key]) !== String(p.default);
                return (
                  <span
                    key={p.key}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px]",
                      changed
                        ? "border-foreground/25 bg-foreground/5 text-foreground"
                        : "border-border bg-background text-ink-faint"
                    )}
                  >
                    {changed && <span className="size-1 rounded-full bg-foreground" />}
                    {p.key}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

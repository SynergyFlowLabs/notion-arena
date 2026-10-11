"use client";

import * as React from "react";
import type { WidgetComponent, WidgetParam } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { IconCheck, IconClose, IconDownload, IconExternal, IconRefresh } from "@/components/icons";
import { ComponentPreviewTransition } from "@/components/page-transition";

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
}: {
  p: WidgetParam;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  const id = `f-${p.key}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-[12px] font-medium text-foreground"
      >
        <span>{p.label}</span>
        <code className="font-mono text-[10.5px] text-muted-foreground">?{p.key}=</code>
      </label>

      {p.type === "select" && p.options ? (
        <select
          id={id}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18"
        >
          {p.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : p.type === "boolean" ? (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={() => onChange(!value)}
          className={cn(
            "relative h-[22px] w-[38px] rounded-full border transition-colors",
            value ? "border-primary bg-primary" : "border-border-strong bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] size-[16px] rounded-full bg-white shadow-sm transition-transform duration-150",
              value ? "left-[19px]" : "left-[2px]"
            )}
          />
        </button>
      ) : p.type === "number" ? (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="range"
            min={p.min ?? 0}
            max={p.max ?? 100}
            step={p.step ?? 1}
            value={Number(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-primary)]"
          />
          <input
            type="number"
            min={p.min}
            max={p.max}
            step={p.step}
            value={Number(value)}
            onChange={(e) => onChange(e.target.value === "" ? (p.default as number) : Number(e.target.value))}
            className="h-8 w-[68px] rounded-lg border border-border bg-background px-2 text-right font-mono text-[12px] tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18"
          />
        </div>
      ) : p.type === "color" ? (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : "#2383e2"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background p-0.5"
          />
          <input
            type="text"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 flex-1 rounded-lg border border-border bg-background px-2 font-mono text-[12px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18"
          />
        </div>
      ) : p.type === "date" ? (
        <input
          id={id}
          type="date"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-lg border border-border bg-background px-2 font-mono text-[12px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18"
        />
      ) : (
        <textarea
          id={id}
          value={String(value)}
          rows={String(value).length > 60 ? 3 : 1}
          onChange={(e) => onChange(e.target.value)}
          placeholder={p.help}
          className="w-full resize-y rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[11.5px] leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/18"
        />
      )}
      {p.help && <p className="text-[11px] leading-snug text-muted-foreground">{p.help}</p>}
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
        "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="relative">
      <pre className="code-block max-h-[320px] overflow-auto pr-12">
        <code>{children}</code>
      </pre>
      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        {lang && (
          <span className="rounded border border-border bg-background px-1.5 py-px font-mono text-[10px] text-muted-foreground">
            {lang}
          </span>
        )}
        <CopyButton value={children} compact />
      </div>
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

  const qs = queryString(widget, cfg);
  const previewSrc = `${origin}/embed/${widget.slug}${qs ? `?${qs}` : ""}${qs ? "&" : "?"}v=${nonce}`;
  const embedHref = `${origin}/embed/${widget.slug}${qs ? `?${qs}` : ""}`;
  const downloadHref = `${downloadUrl}${qs ? `?${qs}` : ""}`;

  const set = (k: string) => (v: string | number | boolean) => {
    setCfg((prev) => ({ ...prev, [k]: v }));
    setNonce((n) => n + 1);
  };

  const notepad = `/embed → paste this URL → Embed link

${embedHref}`;

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
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <IconExternal size={13} />
              </a>
            </span>
          </div>
          <iframe
            key={previewSrc}
            src={previewSrc}
            title={`${widget.name} live preview`}
            sandbox="allow-scripts allow-popups allow-forms allow-modals"
            referrerPolicy="no-referrer"
            style={{ height }}
            className="block w-full border-0 bg-white dark:bg-[#191919]"
          />
        </div>
        </ComponentPreviewTransition>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-soft">
          <label className="flex items-center gap-2">
            Block height
            <input
              type="range"
              min={widget.minHeight}
              max={widget.maxHeight}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-primary)]"
            />
            <span className="w-11 font-mono tabular-nums">{height}px</span>
          </label>
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="rounded-md px-1.5 py-0.5 font-medium underline-offset-2 hover:text-foreground hover:underline lg:hidden"
          >
            {showConfig ? "Hide" : "Show"} configuration
          </button>
          <span className="ml-auto hidden items-center gap-1.5 sm:flex">
            <span className="size-1.5 rounded-full bg-[var(--notion-green)]" />
            runs sandboxed, no network
          </span>
        </div>

        {/* --------------- tabs --------------- */}
        <div className="mt-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-1 border-b border-border p-1.5" role="tablist">
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
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
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

                <p className="rounded-lg border border-border bg-raised px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
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
                <p className="text-[13px] leading-relaxed text-muted-foreground">
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
                    <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
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
                            <td className="py-2 pr-3 align-top text-muted-foreground">{String(note)}</td>
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
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Three requests: create a file upload, send the bytes, then
                  append an{" "}
                  <code className="rounded bg-secondary px-1 py-px font-mono text-[12px]">embed</code>{" "}
                  block that references the upload. This is the same path Notion
                  MCP uses, and it works headlessly with an integration token.
                </p>
                <Code lang="http">{htmlSnippet}</Code>

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-foreground">
                    Or let Blocksmith do it
                  </div>
                  <Code lang="bash">{apiSnippet}</Code>
                </div>

                <p className="rounded-lg border border-border bg-raised px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
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
        <div className="lg:sticky lg:top-20">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
              <h2 className="text-h6 text-foreground">Configure</h2>
              <button
                type="button"
                onClick={() => {
                  setCfg(defaults(widget));
                  setNonce((n) => n + 1);
                }}
                className="rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Reset
              </button>
            </div>
            <div className="flex max-h-[560px] flex-col gap-3.5 overflow-auto p-3.5">
              {widget.params.map((p) => (
                <Field key={p.key} p={p} value={cfg[p.key]} onChange={set(p.key)} />
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-raised p-3.5">
            <h3 className="text-[12px] font-semibold text-foreground">What changes</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              {qs
                ? "Every control writes to the URL, so the same file can be configured differently on every page, and shared as a link."
                : "You are on the defaults. Change anything and the URL, the download and the install payload all update."}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {widget.params.map((p) => {
                const changed = String(cfg[p.key]) !== String(p.default);
                return (
                  <span
                    key={p.key}
                    className={cn(
                      "rounded border px-1.5 py-px font-mono text-[10.5px]",
                      changed
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground/70"
                    )}
                  >
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

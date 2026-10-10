import type { Metadata } from "next";
import { DocPage, H2, H3, P, Note, UL, LI, Code, Table } from "@/components/docs/prose";

export const metadata: Metadata = {
  title: "Authoring a widget",
  description:
    "The four contracts every Blocksmith widget implements — configuration, theming, persistence and export — plus the checklist for adding one to the catalog.",
};

export default function AuthoringPage() {
  return (
    <DocPage
      eyebrow="Building"
      title="Authoring a widget"
      lede={
        <>
          A widget is one self-contained HTML file. No framework, no build step,
          no dependencies. That constraint is what makes both delivery channels
          possible from a single artifact — and it means four contracts have to
          be implemented identically in every file, or the catalog stops feeling
          like one product.
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <H2 id="rules">The four non-negotiables</H2>
        <Table
          head={["Rule", "Why", "Enforced by"]}
          widths={["26%", undefined, "26%"]}
          rows={[
            ["Zero external requests", "The sandbox has no network. A CDN link is a blank block, and a webfont is a layout shift on every load.", "Inline everything: CSS in <style>, JS in <script>, images as data: URIs."],
            ["Read config from two sources", "The /embed path has a URL; the downloaded path does not. One file must serve both.", 'The bk-config loader, in the same order, in every widget.'],
            ["Implement theme and accent", "A dashboard is re-skinned as a whole. Six widgets with six hardcoded palettes cannot be.", '<code>data-theme</code> on <code>&lt;html&gt;</code> plus <code>--accent</code>.'],
            ["Namespace persisted state", "Two widgets on one page must not collide, and a schema change must not corrupt stored data.", '<code>blocksmith.&lt;slug&gt;.v1</code>'],
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="skeleton">The file skeleton</H2>
        <P>
          Copy this and fill in the middle. Everything outside{" "}
          <code>{`<!-- widget -->`}</code> is boilerplate that should be identical
          across the catalog.
        </P>
        <Code
          lang="html"
          filename="public/widgets/my-widget.html"
          code={`<!doctype html>
<html lang="en" data-theme="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Widget</title>
<style>
  :root {
    --accent: #2383e2;
    --bg: #ffffff; --fg: #37352f; --muted: #787774;
    --line: rgba(55,53,47,.14); --raised: #f7f7f5;
  }
  html[data-theme="dark"] {
    --bg: #191919; --fg: #e6e6e4; --muted: #9b9a97;
    --line: rgba(255,255,255,.14); --raised: #202020;
  }
  @media (prefers-color-scheme: dark) {
    html[data-theme="auto"] {
      --bg: #191919; --fg: #e6e6e4; --muted: #9b9a97;
      --line: rgba(255,255,255,.14); --raised: #202020;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { overflow: hidden; background: var(--bg); color: var(--fg);
         font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI",
               Helvetica, Arial, sans-serif; }
  .wrap { height: 100%; display: flex; flex-direction: column; padding: 14px; gap: 10px; }
</style>
</head>
<body>
<div class="wrap">
  <!-- widget -->
</div>

<script>
(function () {
  "use strict";

  /* ---- 1. configuration ------------------------------------- */
  var baked = {};
  try {
    baked = JSON.parse(
      (document.getElementById("bk-config") || {}).textContent || "{}"
    );
  } catch (e) { baked = {}; }

  var qs = new URLSearchParams(location.search);
  var cfg = Object.assign({}, baked);
  qs.forEach(function (v, k) { cfg[k] = v; });

  var num  = function (k, d) { var n = parseFloat(cfg[k]); return isFinite(n) ? n : d; };
  var bool = function (k, d) {
    return cfg[k] === undefined ? d : ["true", "1"].indexOf(String(cfg[k])) > -1;
  };
  var str  = function (k, d) { return cfg[k] === undefined || cfg[k] === "" ? d : String(cfg[k]); };

  document.documentElement.setAttribute("data-theme", str("theme", "auto"));
  document.documentElement.style.setProperty("--accent", str("accent", "#2383e2"));

  /* ---- 2. state --------------------------------------------- */
  var KEY = "blocksmith.my-widget.v1";
  var load = function () {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; }
    catch (e) { return {}; }
  };
  var save = function (s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
  };

  /* ---- 3. widget -------------------------------------------- */
})();
</script>
</body>
</html>`}
        />
        <Note tone="blue" title="Why the IIFE and var">
          Notion renders blocks in WebViews of varying age, and an HTML block
          gives you no error surface — a syntax error is a blank rectangle. The
          defensive style is deliberate: wrap storage access in try/catch (Safari
          private mode throws on <code>setItem</code>), and never let one bad
          parameter throw during initialisation.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="sizing">Sizing and layout</H2>
        <P>
          A Notion block can be resized by dragging its edge to anything between
          roughly 100px and 900px tall and a full page column wide. Your widget
          has to survive all of it.
        </P>
        <UL>
          <LI>
            <code>body {"{ overflow: hidden }"}</code> and{" "}
            <code>.wrap {"{ height: 100% }"}</code>. A scrollbar inside a Notion
            block is a bad experience — the page already scrolls.
          </LI>
          <LI>
            Declare <code>height</code>, <code>minHeight</code> and{" "}
            <code>maxHeight</code> in the catalog entry. The configurator uses
            them to bound the resize slider, and the card preview uses{" "}
            <code>height</code>.
          </LI>
          <LI>
            Prefer fluid units and <code>clamp()</code> over breakpoints. There is
            no reliable viewport width to design against, because the same file
            renders in a full-width page, a narrow column and a mobile screen.
          </LI>
          <LI>
            Test at 240px wide and at 120px tall. If it is unusable there, the
            catalog entry's <code>minHeight</code> should say so honestly.
          </LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="export">Export, and the clipboard caveat</H2>
        <P>
          A sandboxed block cannot send anything anywhere. If a widget produces
          something worth keeping — a whiteboard drawing, an org chart, a
          calculator result — it has to hand it back through the clipboard or the
          console.
        </P>
        <Code
          lang="js"
          filename="the export pattern used by whiteboard, org-chart, roi-calculator, quote-card"
          code={`async function copy(payload, label) {
  try {
    await navigator.clipboard.writeText(payload);
    flash("Copied " + label);
  } catch (err) {
    // Clipboard writes need a user gesture and are blocked in some WebViews.
    // Always leave the payload in the console as a fallback.
    console.log("[blocksmith] " + label + "\\n" + payload);
    flash("Copy blocked — payload logged to the console");
  }
}`}
        />
        <UL>
          <LI>
            Offer the format the destination actually wants: JSON for
            re-importing, CSV for a Notion database import, SVG for a cover image.
          </LI>
          <LI>
            A <code>Download</code> button using a <code>blob:</code> URL and an{" "}
            <code>&lt;a download&gt;</code> works in the desktop app and in
            browsers, and fails silently in some mobile WebViews. Pair it with the
            copy path.
          </LI>
          <LI>
            Never rely on the clipboard alone. Every export in this catalog also
            logs, and says so in the toast.
          </LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="catalog">Adding it to the catalog</H2>
        <P>
          One file, one entry. Nothing else needs to change — the embed route,
          the download route, the registry manifest, the JSON Schema endpoint,
          the sitemap and the catalog UI all read from the same array.
        </P>
        <Code
          lang="ts"
          filename="lib/catalog.ts"
          code={`{
  slug: "my-widget",
  name: "My Widget",
  kind: "widget",
  emoji: "🧩",
  category: "visuals",
  tier: "free",
  plan: "Free",
  badge: "new",
  version: "1.0.0",
  updatedAt: "2026-10-11",
  tagline: "One line that says what it is for.",
  description:
    "Two or three sentences: what it shows, what it remembers, and the thing it cannot do.",
  tags: ["visual", "canvas"],
  features: [
    "Does the thing",
    "Remembers your last session per browser",
    "Exports SVG",
  ],
  useCases: [
    "Top of a project dashboard",
    "Inside a weekly review page",
  ],
  capabilities: {
    interactive: true,
    offlineSafe: true,
    persistsLocally: true,
    writesToNotion: false,   // no widget may ever set this true
    needsNetwork: false,      // false for widgets: the file is self-contained
  },
  delivery: ["embed", "html-block", "download"],
  file: "/widgets/my-widget.html",
  height: 260,
  minHeight: 160,
  maxHeight: 620,
  params: [
    { key: "label",  type: "string",  label: "Label",  default: "My Widget" },
    { key: "count",  type: "number",  label: "Count",  default: 10, min: 1, max: 100, step: 1 },
    { key: "compact",type: "boolean", label: "Compact",default: false },
    { key: "mode",   type: "select",  label: "Mode",   default: "a",
      options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
    { key: "accent", type: "color",   label: "Accent", default: "#2383e2" },
    { key: "theme",  type: "select",  label: "Theme",  default: "auto",
      options: [{ value: "auto", label: "Match Notion" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" }] },
  ],
}`}
        />
        <Note tone="yellow" title="params is a whitelist, not documentation">
          <code>buildConfig()</code> drops any key that is not declared here
          before it reaches the file. So an undeclared parameter is not merely
          undocumented — it is silently unreachable through the embed URL. If a
          widget reads <code>cfg.something</code>, it must appear in{" "}
          <code>params</code>.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="checklist">Pre-merge checklist</H2>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["No external requests", "grep the file for http://, https://, //cdn and @import. Zero hits."],
            ["Renders with no parameters", "Load /widgets/my-widget.html directly. Defaults must produce something sensible."],
            ["Theme works both ways", "theme=light and theme=dark, plus auto under both OS preferences."],
            ["Accent recolors coherently", "Try #e03e3e and #0f7b6c. Nothing should stay hardcoded blue."],
            ["Survives 120px tall", "No overflow, no clipped controls, no scrollbars."],
            ["Survives 240px wide", "Labels truncate or wrap rather than pushing layout out."],
            ["State persists and recovers", "Reload keeps it. Corrupt localStorage manually — it must not throw."],
            ["Reduced motion respected", "prefers-reduced-motion: reduce stops all animation."],
            ["Escape-safe config", "A label containing </script> and a quote must not break the page."],
            ["Export has a console fallback", "Block the clipboard and confirm the payload is logged."],
            ["Catalog entry matches source", "Every param the file reads is declared; every declared param is read."],
            ["Schema endpoint updated", "GET /r/schema.json includes the new widget automatically — verify it appears."],
          ].map(([t, d]) => (
            <div key={t} className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="mt-px grid size-[15px] shrink-0 place-items-center rounded-full border border-border-strong text-[9px] text-muted-foreground">
                ✓
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium">{t}</div>
                <div className="text-[12px] leading-snug text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="testing">Testing without Notion</H2>
        <P>
          You do not need a Notion workspace to develop a widget. Three URLs cover
          almost everything:
        </P>
        <Table
          head={["URL", "What it exercises"]}
          widths={["40%", undefined]}
          rows={[
            [<span><code>/widgets/my-widget.html</code></span>, "The raw file. No config injected, no CSP. Fastest iteration loop, and the closest thing to what an HTML block receives."],
            [<span><code>/embed/my-widget?count=5&theme=dark</code></span>, "The hosted path: parameter coercion, the whitelist, the CSP header, and framing."],
            [<span><code>/api/widget/my-widget?count=5</code></span>, "The download path: config baked into the bk-config tag, served with a Content-Disposition attachment header."],
          ]}
        />
        <H3>Diffing the two paths</H3>
        <P>
          Download the configured file and open it directly. It must render
          identically to the embed URL with the same parameters. If it does not,
          the widget is reading something from <code>location</code> that the
          sandbox will not have — usually <code>location.search</code> or{" "}
          <code>location.href</code>.
        </P>
        <Code
          lang="bash"
          code={`# same config, two channels, byte-comparable output
curl -s "localhost:3000/api/widget/my-widget?count=5&theme=dark" > baked.html
open baked.html   # must match /embed/my-widget?count=5&theme=dark`}
        />
      </section>
    </DocPage>
  );
}

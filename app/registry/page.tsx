import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { COMPONENTS, STATS } from "@/lib/catalog";
import { RegistryExplorer } from "@/components/registry-explorer";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Registry",
  description:
    "A shadcn/ui-compatible component registry for Notion. Machine-readable manifests at /r/index.json, per-item JSON with inlined HTML, and a JSON Schema of every widget's configuration.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/r/index.json",
    what: "The whole catalog in the shadcn registry.json envelope",
    auth: "none",
    size: "~30 KB",
  },
  {
    method: "GET",
    path: "/r/{name}.json",
    what: "One item, with its HTML / recipe JSON / manual steps inlined",
    auth: "none",
    size: "8–40 KB",
  },
  {
    method: "GET",
    path: "/r/schema.json",
    what: "JSON Schema for every widget's configuration parameters",
    auth: "none",
    size: "~8 KB",
  },
  {
    method: "GET",
    path: "/embed/{slug}",
    what: "The configured widget as a framable HTML document",
    auth: "none",
    size: "per widget",
  },
  {
    method: "GET",
    path: "/api/widget/{slug}",
    what: "The same HTML with config baked in, as a file download",
    auth: "none",
    size: "per widget",
  },
  {
    method: "GET",
    path: "/widgets/{slug}.html",
    what: "Raw source, exactly as it is committed",
    auth: "none",
    size: "per widget",
  },
  {
    method: "POST",
    path: "/api/install",
    what: "Plan or execute an install. mode: plan needs no credentials",
    auth: "token for writes",
    size: "—",
  },
];

const ITEM_FIELDS: [string, string, string][] = [
  ["name", "string", "The slug. Stable, lowercase, kebab-case — the address you install by."],
  ["type", "registry:component | registry:block", "component for widgets (a file you place), block for recipes (a structure you create)."],
  ["title / description", "string", "Human-facing name and the one-line pitch shown in the catalog."],
  ["categories", "string[]", "Which of the eight catalog categories it belongs to."],
  ["tags", "string[]", "kind, tier and the component's own tags. Filterable, and what search matches against."],
  ["meta.kind", "widget | native", "It tells you which delivery channels apply."],
  ["meta.tier", "free | pro", "Whether it is in the free set."],
  ["meta.version / updatedAt", "semver / date", "For deciding whether to re-install. Downloaded HTML blocks are frozen; embed URLs are not."],
  ["meta.delivery", "string[]", "The channels this component actually supports — never guessed from kind."],
  ["meta.capabilities", "object", "interactive, offlineSafe, persistsLocally, writesToNotion, needsNetwork. Booleans, not adjectives."],
  ["meta.params", "WidgetParam[]", "Widgets only: every configuration key with type, bounds, options, default and help text."],
  ["meta.embedUrl / downloadUrl", "string", "Widgets only: the two URLs a consumer needs, already absolute."],
  ["meta.recipe / installUrl", "string", "Recipes only: the recipe id and the endpoint that installs it."],
  ["files[]", "object[]", "path, type, target and — on /r/{name}.json — content. The HTML is inlined, not linked."],
];

export default async function RegistryPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const mcpConfig = `{
  "mcpServers": {
    "blocksmith": {
      "registries": {
        "@blocksmith": "${origin}/r/{name}.json"
      }
    }
  }
}`;

  const componentsJson = `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "registries": {
    "@blocksmith": "${origin}/r/{name}.json"
  }
}`;

  const nodeSnippet = `// Node 20+ — no dependencies
const registry = "${origin}/r";

const { items } = await (await fetch(\`\${registry}/index.json\`)).json();

// pick the interactive, offline-safe widgets
const candidates = items.filter(
  (i) => i.meta.kind === "widget" && i.meta.capabilities.offlineSafe
);

for (const item of candidates) {
  const full = await (await fetch(\`\${registry}/\${item.name}.json\`)).json();
  const html = full.files.find((f) => f.path.endsWith(".html")).content;

  // write it somewhere your installer can read
  await Bun.write(\`./notion/widgets/\${item.name}.html\`, html);
}`;

  const installSnippet = `# 1 · see the plan — no credentials, no side effects
curl -s -X POST ${origin}/api/install \\
  -H 'content-type: application/json' \\
  -d '{"component":"crm-pipeline","mode":"plan"}' | jq '.plan.calls[] | .method + " " + .path'

# 2 · run it
curl -s -X POST ${origin}/api/install \\
  -H 'content-type: application/json' \\
  -d '{
    "component": "crm-pipeline",
    "mode": "api",
    "token": "'"$NOTION_TOKEN"'",
    "parentPageId": "'"$PAGE_ID"'"
  }'`;

  const htmlBlockSnippet = `# a widget, installed as a native HTML block
curl -s -X POST ${origin}/api/install \\
  -H 'content-type: application/json' \\
  -d '{
    "component": "pomodoro-timer",
    "mode": "html-block",
    "token": "'"$NOTION_TOKEN"'",
    "parentPageId": "'"$PAGE_ID"'",
    "config": { "work": 50, "short": 10, "accent": "#0f7b6c" }
  }'`;

  return (
    <PageTransition>
      <section className="border-b border-border bg-raised">
        <div className="mx-auto w-full max-w-[1000px] px-4 pb-12 pt-14 sm:px-6">
          <p className="label-mono text-primary">
            Registry
          </p>
          <h1 className="font-display mt-4 text-h1 text-foreground sm:text-hero sm:leading-[1.04] sm:tracking-[-0.025em]">
            Not a gallery. A manifest.
          </h1>
          <p className="mt-5 max-w-2xl text-lede text-ink-soft">
            Every component is published in the shadcn/ui{" "}
            <code className="rounded bg-secondary px-1 py-px font-mono text-[14px]">registry-item</code>{" "}
            schema, with its source inlined rather than linked. A CLI, an MCP
            server, an agent or a 20-line script can list the catalog, read a
            component's exact capabilities, and install it — without anyone
            opening a browser.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              `${STATS.total} items`,
              `${STATS.widgets} with inlined HTML`,
              `${STATS.native} with generated API payloads`,
              "CORS: *",
              "no auth to read",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-border-strong bg-card px-2.5 py-1 text-[12px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1000px] px-4 pb-20 sm:px-6">
        {/* ============ live explorer ============ */}
        <section className="pt-12">
          <h2 className="font-display text-h4 text-foreground">Try it live</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            This panel is not a mock. It fetches{" "}
            <code className="rounded bg-secondary px-1 py-px font-mono text-[13px]">/r/index.json</code>{" "}
            from your browser and then each item as you click it — the same two
            requests an agent would make.
          </p>
          <div className="mt-4">
            <RegistryExplorer origin={origin} />
          </div>
        </section>

        {/* ============ endpoints ============ */}
        <section className="pt-14">
          <h2 className="font-display text-h4 text-foreground">Endpoints</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            Reads are open and cacheable. The only endpoint that touches your
            workspace is the install one, and its{" "}
            <code className="rounded bg-secondary px-1 py-px font-mono text-[13px]">plan</code>{" "}
            mode deliberately requires no credentials at all.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-left">
                  <th className="px-3.5 py-2.5 font-semibold">Method</th>
                  <th className="px-3.5 py-2.5 font-semibold">Path</th>
                  <th className="px-3.5 py-2.5 font-semibold">Returns</th>
                  <th className="px-3.5 py-2.5 font-semibold">Auth</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((e, i) => (
                  <tr key={e.path} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-raised/50")}>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-px font-mono text-[10.5px] font-bold",
                          e.method === "GET"
                            ? "border-[var(--notion-blue)]/40 bg-[var(--notion-blue)]/10 text-[var(--tag-ink-blue)]"
                            : "border-[var(--notion-green)]/40 bg-[var(--notion-green)]/10 text-[var(--tag-ink-green)]"
                        )}
                      >
                        {e.method}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <code className="font-mono text-[12.5px]">{e.path}</code>
                    </td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{e.what}</td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{e.auth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============ consuming ============ */}
        <section className="pt-14">
          <h2 className="font-display text-h4 text-foreground">Consuming it</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            Three ways in, from least to most code.
          </p>

          <div className="mt-5 flex flex-col gap-5">
            <Snippet
              n="A"
              title="Point an agent at the registry"
              body="Notion MCP servers and shadcn-compatible CLIs both read a namespaced registry map. Once it is there, “install the pomodoro timer as an HTML block” is a prompt, not a task."
              lang="json"
              filename="mcp config / components.json"
              code={mcpConfig}
              extra={componentsJson}
              extraLabel="or, for a shadcn-style CLI"
            />
            <Snippet
              n="B"
              title="Two fetches and a file write"
              body="The index gives you names and capabilities. The item gives you the bytes. That is the whole protocol — there is no SDK and no auth for reads."
              lang="ts"
              filename="install.ts"
              code={nodeSnippet}
            />
            <Snippet
              n="C"
              title="Or let the server do the Notion calls"
              body="Plan mode returns the exact request sequence with bodies. Switch to api mode with a token and a parent page id and it executes them, including the two-pass data-source resolution relations require."
              lang="bash"
              filename="shell"
              code={installSnippet}
              extra={htmlBlockSnippet}
              extraLabel="and the widget equivalent"
            />
          </div>
        </section>

        {/* ============ item schema ============ */}
        <section className="pt-14">
          <h2 className="font-display text-h4 text-foreground">The item schema</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            The envelope is shadcn's, because tooling already understands it. The{" "}
            <code className="rounded bg-secondary px-1 py-px font-mono text-[13px]">meta</code>{" "}
            object is ours, and it carries the two things a consumer actually
            needs to decide what to do: which channels apply, and what the
            component is capable of.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {ITEM_FIELDS.map(([field, type, note], i) => (
              <div
                key={field}
                className={cn(
                  "grid gap-1 border-b border-border px-3.5 py-2.5 last:border-0 sm:grid-cols-[190px_160px_minmax(0,1fr)] sm:gap-3",
                  i % 2 === 1 && "bg-raised/50"
                )}
              >
                <code className="font-mono text-[12.5px] font-medium text-foreground">{field}</code>
                <code className="font-mono text-[11.5px] text-primary">{type}</code>
                <span className="text-[12.5px] leading-relaxed text-muted-foreground">{note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ versioning ============ */}
        <section className="pt-14">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                t: "Versioning",
                d: "Items carry semver in meta.version. Widget source files are frozen per version at /widgets/{slug}.html; embed URLs always serve the latest patch. If you are shipping a template to a customer, download the file — that is the whole point of the second channel.",
              },
              {
                t: "Stability",
                d: "Slugs never change once published. A slug that is retired keeps resolving with a meta.deprecated flag rather than 404ing, so a manifest pinned in someone's config does not silently break.",
              },
              {
                t: "Self-hosting",
                d: "Widgets are single files with no dependencies. Fork the repo, serve public/widgets/ from anywhere, and point your registry base at your own host. Nothing phones home — there is nothing to phone.",
              },
              {
                t: "Caching",
                d: "Registry JSON is cached 5 minutes at the edge with stale-while-revalidate. Widget HTML is cached 60 seconds, so a configuration change is visible almost immediately while repeat loads stay cheap.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-[14px] font-semibold">{c.t}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.7] text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ catalog list ============ */}
        <section className="pt-14">
          <h2 className="font-display text-h4 text-foreground">Everything published</h2>
          <p className="mt-2 text-[14.5px] text-muted-foreground">
            {COMPONENTS.length} items. Click a name for the human page, or the
            code for the manifest.
          </p>
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {COMPONENTS.map((c) => (
              <div
                key={c.slug}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-border-strong"
              >
                <span className="text-[15px]">{c.emoji}</span>
                <Link href={`/components/${c.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:text-primary hover:underline">
                  {c.name}
                </Link>
                <a
                  href={`/r/${c.slug}.json`}
                  className="shrink-0 rounded border border-border bg-secondary px-1.5 py-px font-mono text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.slug}.json
                </a>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-px font-mono text-[9.5px] uppercase",
                    c.kind === "widget"
                      ? "bg-[color-mix(in_oklab,var(--notion-purple)_14%,transparent)] text-[var(--tag-ink-purple)]"
                      : "bg-[color-mix(in_oklab,var(--notion-green)_14%,transparent)] text-[var(--tag-ink-green)]"
                  )}
                >
                  {c.kind === "widget" ? "html" : "api"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

function Snippet({
  n,
  title,
  body,
  lang,
  filename,
  code,
  extra,
  extraLabel,
}: {
  n: string;
  title: string;
  body: string;
  lang: string;
  filename: string;
  code: string;
  extra?: string;
  extraLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[11.5px] font-bold">
          {n}
        </span>
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold">{title}</h3>
          <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 border-b border-border bg-raised px-3 py-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">{filename}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="rounded border border-border bg-background px-1.5 py-px font-mono text-[10px] text-muted-foreground">
              {lang}
            </span>
            <CopyButton compact value={code} />
          </span>
        </div>
        <pre className="code-block max-h-[420px] overflow-auto rounded-none border-0 bg-transparent">
          <code>{code}</code>
        </pre>
      </div>
      {extra && (
        <div className="relative border-t border-border">
          <div className="flex items-center gap-2 border-b border-border bg-raised px-3 py-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">{extraLabel}</span>
            <span className="ml-auto">
              <CopyButton compact value={extra} />
            </span>
          </div>
          <pre className="code-block max-h-[300px] overflow-auto rounded-none border-0 bg-transparent">
            <code>{extra}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

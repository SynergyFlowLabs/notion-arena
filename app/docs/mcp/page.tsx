import type { Metadata } from "next";
import { DocPage, H2, H3, P, Note, UL, LI, Code } from "@/components/docs/prose";

export const metadata: Metadata = {
  title: "MCP Server",
  description:
    "Reference for the notion-arena-mcp MCP server: tools, parameters, install commands for Claude Code / Desktop / Cursor / Windsurf, env variables, and how to pin versions.",
};

export default function McpDocsPage() {
  return (
    <DocPage
      eyebrow="For AI agents"
      title="MCP server reference"
      lede={
        <>
          <code className="font-mono">notion-arena-mcp</code> is a stdio MCP server
          that exposes the Notion Arena catalog as ten typed tools. It is
          read-only by default — listing, searching and building URLs never
          touches your Notion workspace. Only <code className="font-mono">plan_install</code>{" "}
          with a supplied token writes anything, and even then it prints the
          exact request sequence first.
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <H2 id="install">Install</H2>
        <P>
          The package is published to npm as{" "}
          <code className="font-mono">notion-arena-mcp</code>. The legacy name{" "}
          <code className="font-mono">blocksmith-mcp</code> is kept as a bin
          alias for the first few releases so existing configs don&apos;t break.
        </P>
        <H3>Claude Code (recommended)</H3>
        <Code
          lang="bash"
          code={`# Project scope — travels with the repo
claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp

# Pinned to a specific version
claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp@0.2.2

# Global (all your projects)
claude mcp add --scope user notion-arena -- npx -y notion-arena-mcp`}
        />
        <H3>Claude Desktop</H3>
        <P>
          Add the following entry to{" "}
          <code className="font-mono">claude_desktop_config.json</code>
          {" "}(<code className="font-mono">~/Library/Application Support/Claude/</code> on macOS,
          {" "}<code className="font-mono">%APPDATA%/Claude/</code> on Windows):
        </P>
        <Code
          lang="json"
          code={`{
  "mcpServers": {
    "notion-arena": {
      "command": "npx",
      "args": ["-y", "notion-arena-mcp@0.2.2"],
      "env": {
        "NOTION_ARENA_SITE_URL": "https://notionarena.vercel.app"
      }
    }
  }
}`}
        />
        <H3>Cursor / Windsurf</H3>
        <P>
          Save the same JSON block to <code className="font-mono">.cursor/mcp.json</code>
          {" "}in your project root, or to Windsurf&apos;s MCP config panel. The
          schema is identical to Claude Desktop&apos;s.
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="env">Environment variables</H2>
        <UL>
          <LI>
            <code className="font-mono">NOTION_ARENA_SITE_URL</code> — base URL of the
            site. Defaults to <code className="font-mono">https://notionarena.vercel.app</code>.
            Override this to point at a self-hosted deployment or a local dev server.
          </LI>
          <LI>
            <code className="font-mono">NOTION_ARENA_REGISTRY_URL</code> — base URL of the
            JSON registry. Defaults to <code className="font-mono">{"{SITE_URL}"}/r</code>.
            Override only if you fork the registry separately.
          </LI>
          <LI>
            <code className="font-mono">BLOCKSMITH_SITE_URL</code> /{" "}
            <code className="font-mono">BLOCKSMITH_REGISTRY_URL</code> — legacy aliases
            from the pre-rename package. Honoured as fallbacks so existing installs
            keep working.
          </LI>
        </UL>
        <Note tone="blue" title="Why stdio, not HTTP/SSE?">
          Stdio servers start on demand, leave no daemon running, and need no
          port. There is nothing to secure, no CORS to configure, and no
          locally-served URL to whitelist.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="tools">Tool reference</H2>
        <P>
          All tools take typed Zod parameters and return JSON. Errors are
          returned as structured <code className="font-mono">{"{ error: string }"}</code>
          {" "}objects, never thrown exceptions.
        </P>
        <H3>Browsing</H3>
        <UL>
          <LI><code className="font-mono">list_components({"{ category?, tier?, kind?, delivery?, capabilities? }"})</code> — returns every component matching the filters. Pagination is not needed: the full catalog is ~50 KB.</LI>
          <LI><code className="font-mono">search_components("{`{query}`}")</code> — case-insensitive substring search across name, tagline, description, features, use cases and tags.</LI>
          <LI><code className="font-mono">get_categories()</code> — eight categories with emoji, tint, blurb and current counts.</LI>
          <LI><code className="font-mono">get_site_info()</code> — version, total counts, endpoints, and any active rate limits.</LI>
        </UL>
        <H3>Detail</H3>
        <UL>
          <LI><code className="font-mono">get_component("{`{slug}`}")</code> — full item: params, capabilities, features, use cases, delivery channels, and related slugs.</LI>
          <LI><code className="font-mono">get_widget_schema("{`{slug}`}")</code> — JSON Schema of every param (type, default, min/max, options, help text), ready to drive a config form or to coerce LLM output.</LI>
          <LI><code className="font-mono">get_recipe("{`{slug}`}")</code> — recipe-specific detail: declared manual steps, required Notion API scopes, and the sequence outline.</LI>
        </UL>
        <H3>Building URLs & install plans</H3>
        <UL>
          <LI><code className="font-mono">build_embed_url("{`{slug}`}", {"{ config }"})</code> — returns <code className="font-mono">{"{ embedUrl, downloadUrl, htmlSnippet }"}</code> with validated config. Unknown keys are dropped.</LI>
          <LI><code className="font-mono">plan_install("{`{slug}`}", {"{ mode: 'plan' | 'embed' | 'html-block' | 'api', config?, token?, parentPageId? }"})</code> — in <code className="font-mono">plan</code> mode, returns total request count, every payload, manual steps, and warnings, without touching your workspace. Add a token and parent page id to execute.</LI>
          <LI><code className="font-mono">get_registry_item("{`{slug}`}")</code> — raw shadcn registry JSON with file contents inlined, used by <code className="font-mono">npx shadcn add</code>.</LI>
          <LI><code className="font-mono">get_install_guide("{`{slug}`}", "{`{mode}`}")</code> — human-readable, Markdown-flavoured install instructions for the given channel.</LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="honesty">What the server will not do</H2>
        <UL>
          <LI>It will never call Notion without you passing a token, even in install mode.</LI>
          <LI>It will never silently omit a manual step. Recipes declare every click-path the API cannot cover, and the plan prints them before executing.</LI>
          <LI>It will not invent parameters. If a config key is not declared on the widget, it is dropped before the URL is built.</LI>
          <LI>It will not phone home. The binary is open source; it fetches only the registry JSON and widget source files from the configured site URL.</LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="versioning">Versioning &amp; pinning</H2>
        <P>
          Widget source files are frozen per semver patch under{" "}
          <code className="font-mono">/widgets/{"{slug}"}.html</code>. Embed URLs serve
          the latest patch for the major.minor you requested, so bug fixes reach
          existing pages automatically. The MCP package follows semver and the
          npm version you pin is the tool schema you get.
        </P>
        <P>
          To guarantee reproducible agent behaviour in CI, pin the package with{" "}
          <code className="font-mono">npx -y notion-arena-mcp@0.2.2</code>{" "}
          rather than leaving the version floating.
        </P>
      </section>
    </DocPage>
  );
}

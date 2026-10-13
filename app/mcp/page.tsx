import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Snippet } from "@/components/ui/snippet";
import {
  IconArrowRight,
  IconCheck,
  IconTerminal,
} from "@/components/icons";

export const metadata: Metadata = withCanonical("/mcp", {
  title: "MCP Server",
  description:
    "The Notion Arena MCP server lets Claude Code, Cursor, Windsurf and any MCP-compatible agent browse, configure and install 203 Notion components from inside the chat.",
});

const TOOLS = [
  { name: "list_components", d: "Browse every component with category, tier and capability filters." },
  { name: "search_components", d: "Keyword search across name, tagline, description, tags and features." },
  { name: "get_component", d: "Full detail for one slug — params, features, use cases, capabilities, delivery channels." },
  { name: "get_widget_schema", d: "JSON Schema of every widget parameter, ready to drive a form or a config prompt." },
  { name: "build_embed_url", d: "Given a slug + config, returns the exact /embed URL and the matching download URL." },
  { name: "plan_install", d: "Dry-run (no token) install plan: every Notion API request, payload, manual step and warning." },
  { name: "get_registry_item", d: "Raw shadcn-compatible registry JSON, including inline file contents." },
  { name: "get_install_guide", d: "Human-readable install instructions for Embed URL, HTML block or Native recipe." },
  { name: "get_categories", d: "All eight categories with emoji, tint and current counts." },
  { name: "get_site_info", d: "Site endpoints, version, component counts, rate limits." },
];

const CLAUDE_CODE_INSTALL = `claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp`;

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "notion-arena": {
      "command": "npx",
      "args": ["-y", "notion-arena-mcp@0.2.2"],
      "env": {
        "NOTION_ARENA_SITE_URL": "https://notionarena.vercel.app"
      }
    }
  }
}`;

const CURSOR_CONFIG = `{
  "mcpServers": {
    "notion-arena": {
      "command": "npx",
      "args": ["-y", "notion-arena-mcp@0.2.2"],
      "env": {
        "NOTION_ARENA_SITE_URL": "https://notionarena.vercel.app"
      }
    }
  }
}`;

const MCP_AGENT_PROMPT = `Add the Notion Arena MCP server to this project so I can browse, configure and install Notion components from our chat.

Run this from the project root:

  claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp

Once the server is connected:
- Use list_components / search_components to find the right component.
- Use get_component to inspect params.
- For embed/HTML installs, hand me the built URL with build_embed_url.
- For native recipes, always run plan_install in "plan" mode first and show me the request list + manual steps before asking for a Notion token.
- Defaults: prefer the HTML block for templates I sell (offline, frozen) and the Embed URL for internal dashboards (auto-updates). Never promise a widget can read or write Notion data.`;

export default function McpPage() {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="border-b border-border bg-raised">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-start px-4 pb-14 pt-14 sm:px-6 lg:pt-20">
          <p className="label-mono text-primary">for AI agents</p>
          <h1 className="font-display mt-4 max-w-3xl text-h1 text-foreground sm:text-hero sm:leading-[1.04] sm:tracking-[-0.025em]">
            An MCP server that knows every component in this registry.
          </h1>
          <p className="mt-5 max-w-2xl text-lede text-ink-soft">
            Install once and your AI agent can browse 203 components, configure
            them with the right params, hand you a ready-to-paste embed URL, and
            plan a full API install — without leaving the conversation.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-[15px] font-semibold sm:w-auto">
              <a href="#install">
                Install the server
                <span className="ml-1.5" aria-hidden="true">→</span>
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-[15px] sm:w-auto">
              <Link href="/docs/mcp">Read the full docs</Link>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-faint">
            <li className="flex items-center gap-1.5">
              <IconCheck size={13} className="text-notion-green" />
              10 tools, zero OAuth scopes needed to browse
            </li>
            <li className="flex items-center gap-1.5">
              <IconCheck size={13} className="text-notion-green" />
              Runs over stdio — no server, no port, no daemon
            </li>
            <li className="flex items-center gap-1.5">
              <IconCheck size={13} className="text-notion-green" />
              Ships from npm as <code className="font-mono text-[12px]">notion-arena-mcp</code>
            </li>
          </ul>
        </div>
      </section>

      {/* What you can do */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-16 sm:px-6">
          <h2 className="font-display text-h2 text-foreground">What the agent can do</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Every tool is read-only by default. An install plan never asks for a
            Notion token until you approve it, and the final API call prints the
            exact requests it is about to make.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div key={t.name} className="bg-background p-5">
                <code className="font-mono text-[13px] font-semibold text-primary">{t.name}</code>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-soft">{t.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-16 sm:px-6">
          <h2 className="font-display text-h2 text-foreground">Install in two lines</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            The package is <code className="font-mono">notion-arena-mcp</code> on npm.
            Run it with <code className="font-mono">npx</code> so clients always
            pull the latest version; pin a version if you want reproducible tool
            behavior.
          </p>

          <div className="mt-8 flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center gap-2">
                <span className="grid size-[22px] place-items-center rounded-full bg-secondary font-mono text-[11px] font-semibold text-foreground">
                  1
                </span>
                <h3 className="text-[16px] font-semibold text-foreground">Claude Code</h3>
              </div>
              <p className="mt-1.5 pl-[30px] text-[13px] text-ink-faint">
                Travels with the repo — anyone who clones it gets the same tools.
              </p>
              <div className="mt-3">
                <Snippet code={CLAUDE_CODE_INSTALL} lang="bash" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center gap-2">
                <span className="grid size-[22px] place-items-center rounded-full bg-secondary font-mono text-[11px] font-semibold text-foreground">
                  2
                </span>
                <h3 className="text-[16px] font-semibold text-foreground">Claude Desktop</h3>
              </div>
              <p className="mt-1.5 pl-[30px] text-[13px] text-ink-faint">
                Drop this into <code className="font-mono text-[12px]">~/Library/Application Support/Claude/claude_desktop_config.json</code>.
              </p>
              <div className="mt-3">
                <Snippet code={CLAUDE_DESKTOP_CONFIG} lang="json" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center gap-2">
                <span className="grid size-[22px] place-items-center rounded-full bg-secondary font-mono text-[11px] font-semibold text-foreground">
                  3
                </span>
                <h3 className="text-[16px] font-semibold text-foreground">Cursor / Windsurf</h3>
              </div>
              <p className="mt-1.5 pl-[30px] text-[13px] text-ink-faint">
                Save to <code className="font-mono text-[12px]">.cursor/mcp.json</code> in the project root.
              </p>
              <div className="mt-3">
                <Snippet code={CURSOR_CONFIG} lang="json" />
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-primary/20 bg-primary-wash p-4 text-[13.5px] leading-relaxed text-primary-deep">
            <p>
              <strong className="font-semibold">Self-hosted?</strong> Add the env
              flag <code className="font-mono text-[12.5px]">-e NOTION_ARENA_SITE_URL=https://your-host.com</code>{" "}
              to point the server at your own deployment of the site. It works
              offline against the public catalog, but URLs and download links
              will resolve to the host you choose.
            </p>
          </div>

          {/* Ready-to-paste prompt */}
          <div className="mt-10">
            <h3 className="font-display text-h3 text-foreground">
              Or just paste this prompt into your agent
            </h3>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
              If you don&apos;t want to edit config files by hand, copy the block
              below and paste it directly into Claude Code, Cursor, ChatGPT with
              MCP support, or any other agent. It installs the server, restarts
              the client, and explains the decision rules so the agent picks the
              right channel first try.
            </p>
            <div className="mt-4">
              <Snippet code={MCP_AGENT_PROMPT} lang="prompt" size="sm" />
            </div>
          </div>

          <p className="mt-8 text-[13.5px] text-ink-faint">
            Want to know exactly what each tool returns, how to pin a version,
            or how to author recipes that the MCP server can install?{" "}
            <Link href="/docs/mcp" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/70">
              Read the MCP documentation
              <IconArrowRight size={13} className="ml-1 inline-block" />
            </Link>
          </p>
        </div>
      </section>

      {/* Pair CTA */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-start gap-4 px-4 py-16 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <h2 className="font-display text-h3 text-foreground">
              Building agents, not just using them?
            </h2>
            <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-soft">
              Pair the MCP server with the Skills file to teach your agent the
              honesty policy, the three-channel decision table, and the
              localStorage / sandbox limits — before it makes a mistake.
            </p>
          </div>
          <Button asChild variant="outline" className="h-11 px-5 text-[14.5px]">
            <Link href="/skills">See the skill</Link>
          </Button>
        </div>
      </section>
    </PageTransition>
  );
}

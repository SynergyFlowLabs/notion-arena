import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, H2, P, Note, UL, LI } from "@/components/docs/prose";
import { ThemedIllustration } from "@/components/illustrations";
import { STATS } from "@/lib/catalog";
import { IconArrowRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How Notion Arena components get into Notion, what the HTML block sandbox allows, and every Notion API limit that shapes a recipe, with citations.",
};

const PAGES = [
  {
    href: "/docs/sandbox",
    emoji: "📦",
    title: "The HTML block sandbox",
    d: "What Notion's native HTML block can and cannot do, verified line by line. Read this before you design anything for it.",
  },
  {
    href: "/docs/api-limits",
    emoji: "📐",
    title: "Notion API limits, cited",
    d: "Block nesting, children per request, rate limits, the missing button type, automations, recurring templates, and the two-pass data-source problem.",
  },
  {
    href: "/docs/authoring",
    emoji: "🛠️",
    title: "Authoring a widget",
    d: "The configuration contract, the theming contract, the persistence contract, and how to add a component to the catalog.",
  },
  {
    href: "/docs/recipes",
    emoji: "🧬",
    title: "Authoring a recipe",
    d: "Declaring databases, views, seed rows and page bodies; how relations resolve; when to write a manual step instead.",
  },
  {
    href: "/how-it-works",
    emoji: "🧭",
    title: "How it works",
    d: "The three delivery channels side by side, with the failure table and a decision matrix.",
  },
  {
    href: "/registry",
    emoji: "📇",
    title: "The registry",
    d: "Endpoints, the item schema, and three ways to consume the catalog from code or from an agent.",
  },
];

export default function DocsPage() {
  return (
    <DocPage
      eyebrow="Documentation"
      title="Read this before you install"
      lede={
        <>
          Other component libraries document how to use their components. This one
          documents the platform they run on, because Notion's constraints, not
          our design choices, decide what is possible. Everything here is
          verified against the Notion API reference or the HTML block
          documentation, and every limit is cited.
        </>
      }
    >
      <ThemedIllustration
        name="docs"
        alt="An open manual surrounded by the tools it documents: a wrench, angle brackets, a database cylinder and a shield."
        className="mb-4 h-52 w-full max-w-[520px]"
      />
      <section className="flex flex-col gap-4">
        <H2>The short version</H2>
        <P>
          Notion has no plugin system, so there is no single install path. There
          are three, and they have almost nothing in common:
        </P>
        <UL>
          <LI>
            <strong className="font-semibold text-foreground">Embed URL</strong>:{" "}
            we host the widget, Notion iframes it. Zero setup, works on Free,
            picks up our updates, and dies if we do.
          </LI>
          <LI>
            <strong className="font-semibold text-foreground">HTML block</strong>:{" "}
            you upload the same file to Notion's own storage. Offline forever,
            frozen at the version you took, and sandboxed hard enough that it
            cannot read the page it sits on.
          </LI>
          <LI>
            <strong className="font-semibold text-foreground">Native recipe</strong>:{" "}
            we call the Notion API to build real databases, relations, rollups,
            formulas and views. Data-driven and shared, and it needs an
            integration token plus four manual click-paths the API cannot cover.
          </LI>
        </UL>
        <Note tone="yellow" title="The one rule that explains the catalog">
          A widget cannot read your Notion data. If a component needs to show
          numbers from your workspace, it is a recipe, not because we preferred
          it that way, but because the HTML block sandbox has no network access
          and no bridge to its parent page.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2>What is in the box</H2>
        <P>
          {STATS.total} components: {STATS.widgets} widgets and {STATS.native}{" "}
          native recipes. {STATS.free} are free, including their HTML downloads.
        </P>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-border-strong"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[19px]">{p.emoji}</span>
                <h3 className="text-[14.5px] font-semibold group-hover:text-primary">{p.title}</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{p.d}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                Open
                <IconArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <H2>For AI agents & coding assistants</H2>
        <P>
          Notion Arena publishes an official MCP server and Agent Skill so Claude Code, Cursor, Windsurf, or Claude Desktop can discover, configure, and install components directly:
        </P>
        <UL>
          <LI>
            <strong className="font-semibold text-foreground">Claude Code MCP</strong>:{" "}
            <code>claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp</code>
          </LI>
          <LI>
            <strong className="font-semibold text-foreground">Standalone MCP runner</strong>:{" "}
            <code>npx -y notion-arena-mcp@0.2.2</code>
          </LI>
          <LI>
            <strong className="font-semibold text-foreground">Agent Skill (skills.sh)</strong>:{" "}
            <code>npx skills add SynergyFlowLabs/notion-arena --skill notion-arena</code>
          </LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2>Conventions used in these docs</H2>
        <UL>
          <LI>
            <code>Notion-Version: 2026-03-11</code> is the version every request
            in this project sends. It is the version that introduced HTML blocks
            via the File Upload API, <code>heading_4</code>, tab blocks, and the{" "}
            <code>position</code> field that replaced <code>after</code>.
          </LI>
          <LI>
            A <strong className="font-semibold text-foreground">manual step</strong>{" "}
            in a recipe is never a shortcut we took. Each one names the API
            limitation that forces it.
          </LI>
          <LI>
            Capability claims are booleans in the catalog,{" "}
            <code>interactive</code>, <code>offlineSafe</code>,{" "}
            <code>persistsLocally</code>, <code>writesToNotion</code>,{" "}
            <code>needsNetwork</code>, and they are exposed in the registry so
            an agent can filter on them instead of reading prose.
          </LI>
        </UL>
      </section>
    </DocPage>
  );
}

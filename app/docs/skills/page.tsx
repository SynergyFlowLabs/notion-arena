import type { Metadata } from "next";
import { DocPage, H2, H3, P, Note, UL, LI, Code } from "@/components/docs/prose";

export const metadata: Metadata = {
  title: "Agent Skill",
  description:
    "Reference for the notion-arena SKILL.md: where to install it for Claude Code, Cursor, Windsurf and other agents; what the skill encodes; and how to customise it.",
};

export default function SkillsDocsPage() {
  return (
    <DocPage
      eyebrow="For AI agents"
      title="Skill reference"
      lede={
        <>
          A SKILL.md is the part of your agent&apos;s system prompt it reads
          when it detects it is working in a domain. The Notion Arena skill
          encodes the mental model, the safety rails, and the decision table
          that stops an agent from promising a widget can do things a Notion
          widget cannot do.
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <H2 id="install">Install</H2>
        <H3>Via skills CLI (recommended)</H3>
        <Code
          lang="bash"
          code={`# One specific skill
npx skills add SynergyFlowLabs/notion-arena --skill notion-arena

# Every skill in the repo
npx skills add SynergyFlowLabs/notion-arena --all

# Pin a specific agent
npx skills add SynergyFlowLabs/notion-arena --skill notion-arena --agent cursor
npx skills add SynergyFlowLabs/notion-arena --skill notion-arena --agent windsurf`}
        />
        <H3>Manual install</H3>
        <P>Copy <code className="font-mono">skills/notion-arena/SKILL.md</code> from this repository into one of:</P>
        <UL>
          <LI><code className="font-mono">.claude/skills/notion-arena/SKILL.md</code> — travels with the project (recommended for teams).</LI>
          <LI><code className="font-mono">~/.claude/skills/notion-arena/SKILL.md</code> — personal, available across every project.</LI>
          <LI><code className="font-mono">.cursor/skills/notion-arena/</code> — for Cursor. Other agents read the same Markdown conventions; drop it into whichever skills folder your agent expects.</LI>
        </UL>
        <Note tone="green" title="Versioning the skill">
          The installed SKILL.md is a snapshot. When you pull a new version of
          this repo, re-run <code className="font-mono">skills add</code> (or
          re-copy the file) to refresh the copy your agent reads.
        </Note>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="what-it-says">What the skill encodes</H2>
        <H3>When to trigger</H3>
        <P>
          The front-matter <code className="font-mono">description</code> field
          lists the triggers: Notion widget, embed, dashboard component,
          timer, tracker, kanban, CRM, installing into Notion, adding to
          Notion, building a template or system, and any reference to{" "}
          <code className="font-mono">notion-arena</code>.
        </P>
        <H3>The four policies</H3>
        <UL>
          <LI><strong className="font-semibold text-foreground">Honesty policy</strong> — never fabricate install counts; never promise a widget can read/write Notion data; if the workflow needs shared state, escalate to a recipe.</LI>
          <LI><strong className="font-semibold text-foreground">Three-channel rule</strong> — Embed URL for speed, HTML block for offline/frozen, native recipe for real data. Match the channel to the goal.</LI>
          <LI><strong className="font-semibold text-foreground">Sandbox contract</strong> — zero network, zero parent-page access, localStorage per-browser only.</LI>
          <LI><strong className="font-semibold text-foreground">Plan-before-you-install</strong> — always run a dry-run plan for native recipes and show it to the user before requesting a Notion token.</LI>
        </UL>
        <H3>Reference material included</H3>
        <UL>
          <LI>All 8 categories with emoji and when to reach for each.</LI>
          <LI>The full widget contract (zero external requests, dual config source, theme and accent, namespaced storage, reduced motion).</LI>
          <LI>Install flows for all three channels, including the exact File Upload API sequence for HTML blocks and the two-pass database/relation/rollup sequence for recipes.</LI>
          <LI>Three worked examples (Pomodoro, CRM pipeline, offline habit tracker).</LI>
          <LI>Authoring notes for contributors who want to add a new widget.</LI>
        </UL>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="customise">Customising the skill</H2>
        <P>
          SKILL.md is Markdown — edit it freely. Teams typically pin one or two
          project-specific choices:
        </P>
        <UL>
          <LI>Set <code className="font-mono">NOTION_ARENA_SITE_URL</code> to your self-hosted deployment so the agent hands out links pointing at your domain.</LI>
          <LI>Add an approved-categories list (e.g. only <code className="font-mono">dashboards</code> and <code className="font-mono">trackers</code>) if you want the agent to ignore everything else.</LI>
          <LI>Set a default accent color and theme so generated URLs match your workspace style without being asked.</LI>
          <LI>Add house-specific install rules (e.g. &quot;always deliver as HTML block in templates we sell&quot;).</LI>
        </UL>
        <P>
          The MCP server picks up <code className="font-mono">NOTION_ARENA_SITE_URL</code>{" "}
          from its own env block; customising the skill file alone does not
          change the server&apos;s behaviour — set the env on both sides if you
          self-host.
        </P>
      </section>

      <section className="flex flex-col gap-4">
        <H2 id="pairing">Pairing with the MCP server</H2>
        <P>
          The skill tells the agent <em>how to think</em>. The MCP server gives
          it <em>structured tools</em>. Without the skill the agent can still
          browse the catalog (the tools are self-describing), but it may choose
          the wrong channel or promise sandbox powers it does not have.
          Without the server the agent can still read the SKILL.md and hand out
          URLs, but it will have to fetch the catalog JSON over HTTP itself.
          Most teams install both.
        </P>
        <P>
          The MCP install guide lives at{" "}
          <a className="text-primary underline underline-offset-2" href="/docs/mcp">/docs/mcp</a>.
        </P>
      </section>
    </DocPage>
  );
}

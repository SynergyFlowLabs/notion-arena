import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Snippet } from "@/components/ui/snippet";
import { IconArrowRight, IconCheck, IconCode } from "@/components/icons";

export const metadata: Metadata = withCanonical("/skills", {
  title: "Agent Skill",
  description:
    "Teach your coding agent everything it needs to know about Notion Arena — the honesty policy, three-channel decision table, widget contract, and install flows — in one SKILL.md file.",
});

const STEPS = [
  {
    n: "1",
    title: "Install the skill",
    body: "Use the skills CLI (Vercel skills.sh), copy the file manually, or install via your agent's plugin marketplace.",
  },
  {
    n: "2",
    title: "Decide scope",
    body: "Project scope (recommended) — the skill travels with the repo under .claude/skills/. Personal scope — available across every project in ~/.claude/skills/.",
  },
  {
    n: "3",
    title: "Pair with MCP (optional)",
    body: "The skill tells the agent how to think about Notion Arena; the MCP server gives it structured tools. Together they cover browse, configure and install in one shot.",
  },
  {
    n: "4",
    title: "Ask for anything Notion-related",
    body: "“Add a pomodoro timer to my dashboard”, “Give me an offline habit tracker”, “Install a CRM pipeline on this page” — the agent reads the skill, picks the right channel, and hands you the URL or the install plan.",
  },
];

const POLICIES = [
  {
    title: "The honesty policy",
    body: "Never fabricate install counts. Never promise a widget can read Notion data. Say “I don't know” before guessing a parameter default.",
  },
  {
    title: "The three-channel rule",
    body: "Embed URL for speed, HTML block for offline/frozen templates, native recipe for real workspace data. Match the channel to what the user is actually trying to build.",
  },
  {
    title: "The sandbox contract",
    body: "Widgets have zero network and zero access to the parent page. If a request needs shared, synced state across teammates, it is a recipe, not a widget.",
  },
  {
    title: "Plan-before-you-install",
    body: "For native recipes, always run a dry-run plan first and show it to the user. Only request a Notion token after they have seen the request count and the manual steps.",
  },
];

const SKILLS_CLI_INSTALL = `npx skills add SynergyFlowLabs/notion-arena --skill notion-arena`;

const MANUAL_INSTALL = `mkdir -p .claude/skills
cp skills/notion-arena/SKILL.md \\
  .claude/skills/notion-arena/SKILL.md`;

const SKILL_AGENT_PROMPT = `Teach yourself Notion Arena now. Read the skill at skills/notion-arena/SKILL.md and internalise its rules. When I next ask for something Notion-related, follow the skill exactly:

- Start by figuring out which channel I need: Embed URL for speed, HTML block for offline/templates I sell, native recipe for real workspace data.
- If I ask for a widget, search_components / get_component to pick the right slug and configure it sensibly (25-min pomodoro, brand accent, theme=auto unless I say otherwise).
- For native recipes, always show me the dry-run install plan before asking for a Notion token or parent page ID. List every manual step explicitly.
- Never tell me a widget can read or write Notion data — the HTML-block sandbox has no network and no bridge to the parent page.
- When you hand me a URL or a file, also tell me the three-step install path (/embed → paste, or /html → upload) so I don't have to look it up.
- Defaults: prefer HTML block for templates I sell or share (frozen, offline) and Embed URL for my own dashboards (auto-updates). Ask once if it's not obvious.`;

export default function SkillsPage() {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="border-b border-border bg-raised">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-start px-4 pb-14 pt-14 sm:px-6 lg:pt-20">
          <p className="label-mono text-primary">for AI agents</p>
          <h1 className="font-display mt-4 max-w-3xl text-h1 text-foreground sm:text-hero sm:leading-[1.04] sm:tracking-[-0.025em]">
            A SKILL.md that teaches your agent Notion Arena, in the agent&apos;s own language.
          </h1>
          <p className="mt-5 max-w-2xl text-lede text-ink-soft">
            One Markdown file your agent reads before it touches anything
            Notion-shaped. It encodes the honesty policy, the three-channel
            decision table, every delivery-channel limitation, and the exact
            install flows — so the agent doesn&apos;t have to guess.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-[15px] font-semibold sm:w-auto">
              <a
                href="https://www.npmjs.com/package/@skillz-io/skills-cli"
                target="_blank"
                rel="noreferrer noopener"
              >
                Install the skill
                <span className="ml-1.5" aria-hidden="true">→</span>
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-[15px] sm:w-auto">
              <Link href="/docs/skills">Read the skill reference</Link>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-faint">
            <li className="flex items-center gap-1.5">
              <IconCheck size={13} className="text-notion-green" />
              Works with Claude Code, Cursor, Windsurf, Codex, any agent that reads SKILL.md
            </li>
            <li className="flex items-center gap-1.5">
              <IconCheck size={13} className="text-notion-green" />
              Pairs naturally with the MCP server
            </li>
            <li className="flex items-center gap-1.5">
              <IconCheck size={13} className="text-notion-green" />
              One file, no dependencies, MIT licensed
            </li>
          </ul>
        </div>
      </section>

      {/* What it teaches */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-16 sm:px-6">
          <h2 className="font-display text-h2 text-foreground">What it teaches the agent</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            The skill is the &quot;why&quot; — the mental model and the safety rails.
            The MCP server is the &quot;what&quot; — structured lookups and URL builders.
            You can use either alone, but they were written together.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {POLICIES.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-[15px] font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install steps */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-16 sm:px-6">
          <h2 className="font-display text-h2 text-foreground">Four steps to a smarter agent</h2>

          <ol className="mt-8 flex flex-col gap-5">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background font-mono text-[14px] font-semibold text-foreground">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-[16px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 max-w-2xl text-[14px] leading-[1.7] text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center gap-2">
                <IconCode size={16} className="text-ink-faint" />
                <span className="label-mono text-ink-faint">via skills CLI</span>
              </div>
              <div className="mt-3">
                <Snippet code={SKILLS_CLI_INSTALL} lang="bash" />
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
                Works with Claude Code, Cursor and Windsurf. Add <code className="font-mono">--all</code> to install every skill in the repo.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex items-center gap-2">
                <IconCode size={16} className="text-ink-faint" />
                <span className="label-mono text-ink-faint">manual (Claude Code)</span>
              </div>
              <div className="mt-3">
                <Snippet code={MANUAL_INSTALL} lang="bash" />
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
                Drop SKILL.md into <code className="font-mono">~/.claude/skills/notion-arena/</code> to make it personal.
              </p>
            </div>
          </div>

          {/* Ready-to-paste prompt */}
          <div className="mt-10">
            <h3 className="font-display text-h3 text-foreground">
              Or just paste this prompt into your agent
            </h3>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
              Don&apos;t want to touch config files? Paste the block below into
              any coding agent (Claude Code, Cursor agent, Cascade, Codex) and
              it will read the skill from the local checkout and follow the
              rules in this session without a permanent install.
            </p>
            <div className="mt-4">
              <Snippet code={SKILL_AGENT_PROMPT} lang="prompt" size="sm" />
            </div>
          </div>

          <p className="mt-8 text-[13.5px] text-ink-faint">
            Want the full skill reference, the decision matrix, and the worked examples?{" "}
            <Link href="/docs/skills" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/70">
              Read the skills documentation
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
              Pair it with the MCP server.
            </h2>
            <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-soft">
              The skill tells the agent how to reason about Notion Arena; the MCP
              server gives it ten structured tools to act on that reasoning.
              Most teams install both.
            </p>
          </div>
          <Button asChild variant="outline" className="h-11 px-5 text-[14.5px]">
            <Link href="/mcp">Add the MCP server</Link>
          </Button>
        </div>
      </section>
    </PageTransition>
  );
}

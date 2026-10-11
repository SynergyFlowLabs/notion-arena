# Blocksmith for AI Agents — MCP + Skill Setup

> **You work from your AI agent most of the time.** This guide shows how to plug Blocksmith directly into Claude Code, Cursor, Windsurf, Claude Desktop, and any MCP-compatible agent, so you can browse, configure, and install Notion components without leaving the conversation.

---

## TL;DR

**MCP server** — gives your agent tools to list/search/configure/plan-install 143 Notion components.

```bash
# Claude Code (project scope, recommended)
claude mcp add --scope project blocksmith -- npx -y blocksmith-mcp

# Cursor — .cursor/mcp.json
# Claude Desktop — claude_desktop_config.json
# See full configs below
```

**Skill** — teaches your agent the Blocksmith workflow, delivery channels, and install patterns.

```bash
# Via skills.sh (Vercel) — recommended
npx skills add SynergyFlowLabs/notion-components --skill blocksmith

# Manual
cp -r skills/blocksmith .claude/skills/blocksmith
# or project: .claude/skills/blocksmith/
# or personal: ~/.claude/skills/blocksmith/
```

Once both are installed, say:

> "Find me a pomodoro timer for Notion"
> "Add a CRM pipeline to my Notion"
> "I need a habit tracker that works offline"

Your agent will use `search_components`, `get_component`, `build_embed_url`, `plan_install` automatically.

---

## 1. MCP Server

### What it is

`blocksmith-mcp` is an MCP server (Model Context Protocol) that exposes Blocksmith's 143-component registry as tools your AI agent can call.

- **Package**: `blocksmith-mcp` on npm (or local `mcp/` folder in this repo)
- **Transport**: stdio (standard for MCP)
- **Data**: Catalog baked in at build time from `lib/catalog.ts` — no network needed for list/search/get. For full HTML file contents, it returns URLs to fetch from live registry.

### Tools

| Tool | What it does |
|------|--------------|
| `list_components` | List all 143 components, filter by category/kind/tier/delivery |
| `search_components` | Keyword search: "pomodoro", "CRM", "habit tracker", "budget" |
| `get_component` | Full detail for a slug: params, features, useCases, capabilities, URLs |
| `get_widget_schema` | JSON Schema for widget params (theme, accent, etc.) |
| `build_embed_url` | Build configured embed & download URLs, validated |
| `plan_install` | Dry-run install plan (no token). Shows exact Notion API calls |
| `get_registry_item` | shadcn-compatible registry JSON (`/r/{name}.json`) |
| `get_install_guide` | Human-readable install guide |
| `get_categories` | 8 categories with counts |
| `get_site_info` | Site info, endpoints, limits, docs |

### Install — Claude Code

Claude Code reads MCP config from `.mcp.json` (project), `~/.claude.json` (user), or via `claude mcp add`.

**Project scope (recommended — travels with repo, team gets it):**

```bash
claude mcp add --scope project blocksmith -- npx -y blocksmith-mcp
```

This writes to `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "blocksmith": {
      "command": "npx",
      "args": ["-y", "blocksmith-mcp"]
    }
  }
}
```

**With custom site URL (self-hosted Blocksmith):**

```bash
claude mcp add --scope project blocksmith -- npx -y blocksmith-mcp -e BLOCKSMITH_SITE_URL=https://your-host.com
```

**Local dev (this repo):**

```bash
claude mcp add --scope project blocksmith -- node mcp/dist/index.js -e BLOCKSMITH_SITE_URL=http://localhost:3000
```

Or use the pre-made `.mcp.json` at repo root:

```json
{
  "mcpServers": {
    "blocksmith": {
      "command": "node",
      "args": ["mcp/dist/index.js"],
      "env": { "BLOCKSMITH_SITE_URL": "http://localhost:3000" }
    }
  }
}
```

**User scope (all your projects):**

```bash
claude mcp add --scope user blocksmith -- npx -y blocksmith-mcp
```

**Verify:**

```bash
claude mcp list
# blocksmith   npx -y blocksmith-mcp   connected ✓
```

If it shows `failed`, clear cache:

```bash
claude mcp remove blocksmith
claude mcp add --scope project blocksmith -- npx -y blocksmith-mcp@latest
```

### Install — Claude Desktop

Edit config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "blocksmith": {
      "command": "npx",
      "args": ["-y", "blocksmith-mcp"],
      "env": {
        "BLOCKSMITH_SITE_URL": "https://blocksmith.dev"
      }
    }
  }
}
```

Quit and relaunch Claude Desktop.

### Install — Cursor

Edit `.cursor/mcp.json` in project root (create if not exists):

```json
{
  "mcpServers": {
    "blocksmith": {
      "command": "npx",
      "args": ["-y", "blocksmith-mcp"],
      "env": {
        "BLOCKSMITH_SITE_URL": "https://blocksmith.dev"
      }
    }
  }
}
```

Restart Cursor.

### Install — Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "blocksmith": {
      "command": "npx",
      "args": ["-y", "blocksmith-mcp"],
      "env": {
        "BLOCKSMITH_SITE_URL": "https://blocksmith.dev"
      }
    }
  }
}
```

Restart Windsurf.

### Install — Any MCP client (generic)

Any client that speaks MCP stdio:

```json
{
  "command": "npx",
  "args": ["-y", "blocksmith-mcp"],
  "env": {
    "BLOCKSMITH_SITE_URL": "https://blocksmith.dev",
    "BLOCKSMITH_REGISTRY_URL": "https://blocksmith.dev/r"
  }
}
```

### Environment variables

- `BLOCKSMITH_SITE_URL` — override site URL (default `https://blocksmith.dev`). Use `http://localhost:3000` for local dev.
- `BLOCKSMITH_REGISTRY_URL` — override registry base (default `{SITE_URL}/r`)

### Local development of MCP server

```bash
# From repo root
npm install
node scripts/generate-mcp-catalog.mjs   # generates mcp/src/data/catalog.json (143 components)
cd mcp
npm install
npm run build                           # tsc + copy data
npm run dev                             # tsx src/index.ts, stdio

# Test with MCP inspector (if installed)
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 2. Skill — Blocksmith Agent Skill

### What it is

An Agent Skill is a `SKILL.md` file with YAML frontmatter that teaches Claude (and other agents) when and how to use Blocksmith.

- **Format**: `SKILL.md` — open standard, works across Claude Code, Claude.ai, Cursor, Windsurf via `skills.sh`
- **Location in this repo**:
  - Source: `skills/blocksmith/SKILL.md` (committed, distributable via skills.sh)
  - Project skill: `.claude/skills/blocksmith/SKILL.md` (also committed via .gitignore exception)
- **Distribution**: Vercel `skills.sh` marketplace, Claude Code plugin marketplace, manual copy

### What the skill teaches

- When to use Blocksmith (user asks for Notion widget, dashboard, timer, tracker, CRM, etc.)
- The 3 delivery channels (embed URL, HTML block, native recipe) and when to use each
- How to discover (`list_components`, `search_components`, `/r/index.json`)
- How to configure widgets (theme, accent, param coercion, `bk-config` script tag)
- How to install (embed paste, HTML upload via File Upload API, `POST /api/install` plan/api)
- Widget contract (zero external requests, two config sources, namespaced state)
- Honesty policy (widgets cannot read/write Notion data, recipes declare manual steps with real API limitations)
- Authoring new widgets (`public/widgets/*.html`, `lib/catalog.ts`, `npm run check:widgets`)

### Install — Via skills.sh (recommended, cross-agent)

`skills.sh` is Vercel's open skill package manager. One command installs to Claude Code, Cursor, Windsurf, etc.

```bash
# List available skills in this repo
npx skills add SynergyFlowLabs/notion-components --list

# Install just blocksmith skill to Claude Code
npx skills add SynergyFlowLabs/notion-components --skill blocksmith --agent claude-code --yes

# Install to all supported agents (claude-code, cursor, windsurf, etc.)
npx skills add SynergyFlowLabs/notion-components --skill blocksmith --agent '*' --yes

# Install all skills from this repo (if we add more later)
npx skills add SynergyFlowLabs/notion-components --all
```

This clones the repo temporarily and symlinks (or copies) `skills/blocksmith/SKILL.md` into your agent's skills directory.

**For Cursor:**

```bash
npx skills add SynergyFlowLabs/notion-components --skill blocksmith --agent cursor --yes
```

**For Windsurf:**

```bash
npx skills add SynergyFlowLabs/notion-components --skill blocksmith --agent windsurf --yes
```

### Install — Via Claude Code Plugin Marketplace

We ship a Claude Code plugin that bundles both the skill and MCP server.

`.claude-plugin/plugin.json` at repo root defines:

```json
{
  "name": "blocksmith",
  "skills": ["./skills/blocksmith/SKILL.md", "./.claude/skills/blocksmith/SKILL.md"],
  "mcpServers": {
    "blocksmith": { "command": "npx", "args": ["-y", "blocksmith-mcp"] }
  }
}
```

`.claude-plugin/marketplace.json` defines the marketplace.

**Install from GitHub:**

```bash
# Add marketplace
/plugin marketplace add SynergyFlowLabs/notion-components

# Install plugin
/plugin install blocksmith@blocksmith-marketplace
```

**Or local dev:**

```bash
/plugin marketplace add ./
# then
/plugin install blocksmith@blocksmith-marketplace
```

### Install — Manual

**Project skill (travels with repo, team gets it):**

```bash
mkdir -p .claude/skills/blocksmith
cp skills/blocksmith/SKILL.md .claude/skills/blocksmith/SKILL.md
# commit it — we have .gitignore exception for this path
```

**Personal skill (all your projects):**

```bash
mkdir -p ~/.claude/skills/blocksmith
cp skills/blocksmith/SKILL.md ~/.claude/skills/blocksmith/SKILL.md
```

**Cursor:**

```bash
mkdir -p .cursor/skills/blocksmith
cp skills/blocksmith/SKILL.md .cursor/skills/blocksmith/SKILL.md
# or if Cursor uses .claude/skills, same as above
```

**Any agent:**

Copy the content of `skills/blocksmith/SKILL.md` into your agent's skill directory or rules file. The format is plain Markdown with YAML frontmatter — portable.

### Verify skill is loaded

In Claude Code, type `/` and you should see `blocksmith` skill, or ask:

> "What skills do you have?"

Or trigger it:

> "I need a Notion component"

Claude should load the skill (progressive disclosure: frontmatter always loaded, body loaded when relevant) and use Blocksmith MCP tools.

---

## 3. Combined — MCP + Skill (recommended for agent-native workflow)

For users who work from AI agents most of time, install both:

```bash
# 1. MCP server — gives tools
claude mcp add --scope project blocksmith -- npx -y blocksmith-mcp

# 2. Skill — gives workflow knowledge
npx skills add SynergyFlowLabs/notion-components --skill blocksmith --agent claude-code --yes

# Verify
claude mcp list
# blocksmith   npx -y blocksmith-mcp   connected ✓

ls .claude/skills/blocksmith/
# SKILL.md
```

Now you can have conversations like:

**User**: "Find me a habit tracker that works offline and keeps streaks"

**Agent** (with skill + MCP):
1. Loads `blocksmith` skill — knows to use `search_components` with filters
2. Calls `search_components` query "habit tracker", then `list_components` category "trackers" delivery "html-block"
3. Calls `get_component` for `habit-grid` — checks `capabilities.offlineSafe=true`, `persistsLocally=true`
4. Calls `build_embed_url` for `habit-grid` with user's accent/theme
5. Responds: "Found `habit-grid` — offline-safe, persists locally via `blocksmith.habit-grid.v1`. Embed URL: ... Download: ... Install via /embed paste or HTML upload..."

**User**: "Add CRM pipeline to my Notion workspace"

**Agent**:
1. `search_components` "CRM" → `crm-pipeline`
2. `get_component` `crm-pipeline` → native recipe, creates 3 databases, 5 views, manual steps
3. `plan_install` mode `plan` → dry-run, no token, shows 12 API calls, 2 manual steps (button, automation)
4. Asks user for `parentPageId` and `token`
5. Calls `plan_install` mode `api` or instructs `POST /api/install`

---

## 4. For Blocksmith developers — local setup

```bash
# Clone
git clone https://github.com/SynergyFlowLabs/notion-components.git
cd notion-components

# Install deps
npm install

# Restore skills (13 design/dev skills from skills-lock.json)
npx skills experimental_install -y
# -> .agents/skills/

# Generate MCP catalog snapshot (143 components)
node scripts/generate-mcp-catalog.mjs
# -> mcp/src/data/catalog.json

# Build MCP server
cd mcp
npm install
npm run build
cd ..

# Run site
npm run dev
# http://localhost:3000

# Type-check & widget contract checks
npx tsc --noEmit
npm run check:widgets
```

Site endpoints for agents:

- `GET /r/index.json` — whole catalog
- `GET /r/{name}.json` — one item with file contents inlined
- `GET /r/schema.json` — JSON Schema for all widget params
- `POST /api/install` — plan/install
- `GET /embed/{slug}?config` — hosted widget
- `GET /api/widget/{slug}?config` — download HTML

---

## 5. Publishing — how we distribute MCP and skill

### MCP — npm

```bash
cd mcp
npm version patch
npm run build
npm publish --access public
```

Then users get it via `npx -y blocksmith-mcp`.

For MCP Registry (modelcontextprotocol/registry):

```bash
# Install publisher CLI
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher

# Init server.json
./mcp-publisher init --name io.github.SynergyFlowLabs/blocksmith --type npm --package blocksmith-mcp

# Login via GitHub OAuth
./mcp-publisher login github

# Publish
./mcp-publisher publish
```

### Skill — skills.sh

No publish step needed — `skills.sh` reads directly from GitHub. Just push to `main`:

```bash
git push origin main
```

Users install via:

```bash
npx skills add SynergyFlowLabs/notion-components --skill blocksmith
```

`skills.sh` will discover `skills/blocksmith/SKILL.md` and `.claude/skills/blocksmith/SKILL.md`.

### Skill — Claude Code Plugin Marketplace

We already have `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` at repo root.

To publish as official Claude Code plugin marketplace:

1. Push repo to GitHub (public)
2. Users add marketplace: `/plugin marketplace add SynergyFlowLabs/notion-components`
3. Users install: `/plugin install blocksmith@blocksmith-marketplace`

For private/team marketplace, host marketplace.json in a private repo and add via same command.

---

## 6. Why both MCP and skill?

| Aspect | MCP server | Skill |
|--------|------------|-------|
| What it provides | Tools (code that runs) | Knowledge (Markdown instructions) |
| When it runs | When agent calls a tool | When agent decides skill is relevant (via description) |
| Example | `search_components` returns JSON | "Widgets cannot read Notion data — use native recipe if need workspace records" |
| Distribution | npm, MCP registry, Docker | skills.sh, Claude plugin marketplace, GitHub |
| Offline? | Yes, catalog baked in | Yes, SKILL.md is local |
| Needs network? | Only for live file contents via registry URLs | No |

**Together**: Skill teaches *when* and *how* to use Blocksmith, MCP provides *actions* to do it. Skill without MCP = agent knows workflow but must fetch registry via curl. MCP without skill = agent has tools but doesn't know delivery channels, widget contract, honesty policy. Both = full agent-native experience.

---

## 7. FAQ

**Do I need both?**
Recommended yes. Skill alone works (agent can curl registry). MCP alone works (agent can list/search). Both together is best: skill guides, MCP executes.

**Can I use this without Notion API token?**
Yes for planning. `plan_install` mode `plan` needs no token. For widgets, embed URL and download URL need no token. Only actual install to your workspace (mode `embed`, `html-block`, `api`) needs `ntn_...` token.

**Self-hosted Blocksmith?**
Set env `BLOCKSMITH_SITE_URL=https://your-host.com`. Widgets are single files with no deps — serve `public/widgets/` from anywhere, point registry base at your host.

**What about shadcn CLI?**
Blocksmith is shadcn-compatible. Add to `components.json`:
```json
{ "registries": { "@blocksmith": "https://blocksmith.dev/r/{name}.json" } }
```
Then `npx shadcn add @blocksmith/pomodoro-timer`. MCP and skill work alongside CLI.

**Security?**
- MCP server does not need Notion token for list/search/plan. Token only used when you explicitly call install with mode != plan.
- Skill is plain Markdown — read it before installing.
- Pin to Git tag/SHA rather than main if concerned: `npx skills add SynergyFlowLabs/notion-components#v0.1.0 --skill blocksmith`

---

## 8. Links

- Repo: https://github.com/SynergyFlowLabs/notion-components
- Site: https://blocksmith.dev (or your self-hosted URL)
- Registry index: https://blocksmith.dev/r/index.json
- MCP server: `mcp/` folder in repo, npm `blocksmith-mcp`
- Skill: `skills/blocksmith/SKILL.md`, `.claude/skills/blocksmith/SKILL.md`
- Plugin: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Docs: `/docs/RESEARCH.md`, `/docs/DESIGN.md`, `/docs/authoring`, `/docs/api-limits`

# Skills — Blocksmith

This directory contains distributable Agent Skills for Blocksmith.

## Available skills

### `blocksmith`

**The component registry for Notion — for your AI agent.**

- **File**: `blocksmith/SKILL.md`
- **Description**: Use Blocksmith to browse, configure, and install 143 Notion components (132 widgets + 11 native recipes)
- **Triggers**: Notion widget, embed, HTML block, dashboard component, timer, tracker, kanban, CRM, "add to Notion", etc.

**Install via skills.sh (Vercel):**

```bash
npx skills add SynergyFlowLabs/notion-components --skill blocksmith --agent claude-code --yes
# or all agents
npx skills add SynergyFlowLabs/notion-components --skill blocksmith --agent '*' --yes

# list available
npx skills add SynergyFlowLabs/notion-components --list
```

**Manual:**

```bash
# Project (travels with repo)
mkdir -p .claude/skills/blocksmith
cp skills/blocksmith/SKILL.md .claude/skills/blocksmith/

# Personal (all projects)
mkdir -p ~/.claude/skills/blocksmith
cp skills/blocksmith/SKILL.md ~/.claude/skills/blocksmith/
```

Also available at `.claude/skills/blocksmith/SKILL.md` (same file, committed via .gitignore exception for Claude Code plugin marketplace).

## How skills.sh discovers skills

`skills.sh` (https://skills.sh) clones a GitHub repo and searches for `**/SKILL.md` files. It finds:

- `skills/blocksmith/SKILL.md` ✅
- `.claude/skills/blocksmith/SKILL.md` ✅

Both are valid. We keep both so:
- `skills/` is the conventional location for distributable skills (not ignored)
- `.claude/skills/` is the Claude Code project skill location (needs .gitignore exception)

## Plugin marketplace

For Claude Code plugin marketplace distribution, see:

- `.claude-plugin/plugin.json` — plugin manifest, references both skill paths and MCP server
- `.claude-plugin/marketplace.json` — marketplace manifest

Install:

```bash
/plugin marketplace add SynergyFlowLabs/notion-components
/plugin install blocksmith@blocksmith-marketplace
```

## Adding a new skill

1. Create folder `skills/<name>/`
2. Create `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: <name>
   description: What it does and when to use it. Include trigger phrases.
   ---
   # Instructions...
   ```
3. Keep SKILL.md under 500 lines, move details to sibling files if needed
4. Copy to `.claude/skills/<name>/SKILL.md` if you want it as project skill
5. Add entry to `.claude-plugin/plugin.json` skills array
6. Push — `skills.sh` will discover automatically

## References

- Full setup guide: `../docs/AGENT_SETUP.md`
- Skill spec: https://agentskills.io, https://code.claude.com/docs/en/skills
- skills.sh: https://skills.sh, https://github.com/vercel-labs/agent-skills

# Notion Arena MCP Server

> **Notion Arena** — A component registry for Notion. 143 pre-built components (132 widgets + 11 native recipes) for Notion dashboards.

[![npm version](https://img.shields.io/npm/v/notion-arena-mcp.svg)](https://www.npmjs.com/package/notion-arena-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/SynergyFlowLabs/notion-arena/blob/main/LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

## Overview

This package provides the **Model Context Protocol (MCP) server** for Notion Arena, giving AI agents (Claude Code, Cursor, Windsurf, Claude Desktop) tools to discover, configure, and install 143 Notion components.

**Components:**
- **132 Widgets** — Self-contained HTML components that run in Notion via Embed URL or HTML Block
- **11 Native Recipes** — Notion API installations (databases, views, formulas, automations)

## Installation

### Claude Code
```bash
# Project scope (recommended)
claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp

# Or user scope
claude mcp add notion-arena -- npx -y notion-arena-mcp

# Pinned version
npx -y notion-arena-mcp@0.2.2
```

### Cursor
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "notion-arena": {
      "command": "npx",
      "args": ["-y", "notion-arena-mcp"]
    }
  }
}
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "notion-arena": {
      "command": "npx",
      "args": ["-y", "notion-arena-mcp"]
    }
  }
}
```

### Windsurf
Add to `~/.windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "notion-arena": {
      "command": "npx",
      "args": ["-y", "notion-arena-mcp"]
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_components` | List all 143 components with basic metadata |
| `search_components` | Search by query, category, tag, tier, capability |
| `get_component` | Get full component spec by slug |
| `get_widget_schema` | Get JSON Schema for widget parameters |
| `build_embed_url` | Generate configured embed URL for a widget |
| `plan_install` | Dry-run install plan for native recipes |
| `get_registry_item` | Get shadcn-compatible registry item |
| `get_install_guide` | Get step-by-step install instructions |
| `get_categories` | List all 8 categories with counts |
| `get_site_info` | Get site metadata (URL, version, stats) |

## Usage Examples

### Find a pomodoro timer
```json
{
  "tool": "search_components",
  "arguments": {
    "query": "pomodoro",
    "category": "time"
  }
}
```

### Get embed URL for a widget
```json
{
  "tool": "build_embed_url",
  "arguments": {
    "slug": "pomodoro-timer",
    "params": { "work": 30, "theme": "dark" }
  }
}
```

### Plan a native recipe install (dry-run)
```json
{
  "tool": "plan_install",
  "arguments": {
    "component": "crm-pipeline",
    "parentPageId": "your-page-id"
  }
}
```

### Execute a native recipe install
```json
{
  "tool": "plan_install",
  "arguments": {
    "component": "crm-pipeline",
    "parentPageId": "your-page-id",
    "token": "ntn_xxxxx",
    "mode": "api"
  }
}
```

## Combining with the Skill

For best results, also install the **Notion Arena Skill** which teaches agents the workflow, delivery channels, and widget contract:

```bash
npx skills add SynergyFlowLabs/notion-arena --skill notion-arena
```

Then your agent can understand natural language requests like:
> *"Find me a habit tracker that works offline"*
> *"Add a CRM pipeline to my Notion workspace"*
> *"I need a sprint tracker for my engineering team"*

## Development

```bash
# Clone the full repo
git clone https://github.com/SynergyFlowLabs/notion-arena.git
cd notion-arena/mcp

# Install & build
npm install
npm run build

# Run locally (stdio)
npm run dev
```

## Documentation

- **Full docs**: https://notionarena.vercel.app/docs
- **Agent setup**: https://notionarena.vercel.app/docs/agent-setup
- **Widget authoring**: https://notionarena.vercel.app/docs/authoring
- **GitHub**: https://github.com/SynergyFlowLabs/notion-arena

## License

MIT — see [LICENSE](https://github.com/SynergyFlowLabs/notion-arena/blob/main/LICENSE)

---

*Notion is a trademark of Notion Labs Inc. This is an independent project and is not affiliated with or endorsed by Notion.*
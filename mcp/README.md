# Blocksmith MCP Server

**The component registry for Notion, for your AI agent.**

143 components: 132 embeddable widgets that run inside a Notion page, and 11 native database recipes that install through the Notion API.

This MCP server lets AI coding agents (Claude Code, Cursor, Windsurf, etc.) browse, configure, and install Blocksmith components without leaving the conversation.

## What it does

- **List & search** 143 components by category, kind, tier, capability
- **Get full detail** for any component: params, features, use cases, capabilities, delivery channels
- **Build configured URLs**: embed URL (`/embed/slug?config`) and download URL (`/api/widget/slug?config`)
- **Plan installs** (dry-run, no token): shows exact Notion API calls a component will make
- **Registry access**: shadcn-compatible registry JSON at `/r/{name}.json`

## Install

### Claude Code

```bash
# Project scope (recommended — travels with repo)
claude mcp add --scope project blocksmith -- npx -y blocksmith-mcp

# Or global
claude mcp add --scope user blocksmith -- npx -y blocksmith-mcp
```

With custom site URL (self-hosted):

```bash
claude mcp add --scope project blocksmith -- npx -y blocksmith-mcp -e BLOCKSMITH_SITE_URL=https://your-host.com
```

### Claude Desktop

Edit `claude_desktop_config.json`:

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

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor

`.cursor/mcp.json`:

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

### Windsurf

`~/.codeium/windsurf/mcp_config.json` — same format as Cursor.

### .mcpb one-click

If your client supports `.mcpb` bundles, build one:

```bash
npm run build
npx @modelcontextprotocol/mcpb pack
```

## Tools

| Tool | Description |
|------|-------------|
| `list_components` | List all components, filter by category/kind/tier/delivery |
| `search_components` | Keyword search: "pomodoro", "CRM", "habit tracker" |
| `get_component` | Full detail for a slug |
| `get_widget_schema` | JSON Schema for widget params |
| `build_embed_url` | Build configured embed & download URLs |
| `plan_install` | Dry-run install plan (no token needed) |
| `get_registry_item` | shadcn-compatible registry JSON |
| `get_install_guide` | Human-readable install guide |
| `get_categories` | List 8 categories with counts |
| `get_site_info` | Site info, endpoints, limits |

## Environment variables

- `BLOCKSMITH_SITE_URL` — override site URL (default: `https://blocksmith.dev`)
- `BLOCKSMITH_REGISTRY_URL` — override registry base (default: `{SITE_URL}/r`)

For local dev:

```bash
BLOCKSMITH_SITE_URL=http://localhost:3000 npx blocksmith-mcp
```

## Local development

```bash
npm install
npm run generate:catalog  # from repo root: node scripts/generate-mcp-catalog.mjs
npm run build
npm run dev               # runs with tsx, stdio transport
```

## How it works

- Catalog is baked in at build time from `lib/catalog.ts` (143 components)
- No network needed for list/search/get — all data is local
- For live file contents (full HTML), tools return URLs to fetch from `/r/{slug}.json` or `/api/widget/{slug}`
- `plan_install` with mode `plan` is a dry-run that matches `POST /api/install { mode: "plan" }` — safe, no credentials

## Registry compatibility

Blocksmith is shadcn-compatible:

```json
// components.json
{
  "registries": {
    "@blocksmith": "https://blocksmith.dev/r/{name}.json"
  }
}
```

```bash
npx shadcn add @blocksmith/pomodoro-timer
```

The MCP server respects the same registry URL via `BLOCKSMITH_REGISTRY_URL`.

## License

MIT — same as parent repo. Components you download are yours.

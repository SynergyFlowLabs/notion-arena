# Deploy for Free + Publish MCP, Skill, Plugin

> Complete guide to deploy Notion Arena site for free and publish its MCP server, skill, and plugin so AI-agent users can `npx` and `/plugin install` it.

---

## Part 1 — Deploy the Site for Free

Notion Arena is a Next.js 16 app (App Router, API routes, Turbopack). It needs **server rendering** for `/embed/[slug]`, `/api/widget/[slug]`, `/api/install`, `/r/[name]`. So **static export (GitHub Pages) won't work** — you need a platform that runs Node functions.

### Best free option: Vercel (made for Next.js)

**Why:** Zero config for Next.js, 100GB bandwidth free, 100k function invocations, preview deploys, global CDN, free `*.vercel.app` domain, automatic HTTPS, env vars, and `NEXT_PUBLIC_SITE_URL` support. [1](https://dev.to/joodi/free-nextjs-hosting-providers-in-2025-pros-and-cons-2a0e)

**Cost 2026:** Hobby = $0 (1 user, 100GB bandwidth, 6000 build minutes). Pro = $20/seat. For Notion Arena (no DB, no heavy compute), Hobby is enough for thousands of users. [2](https://temps.sh/blog/nextjs-deployment-cost-calculator)

#### Deploy via Vercel Dashboard (no CLI, 2 minutes)

1. Push your repo to GitHub (you already have `SynergyFlowLabs/notion-arena`)
2. Go to https://vercel.com/new
3. Import GitHub repo `SynergyFlowLabs/notion-arena`
4. Framework preset: **Next.js** (auto-detected)
5. **Environment Variables** → Add:
   ```
   NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
   ```
   Use the URL Vercel will give you, or your custom domain. This makes registry manifests emit absolute URLs for the right host. Without it, URLs are derived from `x-forwarded-host`, fallback `http://localhost:3000` (see `lib/utils.ts`).
6. Click **Deploy**
7. Wait ~1-2 min. Vercel runs `npm install && npm run build` (251 static pages with 203 components)
8. Open `https://your-project.vercel.app/r/index.json` — should return JSON with 191 items
9. Test:
   - `https://your-project.vercel.app/embed/pomodoro-timer?work=25`
   - `https://your-project.vercel.app/api/widget/pomodoro-timer`
   - `https://your-project.vercel.app/r/pomodoro-timer.json`
   - `POST https://your-project.vercel.app/api/install {component:"crm-pipeline", mode:"plan"}`

#### Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
# First run: link to existing project or create new
# Set env:
vercel env add NEXT_PUBLIC_SITE_URL production
# Enter: https://your-project.vercel.app

# Redeploy
vercel --prod
```

#### Custom domain (free)

Vercel free includes free `*.vercel.app` and you can add custom domain free (you pay domain registrar, Vercel SSL free):

- Vercel Dashboard → Project → Settings → Domains → Add `notionarena.vercel.app` or `notion.yourdomain.com`
- Add DNS CNAME/TXT as instructed
- Vercel auto-issues Let's Encrypt cert
- Update env var `NEXT_PUBLIC_SITE_URL=https://your-custom-domain.com` and redeploy

#### After deploy, update MCP env

Your MCP server defaults to `https://notionarena.vercel.app`. For self-hosted, users should override:

```bash
claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp -e NOTION_ARENA_SITE_URL=https://your-project.vercel.app
```

Or you can publish MCP with your URL baked in via `mcp/server.json` or `README`.

### Alternative free options

| Platform | Free tier | Next.js support | Notes |
|----------|-----------|-----------------|-------|
| **Cloudflare Pages** | Unlimited bandwidth, 500 builds/mo | Needs `@cloudflare/next-on-pages` or OpenNext adapter | Great for global edge, but API routes need adapter. Use `npx @cloudflare/next-on-pages` |
| **Netlify** | 100GB bandwidth, 300 build min | Native Next.js via `@netlify/plugin-nextjs` | Auto-detects Next.js, similar to Vercel |
| **Render** | 750h free web service, sleeps after 15m | Docker/Node | Set `npm run build && npm run start`, env `NEXT_PUBLIC_SITE_URL` |
| **Fly.io** | Free allowance ~3 small VMs | Docker | `fly launch`, `fly deploy` |
| **Railway** | $5 free trial, then usage | Nixpacks | Easy but not forever free |

**For Notion Arena, Vercel is simplest.** If you need Cloudflare for free unlimited bandwidth, do:

```bash
npm i -D @cloudflare/next-on-pages
npx @cloudflare/next-on-pages
# Then deploy to Cloudflare Pages via wrangler or dashboard
```

But you must test `/embed/*` CSP `frame-ancestors *` and `/r/*` CORS `*` headers still work (they are set in `next.config.ts` and `app/embed/[slug]/route.ts`).

### Self-host via Docker (free on your own VPS)

```dockerfile
# Dockerfile at repo root
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
```

```bash
docker build -t notion-arena .
docker run -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://your-domain.com notion-arena
```

Free VPS: Oracle Cloud Free (4 ARM cores, 24GB RAM forever), Hetzner CX11 ~€4/mo, or Fly.io free.

---

## Part 2 — Publish MCP Server to npm (free)

MCP server is just an npm package that runs via stdio. Users install via `npx -y notion-arena-mcp`.

### Check name availability

```bash
npm view notion-arena-mcp version
# If 404, name is free. If exists, you need scoped name: @yourorg/notion-arena-mcp
```

Our `mcp/package.json` uses `notion-arena-mcp` — if taken, rename to `@synergyflow/notion-arena-mcp` or `notion-arena-notion-mcp`.

### Publish steps

1. **Create npm account**: https://www.npmjs.com/signup (free)

2. **Login locally**:
```bash
npm login
# Enter username, password, email, OTP
```

3. **Prepare package** (from repo root):
```bash
node scripts/generate-mcp-catalog.mjs   # 191 components → mcp/src/data/catalog.json
cd mcp
npm install
npm run build                           # tsc + copy data to dist/data/
# Verify:
ls dist/ dist/data/
node dist/index.js  # should start and say 191 components loaded, then wait for stdio (Ctrl+C)
```

4. **Update version** (semver):
```bash
npm version patch   # 0.1.0 → 0.1.1
# or
npm version minor   # 0.1.0 → 0.2.0 (we added 12 widgets, so minor bump makes sense)
```

5. **Publish** (public):
```bash
npm publish --access public
# If scoped: npm publish --access public
```

6. **Verify**:
```bash
npm view notion-arena-mcp
npx -y notion-arena-mcp --help  # our server has no --help, but it will start and wait
# Test via MCP inspector:
npx @modelcontextprotocol/inspector npx -y notion-arena-mcp
```

7. **Update `mcp/server.json` version** to match package.json version before MCP Registry publish.

### If name taken — use scoped

```json
// mcp/package.json
{
  "name": "@synergyflowlabs/notion-arena-mcp",
  "bin": { "notion-arena-mcp": "./dist/index.js" }
}
```

Users then run:

```bash
npx -y @synergyflowlabs/notion-arena-mcp
claude mcp add --scope project notion-arena -- npx -y @synergyflowlabs/notion-arena-mcp
```

### Automate via GitHub Actions (free)

Create `.github/workflows/publish-mcp.yml`:

```yaml
name: Publish MCP to npm
on:
  push:
    tags: ['mcp-v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: node scripts/generate-mcp-catalog.mjs
      - run: cd mcp && npm ci && npm run build
      - run: cd mcp && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Create NPM_TOKEN at https://www.npmjs.com/settings/tokens (Automation token) → Add to GitHub repo Secrets → `NPM_TOKEN`.

Then:

```bash
git tag mcp-v0.2.0
git push origin mcp-v0.2.0
# GitHub Action publishes automatically
```

---

## Part 3 — Publish MCP to Official MCP Registry (free, for discoverability)

MCP Registry is like App Store for MCP servers at `registry.modelcontextprotocol.io`. Publishing there makes your server discoverable in future clients.

### Steps

1. **Install publisher CLI** (binary, not npm):
```bash
# macOS/Linux
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
chmod +x mcp-publisher
sudo mv mcp-publisher /usr/local/bin/
# Or build from source:
# git clone https://github.com/modelcontextprotocol/registry && cd registry && make publisher
```

2. **Ensure `mcp/server.json` exists** (we have it):

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.imgul/notion-arena",
  "description": "MCP server for Notion Arena — 191 Notion components: 180 widgets + 11 recipes",
  "repository": { "url": "https://github.com/SynergyFlowLabs/notion-arena.git", "source": "github" },
  "version": "0.2.2",
  "packages": [{
    "registryType": "npm",
    "identifier": "notion-arena-mcp",
    "version": "0.2.2",
    "transport": { "type": "stdio" }
  }]
}
```

- `name` must be namespaced: `io.github.<github-user>/<server-name>` → we use `io.github.imgul/notion-arena`
- **Note on organization namespace**: Publishing under an org namespace like `io.github.SynergyFlowLabs/notion-arena` requires the publisher's GitHub account to have public organization membership in `SynergyFlowLabs`. For individual publishers, `io.github.<username>/notion-arena` (e.g. `io.github.imgul/notion-arena@0.2.2`) is used and verified.
- `identifier` must be exact npm package name (`notion-arena-mcp@0.2.2`)

3. **Login via GitHub OAuth**:
```bash
cd mcp
mcp-publisher login github
# Opens browser, authorize, token saved locally
```

4. **Publish**:
```bash
mcp-publisher publish
# ✓ Successfully published
```

5. **Verify**:
- https://registry.modelcontextprotocol.io → search `notion-arena`
- API: `curl https://registry.modelcontextprotocol.io/v0/servers?search=notion-arena`

**For custom domain namespace** (`com.example/...`): verify via DNS TXT record instead of GitHub OAuth. For Notion Arena, `io.github` is easiest.

**Note:** Registry listing does NOT auto-install in Claude Desktop/Cursor yet (clients don't auto-discover). It improves SEO and future client integration. Primary install remains via `npx`.

---

## Part 4 — Publish Skill (free, no npm needed)

Skills are just Markdown — distribution is via GitHub + skills.sh + Claude Code plugin marketplace. All free.

### Option A — skills.sh (Vercel, cross-agent, recommended)

skills.sh is open marketplace by Vercel, ~600k skills indexed, `npx skills add` works for Claude Code, Cursor, Windsurf, etc.

**No publish step.** Just push to GitHub main:

```bash
git add skills/notion-arena/SKILL.md .claude/skills/notion-arena/SKILL.md
git commit -m "feat: notion-arena skill 191 components"
git push origin main
```

skills.sh auto-discovers `**/SKILL.md` via GitHub API. Users install:

```bash
npx skills add SynergyFlowLabs/notion-arena --skill notion-arena --agent claude-code --yes
npx skills add SynergyFlowLabs/notion-arena --skill notion-arena --agent '*' --yes  # all agents
npx skills add SynergyFlowLabs/notion-arena --list  # list available
```

**To appear higher in skills.sh leaderboard:** skills.sh ranks by anonymous install telemetry. More installs → higher rank. Share your install command in README, docs, Twitter.

**Test locally before push:**

```bash
npx skills add . --list
# Should show: notion-arena — Use Notion Arena — the component registry for Notion...
```

### Option B — Claude Code Plugin Marketplace (official, for Claude Code)

We already ship:

- `.claude-plugin/plugin.json` — plugin manifest, references skills + mcpServers
- `.claude-plugin/marketplace.json` — marketplace manifest

**Publish:**

1. Push to GitHub public repo (done)
2. Users add marketplace and install plugin:

```bash
# In Claude Code:
/plugin marketplace add SynergyFlowLabs/notion-arena
/plugin install notion-arena@notion-arena-marketplace
```

This installs BOTH skill and MCP server in one command (because `plugin.json` defines both).

**For local dev:**

```bash
/plugin marketplace add ./
# Then
/plugin install notion-arena@notion-arena-marketplace
```

**Validation:**

```bash
# If you have Claude Code CLI:
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
```

### Option C — Claude.ai (web app) — ZIP upload

For Claude.ai web (not Claude Code):

1. Zip the skill folder:
```bash
cd skills/notion-arena
zip -r notion-arena-skill.zip SKILL.md
# Or include assets if any
```

2. Go to Claude.ai → Settings → Customize → Skills → Upload Skill → select ZIP
3. Or Organization Settings → Plugins & skills → Add → Upload a skill → provision to everyone

### Option D — Manual (works everywhere)

Tell users to copy file:

```bash
# Project (travels with repo)
mkdir -p .claude/skills/notion-arena
curl -o .claude/skills/notion-arena/SKILL.md https://raw.githubusercontent.com/SynergyFlowLabs/notion-arena/main/skills/notion-arena/SKILL.md

# Personal (all projects)
mkdir -p ~/.claude/skills/notion-arena
curl -o ~/.claude/skills/notion-arena/SKILL.md https://raw.githubusercontent.com/SynergyFlowLabs/notion-arena/main/skills/notion-arena/SKILL.md
```

For Cursor/Windsurf: same, but path `.cursor/skills/notion-arena/` or use `npx skills add` with `--agent cursor`.

---

## Part 5 — Publish Combined Plugin (Skill + MCP) as One

We already bundle both in `.claude-plugin/plugin.json`:

```json
{
  "name": "notion-arena",
  "skills": ["./skills/notion-arena/SKILL.md", "./.claude/skills/notion-arena/SKILL.md"],
  "mcpServers": {
    "notion-arena": { "command": "npx", "args": ["-y", "notion-arena-mcp"] }
  }
}
```

Users get full agent-native experience in **one command**:

```bash
/plugin marketplace add SynergyFlowLabs/notion-arena
/plugin install notion-arena@notion-arena-marketplace
# → installs skill + MCP server
```

Or via skills.sh + claude mcp add separately (two commands, works cross-agent).

---

## Part 6 — Keep Everything in Sync (Free Automation)

### After adding new widgets

```bash
# 1. Generate new catalog for MCP
node scripts/generate-mcp-catalog.mjs  # 191 → 191 etc.

# 2. Build MCP
cd mcp && npm run build && cd ..

# 3. Build site
npm run build  # check 171 → 183 pages

# 4. Bump versions
# mcp/package.json version patch/minor
# .claude-plugin/plugin.json version
# .claude-plugin/marketplace.json plugins[0].version
# mcp/server.json version + packages[0].version

# 5. Commit & push (site auto-deploys on Vercel if GitHub connected)
git add -A
git commit -m "feat: add 12 widgets, 191 total"
git push origin main

# 6. Publish MCP to npm (if version bumped)
cd mcp && npm publish --access public

# 7. Publish MCP to registry (if version bumped)
mcp-publisher publish

# Skill is auto-discoverable after push — no extra publish
```

Vercel auto-deploys on push to main (if connected). No manual deploy needed.

### GitHub Actions for full CI/CD (free for public repos)

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run check:widgets
      - run: node scripts/generate-mcp-catalog.mjs
      - run: cd mcp && npm ci && npm run build
      - run: npm run build
```

Public repos get 2000 free Action minutes/month.

---

## Part 7 — Free Deployment Checklist

- [ ] Push repo to GitHub public
- [ ] Deploy site to Vercel free (import GitHub, set `NEXT_PUBLIC_SITE_URL`, deploy)
- [ ] Test `/r/index.json` returns 191, `/embed/pomodoro-timer` works, `/api/install` plan works
- [ ] (Optional) Add custom domain in Vercel → update env var
- [ ] Publish MCP to npm: `cd mcp && npm publish --access public`
- [ ] Test `npx -y notion-arena-mcp` + MCP inspector
- [ ] Publish MCP to MCP Registry: `mcp-publisher login github && mcp-publisher publish`
- [ ] Skill: push `skills/notion-arena/SKILL.md` to main → test `npx skills add . --list`
- [ ] Plugin: ensure `.claude-plugin/plugin.json` + `marketplace.json` valid → test `/plugin marketplace add .` locally
- [ ] Update README with deploy URL, MCP install, Skill install
- [ ] Share install commands: Twitter, Notion communities, Vercel skills.sh

---

## Part 8 — What Users See (Final)

**Site**: `https://notionarena.vercel.app` (free)

**MCP** (npm, free):
```bash
claude mcp add --scope project notion-arena -- npx -y notion-arena-mcp
# or pinned: npx -y notion-arena-mcp@0.2.2
```

**Skill** (skills.sh, free, cross-agent):
```bash
npx skills add SynergyFlowLabs/notion-arena --skill notion-arena --agent '*' --yes
```

**Plugin** (Claude Code, free, one command for both):
```bash
/plugin marketplace add SynergyFlowLabs/notion-arena
/plugin install notion-arena@notion-arena-marketplace
```

**Registry** (shadcn, free):
```json
{ "registries": { "@notion-arena": "https://notionarena.vercel.app/r/{name}.json" } }
```

All free, no server costs, no DB, no secrets in repo. Widgets are single HTML files with no dependencies, so bandwidth is tiny (5-22KB each).

---

## Links

- Vercel Deploy: https://vercel.com/new
- npm: https://www.npmjs.com/signup, https://www.npmjs.com/package/notion-arena-mcp
- MCP Registry: https://github.com/modelcontextprotocol/registry, https://registry.modelcontextprotocol.io
- skills.sh: https://skills.sh, https://github.com/vercel-labs/agent-skills
- Claude Code Plugins: https://code.claude.com/docs/en/plugins, https://code.claude.com/docs/en/marketplaces
- This repo: `docs/AGENT_SETUP.md` (MCP+Skill setup), `mcp/README.md`, `skills/README.md`

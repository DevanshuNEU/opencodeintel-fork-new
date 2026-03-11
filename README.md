<div align="center">

<img src="docs/assets/OpenCodeIntel_Fav.png" alt="OpenCodeIntel" width="80" />

# OpenCodeIntel

**The open source alternative to Augment Code's context engine.**

Semantic code search + per-task context assembly + MCP integration.
Self-hosted or hosted by us. Your code, your data, your control.

[![CI](https://github.com/OpenCodeIntel/opencodeintel/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenCodeIntel/opencodeintel/actions)
[![License: MIT](https://img.shields.io/github/license/OpenCodeIntel/opencodeintel)](./LICENSE)
[![Stars](https://img.shields.io/github/stars/OpenCodeIntel/opencodeintel?style=social)](https://github.com/OpenCodeIntel/opencodeintel/stargazers)
[![MCP](https://img.shields.io/badge/MCP-compatible-6366f1)](https://mcp.opencodeintel.com)

[**Try Free →**](https://opencodeintel.com) · [**Self-Host**](#self-host) · [**MCP Setup**](./docs/mcp-setup.md) · [**Docs**](./docs) · [**Discord**](https://discord.gg/opencodeintel)

</div>

---

## The problem

Augment Code raised $252M to solve codebase context for AI tools. Their solution works great — if you're an enterprise with 50+ engineers and a budget to match.

Everyone else is left with:
- Claude Code's `/init` — generates 300-line files ETH Zurich proved hurt performance
- Cursor's `@codebase` — semantic search locked inside one editor
- Manual CLAUDE.md files that go stale silently

**OpenCodeIntel is the open source infrastructure layer that solves this for everyone.**

- Semantic search across your entire codebase, via MCP
- Per-task context assembly — returns only what's relevant to *this specific task*
- Works with Claude Code, Cursor, Copilot, Gemini CLI simultaneously
- Self-host with Docker or use our hosted version at opencodeintel.com


---

## The flagship feature: per-task context assembly

Before OCI, AI tools guess which files are relevant to your task. They're often wrong.

With OCI's `get_context_for_task` MCP tool:

```
User: add rate limiting to the settings page endpoints

OCI assembles automatically:
→ backend/routes/settings.py      (94% relevant — exact file to edit)
→ backend/services/user_limits.py (87% relevant — existing rate limit logic)
→ backend/middleware/auth.py      (81% relevant — auth pattern to follow)
→ Rule: Use LimitCheckError, not a new exception
→ Rule: require_auth on all user routes
→ Rule: Never bypass RLS on the users table

Total: 1,400 tokens. Exactly what Claude needs. Nothing it doesn't.
```

**Before OCI:** Claude reads random files, uses the wrong exception class, puts the file in the wrong location. You spend 20 minutes on corrections.

**After OCI:** First try. Every time.

---

## Quick start

### Use the hosted version

1. Go to [opencodeintel.com](https://opencodeintel.com) — free tier available
2. Add your repo (GitHub URL)
3. Get an API key
4. Add to Claude Desktop:

```json
{
  "mcpServers": {
    "codeintel": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.opencodeintel.com/mcp"],
      "env": { "API_KEY": "ci_your-key-here" }
    }
  }
}
```

Or use saar to do it in one command:

```bash
pip install saar
saar extract . --index   # extract + index in one step
```

### Self-host with Docker

```bash
git clone https://github.com/OpenCodeIntel/opencodeintel.git
cd opencodeintel
cp .env.example .env     # add your Supabase + Pinecone keys
docker compose up
```

→ Full self-host guide: [docs/docker-quickstart.md](./docs/docker-quickstart.md)


---

## MCP tools

Once connected, every AI tool gets these tools automatically:

| Tool | What it does |
|---|---|
| `search_code` | Semantic search — finds functions by meaning, not just keywords |
| `get_context_for_task` | **Per-task context assembly** — returns exactly the right files + rules for your specific task |
| `get_codebase_dna` | Extract architecture patterns, naming conventions, auth patterns |
| `get_dependency_graph` | See what depends on what — before you break something |
| `analyze_impact` | "If I change this file, what else breaks?" |
| `add_repository` | Add a new repo programmatically |
| `index_repository` | Trigger indexing for a repo |

---

## Architecture

```
Your codebase
     ↓
  saar extract .            # generates AGENTS.md + extracts DNA locally
     ↓
  saar extract . --index    # indexes into OCI
     ↓
  OCI (Pinecone embeddings + Supabase + FastAPI)
     ↓
  MCP server at mcp.opencodeintel.com
     ↓
  Claude Desktop / Claude Code / Cursor / Copilot / Gemini CLI
```

**Tech stack:** FastAPI · Python 3.11 · Supabase · Pinecone · React 18 · TypeScript · Vite · TanStack Query · shadcn/ui · Railway

---

## Why open source?

Augment Code is a great product. It's also $252M venture-backed, enterprise-first, and not open source.

OpenCodeIntel exists because:
- **Context infrastructure should be open** — not locked behind enterprise sales calls
- **Your codebase metadata belongs to you** — not stored in a vendor's proprietary index
- **Every developer deserves this** — not just teams with $50/month/user budgets
- **The community builds better tools** — in the open

We believe "scheduling infrastructure for everyone" (cal.com's words) has a direct parallel: **context infrastructure for every developer.**

---

## Self-host

Full control. Your data on your infrastructure.

```bash
# Requirements: Docker, Supabase account, Pinecone account
git clone https://github.com/OpenCodeIntel/opencodeintel.git
cd opencodeintel
cp .env.example .env
# Add: SUPABASE_URL, SUPABASE_KEY, PINECONE_API_KEY
docker compose up
```

Backend runs at `localhost:8000`. Frontend at `localhost:5173`.

→ Detailed guide: [docs/docker-quickstart.md](./docs/docker-quickstart.md)
→ Deployment (Railway): [docs/deployment.md](./docs/deployment.md)

---

## Contributing

680 commits. Built solo. Now open for contributions.

```bash
git clone https://github.com/OpenCodeIntel/opencodeintel.git
cd opencodeintel

# Backend
cd backend && pip install -r requirements.txt
pytest tests/ -v         # 392+ tests

# Frontend
cd frontend && bun install
bun run dev
```

Good first issues: [`good first issue`](https://github.com/OpenCodeIntel/opencodeintel/issues?q=is%3Aopen+label%3A%22good+first+issue%22)

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and [CLAUDE.md](./CLAUDE.md) before opening a PR.

---

## Built by

[Devanshu Chicholikar](https://github.com/DevanshuNEU) · MS Software Engineering, Northeastern · Solo founder · F1 visa

Building context infrastructure for developers who use AI tools daily.

---

<div align="center">

**[opencodeintel.com](https://opencodeintel.com)** · **[getsaar.com](https://getsaar.com)** · **[MIT License](./LICENSE)**

*If OCI helped your team ship better AI-assisted code, a ⭐ goes a long way.*

</div>

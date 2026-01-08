<p align="center">
  <!-- Logo placeholder - replace with actual logo -->
  <h1 align="center">OpenCodeIntel</h1>
</p>

<p align="center">
  <strong>AI-powered semantic code search for your repositories</strong>
</p>

<p align="center">
  <a href="https://github.com/OpenCodeIntel/opencodeintel/actions/workflows/ci.yml">
    <img src="https://github.com/OpenCodeIntel/opencodeintel/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  </a>
  <a href="https://github.com/OpenCodeIntel/opencodeintel/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/OpenCodeIntel/opencodeintel" alt="License" />
  </a>
  <a href="https://github.com/OpenCodeIntel/opencodeintel/releases">
    <img src="https://img.shields.io/github/v/release/OpenCodeIntel/opencodeintel?include_prereleases" alt="Release" />
  </a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="./docs/deployment.md">Deployment</a> •
  <a href="./docs/mcp-setup.md">MCP Integration</a> •
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

---

<!-- Demo screenshot placeholder -->
<!-- <p align="center">
  <img src="docs/assets/demo.png" alt="OpenCodeIntel Dashboard" width="800" />
</p> -->

## What is OpenCodeIntel?

OpenCodeIntel gives AI coding assistants deep understanding of your codebase. It's an MCP server that provides semantic code search, dependency analysis, and impact prediction.

**Search by meaning, not keywords.** Find "error handling logic" even when functions are named `processFailure()`.

## Features

- **Semantic Search** - Vector-based code search that understands intent
- **Dependency Graph** - Visualize how your codebase connects
- **Impact Analysis** - Know what breaks before you change a file
- **Code Style Analysis** - Understand team patterns and conventions
- **MCP Integration** - Works directly with Claude Desktop

## Quick Start

### Using Docker (Recommended)

```bash
git clone https://github.com/OpenCodeIntel/opencodeintel.git
cd opencodeintel

cp .env.example .env
# Add your API keys to .env

docker compose up -d
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

**Requirements:** Python 3.11+, Node.js 20+

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## MCP Integration

Connect OpenCodeIntel to Claude Desktop for AI-powered code assistance.

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "opencodeintel": {
      "command": "python",
      "args": ["/path/to/opencodeintel/mcp-server/server.py"],
      "env": {
        "BACKEND_API_URL": "http://localhost:8000",
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

**Available tools:** `search_code`, `list_repositories`, `get_dependency_graph`, `analyze_code_style`, `analyze_impact`, `get_repository_insights`

See [MCP Setup Guide](./docs/mcp-setup.md) for detailed instructions.

## Architecture

```
Frontend (React + TypeScript)
     ↓
Backend (FastAPI + Python)
     ↓
┌────┴────┬────────────┐
Pinecone  Supabase    Redis
(vectors) (database)  (cache)
```

**Stack:** FastAPI, React, TypeScript, Pinecone, Supabase, Redis, tree-sitter

## Documentation

| Guide | Description |
|-------|-------------|
| [Docker Quickstart](./docs/docker-quickstart.md) | Get running in 5 minutes |
| [Deployment](./docs/deployment.md) | Production deployment guide |
| [MCP Setup](./docs/mcp-setup.md) | Claude Desktop integration |
| [Docker Troubleshooting](./docs/docker-troubleshooting.md) | Common issues and fixes |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Quick links:**
- [Open Issues](https://github.com/OpenCodeIntel/opencodeintel/issues)
- [Good First Issues](https://github.com/OpenCodeIntel/opencodeintel/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

## License

MIT License - see [LICENSE](./LICENSE) for details.

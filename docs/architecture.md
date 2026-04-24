# OpenCodeIntel — System Architecture

## Overview

OpenCodeIntel is a RAG-based (Retrieval-Augmented Generation) code intelligence system. It indexes codebases into a vector database, then assembles per-task context for AI coding assistants via the Model Context Protocol (MCP).

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer's Machine                       │
│                                                                  │
│   ┌──────────┐    ┌────────────────┐    ┌──────────────────┐    │
│   │  Claude  │    │  Cursor / VSC  │    │   Gemini CLI /   │    │
│   │   Code   │    │   + Copilot    │    │   Any MCP client │    │
│   └────┬─────┘    └───────┬────────┘    └────────┬─────────┘    │
│        │                  │                       │              │
│        └──────────────────┼───────────────────────┘              │
│                           │ MCP Protocol                         │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                ┌───────────▼───────────┐
                │     MCP Server        │
                │  mcp.opencodeintel.com│
                │  (FastMCP, Railway)   │
                │                       │
                │  Dual transport:      │
                │  • stdio (local)      │
                │  • streamable-http    │
                └───────────┬───────────┘
                            │ REST API
                ┌───────────▼───────────┐
                │    Backend API        │
                │  api.opencodeintel.com│
                │  (FastAPI, Railway)   │
                └──┬──────────┬─────────┘
                   │          │
        ┌──────────▼──┐  ┌────▼──────────┐
        │  Supabase   │  │   Pinecone    │
        │  (Postgres) │  │ (Vector DB)   │
        │             │  │               │
        │ - users     │  │ - embeddings  │
        │ - repos     │  │ - 1536/3072d  │
        │ - api_keys  │  │ - cosine sim  │
        │ - deps      │  └───────────────┘
        └─────────────┘
```

---

## Indexing Pipeline (RAG — Knowledge Base Construction)

```
Repository (GitHub URL or local path)
            │
            ▼
┌─────────────────────────┐
│   Repo Cloning / Access │
│   (GitPython)           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   File Filtering        │
│   - Skip: node_modules, │
│     .git, build dirs    │
│   - Include: .py, .ts,  │
│     .tsx, .js, .go etc  │
│   - include_paths filter│
│     (Path.parts — exact)│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Tree-sitter Parsing   │  ← Language: Python, JS, TS, TSX
│   (Function-level       │
│    extraction — v2)     │
│                         │
│   Extracts per chunk:   │
│   - function name       │
│   - docstring           │
│   - parameters          │
│   - return type         │
│   - surrounding context │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Embedding Generation  │  ← OpenAI text-embedding-3-small
│   (AsyncOpenAI)         │     or text-embedding-3-large
│                         │
│   Batch size: 100       │
│   Parallel files: 10    │
│   Rich text format:     │
│   "File: X\nFunc: Y\n   │
│    Params: Z\nBody: ..."│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Pinecone Upsert       │  ← Serverless index, AWS us-east-1
│   (Batch: 100 vectors)  │     Cosine similarity metric
│                         │
│   Metadata stored:      │
│   - file_path           │
│   - function_name       │
│   - repo_id             │
│   - chunk_type          │
└─────────────────────────┘
```

---

## Query Pipeline (RAG — Retrieval + Context Assembly)

```
User Task: "add rate limiting to the settings endpoints"
            │
            ▼
┌─────────────────────────┐
│   Query Expansion       │  ← SearchEnhancer (GPT-4o-mini)
│   (search_enhancer.py)  │     Generates 3 semantic variants
│                         │     to improve recall
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Pinecone Semantic     │
│   Search                │
│   - top-k results       │
│   - cosine similarity   │
│   - repo_id filter      │
│   - keyword boosting    │
│     for exact matches   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   1-Hop Dependency      │  ← dependency_analyzer.py
│   Expansion             │     Tree-sitter AST import graph
│   (context_assembler.py)│     Adds files that import or
│                         │     are imported by top results
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Rules Matching        │  ← Reads CLAUDE.md / AGENTS.md /
│   (context_assembler.py)│     .cursorrules / CONVENTIONS.md
│                         │     Splits by ## headers
│                         │     Matches sections to task
│                         │     using regex + keyword overlap
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Token Budget Packing  │  ← Default budget: 1500 tokens
│   (context_assembler.py)│     Ranks files by relevance score
│                         │     Packs until budget is hit
│                         │     ~1 token per 4 chars estimate
└───────────┬─────────────┘
            │
            ▼
Assembled Context (Markdown):
  → backend/routes/settings.py      (94% relevant)
  → backend/services/user_limits.py (87% relevant)
  → backend/middleware/auth.py       (81% relevant)
  → Rule: Use LimitCheckError, not a new exception
  → Rule: require_auth on all user routes
  Total: ~1,400 tokens
```

---

## DNA Extraction Pipeline (Prompt Engineering Component)

```
Repository Files
      │
      ▼
┌──────────────────────────┐
│   dna_extractor.py       │
│   (Tree-sitter AST scan) │
│                          │
│   Detects:               │
│   - Auth patterns        │
│     (middleware, decorators,│
│      ownership checks)   │
│   - Service patterns     │
│     (singletons, DI)     │
│   - DB patterns          │
│     (ORM, RLS, ID types) │
│   - Error patterns       │
│     (exception classes)  │
│   - Logging patterns     │
│   - Naming conventions   │
│   - Style conventions    │
│     (async ratio, type   │
│      hint coverage)      │
└───────────┬──────────────┘
            │
            ▼
      AGENTS.md file
  (Machine-readable rules
   for AI coding assistants)
```

---

## Dependency Analysis Pipeline

```
Repository Source Files
         │
         ▼
┌─────────────────────────┐
│  dependency_analyzer.py │
│  (Tree-sitter AST)      │
│                         │
│  Languages:             │
│  Python: import X,      │
│          from X import Y│
│  JS/TS/TSX: import X    │
│             require('X')│
│                         │
│  Resolves relative paths│
│  Handles index.ts files │
│  Uses Path.parts for    │
│  exact prefix matching  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Supabase Storage       │
│  file_dependencies table│
│  (source → target edges)│
└───────────┬─────────────┘
            │
            ▼
  Context assembler uses
  dep graph to expand
  1 hop beyond search hits
```

---

## MCP Protocol Layer

```
MCP Client (Claude Code / Cursor / etc.)
         │
         │  JSON-RPC over stdio OR HTTP
         ▼
┌─────────────────────────────────┐
│  FastMCP Server (server.py)     │
│                                 │
│  Tools exposed:                 │
│  ┌─────────────────────────┐    │
│  │ search_code             │    │
│  │ get_context_for_task    │    │  ← Core RAG tool
│  │ get_codebase_dna        │    │
│  │ get_dependency_graph    │    │
│  │ analyze_impact          │    │
│  │ analyze_code_style      │    │
│  │ add_repository          │    │
│  │ index_repository        │    │
│  │ list_repositories       │    │
│  └─────────────────────────┘    │
│                                 │
│  Auth: MCP_API_KEY (ci_ prefix) │
│  SHA-256 hashed in DB           │
└─────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend API | FastAPI, Python 3.11+, Uvicorn |
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui, Bun |
| MCP Server | FastMCP, Python, Streamable HTTP + stdio |
| Vector DB | Pinecone (Serverless, AWS us-east-1) |
| Embeddings | OpenAI text-embedding-3-small / text-embedding-3-large |
| Code Parsing | tree-sitter (Python, JS, TS, TSX) |
| Relational DB | Supabase (PostgreSQL + RLS) |
| Auth | JWT + API key (SHA-256 hashed) |
| Infrastructure | Railway (backend + MCP), Vercel (frontend) |
| CI/CD | GitHub Actions (path-filtered per service) |
| Package Manager | Bun (frontend), pip (backend/MCP) |

---

## Data Flow: End-to-End

```
1. Developer adds repo URL at opencodeintel.com
         ↓
2. Backend clones repo, tree-sitter parses all files
         ↓
3. Functions/chunks embedded via OpenAI → stored in Pinecone
         ↓
4. Import graph built → stored in Supabase
         ↓
5. DNA extracted → AGENTS.md written to repo
         ↓
6. Developer configures MCP in Claude Code / Cursor
         ↓
7. AI assistant calls get_context_for_task("add rate limiting...")
         ↓
8. MCP server → Backend: query expansion + vector search
         ↓
9. Top hits + 1-hop deps + matching rules assembled
         ↓
10. Context package returned to AI assistant (~1,400 tokens)
         ↓
11. AI generates correct code, first try
```

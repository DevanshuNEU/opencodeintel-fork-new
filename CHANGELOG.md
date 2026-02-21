# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-20

### Added
- **Dependency Graph Overhaul** (PR #246): Replaced ReactFlow with Sigma.js WebGL rendering. ForceAtlas2 layout with Louvain community detection for automatic clustering. Node search with zoom-to-focus, zoom controls, hover/click interactions with neighbor highlighting.
- **Dependency Structure Matrix**: New directory-level DSM view showing cross-directory coupling. Circular dependency detection with red cell highlights. Click-to-drill from directory to file level.
- **Team Rules Detection** (PR #244): Auto-detects CLAUDE.md, .cursorrules, and other AI assistant config files. Includes them in Codebase DNA extraction.
- **Documentation Overhaul** (PR #240): 12 new docs pages covering API reference, architecture, deployment, MCP setup, and contributing guide.
- **React Error Boundary**: Prevents white-screen crashes with recovery UI.
- **Frontend Test Suite**: 13 smoke tests using Vitest + happy-dom covering ErrorBoundary, useGraphData, and useDirectoryMatrix. Tests integrated into CI pipeline.
- **SEO Setup** (PR #245): Meta tags, sitemap, Open Graph.
- **GitHub OAuth Import** (PR #230): Import repos directly from GitHub.
- **Settings Page** (PR #231): User preferences and API key management.
- **Real-time Indexing Progress** (PR #226): WebSocket-based live progress during repo indexing.
- **Search v3** (PR #224): AI-powered search summaries, Cohere reranking.
- **Feedback/Waitlist/Discord integration** (PR #232): User feedback pipeline.

### Changed
- Dashboard redesigned with dark theme and glassmorphism (PR #219).
- NavLink component moved to module scope to prevent remount on every render.
- Replaced manual fetch-in-useEffect with React Query for repo list (30s polling, request dedup, caching).
- Docker env vars standardized: SUPABASE_ANON_KEY replaces SUPABASE_KEY (**Breaking** -- self-hosted users must rename SUPABASE_KEY to SUPABASE_ANON_KEY in their .env). Added SUPABASE_JWT_SECRET, VOYAGE_API_KEY, COHERE_API_KEY, SENTRY_DSN.
- Repository type in useCachedQuery now uses shared interface (fixes undefined git_url).

### Removed
- ReactFlow, dagre, @types/dagre dependencies (replaced by Sigma.js stack).
- Old DependencyGraph components: GraphNode.tsx, DirectoryNode.tsx, GraphToolbar.tsx.
- jsdom (replaced by happy-dom for testing).

### Fixed
- [object Object] bug in DashboardHome toast messages (defensive error extraction).
- Dependency graph search zoom coordinates (graphToViewport + camera offset calculation).
- Search and hover competing for node highlight state (shared pinned/hovered model).
- .env.example inline comments parsed as part of values by python-dotenv.
- Startup env validation comment mismatch (2-tuple, not 3-tuple).

---

## [0.1.0] - 2024-12-23

### Added
- Semantic code search using vector embeddings
- Dependency graph analysis
- Impact analysis for code changes
- Code style analysis
- MCP (Model Context Protocol) server integration
- Support for Python, TypeScript, JavaScript, Go, Rust
- Supabase authentication
- Redis caching layer
- Docker deployment support
- Comprehensive API documentation

### Infrastructure
- FastAPI backend with async support
- React + Vite + TypeScript frontend
- Pinecone vector database integration
- GitHub OAuth integration
- Rate limiting and security middleware

---

## Version History

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality (backwards compatible)
- **PATCH** version for bug fixes (backwards compatible)

Pre-1.0 releases (0.x.x) may have breaking changes in minor versions as the API stabilizes.

# CodeIntel Development Rules

## Code Style

### General
- NO emojis anywhere - not in code, comments, docs, or commit messages
- Files must stay under 200 lines. Split if larger.
- Comments explain WHY, not WHAT. One-liners only.
- No decorative headers, no JSDoc blocks, no ASCII art
- Casual tone in comments - write like a human, not a robot

### Frontend (TypeScript/React)
- Package manager: **Bun only**. Never npm, never yarn.
- Always `bun install`, `bun run dev`, `bun run build`
- Never delete `bun.lock` or create `package-lock.json`
- Use shadcn/ui components over custom UI
- Tailwind for styling, no CSS files
- Functional components with hooks, no class components

### Backend (Python)
- Python 3.11+ required
- Type hints on all function signatures
- Async/await for I/O operations
- PEP 8 style, max 120 char lines
- Use existing patterns from `services/` directory

### Commits
- Format: `type: description` (e.g., `fix: remove broken link`)
- Types: feat, fix, docs, refactor, test, chore
- No emojis in commit messages
- Keep commits focused - one change per commit

## Architecture

### Project Structure
```
backend/          # FastAPI, Python 3.11+
frontend/         # React 18, TypeScript, Vite, Bun
mcp-server/       # MCP protocol server
```

### API Versioning
- All endpoints use `/api/v1/` prefix
- Version config in `backend/config/api.py`

### Key Services
- `indexer_optimized.py` - Code parsing and embedding
- `dependency_analyzer.py` - Import graph extraction
- `style_analyzer.py` - Convention detection
- `dna_extractor.py` - Architectural pattern extraction

## What NOT to Do

- Don't use npm (use Bun)
- Don't add emojis
- Don't write verbose comments
- Don't create files over 200 lines
- Don't add "AI-looking" badges or decorations
- Don't use JSDoc or decorative comment blocks

# CodeIntel - Launch Priorities

## P0 - Must Fix Before Launch

### Frontend
- [ ] Fix `[object Object]` bug in DashboardHome.tsx

### DevOps / Auth
- [ ] MCP Authentication Overhaul (Option D)
  - [ ] Create `~/.codeintel/config.yaml` spec
  - [ ] Build `codeintel_config` shared loader
  - [ ] Add `codeintel init` CLI command
  - [ ] Update MCP server to use unified config
  - [ ] Update backend auth to use unified config
  - [ ] Documentation

---

## P1 - Launch Week

### Product
- [ ] LinkedIn launch announcement (post ready, need to schedule)
- [ ] Greptile config (`greptile.json` with team rules)

### DevOps
- [ ] Branch protection (require Greptile review)
- [ ] Staging environment setup

---

## P2 - Post-Launch

### Frontend
- [ ] Navigation refactor (single source of truth) - see DEFERRED.md
- [ ] DNA Preview component (show users what gets extracted)
- [ ] EndpointHeader extraction (DRY refactor) - see DEFERRED.md

### Product
- [ ] MCP distribution strategy (Cursor, Continue, Claude Desktop docs)
- [ ] "CodeIntel-aware" badge/marketing

---

## Completed

- [x] PR #240: Docs Overhaul
- [x] PR #244: Team Rules Detection (CLAUDE.md auto-inclusion)
- [x] Polish Sprint (Feedback/Waitlist/Discord)
- [x] GitHub CLI integration
- [x] Greptile setup (replacing CodeRabbit)

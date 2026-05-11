## Summary

<!-- 1-2 sentences. What changed and why. A busy reviewer should absorb this in 10 seconds. Skip "this PR adds" - just state the change. If you cannot summarize in 2 sentences, the PR is too big; split it. -->



## Type of change

- [ ] feat (new user-visible behavior)
- [ ] fix (bug fix)
- [ ] refactor (internal restructure, no behavior change)
- [ ] perf (measured performance improvement)
- [ ] docs (documentation only)
- [ ] test (test additions, no behavior change)
- [ ] chore (tooling, deps, CI)

## Closes / implements

<!-- Anchor this PR to its origin. Delete lines that do not apply. -->

- Closes #
- ADR: `oci/decisions/` (or `n/a - under ADR threshold`)
- Stack(s): backend / frontend / mcp-server (delete what does not apply)

## What changed

<!-- File-grouped diff summary. One line per substantive file: "what changed and why", not "modified X". Skip pure formatting / import-only changes. If >15 substantive files, the PR is probably too big. -->

**Backend:**
-

**Frontend:**
-

**MCP server:**
-

**Tests / docs:**
-

## ADR adherence

<!-- The ADR is the contract. Each checkbox answers "did this PR honor the part of the ADR that says X?" Unchecked = explain in the section below. If no ADR (small fix), delete this section. -->

- [ ] Data model matches ADR
- [ ] Consistency guarantee matches ADR (strong / read-after-write / eventual)
- [ ] Latency target honored, measured: p50 ___ ms / p95 ___ ms (ADR target: ___)
- [ ] Blast radius is what the ADR predicted
- [ ] All ADR acceptance criteria pass

## How to test

<!-- Step-by-step manual repro. Pretend the reviewer is dropping in cold. Each step is either a command to run or an observation to make. End with "Expected: ..." for each visible outcome. -->

1.
2.

Expected:

## Verification

- [ ] `/oci-pipeline` ran clean (BLOCKING: 0)
- [ ] CodeRabbit comments addressed (or explicit dismiss with reason)
- [ ] `/oci-defend` 7/7 passed if this is a feat / non-trivial change
- [ ] Backend tests pass: `cd backend && pytest tests/ -v`
- [ ] Frontend tests pass: `cd frontend && bun run typecheck && bun run test && bun run build`
- [ ] MCP tests pass: `cd mcp-server && pytest tests/ -v` (or `n/a` if mcp-server untouched)

## Deployment notes

<!-- Anything the deploy needs to know. Flag here, not buried in the diff. -->

- [ ] No new env vars (or list them and where they go: Railway backend / Railway mcp-server / Vercel)
- [ ] No DB migration (or paste the migration filename)
- [ ] No off-limits files modified (`backend/middleware/auth.py`, `backend/config/startup_checks.py`, `bun.lockb`)
- [ ] No `mcp` package version change (still `>=1.25.0,<2.0.0`)
- [ ] No breaking change to `/api/v1/*` contracts

## Tradeoff (Paired-Ship Protocol)

<!-- ONE QUESTION: what design choice did this PR make that had a viable alternative? Name the rejected alternative and why. This is the senior-engineer tradeoff statement; it gets paraphrased into interview answers for "tell me about a hard decision." If no real tradeoff existed, the PR is probably too small to need this section - delete it. -->



## Risk and rollback

- **Symptom if wrong:**
- **Blast radius:**
- **Rollback path:** revert this PR / feature flag / migration revert / config change
- **Time-to-rollback:** < 5 min / < 30 min / requires migration revert

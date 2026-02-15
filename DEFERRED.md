# Deferred Work

Items intentionally skipped for future PRs.

---

## PR: feature/docs-overhaul

### 1. Extract shared EndpointHeader component
**Priority:** Low
**Effort:** 30 min
**Files affected:**
- `frontend/src/pages/api/APIRepositoriesPage.tsx`
- `frontend/src/pages/api/APIAnalysisPage.tsx`
- `frontend/src/pages/api/APISearchPage.tsx`
- `frontend/src/pages/api/APIOverviewPage.tsx`

**What:** All 4 API doc pages duplicate the endpoint header markup (colored method badge + path in bordered container). APIRepositoriesPage already has a local `EndpointHeader` component - extract it to `@/components/docs` and reuse.

**Saves:** ~40 lines of duplication

**When to do:** Next time any of these pages need changes, or during a cleanup sprint.

---

### 2. Consolidate navigation data source
**Priority:** Medium  
**Effort:** 1-2 hours
**Files affected:**
- `frontend/src/components/docs/DocsSidebar.tsx` (navigation)
- `frontend/src/components/docs/DocsSearch.tsx` (docsPages)
- `frontend/src/components/docs/DocsLayout.tsx` (mobileNavigation)

**What:** Same page list maintained in 3 places. Adding a page requires updating all 3. Extract single `docsNavigation` data source and derive variants from it.

**When to do:** Before adding more doc pages, or if someone forgets to update all 3.

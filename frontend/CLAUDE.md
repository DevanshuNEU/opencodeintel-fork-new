# frontend/ Rules

React 18, TypeScript, Vite, Bun. Tailwind, shadcn/ui, TanStack Query, Vitest.

Root rules in `../CLAUDE.md` apply. This file adds frontend-specific rules.

## Package manager

- **Bun only.** Never npm, never yarn.
- `bun install`, `bun run dev`, `bun run build`, `bun run typecheck`, `bun run test`.
- Never delete `bun.lock`. Never create `package-lock.json` or `yarn.lock`.

## React patterns

- Functional components with hooks. `ErrorBoundary` is the ONLY allowed class component (React requires class for error boundaries).
- Define components at module scope. Never inside another component (causes remounts on every parent render).
- Derive state during render. Avoid `useEffect` for state syncing.
- Stable keys (`item.id`), never array indices, on lists that mutate.
- Colocate state with the component that uses it. Lift only when needed.

## Data fetching

- All server data goes through TanStack Query (`useQuery` / `useMutation`).
- Never raw `fetch` in `useEffect`.
- Set `staleTime` based on freshness needs. `useQuery` without `staleTime` refetches on every focus.
- Custom hooks in `src/hooks/` with `use` prefix. Canonical example: `useUserUsage`.

## Components and styling

- Prefer shadcn/ui components over custom. `bun run shadcn add <name>` for new ones.
- Tailwind only. No CSS files, no styled-components.
- `cn()` from `@/lib/utils` for conditional class merging. Never template literals.
- Lists over 100 items need virtualization (`@tanstack/react-virtual` or shadcn equivalent).

## Types

- Shared interfaces in `src/types.ts`. Never duplicate inline.
- Prefer `interface` over `type` for object shapes (better error messages).
- Strict `tsconfig`. `any` requires a comment explaining why.

## Design language

- Dark theme.
- Subtle borders: `border-border/60`.
- Low-opacity card backgrounds: `bg-card/40`.
- Tier-colored accents: amber for enterprise, indigo for pro, zinc for free.
- JetBrains Mono for code, system font stack for text.
- Full-width layouts. No `max-w-4xl` constraints unless a specific page genuinely needs it.
- Never generate "AI-looking" generic designs (no purple gradients on white).

## Tests

- Vitest + happy-dom. Tests live in `src/test/` with `@/` alias imports.
- Run: `cd frontend && bun run typecheck && bun run test && bun run build`.
- happy-dom has limits: no real navigation, limited Canvas/WebGL. WebGL graph tests must mock Sigma.js.
- Every component test that uses TanStack Query must wrap with a fresh `QueryClientProvider` per test.
- Async UI assertions: `waitFor`, not `setTimeout`.

## Critical files (most dependents, change carefully)

These have the most dependents per the latest AGENTS.md run. Understand before modifying:

- `components/ui/Skeleton.tsx`
- `components/ui/button.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/landing/GitHubStars.tsx`
- `components/landing/ThemeToggle.tsx`
- `components/docs/DocsSearch.tsx`
- `components/dashboard/DashboardLayout.tsx`
- `components/dashboard/DashboardHome.tsx`

## Approved file-size exceptions

Most files stay under 200 lines. These are approved larger due to logical cohesion:

- `components/DependencyGraph/GraphView/index.tsx`
- `components/DependencyGraph/MatrixView/index.tsx`

## Off-limits files in frontend/

- `bun.lockb`

Never delete or hand-edit. Let Bun manage it.

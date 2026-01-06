// demo repos shown on landing page - these must be pre-indexed and hot in cache
// order matters: first one is the default

export interface DemoRepo {
  id: string
  name: string
  icon: string
}

export const DEMO_REPOS: DemoRepo[] = [
  { id: 'flask', name: 'Flask', icon: '🐍' },
  { id: 'fastapi', name: 'FastAPI', icon: '⚡' },
  { id: 'express', name: 'Express', icon: '🟢' },
]

export const DEFAULT_DEMO_QUERY = 'authentication middleware patterns'

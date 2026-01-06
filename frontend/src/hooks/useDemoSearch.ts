import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL } from '@/config/api'
import { DEMO_REPOS, DEFAULT_DEMO_QUERY, type DemoRepo } from '@/config/demo-repos'
import type { SearchResult } from '@/types'

interface SearchState {
  query: string
  repo: DemoRepo
  results: SearchResult[]
  loading: boolean
  searchTime: number | null
  error: string | null
}

const initialState: SearchState = {
  query: DEFAULT_DEMO_QUERY,
  repo: DEMO_REPOS[0],
  results: [],
  loading: false,
  searchTime: null,
  error: null,
}

export function useDemoSearch(autoStart = true) {
  const [state, setState] = useState<SearchState>(initialState)
  const abortRef = useRef<AbortController | null>(null)
  const didAutoStart = useRef(false)

  const search = useCallback(async (q?: string, repoId?: string) => {
    const query = q ?? state.query
    const repo = repoId ?? state.repo.id
    if (!query.trim()) return

    // kill any pending request - user might be typing fast
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setState(s => ({ ...s, loading: true, error: null }))
    const t0 = Date.now()

    try {
      const res = await fetch(`${API_URL}/playground/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortRef.current.signal,
        body: JSON.stringify({ query, demo_repo: repo, max_results: 10 }),
      })

      const data = await res.json()

      if (data.results) {
        setState(s => ({
          ...s,
          results: data.results,
          searchTime: data.search_time_ms || Date.now() - t0,
          loading: false,
        }))
      } else if (data.status === 429) {
        setState(s => ({ ...s, error: 'Rate limited', loading: false }))
      }
    } catch (err) {
      // user navigated away or started new search - don't show error
      if (err instanceof Error && err.name === 'AbortError') return
      setState(s => ({ ...s, error: 'Search failed', loading: false }))
    }
  }, [state.query, state.repo.id])

  const setQuery = useCallback((query: string) => {
    setState(s => ({ ...s, query }))
  }, [])

  const setRepo = useCallback((repo: DemoRepo) => {
    setState(s => ({ ...s, repo }))
  }, [])

  const reset = useCallback(() => setState(initialState), [])

  // fire search on mount with slight delay so user sees it "start"
  // without this, results appear instantly which feels less impressive
  useEffect(() => {
    if (!autoStart || didAutoStart.current) return
    didAutoStart.current = true

    const delay = setTimeout(() => search(), 600)
    return () => clearTimeout(delay)
  }, [autoStart, search])

  return { ...state, setQuery, setRepo, search, reset }
}

export { DEMO_REPOS, type DemoRepo }

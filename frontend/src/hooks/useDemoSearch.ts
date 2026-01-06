import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL } from '@/config/api'
import type { SearchResult } from '@/types'

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

const DEFAULT_QUERY = 'authentication middleware patterns'
const DEFAULT_REPO = 'flask'

interface DemoSearchState {
  query: string
  repo: DemoRepo
  results: SearchResult[]
  loading: boolean
  searchTime: number | null
  error: string | null
  hasSearched: boolean
}

interface UseDemoSearchReturn extends DemoSearchState {
  setQuery: (query: string) => void
  setRepo: (repo: DemoRepo) => void
  search: (query?: string, repoId?: string) => Promise<void>
  reset: () => void
}

export function useDemoSearch(autoStart = true): UseDemoSearchReturn {
  const [state, setState] = useState<DemoSearchState>({
    query: DEFAULT_QUERY,
    repo: DEMO_REPOS[0],
    results: [],
    loading: false,
    searchTime: null,
    error: null,
    hasSearched: false,
  })

  const abortRef = useRef<AbortController | null>(null)
  const hasAutoStarted = useRef(false)

  const search = useCallback(async (queryOverride?: string, repoOverride?: string) => {
    const q = queryOverride ?? state.query
    const repoId = repoOverride ?? state.repo.id

    if (!q.trim()) return

    // cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    setState(prev => ({ ...prev, loading: true, error: null }))
    const startTime = Date.now()

    try {
      const response = await fetch(`${API_URL}/playground/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortRef.current.signal,
        body: JSON.stringify({
          query: q,
          demo_repo: repoId,
          max_results: 10,
        }),
      })

      const data = await response.json()

      if (data.results) {
        setState(prev => ({
          ...prev,
          results: data.results,
          searchTime: data.search_time_ms || (Date.now() - startTime),
          loading: false,
          hasSearched: true,
        }))
      } else if (data.status === 429) {
        setState(prev => ({
          ...prev,
          error: 'Rate limited. Sign up for unlimited searches.',
          loading: false,
          hasSearched: true,
        }))
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setState(prev => ({
        ...prev,
        error: 'Search failed. Try again.',
        loading: false,
      }))
    }
  }, [state.query, state.repo.id])

  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }))
  }, [])

  const setRepo = useCallback((repo: DemoRepo) => {
    setState(prev => ({ ...prev, repo }))
  }, [])

  const reset = useCallback(() => {
    setState({
      query: DEFAULT_QUERY,
      repo: DEMO_REPOS[0],
      results: [],
      loading: false,
      searchTime: null,
      error: null,
      hasSearched: false,
    })
  }, [])

  // auto-start search on mount
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true
      // small delay so user sees the search "start"
      const timer = setTimeout(() => {
        search(DEFAULT_QUERY, DEFAULT_REPO)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [autoStart, search])

  return {
    ...state,
    setQuery,
    setRepo,
    search,
    reset,
  }
}

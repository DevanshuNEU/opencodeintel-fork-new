import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HeroSearch, type HeroSearchRef } from './HeroSearch'
import { RepoSwitcher } from './RepoSwitcher'
import { useDemoSearch, DEMO_REPOS } from '@/hooks/useDemoSearch'
import type { SearchResult } from '@/types'

interface HeroProps {
  onResultsReady?: (results: SearchResult[], query: string, repoId: string, searchTime: number | null) => void
}

export function Hero({ onResultsReady }: HeroProps) {
  const searchRef = useRef<HeroSearchRef>(null)
  const {
    query,
    repo,
    results,
    loading,
    searchTime,
    setQuery,
    setRepo,
    search,
  } = useDemoSearch(true)

  // notify parent when results come in
  useEffect(() => {
    if (results.length > 0 && onResultsReady) {
      onResultsReady(results, query, repo.id, searchTime)
    }
  }, [results, query, repo.id, searchTime, onResultsReady])

  // keyboard shortcut: / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleRepoSelect = (newRepo: typeof repo) => {
    setRepo(newRepo)
    search(query, newRepo.id)
  }

  const handleSearch = () => {
    search(query, repo.id)
  }

  return (
    <section className="min-h-[70vh] flex flex-col justify-center pt-20 pb-12 px-6">
      <div className="max-w-3xl mx-auto w-full">
        {/* headline */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="text-white">Find anything in any Python codebase.</span>
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-[var(--python-blue)]">
            Instantly.
          </p>
        </motion.div>

        {/* search bar */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <HeroSearch
            ref={searchRef}
            value={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            searching={loading}
            repoName={repo.name}
          />
        </motion.div>

        {/* repo switcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <RepoSwitcher
            repos={DEMO_REPOS}
            selected={repo}
            onSelect={handleRepoSelect}
            disabled={loading}
          />
        </motion.div>

        {/* keyboard hint */}
        <motion.div
          className="text-center mt-6 text-sm text-zinc-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-xs">/</kbd> to focus search
        </motion.div>
      </div>
    </section>
  )
}

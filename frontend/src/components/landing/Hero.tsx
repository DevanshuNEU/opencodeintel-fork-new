import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HeroSearch, type HeroSearchHandle } from './HeroSearch'
import { RepoSwitcher } from './RepoSwitcher'
import { useDemoSearch, DEMO_REPOS, type DemoRepo } from '@/hooks/useDemoSearch'
import type { SearchResult } from '@/types'

// stagger animations so elements don't all pop in at once
// feels more polished and draws eye down the page
const STAGGER = {
  headline: 0.2,
  search: 0.4,
  repos: 0.8,
  hint: 1.2,
}

interface Props {
  onResultsReady?: (results: SearchResult[], query: string, repoId: string, time: number | null) => void
}

export function Hero({ onResultsReady }: Props) {
  const searchRef = useRef<HeroSearchHandle>(null)
  const { query, repo, results, loading, searchTime, setQuery, setRepo, search } = useDemoSearch(true)

  // bubble results up to parent so it can show them below the fold
  useEffect(() => {
    if (results.length && onResultsReady) {
      onResultsReady(results, query, repo.id, searchTime)
    }
  }, [results, query, repo.id, searchTime, onResultsReady])

  // slash to focus search - standard convention from github/slack/etc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const switchRepo = (r: DemoRepo) => {
    setRepo(r)
    search(query, r.id)
  }

  return (
    <section className="min-h-[70vh] flex flex-col justify-center pt-20 pb-12 px-6">
      <div className="max-w-3xl mx-auto w-full">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: STAGGER.headline }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-white">
            Find anything in any Python codebase.
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-[var(--python-blue)]">
            Instantly.
          </p>
        </motion.div>

        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: STAGGER.search }}
        >
          <HeroSearch
            ref={searchRef}
            value={query}
            onChange={setQuery}
            onSubmit={() => search()}
            searching={loading}
            repoName={repo.name}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: STAGGER.repos }}
        >
          <RepoSwitcher repos={DEMO_REPOS} selected={repo} onSelect={switchRepo} disabled={loading} />
        </motion.div>

        <motion.p
          className="text-center mt-6 text-sm text-zinc-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: STAGGER.hint }}
        >
          Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-xs">/</kbd> to focus
        </motion.p>
      </div>
    </section>
  )
}

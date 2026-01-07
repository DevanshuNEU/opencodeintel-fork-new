import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2 } from 'lucide-react'
import { HeroSearch, type HeroSearchHandle } from './HeroSearch'
import { useDemoSearch, DEMO_REPOS, type DemoRepo } from '@/hooks/useDemoSearch'
import type { SearchResult } from '@/types'

interface Props {
  onResultsReady?: (results: SearchResult[], query: string, repoId: string, time: number | null) => void
}

const PYTHON_REPOS = DEMO_REPOS.filter(r => ['flask', 'fastapi'].includes(r.id))

export function Hero({ onResultsReady }: Props) {
  const searchRef = useRef<HeroSearchHandle>(null)
  const { query, repo, results, loading, searchTime, setQuery, setRepo, search } = useDemoSearch(true)

  useEffect(() => {
    if (results.length) {
      onResultsReady?.(results, query, repo.id, searchTime)
    }
  }, [results, query, repo.id, searchTime, onResultsReady])

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

  const topResult = results[0]

  return (
    <section className="min-h-screen flex flex-col justify-center py-20 px-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Headline - simple, no fancy underlines */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-snug">
            Stop grep-ing through Python code.
            <br />
            <span className="text-blue-400">Just describe what you need.</span>
          </h1>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
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

        {/* Repo switcher */}
        <motion.div
          className="mt-3 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <span className="text-xs text-zinc-600">Searching:</span>
          {PYTHON_REPOS.map(r => (
            <button
              key={r.id}
              onClick={() => switchRepo(r)}
              disabled={loading}
              className={`
                px-2.5 py-1 text-xs rounded-md transition-all
                ${repo.id === r.id 
                  ? 'bg-zinc-800 text-zinc-300' 
                  : 'text-zinc-600 hover:text-zinc-400'
                }
              `}
            >
              {r.name}
            </button>
          ))}
        </motion.div>

        {/* Result - single card, right below search */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-zinc-500">Searching {repo.name}...</span>
                </div>
                <div className="space-y-2 animate-pulse">
                  <div className="h-5 w-48 bg-zinc-800 rounded" />
                  <div className="h-3 w-32 bg-zinc-800/50 rounded" />
                  <div className="h-20 bg-zinc-800/30 rounded mt-3" />
                </div>
              </motion.div>
            ) : topResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
              >
                {/* Result header */}
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">Found in {searchTime}ms</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {Math.round(topResult.score * 100)}% match
                    </span>
                  </div>
                  <span className="text-xs text-zinc-600">{repo.name}</span>
                </div>
                
                {/* Result content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-sm font-medium text-white">{topResult.name}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                        {topResult.type}
                      </span>
                      <div className="text-xs text-zinc-600 font-mono mt-1">{topResult.file_path}</div>
                    </div>
                  </div>
                  
                  <pre className="text-xs text-zinc-400 bg-black/40 rounded p-3 overflow-x-auto">
                    <code>{topResult.content?.slice(0, 200)}...</code>
                  </pre>
                </div>

                {/* More results hint */}
                {results.length > 1 && (
                  <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
                    <span className="text-xs text-zinc-600">
                      +{results.length - 1} more results
                    </span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-8 text-center"
              >
                <Search className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-600">Type a query and search</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-blue-500 hover:bg-blue-400 transition-colors"
          >
            Try with your repo
          </a>
          <p className="text-xs text-zinc-600 mt-3">
            Free for open source
          </p>
        </motion.div>
      </div>
    </section>
  )
}

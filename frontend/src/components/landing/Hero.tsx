import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Sparkles } from 'lucide-react'
import { HeroSearch, type HeroSearchHandle } from './HeroSearch'
import { RepoSwitcher } from './RepoSwitcher'
import { useDemoSearch, DEMO_REPOS, type DemoRepo } from '@/hooks/useDemoSearch'
import type { SearchResult } from '@/types'

interface Props {
  onResultsReady?: (results: SearchResult[], query: string, repoId: string, time: number | null) => void
}

export function Hero({ onResultsReady }: Props) {
  const searchRef = useRef<HeroSearchHandle>(null)
  const { query, repo, results, loading, searchTime, setQuery, setRepo, search } = useDemoSearch(true)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    if (results.length && onResultsReady) {
      onResultsReady(results, query, repo.id, searchTime)
    }
  }, [results, query, repo.id, searchTime, onResultsReady])

  // show comparison after search completes
  useEffect(() => {
    if (results.length > 0 && !loading) {
      const timer = setTimeout(() => setShowComparison(true), 300)
      return () => clearTimeout(timer)
    }
  }, [results, loading])

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
    setShowComparison(false)
    search(query, r.id)
  }

  const topResult = results[0]

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-6 overflow-hidden">
      {/* background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[1000px] h-[800px] bg-gradient-to-b from-blue-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '72px 72px'
          }}
        />
      </div>
      
      <div className="relative max-w-5xl mx-auto w-full">
        {/* headline */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-4">
            <span className="text-red-400">grep</span> sucks.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">We fixed it.</span>
          </h1>
          <p className="text-xl text-zinc-400 mt-6 max-w-2xl mx-auto">
            Semantic search for codebases. Ask for what you need, get the exact function.
          </p>
        </motion.div>

        {/* search */}
        <motion.div
          className="max-w-3xl mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <HeroSearch
            ref={searchRef}
            value={query}
            onChange={setQuery}
            onSubmit={() => { setShowComparison(false); search() }}
            searching={loading}
            repoName={repo.name}
          />
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <RepoSwitcher repos={DEMO_REPOS} selected={repo} onSelect={switchRepo} disabled={loading} />
        </motion.div>

        {/* side-by-side comparison */}
        <motion.div
          className="mt-16 grid md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: showComparison ? 1 : 0, y: showComparison ? 0 : 40 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* grep side - the problem */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-red-500/10 bg-red-500/[0.05]">
              <Terminal className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">grep</span>
              <span className="ml-auto text-xs text-red-400/60">847 results • 2.3s</span>
            </div>
            <div className="p-5 font-mono text-sm">
              <div className="text-zinc-500">$ grep -r "auth" ./src</div>
              <div className="mt-4 space-y-1.5 text-zinc-600">
                <div>src/components/AuthButton.tsx</div>
                <div>src/utils/auth.ts</div>
                <div>src/hooks/useAuth.ts</div>
                <div>src/pages/auth/login.tsx</div>
                <div>src/middleware/auth.ts</div>
                <div className="text-zinc-700">... 842 more results</div>
              </div>
              <div className="mt-6 pt-4 border-t border-red-500/10 text-red-400 text-xs">
                Which one has the actual logic? 🤷
              </div>
            </div>
          </div>

          {/* codeintel side - the solution */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-500/10 bg-emerald-500/[0.05]">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">CodeIntel</span>
              <span className="ml-auto text-xs text-emerald-400/60">
                {topResult ? '1 result' : 'searching'} • {searchTime ? `${searchTime}ms` : '...'}
              </span>
            </div>
            <div className="p-5">
              {topResult ? (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono font-semibold text-white">{topResult.name}</span>
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase">
                        {topResult.type}
                      </span>
                      <div className="text-xs text-zinc-500 font-mono mt-1">{topResult.file_path}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">{Math.round(topResult.score * 100)}%</div>
                      <div className="text-[10px] text-zinc-500">match</div>
                    </div>
                  </div>
                  <pre className="text-xs text-zinc-300 bg-black/30 rounded-lg p-3 overflow-x-auto max-h-32">
                    <code>{topResult.content?.slice(0, 300)}{topResult.content && topResult.content.length > 300 ? '...' : ''}</code>
                  </pre>
                  <div className="mt-4 pt-3 border-t border-emerald-500/10 text-emerald-400 text-xs">
                    Found exactly what you needed ✓
                  </div>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">
                  Search to see the magic...
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* keyboard hint */}
        <motion.p
          className="text-center mt-10 text-sm text-zinc-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Press <kbd className="px-2 py-1 rounded-lg bg-zinc-800/80 text-zinc-400 font-mono text-xs border border-zinc-700">/</kbd> to focus
        </motion.p>
      </div>
    </section>
  )
}

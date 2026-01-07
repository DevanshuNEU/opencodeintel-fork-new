import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Zap, Loader2, ArrowRight } from 'lucide-react'
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

  useEffect(() => {
    if (results.length && onResultsReady) {
      onResultsReady(results, query, repo.id, searchTime)
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
  const displayTime = searchTime || 67
  const displayScore = topResult ? Math.round(topResult.score * 100) : 94

  return (
    <section className="relative min-h-screen flex flex-col justify-center py-20 px-6">
      {/* subtle background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/[0.07] rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-4xl mx-auto w-full">
        {/* headline - confident but not screaming */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            <span className="text-red-400">grep</span> sucks. <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">We fixed it.</span>
          </h1>
          <p className="text-lg text-zinc-500 mt-4">
            One question. One answer.
          </p>
        </motion.div>

        {/* search */}
        <motion.div
          className="max-w-2xl mx-auto mb-4"
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

        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <RepoSwitcher repos={DEMO_REPOS} selected={repo} onSelect={switchRepo} disabled={loading} />
        </motion.div>

        {/* comparison - clean and minimal */}
        <motion.div
          className="mt-10 grid md:grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* grep */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-red-400/80" />
                <span className="text-sm font-medium text-zinc-400">grep</span>
              </div>
              <span className="text-xs text-zinc-600">2.3s</span>
            </div>
            
            <div className="p-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-red-400/90">847</span>
                <span className="text-sm text-zinc-500">results</span>
              </div>
              
              <div className="font-mono text-xs text-zinc-600 space-y-1">
                <div>src/components/AuthButton.tsx</div>
                <div>src/utils/auth.ts</div>
                <div>src/hooks/useAuth.ts</div>
                <div className="text-zinc-700">... 844 more files</div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-600">Which one? 🤷</span>
              </div>
            </div>
          </div>

          {/* codeintel */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-500/10 bg-emerald-500/[0.05]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">CodeIntel</span>
              </div>
              <div className="flex items-center gap-2">
                {loading && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
                <span className="text-xs text-zinc-500">{displayTime}ms</span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-baseline justify-between mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-400">1</span>
                  <span className="text-sm text-zinc-500">result</span>
                </div>
                <span className="text-2xl font-bold text-emerald-400/80">{displayScore}%</span>
              </div>
              
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 w-40 bg-zinc-800 rounded" />
                  <div className="h-16 bg-zinc-800/50 rounded" />
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="font-mono text-sm text-white">
                      {topResult?.name || 'authenticate_user'}
                    </span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/80 uppercase">
                      {topResult?.type || 'function'}
                    </span>
                    <div className="text-xs text-zinc-600 font-mono mt-1">
                      {topResult?.file_path || 'src/auth/handlers.py'}
                    </div>
                  </div>
                  <pre className="text-xs text-zinc-400 bg-black/30 rounded-lg p-3 overflow-hidden">
                    <code>{topResult?.content?.slice(0, 140) || `def authenticate_user(credentials):
    user = db.get_user(credentials['email'])
    if verify_password(credentials['password']):
        return create_session(user)`}...</code>
                  </pre>
                </>
              )}
              
              <div className="mt-3 pt-3 border-t border-emerald-500/10">
                <span className="text-xs text-emerald-400/80">Found it ✓</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA - clean and simple */}
        <motion.div
          className="mt-12 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg bg-blue-500 hover:bg-blue-400 transition-colors"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </a>
          
          <p className="text-sm text-zinc-600">
            Trusted by <span className="text-zinc-400">12,847</span> developers · No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  )
}

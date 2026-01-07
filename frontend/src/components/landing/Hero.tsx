import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Sparkles, Loader2 } from 'lucide-react'
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
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-4">
            <span className="text-red-400">grep</span> sucks.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">We fixed it.</span>
          </h1>
          <p className="text-xl text-zinc-400 mt-6 max-w-xl mx-auto">
            Ask what you need. Get the exact function.
          </p>
        </motion.div>

        {/* search */}
        <motion.div
          className="max-w-3xl mx-auto mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
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
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <RepoSwitcher repos={DEMO_REPOS} selected={repo} onSelect={switchRepo} disabled={loading} />
        </motion.div>

        {/* side-by-side comparison - always visible */}
        <motion.div
          className="mt-12 grid md:grid-cols-2 gap-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {/* grep side */}
          <div className="rounded-2xl border border-red-500/20 bg-[#0c0c0f] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-red-500/[0.05]">
              <Terminal className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">grep</span>
              <span className="ml-auto text-xs text-zinc-500">847 results • 2.3s</span>
            </div>
            <div className="p-4 font-mono text-sm">
              <div className="text-zinc-500">$ grep -r "auth" ./src</div>
              <div className="mt-3 space-y-1 text-zinc-600 text-xs">
                <div>src/components/AuthButton.tsx</div>
                <div>src/utils/auth.ts</div>
                <div>src/hooks/useAuth.ts</div>
                <div>src/pages/auth/login.tsx</div>
                <div>src/middleware/auth.ts</div>
                <div className="text-zinc-700">... 842 more</div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-red-400/80 text-xs">
                Which one has the logic? 🤷
              </div>
            </div>
          </div>

          {/* codeintel side */}
          <div className="rounded-2xl border border-emerald-500/20 bg-[#0c0c0f] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-emerald-500/[0.05]">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">CodeIntel</span>
              <span className="ml-auto text-xs text-zinc-500">
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    searching...
                  </span>
                ) : topResult ? (
                  `1 result • ${searchTime}ms`
                ) : (
                  '1 result • 67ms'
                )}
              </span>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-5 w-40 bg-zinc-800 rounded" />
                    <div className="h-8 w-12 bg-zinc-800 rounded" />
                  </div>
                  <div className="h-3 w-32 bg-zinc-800 rounded" />
                  <div className="h-24 bg-zinc-800/50 rounded-lg" />
                </div>
              ) : topResult ? (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-white text-sm">{topResult.name}</span>
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase">
                        {topResult.type}
                      </span>
                      <div className="text-[11px] text-zinc-500 font-mono mt-1 truncate max-w-[200px]">{topResult.file_path}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-400">{Math.round(topResult.score * 100)}%</div>
                    </div>
                  </div>
                  <pre className="text-[11px] text-zinc-400 bg-black/40 rounded-lg p-3 overflow-hidden max-h-24">
                    <code>{topResult.content?.slice(0, 200)}...</code>
                  </pre>
                  <div className="mt-3 pt-2 border-t border-white/5 text-emerald-400/80 text-xs">
                    Found it ✓
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-white text-sm">authenticate_user</span>
                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase">
                        function
                      </span>
                      <div className="text-[11px] text-zinc-500 font-mono mt-1">src/auth/handlers.py</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-400">94%</div>
                    </div>
                  </div>
                  <pre className="text-[11px] text-zinc-400 bg-black/40 rounded-lg p-3 overflow-hidden max-h-24">
                    <code>{`def authenticate_user(credentials):
    user = db.get_user(credentials['email'])
    if verify_password(credentials['password'], user.hash):
        return create_session(user)
    raise AuthError("Invalid")`}</code>
                  </pre>
                  <div className="mt-3 pt-2 border-t border-white/5 text-emerald-400/80 text-xs">
                    Found it ✓
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* keyboard hint */}
        <motion.p
          className="text-center mt-8 text-sm text-zinc-600"
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

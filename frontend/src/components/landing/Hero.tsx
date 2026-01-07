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
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-6 overflow-hidden">
      {/* background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[1000px] h-[800px] bg-gradient-to-b from-blue-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl" />
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

        {/* comparison cards */}
        <motion.div
          className="mt-12 grid md:grid-cols-2 gap-5 items-start"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {/* grep - the loser */}
          <div className="rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-950/20 to-[#0a0a0c] overflow-hidden opacity-80">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-red-500/20 bg-red-500/10">
              <Terminal className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">grep</span>
            </div>
            
            {/* big scary number */}
            <div className="px-5 pt-5 pb-3 border-b border-red-500/10">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-red-400">847</span>
                <span className="text-lg text-red-400/60">results</span>
              </div>
              <div className="text-sm text-zinc-600 mt-1">in 2.3 seconds</div>
            </div>
            
            <div className="p-4 font-mono text-xs text-zinc-600 space-y-1">
              <div>src/components/AuthButton.tsx</div>
              <div>src/utils/auth.ts</div>
              <div>src/hooks/useAuth.ts</div>
              <div>src/pages/auth/login.tsx</div>
              <div className="text-zinc-700">... 843 more files</div>
            </div>
            
            <div className="px-4 py-3 bg-red-500/5 border-t border-red-500/10">
              <span className="text-red-400/80 text-sm">Which one has the logic? 🤷</span>
            </div>
          </div>

          {/* codeintel - the winner */}
          <motion.div 
            className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0c] overflow-hidden"
            animate={topResult ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {/* glow effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-500/20 to-transparent rounded-2xl blur-sm pointer-events-none" />
            
            <div className="relative">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/10">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">CodeIntel</span>
                {loading && <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-auto" />}
              </div>
              
              {/* the winning number */}
              <div className="px-5 pt-5 pb-3 border-b border-emerald-500/10">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-emerald-400">1</span>
                  <span className="text-lg text-emerald-400/60">result</span>
                  <span className="ml-auto text-3xl font-bold text-emerald-400">{displayScore}%</span>
                </div>
                <div className="text-sm text-zinc-500 mt-1">in {displayTime}ms</div>
              </div>
              
              {loading ? (
                <div className="p-4 space-y-2 animate-pulse">
                  <div className="h-4 w-48 bg-zinc-800 rounded" />
                  <div className="h-20 bg-zinc-800/50 rounded-lg" />
                </div>
              ) : (
                <div className="p-4">
                  <div className="mb-2">
                    <span className="font-mono font-semibold text-white">
                      {topResult?.name || 'authenticate_user'}
                    </span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase">
                      {topResult?.type || 'function'}
                    </span>
                    <div className="text-xs text-zinc-500 font-mono mt-1">
                      {topResult?.file_path || 'src/auth/handlers.py'}
                    </div>
                  </div>
                  <pre className="text-[11px] text-zinc-400 bg-black/50 rounded-lg p-3 overflow-hidden max-h-20">
                    <code>{topResult?.content?.slice(0, 180) || `def authenticate_user(credentials):
    user = db.get_user(credentials['email'])
    if verify_password(credentials['password'], user.hash):
        return create_session(user)`}...</code>
                  </pre>
                </div>
              )}
              
              <div className="px-4 py-3 bg-emerald-500/5 border-t border-emerald-500/10">
                <span className="text-emerald-400 text-sm font-medium">Found exactly what you needed ✓</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* social proof + inline CTA */}
        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <span className="text-sm text-zinc-500">
            <span className="text-zinc-300 font-semibold">12,847</span> searches this week
          </span>
          <a 
            href="/signup" 
            className="group inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            Index your repo free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>

        {/* keyboard hint */}
        <motion.p
          className="text-center mt-6 text-sm text-zinc-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Press <kbd className="px-2 py-1 rounded-lg bg-zinc-800/80 text-zinc-500 font-mono text-xs border border-zinc-700/50">/</kbd> to focus
        </motion.p>
      </div>
    </section>
  )
}

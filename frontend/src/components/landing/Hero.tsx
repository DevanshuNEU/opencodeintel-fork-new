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
    <section className="relative min-h-screen flex flex-col justify-center py-24 px-6 overflow-hidden">
      {/* background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[1200px] h-[900px] bg-gradient-to-b from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-6xl mx-auto w-full">
        {/* headline - BIG and confident */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.1]">
            <span className="text-red-400">grep</span> sucks.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">We fixed it.</span>
          </h1>
          <p className="text-2xl md:text-3xl text-zinc-400 mt-6 font-medium">
            One question. One answer.
          </p>
        </motion.div>

        {/* search - more breathing room */}
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

        {/* comparison cards - bigger, bolder */}
        <motion.div
          className="mt-14 grid md:grid-cols-2 gap-6 items-stretch"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {/* grep - the loser */}
          <motion.div 
            className="rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-950/20 to-[#0a0a0c] overflow-hidden opacity-70 flex flex-col"
            whileHover={{ y: -3, opacity: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/20 bg-red-500/10">
              <Terminal className="w-6 h-6 text-red-400" />
              <span className="text-lg font-semibold text-red-400">grep</span>
            </div>
            
            <div className="px-6 pt-6 pb-4 border-b border-red-500/10">
              <div className="flex items-baseline gap-3">
                <span className="text-6xl md:text-7xl font-black text-red-400">847</span>
                <span className="text-xl text-red-400/70">results</span>
              </div>
              <div className="text-base text-zinc-600 mt-2">took 2.3 seconds</div>
            </div>
            
            <div className="p-5 font-mono text-sm text-zinc-500 flex-1 space-y-2">
              <div>src/components/AuthButton.tsx</div>
              <div>src/utils/auth.ts</div>
              <div>src/hooks/useAuth.ts</div>
              <div>src/middleware/auth.ts</div>
              <div className="text-zinc-600">...</div>
              <div className="text-zinc-600 italic">scrolling forever</div>
            </div>
            
            <div className="px-5 py-4 bg-red-500/5 border-t border-red-500/10 mt-auto">
              <span className="text-red-400/80 text-base">Good luck finding it 🤷</span>
            </div>
          </motion.div>

          {/* codeintel - the winner */}
          <motion.div 
            className="relative rounded-2xl overflow-hidden flex flex-col"
            whileHover={{ y: -3 }}
            animate={topResult ? { scale: [1, 1.01, 1] } : {}}
            transition={{ duration: 0.2 }}
          >
            {/* strong glow */}
            <div className="absolute -inset-[2px] bg-gradient-to-b from-emerald-400/40 via-emerald-500/20 to-cyan-500/30 rounded-2xl blur-lg pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/50 to-[#080a0c] rounded-2xl border border-emerald-500/40" />
            
            <div className="relative flex flex-col h-full">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/20 bg-emerald-500/10">
                <Zap className="w-6 h-6 text-emerald-400" />
                <span className="text-lg font-semibold text-emerald-400">CodeIntel</span>
                {loading && <Loader2 className="w-5 h-5 animate-spin text-emerald-400 ml-auto" />}
              </div>
              
              <div className="px-6 pt-6 pb-4 border-b border-emerald-500/10">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl md:text-7xl font-black text-emerald-400">1</span>
                    <span className="text-xl text-emerald-400/70">result</span>
                  </div>
                  <div className="text-5xl font-black text-emerald-400">{displayScore}%</div>
                </div>
                <div className="text-base text-zinc-500 mt-2">took {displayTime}ms</div>
              </div>
              
              {loading ? (
                <div className="p-5 space-y-3 animate-pulse flex-1">
                  <div className="h-6 w-56 bg-zinc-800 rounded" />
                  <div className="h-28 bg-zinc-800/50 rounded-xl" />
                </div>
              ) : (
                <div className="p-5 flex-1">
                  <div className="mb-3">
                    <span className="font-mono font-bold text-white text-lg">
                      {topResult?.name || 'authenticate_user'}
                    </span>
                    <span className="ml-3 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                      {topResult?.type || 'function'}
                    </span>
                    <div className="text-sm text-zinc-500 font-mono mt-2">
                      {topResult?.file_path || 'src/auth/handlers.py'}
                    </div>
                  </div>
                  <pre className="text-sm text-zinc-300 bg-black/60 rounded-xl p-4 overflow-hidden border border-white/5 leading-relaxed">
                    <code>{topResult?.content?.slice(0, 180) || `def authenticate_user(credentials):
    user = db.get_user(credentials['email'])
    if verify_password(credentials['password'], user.hash):
        return create_session(user)`}...</code>
                  </pre>
                </div>
              )}
              
              <div className="px-5 py-4 bg-emerald-500/5 border-t border-emerald-500/10 mt-auto">
                <span className="text-emerald-400 font-semibold text-base">Found exactly what you needed ✓</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* CTA - chunky and confident */}
        <motion.div
          className="mt-16 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <a
            href="/signup"
            className="group relative inline-flex items-center gap-3 px-12 py-5 text-xl font-bold text-white rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.03] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">Get started free</span>
            <ArrowRight className="relative w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-base text-zinc-400">
              Trusted by <span className="text-white font-bold">12,847</span> developers
            </p>
            <p className="text-sm text-zinc-600">No credit card required</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

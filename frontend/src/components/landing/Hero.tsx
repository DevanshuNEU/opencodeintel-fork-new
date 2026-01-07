import { useRef, useEffect, useState } from 'react'
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
  const cardRef = useRef<HTMLDivElement>(null)
  const { query, repo, results, loading, searchTime, setQuery, setRepo, search } = useDemoSearch(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (results.length) onResultsReady?.(results, query, repo.id, searchTime)
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const switchRepo = (r: DemoRepo) => {
    setRepo(r)
  }

  const topResult = results[0]

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-20 pb-12 px-6 overflow-hidden">
      {/* Animated gradient orbs - Linear style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }}
          animate={{ x: [0, -25, 0], y: [0, 25, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)' }}
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto w-full">
        {/* Headline */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
            Find code by meaning,
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              not by keywords.
            </span>
          </h1>
          <p className="mt-5 text-lg text-zinc-400 max-w-lg mx-auto">
            Stop grep-ing through thousands of files.
            <br />
            Describe what you need and get the exact function.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
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
          className="mt-4 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <span className="text-xs text-zinc-600">Try on:</span>
          {PYTHON_REPOS.map(r => (
            <button
              key={r.id}
              onClick={() => switchRepo(r)}
              disabled={loading}
              className={`
                px-3 py-1.5 text-xs rounded-lg transition-all font-medium
                ${repo.id === r.id 
                  ? 'bg-white/10 text-white border border-white/10' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }
              `}
            >
              {r.name}
            </button>
          ))}
        </motion.div>

        {/* Result card with mouse-following glow */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className="relative group"
          >
            {/* Mouse glow effect */}
            <div
              className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59,130,246,0.15), transparent 40%)`
              }}
            />
            
            {/* Card */}
            <div className="relative rounded-xl border border-white/[0.08] bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <span className="text-sm text-zinc-500">Searching {repo.name}...</span>
                    </div>
                    <div className="space-y-3 animate-pulse">
                      <div className="h-5 w-48 bg-white/5 rounded" />
                      <div className="h-3 w-32 bg-white/5 rounded" />
                      <div className="h-24 bg-white/[0.02] rounded-lg mt-3" />
                    </div>
                  </motion.div>
                ) : topResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Header */}
                    <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs text-zinc-500">Found in {searchTime}ms</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                          {Math.round(topResult.score * 100)}% match
                        </span>
                      </div>
                      <span className="text-xs text-zinc-600">{repo.name}</span>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-white">{topResult.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 uppercase font-medium">
                              {topResult.type}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-600 font-mono mt-1">{topResult.file_path}</div>
                        </div>
                      </div>
                      
                      {/* Code preview */}
                      <div className="relative rounded-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-violet-500/5" />
                        <pre className="relative text-xs text-zinc-300 bg-black/40 p-4 overflow-x-auto font-mono leading-relaxed">
                          <code>{topResult.content?.slice(0, 250)}...</code>
                        </pre>
                      </div>
                    </div>

                    {/* Footer */}
                    {results.length > 1 && (
                      <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                        <span className="text-xs text-zinc-600">+{results.length - 1} more results</span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-10 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">Search to see results</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-zinc-300 rounded-lg border border-zinc-700 hover:border-zinc-500 hover:text-white hover:bg-white/5 transition-all"
          >
            Index your first repo free →
          </a>
          <p className="text-xs text-zinc-500 mt-4">
            Works with any Python repository • Now in beta
          </p>
        </motion.div>
      </div>
    </section>
  )
}

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Terminal, Zap, Loader2 } from 'lucide-react'
import { HeroSearch, type HeroSearchHandle } from './HeroSearch'
import { useDemoSearch, DEMO_REPOS, type DemoRepo } from '@/hooks/useDemoSearch'
import type { SearchResult } from '@/types'

interface Props {
  onResultsReady?: (results: SearchResult[], query: string, repoId: string, time: number | null) => void
}

// only python repos for now
const PYTHON_REPOS = DEMO_REPOS.filter(r => ['flask', 'fastapi'].includes(r.id))

export function Hero({ onResultsReady }: Props) {
  const searchRef = useRef<HeroSearchHandle>(null)
  const { query, repo, results, loading, searchTime, setQuery, setRepo, search } = useDemoSearch(true)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (results.length) {
      setHasSearched(true)
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/[0.05] rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Find Python code by{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">describing it</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6C50 2 150 2 198 6" stroke="url(#underline-gradient)" strokeWidth="3" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="underline-gradient" x1="0" y1="0" x2="200" y2="0">
                      <stop stopColor="#60a5fa"/>
                      <stop offset="1" stopColor="#22d3ee"/>
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>
            <p className="text-lg text-zinc-500 mt-6">
              Not by guessing keywords.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
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

          {/* Python Repo Switcher */}
          <motion.div
            className="mt-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <span className="text-sm text-zinc-600">Try on:</span>
            {PYTHON_REPOS.map(r => (
              <button
                key={r.id}
                onClick={() => switchRepo(r)}
                disabled={loading}
                className={`
                  px-3 py-1.5 text-sm rounded-lg transition-all
                  ${repo.id === r.id 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }
                `}
              >
                {r.name}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="grid md:grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Old way */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">The old way</span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-zinc-400">847</span>
                  <span className="text-sm text-zinc-600">files to check</span>
                </div>
                <p className="text-xs text-zinc-600 mb-4">grep -r "auth" took 2.3s</p>
                
                <div className="font-mono text-xs text-zinc-600 space-y-1 mb-4">
                  <div>src/components/AuthButton.tsx</div>
                  <div>src/utils/auth.ts</div>
                  <div>src/hooks/useAuth.ts</div>
                  <div className="text-zinc-700">... 844 more</div>
                </div>
                
                <p className="text-sm text-zinc-600 italic">"Which one has the logic?"</p>
              </div>
            </div>

            {/* CodeIntel way */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] overflow-hidden">
              <div className="px-4 py-3 border-b border-emerald-500/10 bg-emerald-500/[0.03]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">The CodeIntel way</span>
                  </div>
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                </div>
              </div>
              <div className="p-5">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <div className="h-8 w-32 bg-zinc-800/50 rounded animate-pulse" />
                      <div className="h-4 w-48 bg-zinc-800/30 rounded animate-pulse" />
                      <div className="h-20 bg-zinc-800/20 rounded animate-pulse" />
                    </motion.div>
                  ) : topResult ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-emerald-400">1</span>
                        <span className="text-sm text-zinc-500">result</span>
                        <span className="ml-auto text-xl font-semibold text-emerald-400/80">
                          {Math.round(topResult.score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mb-4">Found in {searchTime}ms</p>
                      
                      <div className="mb-3">
                        <span className="font-mono text-sm text-white">{topResult.name}</span>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70 uppercase">
                          {topResult.type}
                        </span>
                        <div className="text-xs text-zinc-600 font-mono mt-1">{topResult.file_path}</div>
                      </div>
                      
                      <pre className="text-xs text-zinc-400 bg-black/40 rounded-lg p-3 overflow-hidden leading-relaxed">
                        <code>{topResult.content?.slice(0, 150)}...</code>
                      </pre>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-6"
                    >
                      <Search className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-600">Search to see the magic</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-zinc-800/50">
        <div className="max-w-3xl mx-auto">
          <motion.h2 
            className="text-2xl font-bold text-white text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            How it works
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Describe', desc: 'What you\'re looking for in plain English' },
              { step: '2', title: 'Understand', desc: 'We parse meaning, not just keywords' },
              { step: '3', title: 'Find', desc: 'Get the exact function, instantly' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-400 font-semibold">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to stop guessing?
            </h2>
            <p className="text-zinc-500 mb-8">
              Index your Python repo and find code by meaning.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg bg-blue-500 hover:bg-blue-400 transition-colors"
            >
              Try with your own repo
            </a>
            <p className="text-sm text-zinc-600 mt-4">
              Free for open source. Always.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

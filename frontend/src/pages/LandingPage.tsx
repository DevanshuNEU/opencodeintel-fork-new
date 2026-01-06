import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { API_URL } from '../config/api'
import { Hero } from '@/components/landing'
import { playgroundAPI } from '@/services/playground-api'
import type { SearchResult } from '../types'
import { cn } from '@/lib/utils'

// Icons
const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
)

// Scroll animation hook
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

// Animated section wrapper
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollAnimation()
  
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ============ COMPACT SEARCH BAR (for results view) ============
function CompactSearchBar({ 
  query, 
  onQueryChange, 
  onSearch, 
  onNewSearch,
  loading,
  remaining
}: {
  query: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onNewSearch: () => void
  loading: boolean
  remaining: number
}) {
  return (
    <motion.div 
      className="bg-[#09090b]/95 backdrop-blur-xl border-b border-white/5 sticky top-16 z-40"
      animate={loading ? {
        boxShadow: [
          '0 0 0 rgba(99, 102, 241, 0)',
          '0 0 30px rgba(99, 102, 241, 0.3)',
          '0 0 0 rgba(99, 102, 241, 0)',
        ]
      } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={onNewSearch}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 text-sm text-zinc-300 hover:text-white transition-all shrink-0"
          >
            <ArrowLeftIcon />
            <span className="hidden sm:inline">New Search</span>
          </button>

          {/* Search input */}
          <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="flex-1 flex items-center gap-3">
            <motion.div 
              className="flex-1 relative"
              animate={loading ? {
                scale: [1, 1.01, 1],
              } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <SearchIcon />
                  </motion.div>
                ) : (
                  <SearchIcon />
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search again..."
                className={cn(
                  "w-full bg-zinc-900/80 border rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none transition-all duration-300",
                  loading 
                    ? "border-indigo-500/50 shadow-lg shadow-indigo-500/20" 
                    : "border-zinc-800 focus:border-zinc-700"
                )}
              />
            </motion.div>
            <Button
              type="submit"
              disabled={!query.trim() || loading || remaining <= 0}
              className={cn(
                "px-6 py-3 h-auto rounded-xl transition-all shrink-0",
                query.trim() && !loading && remaining > 0
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                  : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}

// ============ SKELETON LOADING CARD ============
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="bg-[#111113] border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-zinc-800/60 rounded animate-pulse" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-12 bg-zinc-800/60 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2 bg-[#0d0d0f]">
          <div className="h-4 w-full bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-full bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-zinc-800/40 rounded animate-pulse" />
        </div>
      </Card>
    </motion.div>
  )
}

// ============ RESULT CARD with DRAMATIC staggered animation ============
const resultCardVariants = {
  hidden: { 
    opacity: 0, 
    y: 60,
    scale: 0.9,
    filter: 'blur(20px)',
    rotateX: 15,
  },
  visible: (index: number) => ({ 
    opacity: 1, 
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    rotateX: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 200,
      delay: index * 0.12,
    }
  }),
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.95,
    filter: 'blur(10px)',
    transition: { duration: 0.25 }
  }
}

// Hover animation for cards
const cardHoverVariants = {
  rest: { 
    scale: 1, 
    y: 0,
    boxShadow: '0 0 0 rgba(59, 130, 246, 0)',
  },
  hover: { 
    scale: 1.02, 
    y: -4,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(59, 130, 246, 0.1)',
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300,
    }
  }
}

function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const codeLines = result.code.split('\n')
  const isLongCode = codeLines.length > 8
  const displayCode = expanded ? result.code : codeLines.slice(0, 8).join('\n')
  
  // Color based on match score
  const scoreColor = result.score >= 0.7 
    ? 'from-emerald-400 to-green-500' 
    : result.score >= 0.5 
      ? 'from-blue-400 to-indigo-500' 
      : 'from-amber-400 to-orange-500'
  
  const scoreBg = result.score >= 0.7 
    ? 'bg-emerald-500/10 border-emerald-500/20' 
    : result.score >= 0.5 
      ? 'bg-blue-500/10 border-blue-500/20' 
      : 'bg-amber-500/10 border-amber-500/20'

  return (
    <motion.div
      variants={resultCardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      layout
      style={{ perspective: 1000 }}
    >
      <motion.div
        variants={cardHoverVariants}
        initial="rest"
        whileHover="hover"
      >
        <Card className="bg-[#0c0c0e] border-white/[0.06] overflow-hidden hover:border-white/10 transition-all duration-300 cursor-pointer group">
          {/* Header - Clean and Spacious */}
          <div className="px-6 py-5 flex items-start justify-between gap-6">
            {/* Left: Function info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-mono text-lg font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {result.name}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-white/5 rounded">
                  {result.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-mono truncate">
                {result.file_path}
              </p>
            </div>
            
            {/* Right: Match Score - THE HERO */}
            <div className={cn("flex flex-col items-center px-4 py-3 rounded-xl border", scoreBg)}>
              <div className={cn("text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent", scoreColor)}>
                {(result.score * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">match</div>
            </div>
          </div>
          
          {/* Code Block - Contained with gradient fade */}
          <div className="relative">
            <div className={cn(
              "transition-all duration-300",
              !expanded && isLongCode && "max-h-[200px] overflow-hidden"
            )}>
              <SyntaxHighlighter 
                language={result.language || 'python'} 
                style={oneDark} 
                customStyle={{ 
                  margin: 0, 
                  borderRadius: 0, 
                  fontSize: '0.8rem', 
                  background: '#08080a',
                  padding: '1rem 1.5rem',
                }} 
                showLineNumbers 
                startingLineNumber={result.line_start || 1}
              >
                {displayCode}
              </SyntaxHighlighter>
            </div>
            
            {/* Gradient fade + expand button */}
            {isLongCode && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#08080a] to-transparent flex items-end justify-center pb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                  className="px-4 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 hover:border-white/20 transition-all"
                >
                  Show {codeLines.length - 8} more lines
                </button>
              </div>
            )}
            
            {isLongCode && expanded && (
              <div className="flex justify-center py-3 bg-[#08080a] border-t border-white/5">
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                  className="px-4 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 hover:border-white/20 transition-all"
                >
                  Show less
                </button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTime, setSearchTime] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(50)
  const [limit, setLimit] = useState(50)
  const [hasSearched, setHasSearched] = useState(false)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const [searchedQuery, setSearchedQuery] = useState('') // What was actually searched
  const [inputQuery, setInputQuery] = useState('') // What user is typing
  const [currentRepoId, setCurrentRepoId] = useState('')
  const [isCustomRepo, setIsCustomRepo] = useState(false)

  // Check if results are stale (user typed something different)
  const isStale = hasSearched && !loading && inputQuery.trim() !== searchedQuery.trim() && inputQuery.trim() !== ''

  // Reset to hero state
  const handleNewSearch = () => {
    setHasSearched(false)
    setResults([])
    setSearchTime(null)
    setSearchedQuery('')
    setInputQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // callback when Hero's auto-search completes
  const handleHeroResults = (heroResults: SearchResult[], query: string, repoId: string, time: number | null) => {
    setResults(heroResults)
    setSearchTime(time)
    setSearchedQuery(query)
    setInputQuery(query)
    setCurrentRepoId(repoId)
    setIsCustomRepo(false)
    setHasSearched(true)
  }

  // Fetch rate limit status on mount
  useEffect(() => {
    fetch(`${API_URL}/playground/limits`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setRemaining(data.remaining ?? 50)
        setLimit(data.limit ?? 50)
      })
      .catch(console.error)
  }, [])

  // Unified search handler for both demo and custom repos
  const handleSearch = async (query: string, repoId: string, isCustom: boolean) => {
    if (!query.trim() || loading || remaining <= 0) return

    setLoading(true)
    setHasSearched(true)
    setSearchedQuery(query) // Track what was actually searched
    setInputQuery(query) // Sync input with searched
    setCurrentRepoId(repoId)
    setIsCustomRepo(isCustom)
    setRateLimitError(null)
    const startTime = Date.now()

    try {
      const response = isCustom
        ? await playgroundAPI.search(query)
        : await fetch(`${API_URL}/playground/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query, demo_repo: repoId, max_results: 10 })
          }).then(res => res.json())

      const data = isCustom ? response : response
      
      if (data.results) {
        setResults(data.results || [])
        setSearchTime(data.search_time_ms || (Date.now() - startTime))
        if (typeof data.remaining_searches === 'number') {
          setRemaining(data.remaining_searches)
        }
      } else if (data.status === 429) {
        setRateLimitError('Daily limit reached. Sign up for unlimited searches!')
        setRemaining(0)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Re-search with updated query (from compact search bar)
  const handleReSearch = () => {
    if (inputQuery.trim() && currentRepoId) {
      handleSearch(inputQuery, currentRepoId, isCustomRepo)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CI</span>
            </div>
            <span className="font-semibold">CodeIntel</span>
            <Badge variant="glow" className="text-[10px]">BETA</Badge>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/opencodeintel/opencodeintel" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <GitHubIcon />
            </a>
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">
              Docs
            </a>
            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate('/login')}>
              Sign in
            </Button>
            <Button className="bg-white text-black hover:bg-gray-100" onClick={() => navigate('/signup')}>
              Get started
            </Button>
          </div>
        </div>
      </nav>

      {/* ============ RESULTS VIEW (compact header + results in viewport) ============ */}
      {hasSearched ? (
        <div className="min-h-screen pt-16">
          {/* Compact Search Bar - sticky below nav */}
          <CompactSearchBar
            query={inputQuery}
            onQueryChange={setInputQuery}
            onSearch={handleReSearch}
            onNewSearch={handleNewSearch}
            loading={loading}
            remaining={remaining}
          />

          {/* Results Content - immediately visible */}
          <section className="px-6 py-8">
            <div className="max-w-4xl mx-auto">
              {/* Results Header - contextual based on loading state */}
              <div className="flex items-center justify-between mb-6 animate-in fade-in duration-300">
                {loading ? (
                  <span className="text-gray-400 text-sm">
                    Searching for "<span className="text-blue-400">{inputQuery}</span>"...
                  </span>
                ) : isStale ? (
                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="text-amber-400 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      Press Enter to search for "<span className="text-white">{inputQuery}</span>"
                    </span>
                    <span className="text-gray-600 text-xs">
                      (showing results for "{searchedQuery}")
                    </span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">
                      <span className="text-white font-semibold">{results.length}</span> results for "<span className="text-blue-400">{searchedQuery}</span>"
                    </span>
                    {searchTime && (
                      <span className="font-mono text-sm text-green-400">
                        {searchTime > 1000 ? `${(searchTime/1000).toFixed(1)}s` : `${searchTime}ms`}
                      </span>
                    )}
                  </div>
                )}
                {!loading && remaining > 0 && remaining < limit && (
                  <div className="text-sm text-gray-500">{remaining} remaining</div>
                )}
              </div>

              {/* Loading State - Skeleton Cards */}
              {loading && (
                <div className="space-y-4">
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonCard key={i} index={i} />
                  ))}
                </div>
              )}

              {/* Results List */}
              {!loading && (
                <>
                  {(remaining <= 0 || rateLimitError) && (
                    <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-2">You've reached today's limit</h3>
                      <p className="text-gray-300 mb-4">
                        {rateLimitError || 'Sign up to get unlimited searches and index your own repos.'}
                      </p>
                      <Button onClick={() => navigate('/signup')} className="bg-white text-black hover:bg-gray-100">
                        Get started — it's free
                      </Button>
                    </Card>
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={searchedQuery}
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: isStale ? 0.4 : 1,
                        filter: isStale ? 'blur(2px)' : 'blur(0px)',
                        scale: isStale ? 0.98 : 1,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {results.map((result, idx) => (
                        <ResultCard key={`${result.file_path}-${result.name}-${idx}`} result={result} index={idx} />
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  {results.length === 0 && (
                    <div className="text-center py-16 animate-in fade-in duration-500">
                      <div className="text-5xl mb-4">🔍</div>
                      <h3 className="text-lg font-semibold mb-2">No results found</h3>
                      <p className="text-gray-500 mb-6">Try a different query</p>
                      <Button 
                        variant="outline" 
                        onClick={handleNewSearch}
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        Try another search
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* ============ HERO VIEW (full landing page experience) ============ */
        <>
          {/* Hero Section - auto-starts search on load */}
          <Hero onResultsReady={handleHeroResults} />

          {/* THE PROBLEM */}
          <section className="py-32 px-6 border-t border-white/5">
            <AnimatedSection>
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                  <span className="text-red-400 text-sm font-medium uppercase tracking-wider">The Problem</span>
                  <h2 className="text-4xl font-bold mt-4 mb-6">You've been here before</h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    New codebase. 50,000 lines. You need to find where authentication happens.
                  </p>
                </div>

                {/* Terminal visualization */}
                <div className="bg-[#0d0d0f] rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-xs text-gray-500 font-mono">terminal</span>
                  </div>
                  <div className="p-6 font-mono text-sm">
                    <div className="text-gray-400">$ grep -r "auth" ./src</div>
                    <div className="mt-4 text-gray-500 space-y-1">
                      <div>src/components/AuthButton.tsx: <span className="text-gray-400">// auth button component</span></div>
                      <div>src/utils/auth.ts: <span className="text-gray-400">export const authConfig = ...</span></div>
                      <div>src/pages/auth/login.tsx: <span className="text-gray-400">function AuthLogin() ...</span></div>
                      <div>src/middleware/auth.ts: <span className="text-gray-400">// TODO: add auth</span></div>
                      <div>src/api/auth/callback.ts: <span className="text-gray-400">const authCallback = ...</span></div>
                      <div className="text-gray-600">... 842 more results</div>
                    </div>
                    <div className="mt-6 text-red-400">
                      847 results. Which one handles the actual authentication logic?
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </section>

          {/* THE SOLUTION */}
          <section className="py-32 px-6">
            <AnimatedSection>
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                  <span className="text-green-400 text-sm font-medium uppercase tracking-wider">The Solution</span>
                  <h2 className="text-4xl font-bold mt-4 mb-6">Search by meaning, not keywords</h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Ask for "authentication logic" and get the function that actually handles it.
                  </p>
                </div>

                {/* CodeIntel visualization */}
                <div className="bg-[#0d0d0f] rounded-xl border border-green-500/20 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-green-500/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-[10px]">CI</span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">CodeIntel</span>
                    </div>
                    <span className="text-xs text-green-400 font-mono">1 result • 89ms</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-white">authenticate_user</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">function</span>
                        </div>
                        <span className="text-sm text-gray-500 font-mono">src/auth/handlers.py</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">94%</div>
                        <div className="text-[10px] text-gray-500">match</div>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-300 bg-black/30 rounded-lg p-4 overflow-x-auto"><code>{`def authenticate_user(credentials: dict) -> User:
    """Main authentication logic - validates credentials
    and returns authenticated user or raises AuthError."""
    user = db.get_user(credentials['email'])
    if not verify_password(credentials['password'], user.hash):
        raise AuthError("Invalid credentials")
    return create_session(user)`}</code></pre>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </section>

          {/* HOW IT WORKS */}
          <section className="py-32 px-6 border-t border-white/5">
            <AnimatedSection>
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                  <span className="text-blue-400 text-sm font-medium uppercase tracking-wider">How It Works</span>
                  <h2 className="text-4xl font-bold mt-4">Three steps to code clarity</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                      <span className="text-xl font-bold text-blue-400">1</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-3">Index your repo</h3>
                    <p className="text-gray-500 text-sm">Connect your GitHub repo. We analyze and embed every function, class, and module.</p>
                  </div>

                  <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                      <span className="text-xl font-bold text-blue-400">2</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-3">Search by meaning</h3>
                    <p className="text-gray-500 text-sm">Ask natural questions. "Where is payment handled?" "Show me error boundaries."</p>
                  </div>

                  <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                      <span className="text-xl font-bold text-blue-400">3</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-3">Get precise results</h3>
                    <p className="text-gray-500 text-sm">Not 847 matches. The exact functions you need, ranked by relevance.</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </section>

          {/* FEATURES */}
          <section className="py-32 px-6">
            <AnimatedSection>
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold">Built for developers</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg">🔌</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">MCP Integration</h3>
                        <p className="text-sm text-gray-500">Works with Claude, Cursor, and any MCP-compatible AI. Search code directly from your assistant.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg">⚡</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Lightning Fast</h3>
                        <p className="text-sm text-gray-500">Sub-100ms responses with Redis caching. Semantic search shouldn't slow you down.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg">📊</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Code Intelligence</h3>
                        <p className="text-sm text-gray-500">Understand dependencies, analyze coding patterns, and see impact before you change.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                        <span className="text-lg">🔓</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Open Source</h3>
                        <p className="text-sm text-gray-500">Self-host for private repos. Inspect the code. Contribute improvements. No vendor lock-in.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </section>

          {/* FINAL CTA */}
          <section className="py-32 px-6 border-t border-white/5">
            <AnimatedSection>
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-4xl font-bold mb-6">Ready to understand your codebase?</h2>
                <p className="text-xl text-gray-400 mb-10">Start searching for free. No credit card required.</p>
                <div className="flex items-center justify-center gap-4">
                  <Button onClick={() => navigate('/signup')} className="px-8 py-4 h-auto bg-white text-black hover:bg-gray-100 text-lg">
                    Get started free
                  </Button>
                  <a
                    href="https://github.com/opencodeintel/opencodeintel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <GitHubIcon />
                    <span>Star on GitHub</span>
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </section>
        </>
      )}

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">CI</span>
            </div>
            <span>CodeIntel</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/opencodeintel/opencodeintel" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
            <span className="text-gray-700">•</span>
            <span>Open Source</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

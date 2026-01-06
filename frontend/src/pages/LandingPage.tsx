import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AnimatedSection } from '@/components/ui/AnimatedSection'
import { Hero, ResultsView } from '@/components/landing'
import { API_URL } from '@/config/api'
import { playgroundAPI } from '@/services/playground-api'
import type { SearchResult } from '@/types'

export function LandingPage() {
  const navigate = useNavigate()
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTime, setSearchTime] = useState<number | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [inputQuery, setInputQuery] = useState('')
  const [currentRepoId, setCurrentRepoId] = useState('')
  const [isCustomRepo, setIsCustomRepo] = useState(false)
  const [remaining, setRemaining] = useState(50)
  const [limit, setLimit] = useState(50)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)

  const isStale = hasSearched && !loading && inputQuery.trim() !== searchedQuery.trim() && inputQuery.trim() !== ''

  useEffect(() => {
    fetch(`${API_URL}/playground/limits`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setRemaining(data.remaining ?? 50)
        setLimit(data.limit ?? 50)
      })
      .catch(console.error)
  }, [])

  const handleSearch = async (query: string, repoId: string, isCustom: boolean) => {
    if (!query.trim() || loading || remaining <= 0) return

    setLoading(true)
    setHasSearched(true)
    setSearchedQuery(query)
    setInputQuery(query)
    setCurrentRepoId(repoId)
    setIsCustomRepo(isCustom)
    setRateLimitError(null)
    const t0 = Date.now()

    try {
      const data = isCustom
        ? await playgroundAPI.search(query)
        : await fetch(`${API_URL}/playground/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query, demo_repo: repoId, max_results: 10 })
          }).then(r => r.json())

      if (data.results) {
        setResults(data.results)
        setSearchTime(data.search_time_ms || Date.now() - t0)
        if (typeof data.remaining_searches === 'number') setRemaining(data.remaining_searches)
      } else if (data.status === 429) {
        setRateLimitError('Daily limit reached')
        setRemaining(0)
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleHeroResults = (heroResults: SearchResult[], query: string, repoId: string, time: number | null) => {
    setResults(heroResults)
    setSearchTime(time)
    setSearchedQuery(query)
    setInputQuery(query)
    setCurrentRepoId(repoId)
    setIsCustomRepo(false)
    setHasSearched(true)
  }

  const handleReSearch = () => {
    if (inputQuery.trim() && currentRepoId) handleSearch(inputQuery, currentRepoId, isCustomRepo)
  }

  const handleNewSearch = () => {
    setHasSearched(false)
    setResults([])
    setSearchTime(null)
    setSearchedQuery('')
    setInputQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CI</span>
            </div>
            <span className="font-semibold">CodeIntel</span>
            <Badge variant="glow" className="text-[10px]">BETA</Badge>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/opencodeintel/opencodeintel" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
              <Github className="w-5 h-5" />
            </a>
            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate('/login')}>Sign in</Button>
            <Button className="bg-white text-black hover:bg-gray-100" onClick={() => navigate('/signup')}>Get started</Button>
          </div>
        </div>
      </nav>

      {hasSearched ? (
        <ResultsView
          results={results}
          loading={loading}
          searchTime={searchTime}
          inputQuery={inputQuery}
          searchedQuery={searchedQuery}
          isStale={isStale}
          remaining={remaining}
          limit={limit}
          rateLimitError={rateLimitError}
          onQueryChange={setInputQuery}
          onSearch={handleReSearch}
          onBack={handleNewSearch}
          onSignUp={() => navigate('/signup')}
        />
      ) : (
        <>
          <Hero onResultsReady={handleHeroResults} />
          
          {/* Problem Section */}
          <section className="py-32 px-6 border-t border-white/5">
            <AnimatedSection>
              <div className="max-w-4xl mx-auto text-center">
                <span className="text-red-400 text-sm font-medium uppercase tracking-wider">The Problem</span>
                <h2 className="text-4xl font-bold mt-4 mb-6">You've been here before</h2>
                <p className="text-xl text-gray-400 mb-12">New codebase. 50,000 lines. You need to find where authentication happens.</p>
                
                <div className="bg-[#0d0d0f] rounded-xl border border-white/10 overflow-hidden text-left">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-xs text-gray-500 font-mono">terminal</span>
                  </div>
                  <div className="p-6 font-mono text-sm">
                    <div className="text-gray-400">$ grep -r "auth" ./src</div>
                    <div className="mt-4 text-gray-500 space-y-1">
                      <div>src/components/AuthButton.tsx</div>
                      <div>src/utils/auth.ts</div>
                      <div>src/pages/auth/login.tsx</div>
                      <div>src/middleware/auth.ts</div>
                      <div className="text-gray-600">... 842 more results</div>
                    </div>
                    <div className="mt-6 text-red-400">847 results. Which one handles the actual logic?</div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </section>

          {/* Solution Section */}
          <section className="py-32 px-6">
            <AnimatedSection>
              <div className="max-w-4xl mx-auto text-center">
                <span className="text-green-400 text-sm font-medium uppercase tracking-wider">The Solution</span>
                <h2 className="text-4xl font-bold mt-4 mb-6">Search by meaning, not keywords</h2>
                <p className="text-xl text-gray-400 mb-12">Ask for "authentication logic" and get the function that actually handles it.</p>
                
                <div className="bg-[#0d0d0f] rounded-xl border border-green-500/20 overflow-hidden text-left">
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
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="font-mono font-semibold text-white">authenticate_user</span>
                        <span className="ml-3 text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">function</span>
                        <p className="text-sm text-gray-500 font-mono mt-1">src/auth/handlers.py</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">94%</div>
                        <div className="text-[10px] text-gray-500">match</div>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-300 bg-black/30 rounded-lg p-4 overflow-x-auto"><code>{`def authenticate_user(credentials: dict) -> User:
    """Validates credentials and returns user."""
    user = db.get_user(credentials['email'])
    if not verify_password(credentials['password'], user.hash):
        raise AuthError("Invalid credentials")
    return create_session(user)`}</code></pre>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </section>

          {/* CTA */}
          <section className="py-32 px-6 border-t border-white/5">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">Ready to find code faster?</h2>
              <p className="text-xl text-gray-400 mb-8">Index your first repo in under a minute. No credit card required.</p>
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" onClick={() => navigate('/signup')}>
                Get started free
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

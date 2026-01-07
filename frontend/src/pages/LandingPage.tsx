import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Navbar, Hero, ResultsView } from '@/components/landing'
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
      <Navbar minimal={hasSearched} />

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
          
          {/* CTA section */}
          <section className="py-24 px-6 border-t border-white/5">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to actually find code?
              </h2>
              <p className="text-lg text-zinc-400 mb-8">
                Index your repo in under a minute. Free to start.
              </p>
              <button
                onClick={() => navigate('/signup')}
                className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                Get started free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

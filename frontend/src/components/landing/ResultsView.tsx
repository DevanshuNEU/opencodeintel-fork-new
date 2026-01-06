import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompactSearchBar } from './CompactSearchBar'
import { SkeletonCard } from './SkeletonCard'
import { ResultCard } from './ResultCard'
import type { SearchResult } from '@/types'

interface Props {
  results: SearchResult[]
  loading: boolean
  searchTime: number | null
  inputQuery: string
  searchedQuery: string
  isStale: boolean
  remaining: number
  limit: number
  rateLimitError: string | null
  onQueryChange: (q: string) => void
  onSearch: () => void
  onBack: () => void
  onSignUp: () => void
}

export function ResultsView({
  results, loading, searchTime, inputQuery, searchedQuery, isStale,
  remaining, limit, rateLimitError, onQueryChange, onSearch, onBack, onSignUp
}: Props) {
  return (
    <div className="min-h-screen pt-16">
      <CompactSearchBar
        query={inputQuery}
        onQueryChange={onQueryChange}
        onSearch={onSearch}
        onBack={onBack}
        loading={loading}
        remaining={remaining}
      />

      <section className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <ResultsHeader
            loading={loading}
            isStale={isStale}
            inputQuery={inputQuery}
            searchedQuery={searchedQuery}
            resultCount={results.length}
            searchTime={searchTime}
            remaining={remaining}
            limit={limit}
          />

          {loading && (
            <div className="space-y-4">
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} index={i} />)}
            </div>
          )}

          {!loading && (
            <>
              {(remaining <= 0 || rateLimitError) && (
                <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-2">You've hit the limit</h3>
                  <p className="text-gray-300 mb-4">{rateLimitError || 'Sign up for unlimited searches.'}</p>
                  <Button onClick={onSignUp} className="bg-white text-black hover:bg-gray-100">Get started free</Button>
                </Card>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={searchedQuery}
                  className="space-y-6"
                  animate={{ opacity: isStale ? 0.4 : 1, filter: isStale ? 'blur(2px)' : 'blur(0px)' }}
                  transition={{ duration: 0.3 }}
                >
                  {results.map((result, i) => (
                    <ResultCard key={`${result.file_path}-${result.name}-${i}`} result={result} index={i} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {results.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-400 mb-4">No results found for "{searchedQuery}"</p>
                  <Button variant="outline" onClick={onBack}>Try another search</Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function ResultsHeader({ loading, isStale, inputQuery, searchedQuery, resultCount, searchTime, remaining, limit }: {
  loading: boolean
  isStale: boolean
  inputQuery: string
  searchedQuery: string
  resultCount: number
  searchTime: number | null
  remaining: number
  limit: number
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      {loading ? (
        <span className="text-gray-400 text-sm">
          Searching for "<span className="text-blue-400">{inputQuery}</span>"...
        </span>
      ) : isStale ? (
        <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span className="text-amber-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Press Enter for "<span className="text-white">{inputQuery}</span>"
          </span>
          <span className="text-gray-600 text-xs">(showing "{searchedQuery}")</span>
        </motion.div>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            <span className="text-white font-semibold">{resultCount}</span> results for "<span className="text-blue-400">{searchedQuery}</span>"
          </span>
          {searchTime && (
            <span className="font-mono text-sm text-green-400">
              {searchTime > 1000 ? `${(searchTime / 1000).toFixed(1)}s` : `${searchTime}ms`}
            </span>
          )}
        </div>
      )}
      {!loading && remaining > 0 && remaining < limit && (
        <span className="text-sm text-gray-500">{remaining} left</span>
      )}
    </div>
  )
}

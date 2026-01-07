import { motion } from 'framer-motion'
import { Search, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onBack: () => void
  loading: boolean
  remaining: number
}

export function CompactSearchBar({ query, onQueryChange, onSearch, onBack, loading, remaining }: Props) {
  const canSearch = query.trim() && !loading && remaining > 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSearch) onSearch()
  }

  return (
    <motion.div 
      className="bg-[#09090b]/95 backdrop-blur-xl border-b border-white/5 sticky top-16 z-40"
      animate={loading ? { boxShadow: ['0 0 0 rgba(99,102,241,0)', '0 0 30px rgba(99,102,241,0.3)', '0 0 0 rgba(99,102,241,0)'] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 text-sm text-zinc-300 hover:text-white transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">New Search</span>
          </button>

          <form onSubmit={submit} className="flex-1 flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search again..."
                className={cn(
                  "w-full bg-zinc-900/80 border rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none transition-all",
                  loading ? "border-indigo-500/50 shadow-lg shadow-indigo-500/20" : "border-zinc-800 focus:border-zinc-700"
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={!canSearch}
              className={cn(
                "px-6 py-3 h-auto rounded-xl shrink-0",
                canSearch ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}

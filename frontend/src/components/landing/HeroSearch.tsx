import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type SearchState = 'idle' | 'focused' | 'searching' | 'complete'

interface HeroSearchProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  searching?: boolean
  repoName?: string
  disabled?: boolean
}

export interface HeroSearchRef {
  focus: () => void
}

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const searchBarStyles: Record<SearchState, string> = {
  idle: 'shadow-[0_0_0_1px_rgba(75,139,190,0.3)]',
  focused: 'shadow-[0_0_0_2px_var(--python-blue),0_0_20px_rgba(75,139,190,0.4)]',
  searching: 'shadow-[0_0_0_2px_var(--python-yellow),0_0_30px_rgba(255,212,59,0.3)]',
  complete: 'shadow-[0_0_0_2px_#34D399,0_0_20px_rgba(52,211,153,0.4)]',
}

export const HeroSearch = forwardRef<HeroSearchRef, HeroSearchProps>(function HeroSearch(
  { value, onChange, onSubmit, searching = false, repoName = 'flask', disabled = false },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }))

  // brief green flash when search completes
  useEffect(() => {
    if (!searching && value) {
      setShowComplete(true)
      const timer = setTimeout(() => setShowComplete(false), 800)
      return () => clearTimeout(timer)
    }
  }, [searching, value])

  const getState = (): SearchState => {
    if (searching) return 'searching'
    if (showComplete) return 'complete'
    if (isFocused) return 'focused'
    return 'idle'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!disabled && value.trim()) {
      onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <motion.div
        className={cn(
          'relative bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-800/50 overflow-hidden transition-shadow duration-300',
          searchBarStyles[getState()]
        )}
        animate={searching ? { scale: [1, 1.005, 1] } : {}}
        transition={{ duration: 1.5, repeat: searching ? Infinity : 0 }}
      >
        {/* progress bar */}
        {searching && (
          <motion.div
            className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-[var(--python-yellow)] to-[var(--python-blue)]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        )}

        <div className="flex items-center gap-3 px-5 py-4">
          <div className={cn(
            'transition-colors',
            searching ? 'text-[var(--python-yellow)]' : 'text-zinc-500'
          )}>
            {searching ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <SearchIcon />
              </motion.div>
            ) : (
              <SearchIcon />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search for anything..."
            disabled={disabled}
            className="flex-1 bg-transparent text-white text-lg placeholder:text-zinc-500 focus:outline-none"
          />

          {value && !searching && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <button
            type="submit"
            disabled={disabled || searching || !value.trim()}
            className={cn(
              'px-5 py-2 rounded-xl font-medium transition-all',
              value.trim() && !searching
                ? 'bg-[var(--python-blue)] text-white hover:bg-[var(--python-blue)]/90'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}
          >
            {searching ? (
              <span className="flex items-center gap-2">
                <motion.span
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {/* searching indicator */}
        {searching && (
          <div className="px-5 pb-3 text-sm text-zinc-500">
            Searching <span className="text-[var(--python-yellow)]">{repoName}</span>...
          </div>
        )}
      </motion.div>
    </form>
  )
})

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type VisualState = 'idle' | 'focused' | 'searching' | 'done'

// glow colors match python brand - blue idle, yellow searching, green done
const glowStyles: Record<VisualState, string> = {
  idle: 'shadow-[0_0_0_1px_rgba(75,139,190,0.3)]',
  focused: 'shadow-[0_0_0_2px_var(--python-blue),0_0_20px_rgba(75,139,190,0.4)]',
  searching: 'shadow-[0_0_0_2px_var(--python-yellow),0_0_30px_rgba(255,212,59,0.3)]',
  done: 'shadow-[0_0_0_2px_#34D399,0_0_20px_rgba(52,211,153,0.4)]',
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  searching?: boolean
  repoName?: string
}

export interface HeroSearchHandle {
  focus: () => void
}

export const HeroSearch = forwardRef<HeroSearchHandle, Props>(function HeroSearch(
  { value, onChange, onSubmit, searching = false, repoName = 'flask' },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [showDone, setShowDone] = useState(false)

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }))

  // flash green briefly when search completes - 800ms is long enough to notice
  // but short enough to not feel sluggish
  useEffect(() => {
    if (searching) return
    if (!value) return
    
    setShowDone(true)
    const t = setTimeout(() => setShowDone(false), 800)
    return () => clearTimeout(t)
  }, [searching, value])

  const state: VisualState = searching ? 'searching' 
    : showDone ? 'done' 
    : focused ? 'focused' 
    : 'idle'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSubmit()
  }

  return (
    <form onSubmit={submit} className="w-full">
      <motion.div
        className={cn(
          'relative bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-800/50 overflow-hidden transition-shadow duration-300',
          glowStyles[state]
        )}
        // subtle pulse while searching - makes it feel alive
        animate={searching ? { scale: [1, 1.005, 1] } : {}}
        transition={{ duration: 1.5, repeat: searching ? Infinity : 0 }}
      >
        {/* Shimmer border effect */}
        <div className="absolute inset-0 rounded-2xl opacity-50">
          <div 
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />
        </div>

        {searching && (
          <motion.div
            className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-[var(--python-yellow)] to-[var(--python-blue)]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        )}

        <div className="flex items-center gap-3 px-5 py-4">
          <div className={cn('transition-colors', searching ? 'text-[var(--python-yellow)]' : 'text-zinc-500')}>
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search for anything..."
            className="flex-1 bg-transparent text-white text-lg placeholder:text-zinc-500 focus:outline-none"
          />

          {value && !searching && (
            <button type="button" onClick={() => onChange('')} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={searching || !value.trim()}
            className={cn(
              'px-5 py-2 rounded-xl font-medium transition-all',
              value.trim() && !searching
                ? 'bg-[var(--python-blue)] text-white hover:opacity-90'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searching && (
          <div className="px-5 pb-3 text-sm text-zinc-500">
            Searching <span className="text-[var(--python-yellow)]">{repoName}</span>...
          </div>
        )}
      </motion.div>
    </form>
  )
})

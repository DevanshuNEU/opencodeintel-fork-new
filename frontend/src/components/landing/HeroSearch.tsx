import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type VisualState = 'idle' | 'focused' | 'searching' | 'done'

const glowStyles: Record<VisualState, string> = {
  idle: 'shadow-[0_0_0_1px_rgba(75,139,190,0.3)]',
  focused: 'shadow-[0_0_0_2px_var(--python-blue),0_0_20px_rgba(75,139,190,0.4)]',
  searching: 'shadow-[0_0_0_2px_var(--python-yellow),0_0_30px_rgba(255,212,59,0.3)]',
  done: 'shadow-[0_0_0_2px_#34D399,0_0_20px_rgba(52,211,153,0.4)]',
}

const EXAMPLE_QUERIES = [
  'authentication decorator',
  'error handling middleware',
  'database connection pool',
  'request validation logic',
  'caching implementation',
]

function useTypewriter(phrases: string[], typingSpeed = 80, deleteSpeed = 40, pauseDuration = 2000) {
  const [text, setText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex]
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (text.length < currentPhrase.length) {
          setText(currentPhrase.slice(0, text.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), pauseDuration)
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1))
        } else {
          setIsDeleting(false)
          setPhraseIndex((prev) => (prev + 1) % phrases.length)
        }
      }
    }, isDeleting ? deleteSpeed : typingSpeed)

    return () => clearTimeout(timeout)
  }, [text, phraseIndex, isDeleting, phrases, typingSpeed, deleteSpeed, pauseDuration])

  return text
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
  const animatedPlaceholder = useTypewriter(EXAMPLE_QUERIES)

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }))

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

  const showAnimatedPlaceholder = !value && !focused

  return (
    <form onSubmit={submit} className="w-full">
      <motion.div
        className={cn(
          'relative bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-800/50 overflow-hidden transition-shadow duration-300',
          glowStyles[state]
        )}
        animate={searching ? { scale: [1, 1.005, 1] } : {}}
        transition={{ duration: 1.5, repeat: searching ? Infinity : 0 }}
      >
        {/* Shimmer border effect */}
        <div className="absolute inset-0 rounded-2xl opacity-50 pointer-events-none">
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

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={focused ? 'Search for anything...' : ''}
              className="w-full bg-transparent text-white text-lg placeholder:text-zinc-500 focus:outline-none"
            />
            {showAnimatedPlaceholder && (
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <span className="text-zinc-500 text-lg">
                  {animatedPlaceholder}
                  <span className="animate-pulse">|</span>
                </span>
              </div>
            )}
          </div>

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

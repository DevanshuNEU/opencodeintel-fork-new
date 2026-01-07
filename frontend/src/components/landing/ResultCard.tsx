import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/types'

const PREVIEW_LINES = 8

// stagger cards so they don't all pop in at once
const entrance = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({ 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 200, delay: i * 0.1 }
  }),
}

function scoreColor(score: number) {
  if (score >= 0.7) return { text: 'from-emerald-400 to-green-500', bg: 'bg-emerald-500/10 border-emerald-500/20' }
  if (score >= 0.5) return { text: 'from-blue-400 to-indigo-500', bg: 'bg-blue-500/10 border-blue-500/20' }
  return { text: 'from-amber-400 to-orange-500', bg: 'bg-amber-500/10 border-amber-500/20' }
}

interface Props {
  result: SearchResult
  index: number
}

export function ResultCard({ result, index }: Props) {
  const [expanded, setExpanded] = useState(false)
  const lines = result.code.split('\n')
  const truncated = lines.length > PREVIEW_LINES
  const code = expanded ? result.code : lines.slice(0, PREVIEW_LINES).join('\n')
  const colors = scoreColor(result.score)

  return (
    <motion.div variants={entrance} initial="hidden" animate="visible" custom={index} layout>
      <Card className="bg-[#0c0c0e] border-white/[0.06] overflow-hidden hover:border-white/10 transition-all">
        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-mono text-lg font-semibold text-white truncate">
                {result.name}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-white/5 rounded">
                {result.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono truncate">{result.file_path}</p>
          </div>
          
          <div className={cn("flex flex-col items-center px-4 py-3 rounded-xl border", colors.bg)}>
            <div className={cn("text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent", colors.text)}>
              {(result.score * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">match</div>
          </div>
        </div>
        
        <div className="relative">
          <div className={cn("transition-all", !expanded && truncated && "max-h-[200px] overflow-hidden")}>
            <SyntaxHighlighter 
              language={result.language || 'python'} 
              style={oneDark} 
              customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8rem', background: '#08080a', padding: '1rem 1.5rem' }} 
              showLineNumbers 
              startingLineNumber={result.line_start || 1}
            >
              {code}
            </SyntaxHighlighter>
          </div>
          
          {truncated && (
            <ExpandButton 
              expanded={expanded} 
              remaining={lines.length - PREVIEW_LINES} 
              onClick={() => setExpanded(!expanded)} 
            />
          )}
        </div>
      </Card>
    </motion.div>
  )
}

function ExpandButton({ expanded, remaining, onClick }: { expanded: boolean; remaining: number; onClick: () => void }) {
  if (expanded) {
    return (
      <div className="flex justify-center py-3 bg-[#08080a] border-t border-white/5">
        <button onClick={onClick} className="px-4 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 rounded-full border border-white/10">
          Show less
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#08080a] to-transparent flex items-end justify-center pb-3">
      <button onClick={onClick} className="px-4 py-1.5 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 rounded-full border border-white/10">
        Show {remaining} more lines
      </button>
    </div>
  )
}

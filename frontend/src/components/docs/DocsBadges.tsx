import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeEstimateProps {
  minutes: number
  className?: string
}

export function TimeEstimate({ minutes, className }: TimeEstimateProps) {
  const label = minutes === 1 ? '1 min read' : `${minutes} min read`
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium',
      'text-gray-400 bg-white/5 border border-white/10 rounded-full',
      className
    )}>
      <Clock className="w-3 h-3" />
      {label}
    </span>
  )
}

// Difficulty badge
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface DifficultyBadgeProps {
  level: Difficulty
  className?: string
}

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  beginner: {
    label: 'Beginner',
    className: 'text-green-400 bg-green-500/10 border-green-500/30',
  },
  intermediate: {
    label: 'Intermediate', 
    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  advanced: {
    label: 'Advanced',
    className: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
}

export function DifficultyBadge({ level, className }: DifficultyBadgeProps) {
  const config = difficultyConfig[level]
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 text-xs font-medium border rounded-full',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}

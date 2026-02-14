import { Clock, BookOpen, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DocsTimeEstimateProps {
  minutes: number
  className?: string
}

export function DocsTimeEstimate({ minutes, className }: DocsTimeEstimateProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        'bg-white/5 text-gray-400 border-white/10 hover:bg-white/5',
        className
      )}
    >
      <Clock className="w-3 h-3 mr-1" />
      {minutes} min read
    </Badge>
  )
}

interface DocsDifficultyProps {
  level: 'beginner' | 'intermediate' | 'advanced'
  className?: string
}

export function DocsDifficulty({ level, className }: DocsDifficultyProps) {
  const config = {
    beginner: { label: 'Beginner', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
    intermediate: { label: 'Intermediate', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    advanced: { label: 'Advanced', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  }

  const { label, color } = config[level]

  return (
    <Badge variant="outline" className={cn(color, 'hover:bg-transparent', className)}>
      <BookOpen className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  )
}

interface DocsPageHeaderProps {
  title: string
  description: string
  timeEstimate?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  category?: string
}

export function DocsPageHeader({ 
  title, 
  description, 
  timeEstimate, 
  difficulty,
  category 
}: DocsPageHeaderProps) {
  return (
    <div className="mb-8 pb-8 border-b border-white/10">
      {category && (
        <div className="flex items-center gap-2 text-blue-400 text-sm mb-2 font-medium">
          {category}
        </div>
      )}
      
      <h1 className="text-4xl font-bold text-white mb-3">{title}</h1>
      
      <p className="text-xl text-gray-400 mb-4">{description}</p>
      
      {(timeEstimate || difficulty) && (
        <div className="flex items-center gap-3">
          {timeEstimate && <DocsTimeEstimate minutes={timeEstimate} />}
          {difficulty && <DocsDifficulty level={difficulty} />}
        </div>
      )}
    </div>
  )
}

interface Prerequisite {
  text: string
  href?: string
  completed?: boolean
}

interface DocsPrerequisitesProps {
  items: Prerequisite[]
}

export function DocsPrerequisites({ items }: DocsPrerequisitesProps) {
  return (
    <div className="my-6 p-4 rounded-lg bg-white/5 border border-white/10">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-blue-400" />
        Prerequisites
      </h4>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className={cn(
              'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
              item.completed ? 'bg-green-400' : 'bg-gray-500'
            )} />
            {item.href ? (
              <a 
                href={item.href} 
                className="text-gray-300 hover:text-white transition-colors underline underline-offset-2"
              >
                {item.text}
              </a>
            ) : (
              <span className="text-gray-300">{item.text}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

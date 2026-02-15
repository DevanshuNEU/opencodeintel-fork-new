import { TimeEstimate, DifficultyBadge } from './DocsBadges'

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
      
      {(timeEstimate != null || difficulty) && (
        <div className="flex items-center gap-3">
          {timeEstimate != null && <TimeEstimate minutes={timeEstimate} />}
          {difficulty && <DifficultyBadge level={difficulty} />}
        </div>
      )}
    </div>
  )
}

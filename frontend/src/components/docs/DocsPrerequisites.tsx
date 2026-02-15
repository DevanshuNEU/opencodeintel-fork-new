import { useState } from 'react'
import { ChevronDown, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface Prerequisite {
  text: string
  href?: string
  completed?: boolean
}

interface DocsPrerequisitesProps {
  items: Prerequisite[]
  defaultOpen?: boolean
}

export function DocsPrerequisites({ items, defaultOpen = false }: DocsPrerequisitesProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-6">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/[0.07] transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <span className="font-medium text-white">Prerequisites</span>
          <span className="text-xs text-gray-500">({items.length} items)</span>
        </div>
        <ChevronDown className={cn(
          'w-5 h-5 text-gray-400 transition-transform',
          open && 'rotate-180'
        )} />
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className={cn(
                  'shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                  item.completed 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-white/10 text-gray-500'
                )}>
                  {item.completed ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span className="text-gray-300">
                  {item.href ? (
                    <a 
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {item.text}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    item.text
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// What you will learn section
interface LearningObjective {
  text: string
}

interface DocsLearningObjectivesProps {
  items: LearningObjective[]
}

export function DocsLearningObjectives({ items }: DocsLearningObjectivesProps) {
  return (
    <div className="my-6 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-lg">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span>🎯</span>
        What you will learn
      </h4>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

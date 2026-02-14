import { cn } from '@/lib/utils'

interface StepProps {
  number: number
  title: string
  children: React.ReactNode
}

export function Step({ number, title, children }: StepProps) {
  return (
    <div className="relative pl-10 pb-8 last:pb-0">
      {/* Vertical line connecting steps */}
      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-white/10 last:hidden" />
      
      {/* Step number */}
      <div className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-400 text-sm font-semibold">
        {number}
      </div>
      
      {/* Content */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
        <div className="text-gray-300 [&>p]:mb-3 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    </div>
  )
}

interface StepListProps {
  children: React.ReactNode
  className?: string
}

export function StepList({ children, className }: StepListProps) {
  return (
    <div className={cn('my-8', className)}>
      {children}
    </div>
  )
}

// Alternative: Horizontal steps for shorter processes
interface HorizontalStepProps {
  number: number
  title: string
  description?: string
  active?: boolean
  completed?: boolean
}

export function HorizontalStep({ number, title, description, active, completed }: HorizontalStepProps) {
  return (
    <div className="flex-1 relative">
      {/* Connector line */}
      <div className="absolute top-4 left-8 right-0 h-px bg-white/10" />
      
      <div className="relative flex flex-col items-start">
        {/* Step number */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold z-10',
          completed 
            ? 'bg-green-500 text-white' 
            : active 
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-gray-400 border border-white/20'
        )}>
          {completed ? '✓' : number}
        </div>
        
        <div className="mt-3">
          <p className={cn(
            'text-sm font-medium',
            active || completed ? 'text-white' : 'text-gray-400'
          )}>
            {title}
          </p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface HorizontalStepListProps {
  children: React.ReactNode
  className?: string
}

export function HorizontalStepList({ children, className }: HorizontalStepListProps) {
  return (
    <div className={cn('flex gap-4 my-8', className)}>
      {children}
    </div>
  )
}

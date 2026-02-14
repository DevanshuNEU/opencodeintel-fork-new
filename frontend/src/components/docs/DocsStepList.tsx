import { cn } from '@/lib/utils'

interface Step {
  title: string
  children: React.ReactNode
}

interface DocsStepListProps {
  children: React.ReactNode
}

interface DocsStepProps {
  number: number
  title: string
  children: React.ReactNode
}

export function DocsStepList({ children }: DocsStepListProps) {
  return (
    <div className="my-8 space-y-6">
      {children}
    </div>
  )
}

export function DocsStep({ number, title, children }: DocsStepProps) {
  return (
    <div className="relative pl-12">
      {/* Step number */}
      <div className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-semibold text-sm">
        {number}
      </div>
      
      {/* Connecting line */}
      <div className="absolute left-[15px] top-10 bottom-0 w-px bg-gradient-to-b from-blue-500/40 to-transparent" />
      
      {/* Content */}
      <div className="pb-6">
        <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
        <div className="text-gray-300 [&>p]:mb-4 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    </div>
  )
}

// Alternative: Card-style steps for more visual separation
interface DocsStepCardProps {
  number: number
  title: string
  description?: string
  children: React.ReactNode
}

export function DocsStepCard({ number, title, description, children }: DocsStepCardProps) {
  return (
    <div className="relative my-4">
      <div className="flex gap-4">
        {/* Step indicator */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500/50 text-blue-400 font-bold">
            {number}
          </div>
          <div className="flex-1 w-px bg-gradient-to-b from-blue-500/30 to-transparent mt-2" />
        </div>
        
        {/* Card content */}
        <div className="flex-1 pb-8">
          <div className="p-5 bg-[#111113] border border-white/10 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-gray-400 mb-4">{description}</p>
            )}
            <div className="text-gray-300 [&>p]:mb-3 [&>p:last-child]:mb-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

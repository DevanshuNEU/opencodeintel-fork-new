import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, Info, Lightbulb, CheckCircle } from 'lucide-react'

type CalloutType = 'info' | 'warning' | 'tip' | 'danger' | 'success'

interface DocsCalloutProps {
  type?: CalloutType
  title?: string
  children: React.ReactNode
}

const calloutConfig: Record<CalloutType, {
  icon: React.ReactNode
  containerClass: string
  titleClass: string
}> = {
  info: {
    icon: <Info className="w-5 h-5" />,
    containerClass: 'bg-blue-500/10 border-blue-500/30',
    titleClass: 'text-blue-400',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    containerClass: 'bg-amber-500/10 border-amber-500/30',
    titleClass: 'text-amber-400',
  },
  tip: {
    icon: <Lightbulb className="w-5 h-5" />,
    containerClass: 'bg-green-500/10 border-green-500/30',
    titleClass: 'text-green-400',
  },
  danger: {
    icon: <AlertCircle className="w-5 h-5" />,
    containerClass: 'bg-red-500/10 border-red-500/30',
    titleClass: 'text-red-400',
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    containerClass: 'bg-emerald-500/10 border-emerald-500/30',
    titleClass: 'text-emerald-400',
  },
}

export function DocsCallout({ type = 'info', title, children }: DocsCalloutProps) {
  const config = calloutConfig[type]

  return (
    <div className={cn(
      'my-6 rounded-lg border p-4',
      config.containerClass
    )}>
      <div className="flex gap-3">
        <span className={cn('shrink-0 mt-0.5', config.titleClass)}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <p className={cn('font-semibold mb-1', config.titleClass)}>
              {title}
            </p>
          )}
          <div className="text-gray-300 text-sm [&>p]:mb-2 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

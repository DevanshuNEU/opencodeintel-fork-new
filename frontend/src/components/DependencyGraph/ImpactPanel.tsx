import { memo, useState, useEffect } from 'react'
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  FileCode2, 
  ExternalLink, 
  Search,
  CheckCircle2,
  Flame,
  CircleAlert,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RiskLevel, ImpactResult } from './hooks/useImpactAnalysis'

interface ImpactPanelProps {
  fileName: string
  fullPath: string
  impact: ImpactResult
  onClose: () => void
  onFileClick: (fileId: string) => void
  onFileHover: (fileId: string | null) => void
  onAnalyzeInSearch?: (fileId: string) => void
}

const RISK_CONFIG: Record<RiskLevel, { 
  bg: string
  border: string
  text: string
  icon: typeof CheckCircle2
  label: string 
}> = {
  low: { 
    bg: 'bg-emerald-50 dark:bg-emerald-500/10', 
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400', 
    icon: CheckCircle2,
    label: 'Low Risk'
  },
  medium: { 
    bg: 'bg-yellow-50 dark:bg-yellow-500/10', 
    border: 'border-yellow-200 dark:border-yellow-500/30',
    text: 'text-yellow-600 dark:text-yellow-400', 
    icon: CircleAlert,
    label: 'Medium Risk'
  },
  high: { 
    bg: 'bg-orange-50 dark:bg-orange-500/10', 
    border: 'border-orange-200 dark:border-orange-500/30',
    text: 'text-orange-600 dark:text-orange-400', 
    icon: AlertTriangle,
    label: 'High Risk'
  },
  critical: { 
    bg: 'bg-rose-50 dark:bg-rose-500/10', 
    border: 'border-rose-200 dark:border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400', 
    icon: Flame,
    label: 'Critical'
  },
}

function FileListItem({ 
  fileId, 
  onClick, 
  onHover 
}: { 
  fileId: string
  onClick: () => void
  onHover: (hovering: boolean) => void 
}) {
  const fileName = fileId.split('/').pop() || fileId
  const dirPath = fileId.split('/').slice(0, -1).join('/')

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <FileCode2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
        <span className="text-sm text-zinc-700 dark:text-zinc-200 truncate font-medium">{fileName}</span>
        <ExternalLink className="w-3 h-3 text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
      </div>
      {dirPath && (
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate pl-5">{dirPath}</div>
      )}
    </button>
  )
}

function CollapsibleSection({ 
  title, 
  count, 
  files, 
  defaultOpen = false,
  variant = 'default',
  onFileClick,
  onFileHover,
}: {
  title: string
  count: number
  files: string[]
  defaultOpen?: boolean
  variant?: 'direct' | 'transitive' | 'default'
  onFileClick: (fileId: string) => void
  onFileHover: (fileId: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Reset collapse state when file selection changes
  useEffect(() => {
    setIsOpen(defaultOpen)
  }, [defaultOpen, files])

  const variantStyles = {
    direct: 'text-rose-600 dark:text-rose-400',
    transitive: 'text-amber-600 dark:text-amber-400',
    default: 'text-zinc-700 dark:text-zinc-300',
  }

  if (count === 0) return null

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        )}
        <span className={cn('text-sm font-medium', variantStyles[variant])}>{title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5">{count}</Badge>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-0.5 max-h-[200px] overflow-y-auto">
          {files.map(fileId => (
            <FileListItem
              key={fileId}
              fileId={fileId}
              onClick={() => onFileClick(fileId)}
              onHover={(hovering) => onFileHover(hovering ? fileId : null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ImpactPanelComponent({
  fileName,
  fullPath,
  impact,
  onClose,
  onFileClick,
  onFileHover,
  onAnalyzeInSearch,
}: ImpactPanelProps) {
  const risk = RISK_CONFIG[impact.riskLevel]
  const RiskIcon = risk.icon
  const totalDependents = impact.allDependents.length

  return (
    <div className="w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col animate-in slide-in-from-right duration-200">
      <CardHeader className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 truncate" title={fullPath}>
              {fileName}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5" title={fullPath}>
              {fullPath}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className={cn(
          'mt-3 px-3 py-2 rounded-lg border flex items-center gap-2',
          risk.bg, risk.border
        )}>
          <RiskIcon className={cn('w-5 h-5', risk.text)} />
          <div>
            <div className={cn('font-semibold text-sm', risk.text)}>{risk.label}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {totalDependents === 0 
                ? 'No files depend on this'
                : `${totalDependents} file${totalDependents === 1 ? '' : 's'} will be affected`
              }
            </div>
          </div>
        </div>

        {impact.riskLevel === 'critical' && (
          <div className="mt-2 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Changes to this file have high blast radius. Test thoroughly.</span>
          </div>
        )}

        {impact.isEntryPoint && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-lg">
            <MapPin className="w-3.5 h-3.5" />
            <span>Entry point - root of the dependency tree</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        <CollapsibleSection
          title="Direct Dependents"
          count={impact.directDependents.length}
          files={impact.directDependents}
          variant="direct"
          defaultOpen={true}
          onFileClick={onFileClick}
          onFileHover={onFileHover}
        />

        <CollapsibleSection
          title="Transitive Dependents"
          count={impact.transitiveDependents.length}
          files={impact.transitiveDependents}
          variant="transitive"
          defaultOpen={impact.directDependents.length < 5}
          onFileClick={onFileClick}
          onFileHover={onFileHover}
        />
      </CardContent>

      {onAnalyzeInSearch && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button className="w-full" onClick={() => onAnalyzeInSearch(fullPath)}>
            <Search className="w-4 h-4 mr-2" />
            Analyze in Search
          </Button>
        </div>
      )}
    </div>
  )
}

export const ImpactPanel = memo(ImpactPanelComponent)

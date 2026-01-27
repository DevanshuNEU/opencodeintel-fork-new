import { memo, useState } from 'react'
import { X, ChevronDown, ChevronRight, AlertTriangle, FileCode2, ExternalLink, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
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

const RISK_CONFIG: Record<RiskLevel, { bg: string; border: string; text: string; icon: string; label: string }> = {
  low: { 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/30',
    text: 'text-emerald-400', 
    icon: '✓',
    label: 'Low Risk'
  },
  medium: { 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/30',
    text: 'text-yellow-400', 
    icon: '⚠',
    label: 'Medium Risk'
  },
  high: { 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/30',
    text: 'text-orange-400', 
    icon: '⚠',
    label: 'High Risk'
  },
  critical: { 
    bg: 'bg-rose-500/10', 
    border: 'border-rose-500/30',
    text: 'text-rose-400', 
    icon: '🔥',
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
      className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <FileCode2 className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        <span className="text-sm text-zinc-200 truncate font-medium">{fileName}</span>
        <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
      </div>
      {dirPath && (
        <div className="text-[10px] text-zinc-500 mt-0.5 truncate pl-5">{dirPath}</div>
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

  const variantStyles = {
    direct: 'text-rose-400',
    transitive: 'text-amber-400',
    default: 'text-zinc-300',
  }

  if (count === 0) return null

  return (
    <div className="border-t border-zinc-800 pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 text-left hover:bg-zinc-800/50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        )}
        <span className={cn('text-sm font-medium', variantStyles[variant])}>{title}</span>
        <span className="text-xs text-zinc-500 ml-auto">{count}</span>
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
  const totalDependents = impact.allDependents.length

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-zinc-100 truncate" title={fullPath}>
              {fileName}
            </h3>
            <p className="text-xs text-zinc-500 truncate mt-0.5" title={fullPath}>
              {fullPath}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Risk Badge */}
        <div className={cn(
          'mt-3 px-3 py-2 rounded-lg border flex items-center gap-2',
          risk.bg, risk.border
        )}>
          <span className="text-lg">{risk.icon}</span>
          <div>
            <div className={cn('font-semibold text-sm', risk.text)}>{risk.label}</div>
            <div className="text-xs text-zinc-400">
              {totalDependents === 0 
                ? 'No files depend on this'
                : `${totalDependents} file${totalDependents === 1 ? '' : 's'} will be affected`
              }
            </div>
          </div>
        </div>

        {/* Warning for critical files */}
        {impact.riskLevel === 'critical' && (
          <div className="mt-2 flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Changes to this file have high blast radius. Test thoroughly.</span>
          </div>
        )}

        {/* Entry Point indicator */}
        {impact.isEntryPoint && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
            <span>📍</span>
            <span>Entry point - this file is a root of the dependency tree</span>
          </div>
        )}
      </div>

      {/* Dependents Lists */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
      </div>

      {/* Actions Footer */}
      {onAnalyzeInSearch && (
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => onAnalyzeInSearch(fullPath)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            Analyze in Search
          </button>
        </div>
      )}
    </div>
  )
}

export const ImpactPanel = memo(ImpactPanelComponent)

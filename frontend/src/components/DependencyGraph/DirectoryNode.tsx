import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { Folder, FolderOpen, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { RiskLevel } from './hooks/useImpactAnalysis'

export interface DirectoryNodeData {
  label: string
  fullPath: string
  fileCount: number
  totalDependents: number
  maxRisk: RiskLevel
  isExpanded: boolean
  state: 'default' | 'selected' | 'direct' | 'transitive' | 'dimmed'
}

const STATE_STYLES: Record<DirectoryNodeData['state'], string> = {
  default: 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/90',
  selected: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20',
  direct: 'border-rose-500 bg-rose-50 dark:bg-rose-950 ring-1 ring-rose-500/30',
  transitive: 'border-amber-500 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-500/30',
  dimmed: 'border-zinc-300 bg-zinc-100 opacity-50 dark:border-zinc-600 dark:bg-zinc-800/80',
}

const RISK_STYLES: Record<RiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
}

function DirectoryNodeComponent({ data }: NodeProps<DirectoryNodeData>) {
  const stateStyle = STATE_STYLES[data.state]
  const FolderIcon = data.isExpanded ? FolderOpen : Folder

  return (
    <>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-zinc-400 dark:!bg-zinc-600 !w-2 !h-2 !border-0" 
      />
      
      <div
        className={cn(
          'px-3 py-2.5 rounded-lg border-2 min-w-[180px]',
          'transition-all duration-200 ease-out',
          'hover:scale-[1.02] hover:shadow-md active:scale-[0.98]',
          'cursor-pointer select-none',
          stateStyle
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <FolderIcon className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          <span 
            className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate flex-1" 
            title={data.fullPath}
          >
            {data.label}/
          </span>
          <ChevronRight className={cn(
            'w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ease-out',
            data.isExpanded && 'rotate-90'
          )} />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="font-medium">
            {data.fileCount} file{data.fileCount !== 1 ? 's' : ''}
          </span>
          <span>•</span>
          <span className={cn(
            'font-medium',
            data.totalDependents >= 30 ? 'text-rose-600 dark:text-rose-400' : 
            data.totalDependents >= 10 ? 'text-amber-600 dark:text-amber-400' : 
            'text-zinc-500 dark:text-zinc-400'
          )}>
            {data.totalDependents} deps
          </span>
          {data.maxRisk !== 'low' && (
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-5 ml-auto', RISK_STYLES[data.maxRisk])}>
              {data.maxRisk === 'critical' ? 'Crit' : data.maxRisk === 'high' ? 'High' : 'Med'}
            </Badge>
          )}
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-zinc-400 dark:!bg-zinc-600 !w-2 !h-2 !border-0" 
      />
    </>
  )
}

export const DirectoryNode = memo(DirectoryNodeComponent)

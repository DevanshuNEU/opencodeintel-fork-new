import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { FileCode2, FileJson, FileText, TestTube2, Settings, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLevel } from './hooks/useImpactAnalysis'

export interface GraphNodeData {
  label: string
  fullPath: string
  language: string
  dependentCount: number
  importCount: number
  loc?: number
  riskLevel: RiskLevel
  isEntryPoint: boolean
  state: 'default' | 'selected' | 'direct' | 'transitive' | 'dimmed'
}

const FILE_ICONS: Record<string, typeof FileCode2> = {
  python: FileCode2,
  javascript: FileCode2,
  typescript: FileCode2,
  json: FileJson,
  yaml: FileText,
  markdown: FileText,
  test: TestTube2,
  config: Settings,
  unknown: File,
}

const LANGUAGE_COLORS: Record<string, string> = {
  python: 'text-blue-400',
  javascript: 'text-yellow-400',
  typescript: 'text-blue-500',
  json: 'text-zinc-400',
  yaml: 'text-zinc-400',
  config: 'text-zinc-400',
  test: 'text-purple-400',
  unknown: 'text-zinc-500',
}

const STATE_STYLES: Record<GraphNodeData['state'], string> = {
  default: 'border-zinc-700 bg-zinc-900/90',
  selected: 'border-indigo-500 bg-zinc-900 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20',
  direct: 'border-rose-500 bg-zinc-900 ring-1 ring-rose-500/30',
  transitive: 'border-amber-500 bg-zinc-900 ring-1 ring-amber-500/30',
  dimmed: 'border-zinc-800 bg-zinc-900/50 opacity-40',
}

const RISK_BADGES: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Low' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Med' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'High' },
  critical: { bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'Crit' },
}

function getFileType(path: string, language: string): string {
  const fileName = path.split('/').pop() || ''
  
  if (fileName.includes('.test.') || fileName.includes('_test.') || fileName.includes('.spec.')) {
    return 'test'
  }
  if (fileName.includes('config') || fileName.endsWith('.json') || fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
    return 'config'
  }
  if (['python', 'javascript', 'typescript'].includes(language)) {
    return language
  }
  return 'unknown'
}

function GraphNodeComponent({ data, selected }: NodeProps<GraphNodeData>) {
  const fileType = getFileType(data.fullPath, data.language)
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.unknown
  const iconColor = LANGUAGE_COLORS[fileType] || LANGUAGE_COLORS.unknown
  const stateStyle = STATE_STYLES[data.state]
  const risk = RISK_BADGES[data.riskLevel]

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-zinc-600 !w-2 !h-2 !border-0" />
      
      <div
        className={cn(
          'px-3 py-2.5 rounded-lg border-2 transition-all duration-200 min-w-[200px]',
          'hover:scale-[1.02] hover:shadow-md cursor-pointer',
          stateStyle,
          data.isEntryPoint && 'border-l-4 border-l-emerald-500'
        )}
      >
        {/* Header row: icon + filename + risk badge */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn('w-4 h-4 flex-shrink-0', iconColor)} />
          <span className="font-semibold text-sm text-zinc-100 truncate flex-1" title={data.fullPath}>
            {data.label}
          </span>
          {data.dependentCount > 0 && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', risk.bg, risk.text)}>
              {risk.label}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className={cn(
            'font-medium',
            data.dependentCount >= 15 ? 'text-rose-400' : 
            data.dependentCount >= 5 ? 'text-amber-400' : 'text-zinc-400'
          )}>
            {data.dependentCount} dependents
          </span>
          <span>•</span>
          <span>{data.importCount} imports</span>
          {data.loc && (
            <>
              <span>•</span>
              <span>{data.loc} LOC</span>
            </>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-zinc-600 !w-2 !h-2 !border-0" />
    </>
  )
}

export const GraphNode = memo(GraphNodeComponent)

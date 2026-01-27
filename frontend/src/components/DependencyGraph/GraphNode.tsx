import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { 
  FileCode2, 
  FileJson, 
  FileText, 
  TestTube2, 
  Settings, 
  File
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
  python: 'text-blue-500 dark:text-blue-400',
  javascript: 'text-yellow-600 dark:text-yellow-400',
  typescript: 'text-blue-600 dark:text-blue-500',
  json: 'text-zinc-500 dark:text-zinc-400',
  yaml: 'text-zinc-500 dark:text-zinc-400',
  markdown: 'text-zinc-500 dark:text-zinc-400',
  config: 'text-zinc-500 dark:text-zinc-400',
  test: 'text-purple-500 dark:text-purple-400',
  unknown: 'text-zinc-400 dark:text-zinc-500',
}

const STATE_STYLES: Record<GraphNodeData['state'], string> = {
  default: 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900/90',
  selected: 'border-indigo-500 bg-white dark:bg-zinc-900 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20',
  direct: 'border-rose-500 bg-white dark:bg-zinc-900 ring-1 ring-rose-500/30',
  transitive: 'border-amber-500 bg-white dark:bg-zinc-900 ring-1 ring-amber-500/30',
  dimmed: 'border-zinc-200 bg-zinc-50/50 opacity-40 dark:border-zinc-800 dark:bg-zinc-900/50',
}

const RISK_CONFIG: Record<RiskLevel, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className: string }> = {
  low: { variant: 'secondary', label: 'Low', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  medium: { variant: 'secondary', label: 'Med', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' },
  high: { variant: 'secondary', label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
  critical: { variant: 'destructive', label: 'Crit', className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
}

function getFileType(path: string, language: string): string {
  const fileName = path.split('/').pop() || ''
  const lower = fileName.toLowerCase()
  const ext = lower.split('.').pop() || ''

  if (lower.includes('.test.') || lower.includes('_test.') || lower.includes('.spec.')) {
    return 'test'
  }
  if (ext === 'json') return 'json'
  if (ext === 'yaml' || ext === 'yml') return 'yaml'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (lower.includes('config')) return 'config'
  if (['python', 'javascript', 'typescript'].includes(language)) return language
  return 'unknown'
}

function GraphNodeComponent({ data }: NodeProps<GraphNodeData>) {
  const fileType = getFileType(data.fullPath, data.language)
  const Icon = FILE_ICONS[fileType] || FILE_ICONS.unknown
  const iconColor = LANGUAGE_COLORS[fileType] || LANGUAGE_COLORS.unknown
  const stateStyle = STATE_STYLES[data.state]
  const risk = RISK_CONFIG[data.riskLevel]

  return (
    <>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-zinc-400 dark:!bg-zinc-600 !w-2 !h-2 !border-0" 
      />
      
      <div
        className={cn(
          'px-3 py-2.5 rounded-lg border-2 transition-all duration-200 min-w-[200px]',
          'hover:scale-[1.02] hover:shadow-md cursor-pointer',
          stateStyle,
          data.isEntryPoint && 'border-l-4 border-l-emerald-500'
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn('w-4 h-4 flex-shrink-0', iconColor)} />
          <span 
            className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate flex-1" 
            title={data.fullPath}
          >
            {data.label}
          </span>
          {data.dependentCount > 0 && (
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-5', risk.className)}>
              {risk.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className={cn(
            'font-medium',
            data.dependentCount >= 15 ? 'text-rose-600 dark:text-rose-400' : 
            data.dependentCount >= 5 ? 'text-amber-600 dark:text-amber-400' : 
            'text-zinc-500 dark:text-zinc-400'
          )}>
            {data.dependentCount} dependents
          </span>
          <span>•</span>
          <span>{data.importCount} imports</span>
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

export const GraphNode = memo(GraphNodeComponent)

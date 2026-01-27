import { memo } from 'react'
import { RotateCcw, Maximize2, Filter, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GraphToolbarProps {
  totalFiles: number
  visibleFiles: number
  showAll: boolean
  showTests: boolean
  onToggleShowAll: () => void
  onToggleTests: () => void
  onResetView: () => void
  onFullscreen?: () => void
}

function GraphToolbarComponent({
  totalFiles,
  visibleFiles,
  showAll,
  showTests,
  onToggleShowAll,
  onToggleTests,
  onResetView,
  onFullscreen,
}: GraphToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
      {/* Left: Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">
          Showing <span className="text-zinc-700 dark:text-zinc-200 font-medium">{visibleFiles}</span>
          {!showAll && totalFiles > visibleFiles && (
            <span className="text-zinc-400 dark:text-zinc-500"> of {totalFiles}</span>
          )}
          {' '}files
        </span>
      </div>

      {/* Center: Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleShowAll}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            showAll 
              ? 'bg-indigo-600 text-white' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          {showAll ? 'Show Top 15' : 'Show All'}
        </button>

        <button
          onClick={onToggleTests}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            showTests 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300'
          )}
        >
          {showTests ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Tests
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onResetView}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors group"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
        </button>
        
        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors group"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
          </button>
        )}
      </div>
    </div>
  )
}

export const GraphToolbar = memo(GraphToolbarComponent)

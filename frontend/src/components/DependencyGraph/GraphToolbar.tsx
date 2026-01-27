import { memo } from 'react'
import { RotateCcw, Maximize2, Filter, Eye, EyeOff, FolderTree } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface GraphToolbarProps {
  totalFiles: number
  visibleFiles: number
  showAll: boolean
  showTests: boolean
  clusterByDir: boolean
  onToggleShowAll: () => void
  onToggleTests: () => void
  onToggleCluster: () => void
  onResetView: () => void
  onFullscreen?: () => void
}

function GraphToolbarComponent({
  totalFiles,
  visibleFiles,
  showAll,
  showTests,
  clusterByDir,
  onToggleShowAll,
  onToggleTests,
  onToggleCluster,
  onResetView,
  onFullscreen,
}: GraphToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">
          Showing <span className="text-zinc-700 dark:text-zinc-200 font-medium">{visibleFiles}</span>
          {!showAll && totalFiles > visibleFiles && (
            <span className="text-zinc-400 dark:text-zinc-500"> of {totalFiles}</span>
          )}
          {' '}files
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={clusterByDir ? 'default' : 'secondary'}
          size="sm"
          onClick={onToggleCluster}
          className="h-8"
          title="Group files by directory"
        >
          <FolderTree className="w-3.5 h-3.5 mr-1.5" />
          Cluster
        </Button>

        <Button
          variant={showAll ? 'default' : 'secondary'}
          size="sm"
          onClick={onToggleShowAll}
          className="h-8"
        >
          <Filter className="w-3.5 h-3.5 mr-1.5" />
          {showAll ? 'Show Top 15' : 'Show All'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleTests}
          className={cn('h-8', !showTests && 'opacity-60')}
        >
          {showTests ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
          Tests
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onResetView} title="Reset View">
          <RotateCcw className="w-4 h-4" />
        </Button>
        
        {onFullscreen && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFullscreen} title="Fullscreen">
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export const GraphToolbar = memo(GraphToolbarComponent)

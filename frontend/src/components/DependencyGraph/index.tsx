// DependencyGraph -- main entry point
// Renders stats bar, view toggle (Graph | Matrix), and the active view

import { useState } from 'react'
import { GitFork, LayoutGrid, FileCode2, Navigation, AlertTriangle } from 'lucide-react'
import { GraphView } from './GraphView'
import { MatrixView } from './MatrixView'
import { ImpactPanel } from './ImpactPanel'
import { useImpactAnalysis } from './hooks/useImpactAnalysis'
import { DependencyGraphSkeleton } from '../ui/Skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useDependencyGraph } from '../../hooks/useCachedQuery'
import type { DependencyApiResponse } from './types'

interface DependencyGraphProps {
  repoId: string
  apiKey: string
}

type ViewMode = 'graph' | 'matrix'

function StatsBar({ data }: { data: DependencyApiResponse | undefined }) {
  if (!data) return null

  const totalFiles = data.total_files ?? data.nodes?.length ?? 0
  const totalDeps = data.total_dependencies ?? data.edges?.length ?? 0
  const entryPoints = data.nodes?.filter(
    (n) => (n.import_count ?? n.imports ?? 0) === 0
  ).length ?? 0
  const criticalFiles = data.metrics?.most_critical_files?.filter(
    (f) => f.dependents >= 5
  ).length ?? 0

  const stats = [
    { label: 'Total Files', value: totalFiles, icon: FileCode2 },
    { label: 'Dependencies', value: totalDeps, icon: GitFork },
    { label: 'Entry Points', value: entryPoints, icon: Navigation },
    { label: 'Critical Files', value: criticalFiles, icon: AlertTriangle },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <stat.icon className="w-4 h-4" />
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ViewToggle({
  active,
  onChange,
}: {
  active: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const tabs = [
    { id: 'graph' as const, label: 'Graph', icon: GitFork },
    { id: 'matrix' as const, label: 'Matrix', icon: LayoutGrid },
  ]

  return (
    <div className="flex gap-1 mx-4 mb-4 p-1 bg-muted rounded-lg w-fit border border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            active === tab.id
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-background'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function DependencyGraph({ repoId, apiKey }: DependencyGraphProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const { data, isLoading } = useDependencyGraph({
    repoId,
    apiKey,
    enabled: true,
  })

  // Client-side impact analysis using the full graph data
  const { getDependents, getImports } = useImpactAnalysis(data ?? null)

  // Compute impact for selected file
  const selectedImpact = selectedFile ? getDependents(selectedFile) : null
  const selectedFileName = selectedFile?.split('/').pop() ?? ''

  if (isLoading) return <DependencyGraphSkeleton />

  if (!data?.nodes?.length) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No dependency data available. Try re-indexing the repository.
      </div>
    )
  }

  return (
    <div>
      <StatsBar data={data} />
      <ViewToggle active={viewMode} onChange={setViewMode} />

      <div className="relative">
        {viewMode === 'graph' && (
          <GraphView data={data} onSelectFile={(f) => setSelectedFile(f)} />
        )}
        {viewMode === 'matrix' && (
          <MatrixView data={data} onSelectFile={(f) => setSelectedFile(f)} />
        )}

        {/* impact panel overlays as right sidebar */}
        {selectedFile && selectedImpact && (
          <div className="absolute top-0 right-0 h-full z-20">
            <ImpactPanel
              fileName={selectedFileName}
              fullPath={selectedFile}
              impact={selectedImpact}
              onClose={() => setSelectedFile(null)}
              onFileClick={(fileId) => setSelectedFile(fileId)}
              onFileHover={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Default export for lazy loading
export default DependencyGraph

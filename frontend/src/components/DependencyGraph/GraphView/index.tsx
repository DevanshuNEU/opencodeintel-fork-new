// Sigma.js WebGL graph rendering view
// TODO: OPE-45 -- full implementation with hover/click interactions

import type { DependencyApiResponse } from '../types'

interface GraphViewProps {
  data: DependencyApiResponse
  onSelectFile?: (filePath: string) => void
}

export function GraphView({ data, onSelectFile }: GraphViewProps) {
  return (
    <div className="flex items-center justify-center h-[600px] text-muted-foreground">
      GraphView placeholder -- {data.nodes?.length || 0} nodes ready for Sigma.js rendering
    </div>
  )
}

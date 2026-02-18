// Dependency Structure Matrix (DSM) view
// TODO: OPE-46 -- full implementation with cycle detection + directory grouping

import type { DependencyApiResponse } from '../types'

interface MatrixViewProps {
  data: DependencyApiResponse
  onSelectFile?: (filePath: string) => void
}

export function MatrixView({ data, onSelectFile }: MatrixViewProps) {
  return (
    <div className="flex items-center justify-center h-[600px] text-muted-foreground">
      MatrixView placeholder -- {data.nodes?.length || 0} files ready for DSM rendering
    </div>
  )
}

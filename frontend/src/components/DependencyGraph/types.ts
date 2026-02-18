// Types for the dependency graph API response and internal data structures

export interface ApiNode {
  id: string
  label?: string
  type?: string
  language?: string
  import_count?: number
  imports?: number
}

export interface ApiEdge {
  source: string
  target: string
  type?: string
}

export interface GraphMetrics {
  most_critical_files?: { file: string; dependents: number }[]
  most_complex_files?: { file: string; dependencies: number }[]
  avg_dependencies?: number
  total_edges?: number
}

export interface DependencyApiResponse {
  nodes: ApiNode[]
  edges: ApiEdge[]
  dependencies?: Record<string, string[]>
  metrics?: GraphMetrics
  total_files?: number
  total_dependencies?: number
  external_dependencies?: string[]
  cached?: boolean
}

// Matrix view data types
export interface MatrixData {
  labels: string[]
  shortLabels: string[]
  matrix: number[][]
  directories: Map<string, number[]>
  directorySeparators: number[]
  cycles: [number, number][]
  totalDeps: number
  totalCycles: number
}

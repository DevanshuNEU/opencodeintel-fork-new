import { useMemo, useCallback } from 'react'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ImpactResult {
  directDependents: string[]
  transitiveDependents: string[]
  allDependents: string[]
  riskLevel: RiskLevel
  riskScore: number
  isEntryPoint: boolean
}

export interface FileMetrics {
  id: string
  dependentCount: number
  importCount: number
  importance: number
  isEntryPoint: boolean
  riskLevel: RiskLevel
}

interface GraphData {
  nodes: Array<{ id: string; import_count?: number; imports?: number }>
  edges: Array<{ source: string; target: string }>
}

// Risk thresholds based on dependent count
const RISK_THRESHOLDS = {
  low: 5,
  medium: 15,
  high: 30,
} as const

function calculateRiskLevel(dependentCount: number): RiskLevel {
  if (dependentCount >= RISK_THRESHOLDS.high) return 'critical'
  if (dependentCount >= RISK_THRESHOLDS.medium) return 'high'
  if (dependentCount >= RISK_THRESHOLDS.low) return 'medium'
  return 'low'
}

export function useImpactAnalysis(graphData: GraphData | null) {
  // Build adjacency maps: who imports whom, who depends on whom
  const { fileToImports, fileToDependents, importCounts } = useMemo(() => {
    if (!graphData) {
      return { fileToImports: new Map(), fileToDependents: new Map(), importCounts: new Map() }
    }

    const fileToImports = new Map<string, Set<string>>()
    const fileToDependents = new Map<string, Set<string>>()
    const importCounts = new Map<string, number>()

    // Initialize all nodes
    graphData.nodes.forEach(node => {
      fileToImports.set(node.id, new Set())
      fileToDependents.set(node.id, new Set())
      importCounts.set(node.id, node.import_count || node.imports || 0)
    })

    // Build relationships from edges
    // edge: source imports target (source -> target means source depends on target)
    graphData.edges.forEach(edge => {
      // source imports target
      fileToImports.get(edge.source)?.add(edge.target)
      // target has source as dependent
      fileToDependents.get(edge.target)?.add(edge.source)
    })

    return { fileToImports, fileToDependents, importCounts }
  }, [graphData])

  // Get all dependents (files that would break if this file changes)
  const getDependents = useCallback((fileId: string, maxDepth = Infinity): ImpactResult => {
    const directDependents: string[] = []
    const transitiveDependents: string[] = []
    const visited = new Set<string>()

    function traverse(currentId: string, depth: number) {
      if (visited.has(currentId) || depth > maxDepth) return
      visited.add(currentId)

      const dependents = fileToDependents.get(currentId)
      if (!dependents) return

      dependents.forEach(depId => {
        if (depId === fileId) return // skip self
        
        if (depth === 0) {
          if (!directDependents.includes(depId)) directDependents.push(depId)
        } else {
          if (!transitiveDependents.includes(depId) && !directDependents.includes(depId)) {
            transitiveDependents.push(depId)
          }
        }
        traverse(depId, depth + 1)
      })
    }

    traverse(fileId, 0)

    const allDependents = [...directDependents, ...transitiveDependents]
    const totalCount = allDependents.length
    const riskLevel = calculateRiskLevel(totalCount)

    // Entry point: has dependents but imports nothing (or very little)
    const imports = fileToImports.get(fileId)
    const isEntryPoint = totalCount > 0 && (imports?.size || 0) === 0

    return {
      directDependents,
      transitiveDependents,
      allDependents,
      riskLevel,
      riskScore: totalCount,
      isEntryPoint,
    }
  }, [fileToDependents, fileToImports])

  // Get imports (what this file depends on)
  const getImports = useCallback((fileId: string): string[] => {
    return Array.from(fileToImports.get(fileId) || [])
  }, [fileToImports])

  // Calculate metrics for all files
  const fileMetrics = useMemo((): FileMetrics[] => {
    if (!graphData) return []

    return graphData.nodes.map(node => {
      const dependents = fileToDependents.get(node.id)
      const imports = fileToImports.get(node.id)
      const dependentCount = dependents?.size || 0
      const importCount = imports?.size || 0
      
      // Importance = dependents weigh more (files that break things are more important)
      const importance = dependentCount * 2 + importCount

      return {
        id: node.id,
        dependentCount,
        importCount,
        importance,
        isEntryPoint: dependentCount > 0 && importCount === 0,
        riskLevel: calculateRiskLevel(dependentCount),
      }
    }).sort((a, b) => b.importance - a.importance)
  }, [graphData, fileToDependents, fileToImports])

  // Get top N most important files
  const getTopFiles = useCallback((n: number): string[] => {
    return fileMetrics.slice(0, n).map(f => f.id)
  }, [fileMetrics])

  // Get entry points (files with dependents but no imports)
  const entryPoints = useMemo((): string[] => {
    return fileMetrics.filter(f => f.isEntryPoint).map(f => f.id)
  }, [fileMetrics])

  // Get metrics for a specific file
  const getFileMetrics = useCallback((fileId: string): FileMetrics | null => {
    return fileMetrics.find(f => f.id === fileId) || null
  }, [fileMetrics])

  return {
    getDependents,
    getImports,
    getTopFiles,
    getFileMetrics,
    fileMetrics,
    entryPoints,
    isReady: !!graphData,
  }
}

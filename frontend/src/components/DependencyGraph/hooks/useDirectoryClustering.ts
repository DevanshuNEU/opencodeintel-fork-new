import { useMemo, useCallback } from 'react'

export interface DirectoryCluster {
  path: string
  name: string
  files: string[]
  childDirs: string[]
  totalFiles: number
  totalDependents: number
  maxRisk: 'low' | 'medium' | 'high' | 'critical'
  isExpanded: boolean
}

interface ClusteringResult {
  clusters: Map<string, DirectoryCluster>
  rootDirs: string[]
  getClusterForFile: (fileId: string) => string
  toggleCluster: (dirPath: string) => void
}

// Extract directory path from file path
function getDirectoryPath(filePath: string): string {
  const parts = filePath.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

// Get parent directory
function getParentDir(dirPath: string): string | null {
  if (dirPath === '/' || dirPath === '') return null
  const parts = dirPath.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

// Calculate max risk from an array of risks
function getMaxRisk(risks: Array<'low' | 'medium' | 'high' | 'critical'>): 'low' | 'medium' | 'high' | 'critical' {
  const priority = { critical: 4, high: 3, medium: 2, low: 1 }
  return risks.reduce((max, risk) => priority[risk] > priority[max] ? risk : max, 'low' as const)
}

export function useDirectoryClustering(
  nodes: Array<{ id: string; riskLevel: 'low' | 'medium' | 'high' | 'critical'; dependentCount: number }>,
  expandedDirs: Set<string>,
  onToggleDir: (dirPath: string) => void
): ClusteringResult {
  
  const clusters = useMemo(() => {
    const clusterMap = new Map<string, DirectoryCluster>()
    
    // Group files by directory
    const dirFiles = new Map<string, string[]>()
    nodes.forEach(node => {
      const dirPath = getDirectoryPath(node.id)
      if (!dirFiles.has(dirPath)) {
        dirFiles.set(dirPath, [])
      }
      dirFiles.get(dirPath)!.push(node.id)
    })

    // Create clusters for each directory
    dirFiles.forEach((files, dirPath) => {
      const dirName = dirPath.split('/').pop() || dirPath
      const nodeData = files.map(f => nodes.find(n => n.id === f)!).filter(Boolean)
      
      clusterMap.set(dirPath, {
        path: dirPath,
        name: dirName,
        files,
        childDirs: [],
        totalFiles: files.length,
        totalDependents: nodeData.reduce((sum, n) => sum + n.dependentCount, 0),
        maxRisk: getMaxRisk(nodeData.map(n => n.riskLevel)),
        isExpanded: expandedDirs.has(dirPath),
      })
    })

    // Build directory hierarchy
    clusterMap.forEach((cluster, dirPath) => {
      const parentPath = getParentDir(dirPath)
      if (parentPath && clusterMap.has(parentPath)) {
        clusterMap.get(parentPath)!.childDirs.push(dirPath)
      }
    })

    return clusterMap
  }, [nodes, expandedDirs])

  const rootDirs = useMemo(() => {
    const roots: string[] = []
    clusters.forEach((cluster, dirPath) => {
      const parentPath = getParentDir(dirPath)
      if (!parentPath || !clusters.has(parentPath)) {
        roots.push(dirPath)
      }
    })
    return roots.sort()
  }, [clusters])

  const getClusterForFile = useCallback((fileId: string): string => {
    return getDirectoryPath(fileId)
  }, [])

  const toggleCluster = useCallback((dirPath: string) => {
    onToggleDir(dirPath)
  }, [onToggleDir])

  return {
    clusters,
    rootDirs,
    getClusterForFile,
    toggleCluster,
  }
}

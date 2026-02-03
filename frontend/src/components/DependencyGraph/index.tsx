import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import type { Node, Edge } from 'reactflow'
import dagre from 'dagre'
import { useTheme } from 'next-themes'
import { FileCode2, GitBranch, Navigation, AlertTriangle, FolderTree } from 'lucide-react'
import 'reactflow/dist/style.css'

import { useDependencyGraph } from '../../hooks/useCachedQuery'
import { DependencyGraphSkeleton } from '../ui/Skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useImpactAnalysis, type ImpactResult } from './hooks/useImpactAnalysis'
import { GraphNode, type GraphNodeData } from './GraphNode'
import { DirectoryNode, type DirectoryNodeData } from './DirectoryNode'
import { ImpactPanel } from './ImpactPanel'
import { GraphToolbar } from './GraphToolbar'

interface DependencyGraphProps {
  repoId: string
  apiUrl: string
  apiKey: string
}

const nodeTypes = { 
  custom: GraphNode,
  directory: DirectoryNode,
}

const LAYOUT_CONFIG = {
  rankdir: 'LR',
  ranksep: 100,
  nodesep: 60,
  nodeWidth: 200,
  nodeHeight: 70,
}

const DEFAULT_VISIBLE_COUNT = 15

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  // Guard: if no nodes, return empty
  if (nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: LAYOUT_CONFIG.rankdir,
    ranksep: LAYOUT_CONFIG.ranksep,
    nodesep: LAYOUT_CONFIG.nodesep,
  })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: LAYOUT_CONFIG.nodeWidth, 
      height: LAYOUT_CONFIG.nodeHeight 
    })
  })

  // Only add edges where both source and target exist in nodes
  const nodeIds = new Set(nodes.map(n => n.id))
  edges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target)
    }
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    // Guard: if dagre failed to position node, use fallback
    const x = nodeWithPosition?.x ?? 0
    const y = nodeWithPosition?.y ?? 0
    return {
      ...node,
      position: {
        x: x - LAYOUT_CONFIG.nodeWidth / 2,
        y: y - LAYOUT_CONFIG.nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

const getEdgeStyle = (state: 'default' | 'highlighted' | 'dimmed' | 'incoming' | 'outgoing', isDark: boolean) => {
  const styles = {
    default: { stroke: isDark ? '#52525b' : '#a1a1aa', strokeWidth: 1, opacity: 0.6 },
    highlighted: { stroke: '#6366f1', strokeWidth: 2, opacity: 1 },
    dimmed: { stroke: isDark ? '#27272a' : '#e4e4e7', strokeWidth: 1, opacity: 0.3 },
    incoming: { stroke: '#f43f5e', strokeWidth: 2, opacity: 1 },
    outgoing: { stroke: '#6366f1', strokeWidth: 2, opacity: 1 },
  }
  return styles[state]
}

// Get directory path from file path
function getDirPath(filePath: string): string {
  const parts = filePath.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

// Get max risk from array
function getMaxRisk(risks: Array<'low' | 'medium' | 'high' | 'critical'>): 'low' | 'medium' | 'high' | 'critical' {
  const priority = { critical: 4, high: 3, medium: 2, low: 1 }
  return risks.reduce((max, risk) => priority[risk] > priority[max] ? risk : max, 'low' as const)
}

function DependencyGraphInner({ repoId, apiUrl, apiKey }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [showTests, setShowTests] = useState(true)
  const [clusterByDir, setClusterByDir] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [rawGraphData, setRawGraphData] = useState<any>(null)
  const [renderKey, setRenderKey] = useState(0) // Force re-render key

  const { fitView } = useReactFlow()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const { data, isLoading } = useDependencyGraph({ repoId, apiKey })
  const impact = useImpactAnalysis(rawGraphData)

  useEffect(() => {
    if (data) setRawGraphData(data)
  }, [data])

  // Handle tab visibility changes - force re-render when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Force re-render by updating key
        setRenderKey(k => k + 1)
        // Also trigger fitView after a short delay
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 200 })
        }, 100)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fitView])

  const visibleNodeIds = useMemo(() => {
    if (!rawGraphData || !impact.isReady) return new Set<string>()

    let nodeIds: string[] = rawGraphData.nodes.map((n: any) => n.id)

    if (!showTests) {
      nodeIds = nodeIds.filter((id: string) => {
        const fileName = id.split('/').pop() || ''
        const pathLower = id.toLowerCase()
        // Filter out test files by filename pattern OR by being in tests/ directory
        const isTestFile = fileName.includes('.test.') || 
                          fileName.includes('_test.') || 
                          fileName.includes('.spec.') ||
                          fileName.startsWith('test_') ||
                          pathLower.includes('/tests/') ||
                          pathLower.startsWith('tests/')
        return !isTestFile
      })
    }

    if (!showAll) {
      const topFiles = impact.getTopFiles(DEFAULT_VISIBLE_COUNT)
      nodeIds = nodeIds.filter((id: string) => topFiles.includes(id))
    }

    return new Set(nodeIds)
  }, [rawGraphData, impact.isReady, impact.fileMetrics, showAll, showTests])

  const selectedImpact = useMemo((): ImpactResult | null => {
    if (!selectedNodeId || !impact.isReady) return null
    // For directory nodes, we don't show impact panel
    if (selectedNodeId.startsWith('dir:')) return null
    return impact.getDependents(selectedNodeId)
  }, [selectedNodeId, impact])

  // Build clustered graph data
  const clusteredData = useMemo(() => {
    if (!clusterByDir || !rawGraphData || !impact.isReady) return null

    // Group files by directory
    const dirFiles = new Map<string, string[]>()
    visibleNodeIds.forEach(fileId => {
      const dirPath = getDirPath(fileId)
      if (!dirFiles.has(dirPath)) dirFiles.set(dirPath, [])
      dirFiles.get(dirPath)!.push(fileId)
    })

    // Create directory nodes for collapsed dirs
    const dirNodes: Array<{ id: string; data: DirectoryNodeData }> = []
    const visibleFiles = new Set<string>()

    dirFiles.forEach((files, dirPath) => {
      const isExpanded = expandedDirs.has(dirPath)
      
      // Calculate metrics for this directory
      const metrics = files.map(f => impact.getFileMetrics(f)).filter(Boolean)
      const totalDeps = metrics.reduce((sum, m) => sum + (m?.dependentCount || 0), 0)
      const risks = metrics.map(m => m?.riskLevel || 'low') as Array<'low' | 'medium' | 'high' | 'critical'>
      
      // Always create directory node so user can collapse
      dirNodes.push({
        id: `dir:${dirPath}`,
        data: {
          label: dirPath.split('/').pop() || dirPath,
          fullPath: dirPath,
          fileCount: files.length,
          totalDependents: totalDeps,
          maxRisk: getMaxRisk(risks),
          isExpanded,
          state: 'default',
        }
      })
      
      // When expanded, also show individual files
      if (isExpanded) {
        files.forEach(f => visibleFiles.add(f))
      }
    })

    // Build edges between dirs or files
    const edgeSet = new Set<string>()
    rawGraphData.edges.forEach((edge: any) => {
      const sourceVisible = visibleFiles.has(edge.source)
      const targetVisible = visibleFiles.has(edge.target)
      const sourceDirId = `dir:${getDirPath(edge.source)}`
      const targetDirId = `dir:${getDirPath(edge.target)}`

      let source = sourceVisible ? edge.source : (visibleNodeIds.has(edge.source) ? sourceDirId : null)
      let target = targetVisible ? edge.target : (visibleNodeIds.has(edge.target) ? targetDirId : null)

      if (source && target && source !== target) {
        edgeSet.add(`${source}|${target}`)
      }
    })

    return { dirNodes, visibleFiles, edges: Array.from(edgeSet).map(e => e.split('|')) }
  }, [clusterByDir, rawGraphData, impact.isReady, visibleNodeIds, expandedDirs])

  useEffect(() => {
    if (!rawGraphData || !impact.isReady) return

    let flowNodes: Node[] = []
    let flowEdges: Edge[] = []

    // Only use cluster mode if we have clustered data ready
    const useClusterMode = clusterByDir && clusteredData && clusteredData.dirNodes.length > 0

    if (useClusterMode) {
      // Safety: only apply selection highlighting if the selected node is actually visible
      const effectiveSelectedIdCluster = selectedNodeId && 
        (clusteredData!.visibleFiles.has(selectedNodeId) || selectedNodeId.startsWith('dir:')) 
        ? selectedNodeId : null
      
      // Add directory nodes
      clusteredData!.dirNodes.forEach(dir => {
        flowNodes.push({
          id: dir.id,
          type: 'directory',
          data: dir.data,
          position: { x: 0, y: 0 },
        })
      })

      // Add visible file nodes
      rawGraphData.nodes
        .filter((node: any) => clusteredData!.visibleFiles.has(node.id))
        .forEach((node: any) => {
          const fileName = node.label || node.id.split('/').pop()
          const metrics = impact.getFileMetrics(node.id)
          
          // Simplified state - only highlight, don't dim
          let state: GraphNodeData['state'] = 'default'
          if (effectiveSelectedIdCluster === node.id) state = 'selected'
          else if (selectedImpact?.directDependents.includes(node.id)) state = 'direct'
          else if (selectedImpact?.transitiveDependents.includes(node.id)) state = 'transitive'
          // Don't dim - keep as default

          flowNodes.push({
            id: node.id,
            type: 'custom',
            data: {
              label: fileName,
              fullPath: node.id,
              language: node.language || 'unknown',
              dependentCount: metrics?.dependentCount || 0,
              importCount: metrics?.importCount || 0,
              riskLevel: metrics?.riskLevel || 'low',
              isEntryPoint: metrics?.isEntryPoint || false,
              state,
            },
            position: { x: 0, y: 0 },
          })
        })

      // Add edges
      clusteredData!.edges.forEach(([source, target]) => {
        flowEdges.push({
          id: `${source}-${target}`,
          source,
          target,
          style: getEdgeStyle('default', isDark),
        })
      })
    } else {
      // Non-clustered mode (original logic)
      // Safety: only apply selection highlighting if the selected node is actually visible
      const effectiveSelectedId = selectedNodeId && visibleNodeIds.has(selectedNodeId) ? selectedNodeId : null
      
      flowNodes = rawGraphData.nodes
        .filter((node: any) => visibleNodeIds.has(node.id))
        .map((node: any) => {
          const fileName = node.label || node.id.split('/').pop()
          const metrics = impact.getFileMetrics(node.id)
          
          // Simplified state - only highlight selected and dependents, don't dim others
          let state: GraphNodeData['state'] = 'default'
          if (effectiveSelectedId) {
            if (node.id === effectiveSelectedId) state = 'selected'
            else if (selectedImpact?.directDependents.includes(node.id)) state = 'direct'
            else if (selectedImpact?.transitiveDependents.includes(node.id)) state = 'transitive'
            // Don't dim - keep as default for visibility
          }

          return {
            id: node.id,
            type: 'custom',
            data: {
              label: fileName,
              fullPath: node.id,
              language: node.language || 'unknown',
              dependentCount: metrics?.dependentCount || 0,
              importCount: metrics?.importCount || 0,
              riskLevel: metrics?.riskLevel || 'low',
              isEntryPoint: metrics?.isEntryPoint || false,
              state,
            },
            position: { x: 0, y: 0 },
          }
        })

      flowEdges = rawGraphData.edges
        .filter((edge: any) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .map((edge: any) => {
          // Simplified - only highlight connected edges, don't dim others
          let edgeState: 'default' | 'highlighted' | 'dimmed' | 'incoming' | 'outgoing' = 'default'
          if (effectiveSelectedId) {
            if (edge.source === effectiveSelectedId) edgeState = 'outgoing'
            else if (edge.target === effectiveSelectedId) edgeState = 'incoming'
            // Don't dim - keep as default
          }

          return {
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            style: getEdgeStyle(edgeState, isDark),
            animated: edgeState === 'incoming',
          }
        })
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [rawGraphData, impact.isReady, visibleNodeIds, selectedNodeId, selectedImpact, hoveredFileId, isDark, clusterByDir, clusteredData])

  // Fit view when nodes change or panel opens/closes
  useEffect(() => {
    if (nodes.length > 0) {
      const minZoom = nodes.length > 20 ? 0.5 : 0.3
      // Delay to allow container resize when panel opens/closes
      setTimeout(() => fitView({ padding: 0.2, duration: 300, minZoom }), 150)
    }
  }, [nodes.length, selectedNodeId, showAll, showTests, clusterByDir, expandedDirs, fitView])

  const handleNodeClick = useCallback((_: any, node: Node) => {
    // Toggle directory expansion
    if (node.id.startsWith('dir:')) {
      const dirPath = node.id.replace('dir:', '')
      setExpandedDirs(prev => {
        const next = new Set(prev)
        if (next.has(dirPath)) next.delete(dirPath)
        else next.add(dirPath)
        return next
      })
      return
    }
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handlePanelFileClick = useCallback((fileId: string) => {
    // Only select if the file is currently visible in the graph
    // Otherwise clicking on a non-visible dependent breaks the view
    if (!visibleNodeIds.has(fileId)) {
      // If not visible, enable "show all" to make it visible first
      if (!showAll) {
        setShowAll(true)
        // Small delay to let the nodes render, then select
        setTimeout(() => {
          setSelectedNodeId(fileId)
        }, 100)
        return
      }
    }
    
    setSelectedNodeId(fileId)
    const node = nodes.find(n => n.id === fileId)
    if (node) {
      fitView({ nodes: [node], padding: 0.5, duration: 300 })
    }
  }, [nodes, fitView, visibleNodeIds, showAll])

  const handleResetView = useCallback(() => {
    setSelectedNodeId(null)
    setExpandedDirs(new Set())
    const minZoom = nodes.length > 20 ? 0.5 : 0.3
    fitView({ padding: 0.2, duration: 300, minZoom })
  }, [fitView, nodes.length])

  if (isLoading) {
    return <DependencyGraphSkeleton />
  }

  const selectedNode = rawGraphData?.nodes.find((n: any) => n.id === selectedNodeId)
  const selectedFileName = selectedNode?.label || selectedNodeId?.split('/').pop() || ''
  const criticalCount = impact.fileMetrics.filter(f => f.riskLevel === 'critical' || f.riskLevel === 'high').length
  const dirCount = clusterByDir && clusteredData ? clusteredData.dirNodes.length : 0

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <FileCode2 className="w-3.5 h-3.5" />
              Total Files
            </div>
            <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              {rawGraphData?.nodes?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <GitBranch className="w-3.5 h-3.5" />
              Dependencies
            </div>
            <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              {rawGraphData?.edges?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              {clusterByDir ? <FolderTree className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />}
              {clusterByDir ? 'Directories' : 'Entry Points'}
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {clusterByDir ? dirCount : impact.entryPoints.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Critical Files
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {criticalCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <GraphToolbar
        totalFiles={rawGraphData?.nodes?.length || 0}
        visibleFiles={visibleNodeIds.size}
        showAll={showAll}
        showTests={showTests}
        clusterByDir={clusterByDir}
        onToggleShowAll={() => setShowAll(prev => !prev)}
        onToggleTests={() => setShowTests(prev => !prev)}
        onToggleCluster={() => {
          setClusterByDir(prev => !prev)
          setExpandedDirs(new Set())
        }}
        onResetView={handleResetView}
      />

      <div className="flex overflow-hidden" style={{ height: '600px' }}>
        <div className="relative" style={{ flex: 1, height: '600px' }}>
          <ReactFlow
            key={renderKey}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            proOptions={{ hideAttribution: true }}
            panOnScroll
            selectionOnDrag
            panOnDrag={[1, 2]}
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            snapToGrid={false}
          >
            <Background color={isDark ? '#27272a' : '#d4d4d8'} gap={20} size={1} />
            <Controls 
              className="!bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-800 !rounded-lg [&>button]:!bg-white dark:[&>button]:!bg-zinc-900 [&>button]:!border-zinc-200 dark:[&>button]:!border-zinc-700 [&>button]:!text-zinc-600 dark:[&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-100 dark:[&>button:hover]:!bg-zinc-800" 
              showMiniMap={false}
            />
          </ReactFlow>

          {/* Legend - positioned bottom-right to avoid Controls overlap */}
          <Card className="absolute bottom-4 right-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm z-10 min-w-[180px]">
            <CardContent className="px-4 py-3 text-xs">
              <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">Legend</div>
              <div className="space-y-1.5">
                {clusterByDir && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-zinc-100 border-2 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700" />
                    <span className="text-zinc-500 dark:text-zinc-400">Directory (click to expand)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-indigo-500 bg-white dark:bg-zinc-900" />
                  <span className="text-zinc-500 dark:text-zinc-400">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-rose-500 bg-white dark:bg-zinc-900" />
                  <span className="text-zinc-500 dark:text-zinc-400">Direct dependent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-amber-500 bg-white dark:bg-zinc-900" />
                  <span className="text-zinc-500 dark:text-zinc-400">Transitive dependent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-l-4 border-l-emerald-500 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                  <span className="text-zinc-500 dark:text-zinc-400">Entry point</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500">
                {clusterByDir ? 'Click folder to expand' : 'Click node to analyze impact'}
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedNodeId && selectedImpact && !selectedNodeId.startsWith('dir:') && (
          <ImpactPanel
            fileName={selectedFileName}
            fullPath={selectedNodeId}
            impact={selectedImpact}
            onClose={() => setSelectedNodeId(null)}
            onFileClick={handlePanelFileClick}
            onFileHover={setHoveredFileId}
          />
        )}
      </div>
    </div>
  )
}

export function DependencyGraph(props: DependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner {...props} />
    </ReactFlowProvider>
  )
}

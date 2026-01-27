import { useEffect, useState, useCallback, useMemo } from 'react'
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
import 'reactflow/dist/style.css'

import { useDependencyGraph } from '../../hooks/useCachedQuery'
import { DependencyGraphSkeleton } from '../ui/Skeleton'
import { useImpactAnalysis, type ImpactResult } from './hooks/useImpactAnalysis'
import { GraphNode, type GraphNodeData } from './GraphNode'
import { ImpactPanel } from './ImpactPanel'
import { GraphToolbar } from './GraphToolbar'

interface DependencyGraphProps {
  repoId: string
  apiUrl: string
  apiKey: string
}

const nodeTypes = { custom: GraphNode }

const LAYOUT_CONFIG = {
  rankdir: 'LR',
  ranksep: 100,
  nodesep: 60,
  nodeWidth: 200,
  nodeHeight: 70,
}

const DEFAULT_VISIBLE_COUNT = 15

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
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

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - LAYOUT_CONFIG.nodeWidth / 2,
        y: nodeWithPosition.y - LAYOUT_CONFIG.nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Theme-aware edge styles
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

function DependencyGraphInner({ repoId, apiUrl, apiKey }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [showTests, setShowTests] = useState(true)
  const [rawGraphData, setRawGraphData] = useState<any>(null)

  const { fitView } = useReactFlow()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const { data, isLoading } = useDependencyGraph({ repoId, apiKey })

  const impact = useImpactAnalysis(rawGraphData)

  useEffect(() => {
    if (data) setRawGraphData(data)
  }, [data])

  const visibleNodeIds = useMemo(() => {
    if (!rawGraphData || !impact.isReady) return new Set<string>()

    let nodeIds: string[] = rawGraphData.nodes.map((n: any) => n.id)

    if (!showTests) {
      nodeIds = nodeIds.filter((id: string) => {
        const fileName = id.split('/').pop() || ''
        return !fileName.includes('.test.') && !fileName.includes('_test.') && !fileName.includes('.spec.')
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
    return impact.getDependents(selectedNodeId)
  }, [selectedNodeId, impact])

  useEffect(() => {
    if (!rawGraphData || !impact.isReady) return

    const flowNodes: Node<GraphNodeData>[] = rawGraphData.nodes
      .filter((node: any) => visibleNodeIds.has(node.id))
      .map((node: any) => {
        const fileName = node.label || node.id.split('/').pop()
        const metrics = impact.getFileMetrics(node.id)
        
        let state: GraphNodeData['state'] = 'default'
        if (selectedNodeId) {
          if (node.id === selectedNodeId) {
            state = 'selected'
          } else if (selectedImpact?.directDependents.includes(node.id)) {
            state = 'direct'
          } else if (selectedImpact?.transitiveDependents.includes(node.id)) {
            state = 'transitive'
          } else {
            state = 'dimmed'
          }
        }

        if (hoveredFileId === node.id && state === 'dimmed') {
          state = 'direct'
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

    const flowEdges: Edge[] = rawGraphData.edges
      .filter((edge: any) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge: any) => {
        let edgeState: 'default' | 'highlighted' | 'dimmed' | 'incoming' | 'outgoing' = 'default'
        if (selectedNodeId) {
          if (edge.source === selectedNodeId) {
            edgeState = 'outgoing'
          } else if (edge.target === selectedNodeId) {
            edgeState = 'incoming'
          } else {
            edgeState = 'dimmed'
          }
        }

        return {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          style: getEdgeStyle(edgeState, isDark),
          animated: edgeState === 'incoming',
        }
      })

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [rawGraphData, impact.isReady, visibleNodeIds, selectedNodeId, selectedImpact, hoveredFileId, isDark])

  useEffect(() => {
    if (nodes.length > 0) {
      const minZoom = nodes.length > 20 ? 0.5 : 0.3
      setTimeout(() => fitView({ padding: 0.2, duration: 300, minZoom }), 100)
    }
  }, [showAll, showTests])

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handlePanelFileClick = useCallback((fileId: string) => {
    setSelectedNodeId(fileId)
    const node = nodes.find(n => n.id === fileId)
    if (node) {
      fitView({ nodes: [node], padding: 0.5, duration: 300 })
    }
  }, [nodes, fitView])

  const handleResetView = useCallback(() => {
    setSelectedNodeId(null)
    const minZoom = nodes.length > 20 ? 0.5 : 0.3
    fitView({ padding: 0.2, duration: 300, minZoom })
  }, [fitView, nodes.length])

  if (isLoading) {
    return <DependencyGraphSkeleton />
  }

  const selectedNode = rawGraphData?.nodes.find((n: any) => n.id === selectedNodeId)
  const selectedFileName = selectedNode?.label || selectedNodeId?.split('/').pop() || ''

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Files</div>
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{rawGraphData?.nodes?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Dependencies</div>
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{rawGraphData?.edges?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Entry Points</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{impact.entryPoints.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Critical Files</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {impact.fileMetrics.filter(f => f.riskLevel === 'critical' || f.riskLevel === 'high').length}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <GraphToolbar
        totalFiles={rawGraphData?.nodes?.length || 0}
        visibleFiles={visibleNodeIds.size}
        showAll={showAll}
        showTests={showTests}
        onToggleShowAll={() => setShowAll(prev => !prev)}
        onToggleTests={() => setShowTests(prev => !prev)}
        onResetView={handleResetView}
      />

      {/* Graph + Panel */}
      <div className="flex overflow-hidden" style={{ height: '600px' }}>
        <div style={{ flex: 1, height: '600px' }}>
          <ReactFlow
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
          >
            <Background 
              color={isDark ? '#27272a' : '#d4d4d8'} 
              gap={20} 
              size={1} 
            />
            <Controls 
              className="!bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-800 !rounded-lg [&>button]:!bg-white dark:[&>button]:!bg-zinc-900 [&>button]:!border-zinc-200 dark:[&>button]:!border-zinc-700 [&>button]:!text-zinc-600 dark:[&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-100 dark:[&>button:hover]:!bg-zinc-800" 
              showMiniMap={false}
            />
          </ReactFlow>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-xs backdrop-blur-sm">
            <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">Legend</div>
            <div className="space-y-1.5">
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
              Click node to analyze impact
            </div>
          </div>
        </div>

        {selectedNodeId && selectedImpact && (
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

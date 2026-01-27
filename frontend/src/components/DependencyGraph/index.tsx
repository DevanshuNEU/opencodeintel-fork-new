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

// Register custom node type
const nodeTypes = { custom: GraphNode }

// Layout configuration
const LAYOUT_CONFIG = {
  rankdir: 'LR', // Left-to-right for import flow
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

// Edge styles based on state
const getEdgeStyle = (state: 'default' | 'highlighted' | 'dimmed' | 'incoming' | 'outgoing') => {
  const styles = {
    default: { stroke: '#3f3f46', strokeWidth: 1, opacity: 0.6 },
    highlighted: { stroke: '#6366f1', strokeWidth: 2, opacity: 1 },
    dimmed: { stroke: '#27272a', strokeWidth: 1, opacity: 0.2 },
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
  const { data, isLoading } = useDependencyGraph({ repoId, apiKey })

  // Initialize impact analysis
  const impact = useImpactAnalysis(rawGraphData)

  // Store raw graph data
  useEffect(() => {
    if (data) {
      setRawGraphData(data)
    }
  }, [data])

  // Build filtered & visible nodes
  const visibleNodeIds = useMemo(() => {
    if (!rawGraphData || !impact.isReady) return new Set<string>()

    let nodeIds: string[] = rawGraphData.nodes.map((n: any) => n.id)

    // Filter out tests if disabled
    if (!showTests) {
      nodeIds = nodeIds.filter((id: string) => {
        const fileName = id.split('/').pop() || ''
        return !fileName.includes('.test.') && !fileName.includes('_test.') && !fileName.includes('.spec.')
      })
    }

    // Limit to top N unless showAll
    if (!showAll) {
      const topFiles = impact.getTopFiles(DEFAULT_VISIBLE_COUNT)
      nodeIds = nodeIds.filter((id: string) => topFiles.includes(id))
    }

    return new Set(nodeIds)
  }, [rawGraphData, impact.isReady, impact.fileMetrics, showAll, showTests])

  // Get impact result for selected node
  const selectedImpact = useMemo((): ImpactResult | null => {
    if (!selectedNodeId || !impact.isReady) return null
    return impact.getDependents(selectedNodeId)
  }, [selectedNodeId, impact])

  // Build and layout graph when data or filters change
  useEffect(() => {
    if (!rawGraphData || !impact.isReady) return

    const flowNodes: Node<GraphNodeData>[] = rawGraphData.nodes
      .filter((node: any) => visibleNodeIds.has(node.id))
      .map((node: any) => {
        const fileName = node.label || node.id.split('/').pop()
        const metrics = impact.getFileMetrics(node.id)
        
        // Determine node state based on selection
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

        // Highlight on hover from panel
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
        // Determine edge state
        let edgeState: 'default' | 'highlighted' | 'dimmed' | 'incoming' | 'outgoing' = 'default'
        if (selectedNodeId) {
          if (edge.source === selectedNodeId) {
            edgeState = 'outgoing' // selected node imports this
          } else if (edge.target === selectedNodeId) {
            edgeState = 'incoming' // this file depends on selected
          } else {
            edgeState = 'dimmed'
          }
        }

        return {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          style: getEdgeStyle(edgeState),
          animated: edgeState === 'incoming',
        }
      })

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [rawGraphData, impact.isReady, visibleNodeIds, selectedNodeId, selectedImpact, hoveredFileId])

  // Fit view when nodes change significantly
  useEffect(() => {
    if (nodes.length > 0) {
      // Don't zoom out too much for large graphs
      const minZoom = nodes.length > 20 ? 0.5 : 0.3
      setTimeout(() => fitView({ padding: 0.2, duration: 300, minZoom }), 100)
    }
  }, [showAll, showTests])

  // Handlers
  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handlePanelFileClick = useCallback((fileId: string) => {
    setSelectedNodeId(fileId)
    // Pan to node
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
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-800">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Files</div>
          <div className="text-2xl font-bold text-zinc-100">{rawGraphData?.nodes?.length || 0}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Dependencies</div>
          <div className="text-2xl font-bold text-zinc-100">{rawGraphData?.edges?.length || 0}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Entry Points</div>
          <div className="text-2xl font-bold text-emerald-400">{impact.entryPoints.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-1">Critical Files</div>
          <div className="text-2xl font-bold text-rose-400">
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
        {/* Graph Canvas */}
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
            defaultEdgeOptions={{
              type: 'smoothstep',
            }}
          >
            <Background color="#27272a" gap={20} size={1} />
            <Controls 
              className="!bg-zinc-900 !border-zinc-800 !rounded-lg [&>button]:!bg-zinc-900 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800" 
              showMiniMap={false}
            />
          </ReactFlow>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-zinc-900/90 border border-zinc-800 rounded-lg px-4 py-3 text-xs backdrop-blur-sm">
            <div className="font-medium text-zinc-300 mb-2">Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-indigo-500 bg-zinc-900" />
                <span className="text-zinc-400">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-rose-500 bg-zinc-900" />
                <span className="text-zinc-400">Direct dependent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-amber-500 bg-zinc-900" />
                <span className="text-zinc-400">Transitive dependent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-l-4 border-l-emerald-500 border border-zinc-700 bg-zinc-900" />
                <span className="text-zinc-400">Entry point</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800 text-zinc-500">
              Click node to analyze impact
            </div>
          </div>
        </div>

        {/* Impact Panel */}
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

// Wrapper with ReactFlowProvider
export function DependencyGraph(props: DependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner {...props} />
    </ReactFlowProvider>
  )
}

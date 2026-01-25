import { useEffect, useState, useCallback } from 'react'
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  MiniMap,
} from 'reactflow'
import type { Node, Edge } from 'reactflow'
import dagre from 'dagre'
import { Lightbulb } from 'lucide-react'
import 'reactflow/dist/style.css'
import { useDependencyGraph } from '../hooks/useCachedQuery'
import { DependencyGraphSkeleton } from './ui/Skeleton'

interface DependencyGraphProps {
  repoId: string
  apiUrl: string
  apiKey: string
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 60 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.position = {
      x: nodeWithPosition.x - 90,
      y: nodeWithPosition.y - 30,
    }
  })

  return { nodes, edges }
}

export function DependencyGraph({ repoId, apiUrl, apiKey }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [metrics, setMetrics] = useState<any>(null)
  const [filterCritical, setFilterCritical] = useState(false)
  const [minDeps, setMinDeps] = useState(0)
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null)
  const [allNodes, setAllNodes] = useState<Node[]>([])
  const [allEdges, setAllEdges] = useState<Edge[]>([])

  const { data, isLoading: loading, isFetching } = useDependencyGraph({ repoId, apiKey })

  useEffect(() => {
    if (data) processGraphData(data)
  }, [data])

  useEffect(() => {
    if (allNodes.length > 0) applyFilters()
  }, [filterCritical, minDeps, allNodes, allEdges])

  const applyFilters = () => {
    let filteredNodes = [...allNodes]
    let filteredEdges = [...allEdges]

    if (filterCritical || minDeps > 0) {
      const threshold = minDeps || 3
      filteredNodes = allNodes.filter((node: any) => 
        (node.data.imports || 0) >= threshold || allEdges.some(e => e.target === node.id)
      )
      const nodeIds = new Set(filteredNodes.map(n => n.id))
      filteredEdges = allEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(filteredNodes, filteredEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }

  const processGraphData = (data: any) => {
    const flowNodes: Node[] = data.nodes.map((node: any) => {
      const fileName = node.label || node.id.split('/').pop()
      const fullPath = node.id
      const importCount = node.import_count || node.imports || 0
      
      return {
        id: node.id,
        type: 'default',
        data: { 
          label: (
            <div title={fullPath} style={{ cursor: 'pointer' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: '4px' }}>{fileName}</div>
              {importCount > 0 && <div style={{ fontSize: '9px', opacity: 0.8 }}>{importCount} imports</div>}
            </div>
          ),
          language: node.language,
          imports: importCount
        },
        position: { x: 0, y: 0 },
        style: {
          background: getLanguageColor(node.language),
          color: 'white',
          border: '2px solid hsl(var(--primary))',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          fontFamily: 'monospace',
          width: 180,
          height: 60
        }
      }
    })
    
    const flowEdges: Edge[] = data.edges.map((edge: any) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      animated: false,
      style: { stroke: '#6b7280', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    }))
    
    setAllNodes(flowNodes)
    setAllEdges(flowEdges)
    setMetrics(data.metrics)
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }

  const handleNodeClick = useCallback((event: any, node: Node) => {
    setHighlightedNode(node.id)
    const connectedNodeIds = new Set<string>([node.id])
    allEdges.forEach(edge => {
      if (edge.source === node.id) connectedNodeIds.add(edge.target)
      if (edge.target === node.id) connectedNodeIds.add(edge.source)
    })
    
    setNodes(nodes => nodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: connectedNodeIds.has(n.id) ? 1 : 0.3,
        border: n.id === node.id ? '3px solid #ef4444' : n.style?.border
      }
    })))
    
    setEdges(edges => edges.map(e => ({
      ...e,
      style: {
        ...e.style,
        opacity: e.source === node.id || e.target === node.id ? 1 : 0.1,
        strokeWidth: e.source === node.id || e.target === node.id ? 2.5 : 1.5
      }
    })))
  }, [allEdges])

  const resetHighlight = () => {
    setHighlightedNode(null)
    setNodes(nodes => nodes.map(n => ({ ...n, style: { ...n.style, opacity: 1, border: '2px solid hsl(var(--primary))' } })))
    setEdges(edges => edges.map(e => ({ ...e, style: { ...e.style, opacity: 1, strokeWidth: 1.5 } })))
  }

  const getLanguageColor = (language: string) => {
    const colors: any = { 'python': '#3776ab', 'javascript': '#f7df1e', 'typescript': '#3178c6', 'unknown': '#6b7280' }
    return colors[language] || colors.unknown
  }

  if (loading) {
    return <DependencyGraphSkeleton />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Total Files</div>
          <div className="text-3xl font-bold text-primary">{allNodes.length}</div>
        </div>
        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Dependencies</div>
          <div className="text-3xl font-bold text-primary">{edges.length}</div>
        </div>
        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Avg per File</div>
          <div className="text-3xl font-bold text-primary">{metrics?.avg_dependencies?.toFixed(1) || 0}</div>
        </div>
        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Showing</div>
          <div className="text-3xl font-bold text-primary">{nodes.length}</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-muted border border-border rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterCritical}
              onChange={(e) => setFilterCritical(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <span className="text-sm text-foreground">Show only critical files (≥3 deps)</span>
          </label>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-foreground">Min dependencies:</label>
            <input type="range" min="0" max="10" value={minDeps} onChange={(e) => setMinDeps(Number(e.target.value))} className="w-32 accent-primary" />
            <span className="text-sm font-mono text-foreground">{minDeps}</span>
          </div>

          {highlightedNode && (
            <button onClick={resetHighlight} className="text-sm px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 border border-destructive/20 transition-colors">
              Clear highlight
            </button>
          )}
        </div>
      </div>

      {/* Most Critical Files */}
      {metrics?.most_critical_files && metrics.most_critical_files.length > 0 && (
        <div className="bg-muted border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Most Critical Files</h3>
          <div className="space-y-2">
            {metrics.most_critical_files.slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="font-mono text-foreground truncate flex-1">{item.file.split('/').slice(-2).join('/')}</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded">{item.dependents} dependents</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph Visualization */}
      <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ height: '700px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={resetHighlight}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="hsl(var(--muted-foreground) / 0.2)" gap={16} />
          <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted" />
          <MiniMap 
            nodeColor={(node) => (node.style as any)?.background || '#6b7280'}
            maskColor="rgba(0, 0, 0, 0.5)"
            className="!bg-card !border-border"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="bg-muted border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 text-foreground">Graph Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#3776ab' }} />
            <span className="text-muted-foreground">Python</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#3178c6' }} />
            <span className="text-muted-foreground">TypeScript</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: '#f7df1e' }} />
            <span className="text-muted-foreground">JavaScript</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-primary" />
            <span className="text-muted-foreground">Dependency</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-primary" />
          <span>Click any node to highlight its dependencies • Drag to pan • Scroll to zoom</span>
        </div>
      </div>
    </div>
  )
}

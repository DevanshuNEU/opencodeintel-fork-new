// Sigma.js WebGL graph view
// Highlight state: "pinned" (from click/search) vs "hovered" (from mouseover)
// Pinned persists until user clicks stage or closes panel. Hover is transient.

import { useState, useEffect } from 'react'
import {
  SigmaContainer,
  useSigma,
  useRegisterEvents,
  useLoadGraph,
} from '@react-sigma/core'
import '@react-sigma/core/lib/style.css'

import { useGraphData } from './useGraphData'
import { NodeTooltip } from './NodeTooltip'
import { SearchBar } from './SearchBar'
import { GraphControls } from './GraphControls'
import type { DependencyApiResponse } from '../types'
import type Graph from 'graphology'

interface GraphViewProps {
  data: DependencyApiResponse
  onSelectFile?: (filePath: string) => void
}

const SIGMA_SETTINGS = {
  defaultNodeColor: '#6366f1',
  defaultEdgeColor: 'rgba(75, 85, 99, 0.12)',
  defaultEdgeType: 'arrow' as const,
  edgeReducer: null as any,
  nodeReducer: null as any,
  renderEdgeLabels: false,
  labelFont: 'Inter, system-ui, sans-serif',
  labelSize: 11,
  labelWeight: '500',
  labelColor: { color: '#d1d5db' },
  labelRenderedSizeThreshold: 12,
  labelDensity: 0.12,
  zIndex: true,
  minCameraRatio: 0.03,
  maxCameraRatio: 3,
  stagePadding: 30,
  defaultNodeBorderSize: 1,
  defaultNodeBorderColor: 'rgba(255, 255, 255, 0.06)',
  hideEdgesOnMove: true,
}

function LoadAndDisplay({ graph }: { graph: Graph }) {
  const loadGraph = useLoadGraph()
  const sigma = useSigma()

  useEffect(() => {
    loadGraph(graph)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sigma.getCamera().animatedReset({ duration: 400 })
      })
    })
  }, [graph, loadGraph, sigma])

  return null
}

// Builds the neighbor set for a given node, used by the reducer
function getNeighborSet(sigma: ReturnType<typeof useSigma>, nodeId: string): Set<string> | null {
  const graph = sigma.getGraph()
  if (!graph.hasNode(nodeId)) return null
  const neighbors = new Set(graph.neighbors(nodeId))
  neighbors.add(nodeId)
  return neighbors
}

function Interactions({
  onSelectFile,
  pinnedNode,
  setPinnedNode,
}: {
  onSelectFile?: (filePath: string) => void
  pinnedNode: string | null
  setPinnedNode: (node: string | null) => void
}) {
  const sigma = useSigma()
  const registerEvents = useRegisterEvents()
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    nodeId: string
    position: { x: number; y: number }
  } | null>(null)

  useEffect(() => {
    registerEvents({
      enterNode: ({ node, event }) => {
        setHoveredNode(node)
        setTooltip({ nodeId: node, position: { x: event.x, y: event.y } })
        const el = sigma.getContainer()
        if (el) el.style.cursor = 'pointer'
      },
      leaveNode: () => {
        setHoveredNode(null)
        setTooltip(null)
        const el = sigma.getContainer()
        if (el) el.style.cursor = 'default'
      },
      clickNode: ({ node }) => {
        // pin this node and open impact panel
        setPinnedNode(node)
        onSelectFile?.(node)
      },
      doubleClickNode: ({ node }) => {
        // zoom to node using graphToViewport + camera offset calculation
        const graph = sigma.getGraph()
        if (!graph.hasNode(node)) return
        const attrs = graph.getNodeAttributes(node)
        const camera = sigma.getCamera()
        const { width, height } = sigma.getDimensions()
        const currentState = camera.getState()
        const viewPos = sigma.graphToViewport({ x: attrs.x as number, y: attrs.y as number })
        const dx = viewPos.x - width / 2
        const dy = viewPos.y - height / 2
        camera.animate(
          {
            x: currentState.x + (dx / width) * currentState.ratio,
            y: currentState.y + (dy / height) * currentState.ratio,
            ratio: 0.12,
          },
          { duration: 400 }
        )
      },
      clickStage: () => {
        // clear pinned state when clicking empty space
        setPinnedNode(null)
        onSelectFile?.(undefined as any)
      },
    })
  }, [registerEvents, sigma, onSelectFile, setPinnedNode])

  // the active node is: hovered takes priority for visual, but pinned persists
  const activeNode = hoveredNode || pinnedNode

  useEffect(() => {
    if (!activeNode) {
      sigma.setSetting('nodeReducer', null)
      sigma.setSetting('edgeReducer', null)
      return
    }

    const neighbors = getNeighborSet(sigma, activeNode)
    if (!neighbors) {
      sigma.setSetting('nodeReducer', null)
      sigma.setSetting('edgeReducer', null)
      return
    }

    sigma.setSetting('nodeReducer', (node, data) => {
      if (neighbors.has(node)) {
        return {
          ...data,
          zIndex: 1,
          label: data.label,
          borderSize: node === activeNode ? 3 : 1,
          borderColor: node === activeNode ? '#ffffff' : 'rgba(255,255,255,0.15)',
        }
      }
      return { ...data, color: 'rgba(31, 41, 55, 0.25)', label: '', zIndex: 0, borderSize: 0 }
    })

    sigma.setSetting('edgeReducer', (edge, data) => {
      const graph = sigma.getGraph()
      const src = graph.source(edge)
      const tgt = graph.target(edge)
      if (neighbors.has(src) && neighbors.has(tgt)) {
        return { ...data, color: 'rgba(99, 102, 241, 0.5)', size: 1.5 }
      }
      return { ...data, hidden: true }
    })
  }, [activeNode, sigma])

  const tooltipData = (() => {
    if (!tooltip) return null
    const graph = sigma.getGraph()
    if (!graph.hasNode(tooltip.nodeId)) return null
    const a = graph.getNodeAttributes(tooltip.nodeId)
    return {
      nodeId: tooltip.nodeId,
      label: (a.label as string) || tooltip.nodeId,
      directory: (a.directory as string) || '',
      imports: (a.imports as number) || 0,
      dependents: (a.dependents as number) || 0,
      riskLevel: (a.riskLevel as string) || 'low',
      position: tooltip.position,
    }
  })()

  return tooltipData ? <NodeTooltip {...tooltipData} /> : null
}

export function GraphView({ data, onSelectFile }: GraphViewProps) {
  const graph = useGraphData(data)
  const [pinnedNode, setPinnedNode] = useState<string | null>(null)

  if (!graph || graph.order === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        No graph data available
      </div>
    )
  }

  return (
    <div className="relative h-[700px] rounded-lg overflow-hidden border border-zinc-800">
      <SigmaContainer
        style={{ height: '100%', width: '100%', background: '#09090b' }}
        settings={SIGMA_SETTINGS}
      >
        <LoadAndDisplay graph={graph} />
        <Interactions
          onSelectFile={onSelectFile}
          pinnedNode={pinnedNode}
          setPinnedNode={setPinnedNode}
        />
        <SearchBar
          onFocusNode={(nodeId) => {
            setPinnedNode(nodeId)
            if (nodeId) onSelectFile?.(nodeId)
          }}
        />
        <GraphControls />
      </SigmaContainer>

      <div className="absolute bottom-4 right-4 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 py-2.5 text-[11px]">
        <div className="text-zinc-400 font-medium mb-1.5">Legend</div>
        <div className="space-y-0.5 text-zinc-500">
          <div>Node size = dependents count</div>
          <div>Color = module cluster</div>
          <div>Hover = highlight neighbors</div>
          <div>Click = impact analysis</div>
        </div>
      </div>
    </div>
  )
}

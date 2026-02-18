// Sigma.js WebGL graph view
// Renders the dependency graph using WebGL for performance
// Layout + clustering computed in useGraphData, rendering handled by Sigma

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
import type { DependencyApiResponse } from '../types'
import type Graph from 'graphology'

interface GraphViewProps {
  data: DependencyApiResponse
  onSelectFile?: (filePath: string) => void
}

// Dark theme settings for sigma
const SIGMA_SETTINGS = {
  defaultNodeColor: '#6366f1',
  defaultEdgeColor: '#374151',
  defaultEdgeType: 'arrow' as const,
  renderEdgeLabels: false,
  labelFont: 'Inter, system-ui, sans-serif',
  labelSize: 12,
  labelColor: { color: '#e5e7eb' },
  labelRenderedSizeThreshold: 8,
  zIndex: true,
  minCameraRatio: 0.05,
  maxCameraRatio: 3,
}

// Loads graph into Sigma and fits camera
function LoadAndDisplay({ graph }: { graph: Graph }) {
  const loadGraph = useLoadGraph()
  const sigma = useSigma()

  useEffect(() => {
    loadGraph(graph)
    // fit camera after graph loads
    requestAnimationFrame(() => {
      sigma.getCamera().animatedReset({ duration: 300 })
    })
  }, [graph, loadGraph, sigma])

  return null
}

// Handles all mouse/keyboard interactions on the graph
function Interactions({ onSelectFile }: { onSelectFile?: (filePath: string) => void }) {
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
      clickNode: ({ node }) => onSelectFile?.(node),
      doubleClickNode: ({ node }) => {
        const pos = sigma.getNodeDisplayData(node)
        if (pos) {
          sigma.getCamera().animate(
            { x: pos.x, y: pos.y, ratio: 0.15 },
            { duration: 400 }
          )
        }
      },
    })
  }, [registerEvents, sigma, onSelectFile])

  // highlight hovered node neighborhood, fade everything else
  useEffect(() => {
    const graph = sigma.getGraph()

    if (hoveredNode && graph.hasNode(hoveredNode)) {
      const neighbors = new Set(graph.neighbors(hoveredNode))
      neighbors.add(hoveredNode)

      sigma.setSetting('nodeReducer', (node, data) => {
        if (neighbors.has(node)) return { ...data, zIndex: 1 }
        return { ...data, color: '#1f2937', label: '', zIndex: 0 }
      })
      sigma.setSetting('edgeReducer', (edge, data) => {
        const src = graph.source(edge)
        const tgt = graph.target(edge)
        if (neighbors.has(src) && neighbors.has(tgt)) {
          return { ...data, color: '#6366f1', size: 1.5 }
        }
        return { ...data, hidden: true }
      })
    } else {
      sigma.setSetting('nodeReducer', null)
      sigma.setSetting('edgeReducer', null)
    }
  }, [hoveredNode, sigma])

  // build tooltip data from graph attributes
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

  if (!graph || graph.order === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        No graph data available
      </div>
    )
  }

  return (
    <div className="relative h-[700px] bg-zinc-950 rounded-lg overflow-hidden">
      <SigmaContainer
        style={{ height: '100%', width: '100%' }}
        settings={SIGMA_SETTINGS}
      >
        <LoadAndDisplay graph={graph} />
        <Interactions onSelectFile={onSelectFile} />
      </SigmaContainer>

      <div className="absolute bottom-4 right-4 bg-zinc-900/90 border border-zinc-700 rounded-lg p-3 text-xs">
        <div className="text-zinc-400 font-medium mb-2">Legend</div>
        <div className="space-y-1 text-zinc-500">
          <div>Node size = dependents count</div>
          <div>Node color = module cluster</div>
          <div>Hover to highlight neighbors</div>
          <div>Click to analyze impact</div>
        </div>
      </div>
    </div>
  )
}

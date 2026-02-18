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

// dark theme -- bg matches zinc-950, edges nearly invisible until hover
const SIGMA_SETTINGS = {
  defaultNodeColor: '#6366f1',
  defaultEdgeColor: 'rgba(75, 85, 99, 0.15)',
  defaultEdgeType: 'arrow' as const,
  edgeReducer: null as any,
  nodeReducer: null as any,
  renderEdgeLabels: false,
  labelFont: 'Inter, system-ui, sans-serif',
  labelSize: 11,
  labelWeight: '500',
  labelColor: { color: '#d1d5db' },
  // only show labels for large (important) nodes at default zoom
  labelRenderedSizeThreshold: 14,
  labelDensity: 0.15,
  zIndex: true,
  minCameraRatio: 0.03,
  maxCameraRatio: 3,
  stagePadding: 40,
  // subtle node borders
  defaultNodeBorderSize: 1,
  defaultNodeBorderColor: 'rgba(255, 255, 255, 0.08)',
}

// Loads graph into Sigma and fits camera
function LoadAndDisplay({ graph }: { graph: Graph }) {
  const loadGraph = useLoadGraph()
  const sigma = useSigma()

  useEffect(() => {
    loadGraph(graph)
    requestAnimationFrame(() => {
      sigma.getCamera().animatedReset({ duration: 300 })
    })
  }, [graph, loadGraph, sigma])

  return null
}

// Handles hover/click interactions and drives node/edge reducers
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

  // highlight hovered neighborhood, fade everything else
  useEffect(() => {
    const graph = sigma.getGraph()

    if (hoveredNode && graph.hasNode(hoveredNode)) {
      const neighbors = new Set(graph.neighbors(hoveredNode))
      neighbors.add(hoveredNode)

      sigma.setSetting('nodeReducer', (node, data) => {
        if (neighbors.has(node)) {
          return {
            ...data,
            zIndex: 1,
            // show label on hover for all neighbors
            label: data.label,
            // slight glow effect via larger border
            borderSize: node === hoveredNode ? 3 : 1,
            borderColor: node === hoveredNode ? '#ffffff' : 'rgba(255,255,255,0.2)',
          }
        }
        // fade non-neighbors hard
        return {
          ...data,
          color: 'rgba(31, 41, 55, 0.3)',
          label: '',
          zIndex: 0,
          borderSize: 0,
        }
      })

      sigma.setSetting('edgeReducer', (edge, data) => {
        const src = graph.source(edge)
        const tgt = graph.target(edge)
        if (neighbors.has(src) && neighbors.has(tgt)) {
          return { ...data, color: 'rgba(99, 102, 241, 0.6)', size: 1.5 }
        }
        return { ...data, hidden: true }
      })
    } else {
      sigma.setSetting('nodeReducer', null)
      sigma.setSetting('edgeReducer', null)
    }
  }, [hoveredNode, sigma])

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
    <div className="relative h-[700px] rounded-lg overflow-hidden border border-zinc-800">
      <SigmaContainer
        style={{ height: '100%', width: '100%', background: '#09090b' }}
        settings={SIGMA_SETTINGS}
      >
        <LoadAndDisplay graph={graph} />
        <Interactions onSelectFile={onSelectFile} />
      </SigmaContainer>

      {/* legend - glass card style */}
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

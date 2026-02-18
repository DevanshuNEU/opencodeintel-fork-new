// Transforms API dependency response into a graphology Graph instance
// with ForceAtlas2 layout positions and Louvain community colors

import { useMemo } from 'react'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import louvain from 'graphology-communities-louvain'
import type { DependencyApiResponse } from '../types'

// Community color palette -- distinct, accessible on dark backgrounds
const COMMUNITY_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#ef4444', // red
  '#84cc16', // lime
]

function getDirectory(filePath: string): string {
  const parts = filePath.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
}

function getRiskLevel(dependentCount: number): 'low' | 'med' | 'high' {
  if (dependentCount >= 4) return 'high'
  if (dependentCount >= 1) return 'med'
  return 'low'
}

export function useGraphData(apiData: DependencyApiResponse | undefined) {
  return useMemo(() => {
    if (!apiData?.nodes?.length) return null

    const graph = new Graph({ type: 'directed' })

    // Build in-degree and out-degree maps
    const inDegree: Record<string, number> = {}
    const outDegree: Record<string, number> = {}
    for (const edge of apiData.edges) {
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1
      outDegree[edge.source] = (outDegree[edge.source] || 0) + 1
    }

    // Add nodes -- skip orphans (0 connections) to reduce noise
    for (const node of apiData.nodes) {
      const dependents = inDegree[node.id] || 0
      const imports = node.import_count ?? node.imports ?? 0
      const totalConnections = dependents + (outDegree[node.id] || 0)

      // filter out isolated nodes (no edges at all) -- they clutter the graph
      if (totalConnections === 0) continue

      graph.addNode(node.id, {
        label: node.label || node.id.split('/').pop() || node.id,
        size: Math.max(4, Math.min(20, 4 + dependents * 2)),
        directory: getDirectory(node.id),
        imports,
        dependents,
        riskLevel: getRiskLevel(dependents),
        language: node.language || 'unknown',
        // x/y will be set by ForceAtlas2
        x: Math.random() * 100,
        y: Math.random() * 100,
      })
    }

    // Add edges (skip if source or target missing)
    for (const edge of apiData.edges) {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        // Avoid duplicate edges
        if (!graph.hasEdge(edge.source, edge.target)) {
          graph.addEdge(edge.source, edge.target, {
            weight: 1,
            type: 'arrow',
            size: 0.5,
            color: 'rgba(75, 85, 99, 0.12)',
          })
        }
      }
    }

    // Run Louvain community detection for cluster coloring
    try {
      const communities = louvain(graph)
      const communityIds = [...new Set(Object.values(communities))]

      graph.forEachNode((node) => {
        const communityIndex = communityIds.indexOf(communities[node])
        graph.setNodeAttribute(
          node,
          'color',
          COMMUNITY_COLORS[communityIndex % COMMUNITY_COLORS.length]
        )
        graph.setNodeAttribute(node, 'community', communities[node])
      })
    } catch {
      // Louvain can fail on disconnected graphs -- fall back to directory-based coloring
      const directories = [...new Set(graph.mapNodes((_, attrs) => attrs.directory))]
      graph.forEachNode((node, attrs) => {
        const dirIndex = directories.indexOf(attrs.directory)
        graph.setNodeAttribute(
          node,
          'color',
          COMMUNITY_COLORS[dirIndex % COMMUNITY_COLORS.length]
        )
      })
    }

    // ForceAtlas2 for layout -- tuned for readability over compactness
    forceAtlas2.assign(graph, {
      iterations: 400,
      settings: {
        gravity: 0.5,
        scalingRatio: 20,
        barnesHutOptimize: graph.order > 50,
        barnesHutTheta: 0.5,
        slowDown: 3,
        strongGravityMode: false,
        adjustSizes: true,
        linLogMode: true,
        outboundAttractionDistribution: true,
      },
    })

    return graph
  }, [apiData])
}

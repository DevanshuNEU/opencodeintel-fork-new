// smoke test: useGraphData transforms API response into a valid graphology graph
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGraphData } from '@/components/DependencyGraph/GraphView/useGraphData'
import type { DependencyApiResponse } from '@/components/DependencyGraph/types'

const mockApiData: DependencyApiResponse = {
  nodes: [
    { id: 'src/App.tsx', label: 'App.tsx', language: 'typescript', import_count: 3 },
    { id: 'src/utils.ts', label: 'utils.ts', language: 'typescript', import_count: 0 },
    { id: 'src/types.ts', label: 'types.ts', language: 'typescript', import_count: 0 },
    { id: 'src/orphan.ts', label: 'orphan.ts', language: 'typescript', import_count: 0 },
  ],
  edges: [
    { source: 'src/App.tsx', target: 'src/utils.ts' },
    { source: 'src/App.tsx', target: 'src/types.ts' },
  ],
  total_files: 4,
  total_dependencies: 2,
}

describe('useGraphData', () => {
  it('returns null for empty data', () => {
    const { result } = renderHook(() => useGraphData(undefined))
    expect(result.current).toBeNull()
  })

  it('builds a graph with connected nodes, filters orphans', () => {
    const { result } = renderHook(() => useGraphData(mockApiData))
    const graph = result.current!

    // orphan.ts has 0 connections, should be filtered
    expect(graph.order).toBe(3)
    expect(graph.hasNode('src/App.tsx')).toBe(true)
    expect(graph.hasNode('src/utils.ts')).toBe(true)
    expect(graph.hasNode('src/types.ts')).toBe(true)
    expect(graph.hasNode('src/orphan.ts')).toBe(false)
  })

  it('creates correct edges', () => {
    const { result } = renderHook(() => useGraphData(mockApiData))
    const graph = result.current!

    expect(graph.size).toBe(2)
    expect(graph.hasEdge('src/App.tsx', 'src/utils.ts')).toBe(true)
    expect(graph.hasEdge('src/App.tsx', 'src/types.ts')).toBe(true)
  })

  it('assigns node attributes: label, size, directory, color', () => {
    const { result } = renderHook(() => useGraphData(mockApiData))
    const graph = result.current!
    const attrs = graph.getNodeAttributes('src/App.tsx')

    expect(attrs.label).toBe('App.tsx')
    expect(attrs.directory).toBe('src')
    expect(typeof attrs.size).toBe('number')
    expect(attrs.size).toBeGreaterThan(0)
    // Louvain or directory fallback should assign a color
    expect(attrs.color).toBeDefined()
  })

  it('sets ForceAtlas2 positions (x, y are numbers)', () => {
    const { result } = renderHook(() => useGraphData(mockApiData))
    const graph = result.current!
    const attrs = graph.getNodeAttributes('src/App.tsx')

    expect(typeof attrs.x).toBe('number')
    expect(typeof attrs.y).toBe('number')
    expect(Number.isFinite(attrs.x)).toBe(true)
    expect(Number.isFinite(attrs.y)).toBe(true)
  })
})

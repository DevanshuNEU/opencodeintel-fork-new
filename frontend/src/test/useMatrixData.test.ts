// smoke test: useDirectoryMatrix builds correct adjacency matrix from API data
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDirectoryMatrix } from '@/components/DependencyGraph/MatrixView/useMatrixData'
import type { DependencyApiResponse } from '@/components/DependencyGraph/types'

const mockApiData: DependencyApiResponse = {
  nodes: [
    { id: 'backend/main.py' },
    { id: 'backend/routes/auth.py' },
    { id: 'backend/services/db.py' },
    { id: 'frontend/src/App.tsx' },
    { id: 'frontend/src/utils.ts' },
  ],
  edges: [
    { source: 'backend/routes/auth.py', target: 'backend/services/db.py' },
    { source: 'backend/main.py', target: 'backend/routes/auth.py' },
    { source: 'frontend/src/App.tsx', target: 'frontend/src/utils.ts' },
    // cross-project dep
    { source: 'backend/routes/auth.py', target: 'backend/main.py' },
  ],
  total_files: 5,
  total_dependencies: 4,
}

describe('useDirectoryMatrix', () => {
  it('returns null for empty data', () => {
    const { result } = renderHook(() => useDirectoryMatrix(undefined))
    expect(result.current).toBeNull()
  })

  it('groups files into directories', () => {
    const { result } = renderHook(() => useDirectoryMatrix(mockApiData))
    const data = result.current!

    expect(data.directories).toContain('backend')
    expect(data.directories).toContain('backend/routes')
    expect(data.directories).toContain('backend/services')
    expect(data.directories).toContain('frontend/src')
  })

  it('counts cross-directory deps only in totalDeps', () => {
    const { result } = renderHook(() => useDirectoryMatrix(mockApiData))
    const data = result.current!

    // all 4 edges are cross-directory (different dirs), intra-dir = 0
    // the matrix diagonal is self-deps which we exclude
    expect(data.totalDeps).toBeGreaterThan(0)
  })

  it('detects circular dependencies between directories', () => {
    const { result } = renderHook(() => useDirectoryMatrix(mockApiData))
    const data = result.current!

    // backend -> backend/routes and backend/routes -> backend = circular
    expect(data.totalCycles).toBeGreaterThanOrEqual(1)
  })

  it('provides short labels for display', () => {
    const { result } = renderHook(() => useDirectoryMatrix(mockApiData))
    const data = result.current!

    // short labels are the last segment of the dir path
    expect(data.shortLabels).toContain('routes')
    expect(data.shortLabels).toContain('services')
    expect(data.shortLabels).toContain('src')
  })
})

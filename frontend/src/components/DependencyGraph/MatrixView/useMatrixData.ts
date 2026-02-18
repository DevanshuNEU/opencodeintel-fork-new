// Transforms API dependency response into a 2D adjacency matrix
// for the Dependency Structure Matrix (DSM) view

import { useMemo } from 'react'
import type { DependencyApiResponse, MatrixData } from '../types'

function getDirectory(filePath: string): string {
  const parts = filePath.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
}

function getShortLabel(filePath: string): string {
  return filePath.split('/').pop() || filePath
}

export function useMatrixData(apiData: DependencyApiResponse | undefined): MatrixData | null {
  return useMemo(() => {
    if (!apiData?.nodes?.length) return null

    // Sort files by directory so same-directory files are adjacent
    const sortedFiles = [...apiData.nodes]
      .map((n) => n.id)
      .sort((a, b) => {
        const dirA = getDirectory(a)
        const dirB = getDirectory(b)
        if (dirA !== dirB) return dirA.localeCompare(dirB)
        return a.localeCompare(b)
      })

    // Build index lookup: file path -> matrix index
    const indexMap = new Map<string, number>()
    sortedFiles.forEach((file, idx) => {
      indexMap.set(file, idx)
    })

    const size = sortedFiles.length

    // Build adjacency matrix
    // matrix[row][col] = number of imports from row -> col
    const matrix: number[][] = Array.from({ length: size }, () =>
      new Array(size).fill(0)
    )

    for (const edge of apiData.edges) {
      const sourceIdx = indexMap.get(edge.source)
      const targetIdx = indexMap.get(edge.target)
      if (sourceIdx !== undefined && targetIdx !== undefined) {
        matrix[sourceIdx][targetIdx] += 1
      }
    }

    // Detect circular dependencies: both directions have imports
    const cycles: [number, number][] = []
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        if (matrix[i][j] > 0 && matrix[j][i] > 0) {
          cycles.push([i, j])
        }
      }
    }

    // Build directory grouping and find separator positions
    const directories = new Map<string, number[]>()
    const directorySeparators: number[] = []
    let prevDir = ''

    sortedFiles.forEach((file, idx) => {
      const dir = getDirectory(file)
      if (!directories.has(dir)) {
        directories.set(dir, [])
      }
      directories.get(dir)!.push(idx)

      if (dir !== prevDir && idx > 0) {
        directorySeparators.push(idx)
      }
      prevDir = dir
    })

    const totalDeps = apiData.edges.length
    const totalCycles = cycles.length

    return {
      labels: sortedFiles,
      shortLabels: sortedFiles.map(getShortLabel),
      matrix,
      directories,
      directorySeparators,
      cycles,
      totalDeps,
      totalCycles,
    }
  }, [apiData])
}

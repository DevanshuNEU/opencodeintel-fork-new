// Transforms API response into directory-level matrix (default)
// and file-level matrix (drill-down on directory click)

import { useMemo } from 'react'
import type { DependencyApiResponse } from '../types'

function getDirectory(filePath: string): string {
  const parts = filePath.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
}

function getShortDir(dirPath: string): string {
  const parts = dirPath.split('/')
  return parts[parts.length - 1] || dirPath
}

export interface DirectoryMatrixData {
  directories: string[]
  shortLabels: string[]
  matrix: number[][]
  fileCounts: number[]
  cycles: [number, number][]
  totalDeps: number
  totalCycles: number
}

export interface FileMatrixData {
  directory: string
  files: string[]
  shortLabels: string[]
  matrix: number[][]
  cycles: [number, number][]
}

export function useDirectoryMatrix(apiData: DependencyApiResponse | undefined): DirectoryMatrixData | null {
  return useMemo(() => {
    if (!apiData?.nodes?.length) return null

    // collect all unique directories
    const dirSet = new Set<string>()
    for (const node of apiData.nodes) {
      dirSet.add(getDirectory(node.id))
    }
    const directories = [...dirSet].sort()

    // map dir -> index
    const dirIndex = new Map<string, number>()
    directories.forEach((dir, idx) => dirIndex.set(dir, idx))

    const size = directories.length
    const matrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(0))

    // count how many files per directory
    const fileCounts = new Array(size).fill(0)
    for (const node of apiData.nodes) {
      const idx = dirIndex.get(getDirectory(node.id))
      if (idx !== undefined) fileCounts[idx]++
    }

    // aggregate edges into directory-level
    for (const edge of apiData.edges) {
      const srcDir = getDirectory(edge.source)
      const tgtDir = getDirectory(edge.target)
      const srcIdx = dirIndex.get(srcDir)
      const tgtIdx = dirIndex.get(tgtDir)
      if (srcIdx !== undefined && tgtIdx !== undefined) {
        matrix[srcIdx][tgtIdx]++
      }
    }

    // detect circular deps between directories
    const cycles: [number, number][] = []
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        if (matrix[i][j] > 0 && matrix[j][i] > 0) {
          cycles.push([i, j])
        }
      }
    }

    // count cross-directory deps only (off-diagonal)
    let crossDirDeps = 0
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i !== j) crossDirDeps += matrix[i][j]
      }
    }

    return {
      directories,
      shortLabels: directories.map(getShortDir),
      matrix,
      fileCounts,
      cycles,
      totalDeps: crossDirDeps,
      totalCycles: cycles.length,
    }
  }, [apiData])
}

export function useFileMatrix(
  apiData: DependencyApiResponse | undefined,
  directory: string | null
): FileMatrixData | null {
  return useMemo(() => {
    if (!apiData?.nodes?.length || !directory) return null

    // get files in this directory
    const files = apiData.nodes
      .map((n) => n.id)
      .filter((id) => getDirectory(id) === directory)
      .sort()

    if (files.length === 0) return null

    const fileIndex = new Map<string, number>()
    files.forEach((f, idx) => fileIndex.set(f, idx))

    const size = files.length
    const matrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(0))

    for (const edge of apiData.edges) {
      const srcIdx = fileIndex.get(edge.source)
      const tgtIdx = fileIndex.get(edge.target)
      if (srcIdx !== undefined && tgtIdx !== undefined) {
        matrix[srcIdx][tgtIdx]++
      }
    }

    const cycles: [number, number][] = []
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        if (matrix[i][j] > 0 && matrix[j][i] > 0) {
          cycles.push([i, j])
        }
      }
    }

    return {
      directory,
      files,
      shortLabels: files.map((f) => f.split('/').pop() || f),
      matrix,
      cycles,
    }
  }, [apiData, directory])
}

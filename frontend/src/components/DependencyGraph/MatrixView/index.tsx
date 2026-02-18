// Dependency Structure Matrix (DSM) view
// Renders a colored grid showing file-to-file import relationships
// Red cells = circular dependencies, blue intensity = coupling strength

import { useState, useRef, useMemo, useCallback } from 'react'
import { useMatrixData } from './useMatrixData'
import type { DependencyApiResponse } from '../types'

interface MatrixViewProps {
  data: DependencyApiResponse
  onSelectFile?: (filePath: string) => void
}

// color intensity based on import count
function getCellColor(value: number, isCycle: boolean): string {
  if (isCycle) return 'bg-rose-500/70'
  if (value === 0) return ''
  if (value === 1) return 'bg-indigo-500/20'
  if (value <= 3) return 'bg-indigo-500/40'
  return 'bg-indigo-500/60'
}

function CellTooltip({
  source,
  target,
  count,
  isCycle,
  position,
}: {
  source: string
  target: string
  count: number
  isCycle: boolean
  position: { x: number; y: number }
}) {
  return (
    <div
      className="fixed z-50 pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs"
      style={{ left: position.x + 12, top: position.y - 10 }}
    >
      <div className="text-zinc-100 font-medium">{source.split('/').pop()}</div>
      <div className="text-zinc-500 mb-1">
        imports {count}x from {target.split('/').pop()}
      </div>
      {isCycle && (
        <div className="text-rose-400 font-medium">Circular dependency</div>
      )}
    </div>
  )
}

export function MatrixView({ data, onSelectFile }: MatrixViewProps) {
  const matrixData = useMatrixData(data)
  const [hoveredCell, setHoveredCell] = useState<{
    row: number
    col: number
    mouseX: number
    mouseY: number
  } | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // build a set of cycle pairs for fast lookup
  const cycleSet = useMemo(() => {
    if (!matrixData) return new Set<string>()
    const set = new Set<string>()
    for (const [a, b] of matrixData.cycles) {
      set.add(`${a}-${b}`)
      set.add(`${b}-${a}`)
    }
    return set
  }, [matrixData])

  const isCycleCell = useCallback(
    (row: number, col: number) => cycleSet.has(`${row}-${col}`),
    [cycleSet]
  )

  if (!matrixData || matrixData.labels.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        No dependency data for matrix view
      </div>
    )
  }

  const { labels, shortLabels, matrix, directorySeparators, totalDeps, totalCycles } = matrixData
  const size = labels.length

  // limit rendering for very large matrices
  const maxRender = 150
  const isTruncated = size > maxRender
  const renderSize = Math.min(size, maxRender)

  return (
    <div className="p-4 space-y-3">
      {/* stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{size} files</span>
        <span>{totalDeps} dependencies</span>
        {totalCycles > 0 && (
          <span className="text-rose-400 font-medium">
            {totalCycles} circular {totalCycles === 1 ? 'dependency' : 'dependencies'}
          </span>
        )}
        {isTruncated && (
          <span className="text-yellow-400">Showing first {maxRender} of {size} files</span>
        )}
      </div>

      {/* matrix grid */}
      <div
        ref={containerRef}
        className="overflow-auto max-h-[650px] relative border border-zinc-800 rounded-lg"
      >
        <table className="border-collapse text-[10px]">
          <thead>
            <tr>
              {/* empty corner cell */}
              <th className="sticky left-0 top-0 z-20 bg-zinc-900 min-w-[120px]" />
              {/* column headers */}
              {shortLabels.slice(0, renderSize).map((label, col) => (
                <th
                  key={`col-${col}`}
                  className={`sticky top-0 z-10 bg-zinc-900 px-0.5 h-[80px] ${
                    highlightedIndex === col ? 'bg-zinc-800' : ''
                  }`}
                  onMouseEnter={() => setHighlightedIndex(col)}
                  onMouseLeave={() => setHighlightedIndex(null)}
                >
                  <div
                    className="w-3 overflow-hidden whitespace-nowrap text-zinc-500 origin-bottom-left rotate-[-55deg] translate-x-1"
                    title={labels[col]}
                  >
                    {label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.slice(0, renderSize).map((row, rowIdx) => {
              const isSeparator = directorySeparators.includes(rowIdx)
              return (
                <tr
                  key={`row-${rowIdx}`}
                  className={isSeparator ? 'border-t border-zinc-600' : ''}
                >
                  {/* row header */}
                  <td
                    className={`sticky left-0 z-10 bg-zinc-900 px-2 py-0.5 text-right truncate max-w-[120px] cursor-pointer hover:text-primary transition-colors ${
                      highlightedIndex === rowIdx
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-500'
                    }`}
                    title={labels[rowIdx]}
                    onClick={() => onSelectFile?.(labels[rowIdx])}
                    onMouseEnter={() => setHighlightedIndex(rowIdx)}
                    onMouseLeave={() => setHighlightedIndex(null)}
                  >
                    {shortLabels[rowIdx]}
                  </td>
                  {/* cells */}
                  {row.slice(0, renderSize).map((value, colIdx) => {
                    const cycle = isCycleCell(rowIdx, colIdx)
                    const isHighlighted =
                      highlightedIndex === rowIdx || highlightedIndex === colIdx
                    const isDiagonal = rowIdx === colIdx

                    return (
                      <td
                        key={`cell-${rowIdx}-${colIdx}`}
                        className={`w-3 h-3 min-w-[12px] min-h-[12px] border-r border-b border-zinc-800/50 ${
                          isDiagonal
                            ? 'bg-zinc-800/50'
                            : getCellColor(value, cycle)
                        } ${isHighlighted && value > 0 ? 'ring-1 ring-zinc-500' : ''}`}
                        onMouseEnter={(e) =>
                          value > 0
                            ? setHoveredCell({
                                row: rowIdx,
                                col: colIdx,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                              })
                            : undefined
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* color legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/20" />
          <span>1 import</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/40" />
          <span>2-3 imports</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/60" />
          <span>4+ imports</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-500/70" />
          <span>Circular dep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-zinc-800/50" />
          <span>Self</span>
        </div>
      </div>

      {/* tooltip */}
      {hoveredCell && (
        <CellTooltip
          source={labels[hoveredCell.row]}
          target={labels[hoveredCell.col]}
          count={matrix[hoveredCell.row][hoveredCell.col]}
          isCycle={isCycleCell(hoveredCell.row, hoveredCell.col)}
          position={{ x: hoveredCell.mouseX, y: hoveredCell.mouseY }}
        />
      )}
    </div>
  )
}

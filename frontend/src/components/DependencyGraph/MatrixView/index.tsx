// Dependency Structure Matrix -- directory level by default, drill into files
// Shows cross-directory coupling at a glance, click to explore within a directory

import { useState, useMemo, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useDirectoryMatrix, useFileMatrix } from './useMatrixData'
import type { DependencyApiResponse } from '../types'

interface MatrixViewProps {
  data: DependencyApiResponse
  onSelectFile?: (filePath: string) => void
}

function getCellBg(value: number, isCycle: boolean, isDiagonal: boolean): string {
  if (isDiagonal) return 'bg-zinc-800/40'
  if (isCycle) return 'bg-rose-500/60 hover:bg-rose-500/80'
  if (value === 0) return 'hover:bg-zinc-800/30'
  if (value <= 2) return 'bg-indigo-500/20 hover:bg-indigo-500/30'
  if (value <= 5) return 'bg-indigo-500/35 hover:bg-indigo-500/50'
  if (value <= 10) return 'bg-indigo-500/50 hover:bg-indigo-500/65'
  return 'bg-indigo-500/70 hover:bg-indigo-500/80'
}

function MatrixGrid({
  labels,
  matrix,
  cycles,
  onCellHover,
  onRowClick,
  highlightedIndex,
  setHighlightedIndex,
}: {
  labels: string[]
  matrix: number[][]
  cycles: [number, number][]
  onCellHover: (info: { row: number; col: number; x: number; y: number } | null) => void
  onRowClick: (index: number) => void
  highlightedIndex: number | null
  setHighlightedIndex: (i: number | null) => void
}) {
  const cycleSet = useMemo(() => {
    const set = new Set<string>()
    for (const [a, b] of cycles) {
      set.add(`${a}-${b}`)
      set.add(`${b}-${a}`)
    }
    return set
  }, [cycles])

  const size = labels.length
  // cell size scales with matrix size for readability
  const cellSize = size <= 15 ? 36 : size <= 30 ? 28 : size <= 50 ? 20 : 14

  return (
    <div className="overflow-auto max-h-[600px] border border-zinc-800 rounded-lg">
      <table className="border-collapse" style={{ fontSize: cellSize <= 20 ? '10px' : '11px' }}>
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 bg-zinc-900" style={{ minWidth: 120 }} />
            {labels.map((label, col) => (
              <th
                key={`col-${col}`}
                className={`sticky top-0 z-10 bg-zinc-900 text-zinc-500 font-normal cursor-pointer hover:text-zinc-200 transition-colors ${
                  highlightedIndex === col ? 'text-zinc-200' : ''
                }`}
                style={{ height: 80, width: cellSize, minWidth: cellSize }}
                onMouseEnter={() => setHighlightedIndex(col)}
                onMouseLeave={() => setHighlightedIndex(null)}
                onClick={() => onRowClick(col)}
              >
                <div
                  className="whitespace-nowrap origin-bottom-left"
                  style={{ transform: 'rotate(-55deg) translateX(2px)', width: cellSize }}
                  title={label}
                >
                  {label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIdx) => (
            <tr key={`row-${rowIdx}`}>
              <td
                className={`sticky left-0 z-10 bg-zinc-900 px-2 text-right truncate cursor-pointer hover:text-primary transition-colors ${
                  highlightedIndex === rowIdx ? 'text-zinc-200' : 'text-zinc-500'
                }`}
                style={{ maxWidth: 120 }}
                title={labels[rowIdx]}
                onClick={() => onRowClick(rowIdx)}
                onMouseEnter={() => setHighlightedIndex(rowIdx)}
                onMouseLeave={() => setHighlightedIndex(null)}
              >
                {labels[rowIdx]}
              </td>
              {row.map((value, colIdx) => {
                const isCycle = cycleSet.has(`${rowIdx}-${colIdx}`)
                const isDiagonal = rowIdx === colIdx
                const isHighlighted = highlightedIndex === rowIdx || highlightedIndex === colIdx

                return (
                  <td
                    key={`cell-${rowIdx}-${colIdx}`}
                    className={`border border-zinc-800/30 text-center transition-colors cursor-default ${
                      getCellBg(value, isCycle, isDiagonal)
                    } ${isHighlighted && !isDiagonal ? 'ring-1 ring-inset ring-zinc-600' : ''}`}
                    style={{ width: cellSize, height: cellSize, minWidth: cellSize }}
                    onMouseEnter={(e) =>
                      value > 0 || isCycle
                        ? onCellHover({ row: rowIdx, col: colIdx, x: e.clientX, y: e.clientY })
                        : undefined
                    }
                    onMouseLeave={() => onCellHover(null)}
                  >
                    {value > 0 && !isDiagonal && (
                      <span className="text-zinc-300 font-medium">{value}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
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
      className="fixed z-50 pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs max-w-[250px]"
      style={{ left: position.x + 14, top: position.y - 12 }}
    >
      <div className="text-zinc-200 font-medium truncate">{source}</div>
      <div className="text-zinc-500">
        {count} import{count !== 1 ? 's' : ''} from
      </div>
      <div className="text-zinc-200 font-medium truncate">{target}</div>
      {isCycle && (
        <div className="text-rose-400 font-medium mt-1">Circular dependency detected</div>
      )}
    </div>
  )
}

export function MatrixView({ data, onSelectFile }: MatrixViewProps) {
  const [drillDir, setDrillDir] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{
    row: number; col: number; x: number; y: number
  } | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)

  const dirMatrix = useDirectoryMatrix(data)
  const fileMatrix = useFileMatrix(data, drillDir)

  const isDrilled = drillDir !== null && fileMatrix !== null

  // which matrix to show
  const activeLabels = isDrilled ? fileMatrix.shortLabels : dirMatrix?.shortLabels || []
  const activeFullLabels = isDrilled ? fileMatrix.files : dirMatrix?.directories || []
  const activeMatrix = isDrilled ? fileMatrix.matrix : dirMatrix?.matrix || []
  const activeCycles = isDrilled ? fileMatrix.cycles : dirMatrix?.cycles || []

  const handleRowClick = useCallback((index: number) => {
    if (isDrilled) {
      // file level: trigger impact analysis
      const filePath = fileMatrix!.files[index]
      onSelectFile?.(filePath)
    } else if (dirMatrix) {
      // directory level: drill into that directory
      const dir = dirMatrix.directories[index]
      setDrillDir(dir)
    }
  }, [isDrilled, fileMatrix, dirMatrix, onSelectFile])

  const cycleSet = useMemo(() => {
    const set = new Set<string>()
    for (const [a, b] of activeCycles) {
      set.add(`${a}-${b}`)
      set.add(`${b}-${a}`)
    }
    return set
  }, [activeCycles])

  if (!dirMatrix) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No dependency data for matrix view
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {/* header */}
      <div className="flex items-center gap-3">
        {isDrilled && (
          <button
            onClick={() => setDrillDir(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All directories
          </button>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {isDrilled ? (
            <>
              <span className="text-foreground font-medium">{drillDir}/</span>
              <span>{fileMatrix!.files.length} files</span>
            </>
          ) : (
            <>
              <span>{dirMatrix.directories.length} directories</span>
              <span>{dirMatrix.totalDeps} dependencies</span>
              {dirMatrix.totalCycles > 0 && (
                <span className="text-rose-400 font-medium">
                  {dirMatrix.totalCycles} circular {dirMatrix.totalCycles === 1 ? 'dep' : 'deps'}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {!isDrilled && (
        <div className="text-xs text-zinc-500">
          Click a directory to see file-level dependencies within it
        </div>
      )}

      {/* matrix */}
      <MatrixGrid
        labels={activeLabels}
        matrix={activeMatrix}
        cycles={activeCycles}
        onCellHover={setHoveredCell}
        onRowClick={handleRowClick}
        highlightedIndex={highlightedIndex}
        setHighlightedIndex={setHighlightedIndex}
      />

      {/* legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/20" />
          <span>1-2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/35" />
          <span>3-5</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/50" />
          <span>6-10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/70" />
          <span>10+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-500/60" />
          <span>Circular</span>
        </div>
        {!isDrilled && (
          <span className="text-zinc-600 ml-2">Numbers = import count between directories</span>
        )}
      </div>

      {/* tooltip */}
      {hoveredCell && (
        <CellTooltip
          source={activeFullLabels[hoveredCell.row]}
          target={activeFullLabels[hoveredCell.col]}
          count={activeMatrix[hoveredCell.row]?.[hoveredCell.col] || 0}
          isCycle={cycleSet.has(`${hoveredCell.row}-${hoveredCell.col}`)}
          position={{ x: hoveredCell.x, y: hoveredCell.y }}
        />
      )}
    </div>
  )
}

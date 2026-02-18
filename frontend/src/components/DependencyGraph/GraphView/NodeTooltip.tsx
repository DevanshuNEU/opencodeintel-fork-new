// Tooltip shown when hovering a node in the graph
// Positioned with fixed coordinates (viewport-relative from parent)

interface NodeTooltipProps {
  label: string
  directory: string
  imports: number
  dependents: number
  riskLevel: string
  position: { x: number; y: number }
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  med: 'text-yellow-400',
  high: 'text-rose-400',
}

export function NodeTooltip({
  label,
  directory,
  imports,
  dependents,
  riskLevel,
  position,
}: NodeTooltipProps) {
  return (
    <div
      className="fixed z-50 pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl"
      style={{
        left: position.x + 12,
        top: position.y - 10,
      }}
    >
      <div className="text-sm font-medium text-zinc-100">{label}</div>
      <div className="text-xs text-zinc-500 mb-1.5">{directory}</div>
      <div className="flex gap-3 text-xs">
        <span className="text-zinc-400">
          {imports} imports
        </span>
        <span className={RISK_COLORS[riskLevel] || 'text-zinc-400'}>
          {dependents} dependents
        </span>
      </div>
    </div>
  )
}

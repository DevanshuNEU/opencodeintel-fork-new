// Graph controls: zoom in, zoom out, fit to screen
// Positioned bottom-left of the graph canvas

import { useSigma, useCamera } from '@react-sigma/core'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const BTN = 'p-1.5 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-md text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors'

export function GraphControls() {
  const { zoomIn, zoomOut, reset } = useCamera({ duration: 300, factor: 1.5 })

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
      <button onClick={() => zoomIn()} className={BTN} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button onClick={() => zoomOut()} className={BTN} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button onClick={() => reset()} className={BTN} title="Fit to screen">
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  )
}

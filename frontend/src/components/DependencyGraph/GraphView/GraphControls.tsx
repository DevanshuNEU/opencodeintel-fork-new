// Graph controls: zoom in, zoom out, fit-to-screen, center
// Positioned bottom-left of the graph canvas

import { useCallback } from 'react'
import { useSigma, useCamera } from '@react-sigma/core'
import { ZoomIn, ZoomOut, Maximize2, LocateFixed } from 'lucide-react'

const BTN = 'p-1.5 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-md text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors'

export function GraphControls() {
  const sigma = useSigma()
  const { zoomIn, zoomOut, reset } = useCamera({ duration: 300, factor: 1.5 })

  const fitToScreen = useCallback(() => {
    reset()
  }, [reset])

  const centerGraph = useCallback(() => {
    // zoom to fit all nodes with some padding
    sigma.getCamera().animatedReset({ duration: 300 })
  }, [sigma])

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
      <button onClick={() => zoomIn()} className={BTN} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button onClick={() => zoomOut()} className={BTN} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button onClick={fitToScreen} className={BTN} title="Fit to screen">
        <Maximize2 className="w-4 h-4" />
      </button>
      <button onClick={centerGraph} className={BTN} title="Center graph">
        <LocateFixed className="w-4 h-4" />
      </button>
    </div>
  )
}

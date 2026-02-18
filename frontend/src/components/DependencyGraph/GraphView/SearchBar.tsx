// Search bar for finding and focusing nodes in the graph
// Sets pinnedNode in parent -- doesn't manage reducers

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useSigma } from '@react-sigma/core'

interface SearchBarProps {
  onFocusNode: (nodeId: string | null) => void
}

export function SearchBar({ onFocusNode }: SearchBarProps) {
  const sigma = useSigma()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; label: string }[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const graph = sigma.getGraph()
    const q = query.toLowerCase()
    const matches: { id: string; label: string }[] = []

    graph.forEachNode((node, attrs) => {
      const label = (attrs.label as string) || ''
      if (node.toLowerCase().includes(q) || label.toLowerCase().includes(q)) {
        matches.push({ id: node, label })
      }
    })

    matches.sort((a, b) => {
      const aExact = a.label.toLowerCase().startsWith(q) ? 0 : 1
      const bExact = b.label.toLowerCase().startsWith(q) ? 0 : 1
      return aExact - bExact || a.id.localeCompare(b.id)
    })

    setResults(matches.slice(0, 8))
  }, [query, sigma])

  const focusNode = useCallback((nodeId: string) => {
    const graph = sigma.getGraph()
    if (!graph.hasNode(nodeId)) return

    // pin this node (parent handles highlight via reducers)
    onFocusNode(nodeId)

    // zoom: get the node's position in sigma's coordinate system
    // nodeDisplayData gives us the rendered position which we can use directly
    setTimeout(() => {
      const displayData = sigma.getNodeDisplayData(nodeId)
      if (displayData) {
        // convert viewport pixel coords to graph coords for the camera
        const graphCoords = sigma.viewportToGraph({ x: displayData.x, y: displayData.y })
        sigma.getCamera().animate(
          { x: graphCoords.x, y: graphCoords.y, ratio: 0.2 },
          { duration: 500 }
        )
      }
    }, 100)

    setQuery('')
    setResults([])
    setIsOpen(false)
  }, [sigma, onFocusNode])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    onFocusNode(null)
    sigma.getCamera().animatedReset({ duration: 300 })
  }, [sigma, onFocusNode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === '/' && !isOpen) {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape' && isOpen) {
        clearSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, clearSearch])

  return (
    <div className="absolute top-3 left-3 z-10">
      {!isOpen ? (
        <button
          onClick={() => {
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find file...</span>
          <kbd className="ml-2 px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-500">/</kbd>
        </button>
      ) : (
        <div className="w-64">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/95 backdrop-blur-sm border border-zinc-600 rounded-lg">
            <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files..."
              className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
            />
            <button onClick={clearSearch} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-1 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => focusNode(r.id)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  <div className="text-xs text-zinc-200 font-medium">{r.label}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{r.id}</div>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && (
            <div className="mt-1 bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-500">
              No files found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

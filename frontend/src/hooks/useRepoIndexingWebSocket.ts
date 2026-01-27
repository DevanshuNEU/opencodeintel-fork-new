/**
 * useRepoIndexingWebSocket
 * 
 * WebSocket hook for real-time repo indexing progress in dashboard.
 * Connects to /ws/repos/{repo_id}/indexing with JWT auth.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { buildWsUrl } from '@/config/api'
import { useAuth } from '@/contexts/AuthContext'

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export type IndexingPhase = 'idle' | 'connecting' | 'indexing' | 'completed' | 'error'

export interface IndexingProgress {
  percent: number
  filesProcessed: number
  filesTotal: number
  currentFile: string
  functionsFound: number
}

export interface IndexingStats {
  files_processed: number
  functions_indexed: number
  indexing_time_seconds: number
}

interface WSEvent {
  type: 'connected' | 'progress' | 'completed' | 'error' | 'ping'
  entity_id?: string
  repo_id?: string
  message?: string
  // Progress fields
  files_processed?: number
  files_total?: number
  functions_found?: number
  current_file?: string
  percent?: number
  // Completion fields
  stats?: IndexingStats
  // Error fields
  error?: string
  recoverable?: boolean
}

interface UseRepoIndexingOptions {
  onCompleted?: (repoId: string, stats: IndexingStats) => void
  onError?: (error: string, recoverable: boolean) => void
}

const INITIAL_PROGRESS: IndexingProgress = {
  percent: 0,
  filesProcessed: 0,
  filesTotal: 0,
  currentFile: '',
  functionsFound: 0,
}

export function useRepoIndexingWebSocket(
  repoId: string | null,
  options: UseRepoIndexingOptions = {}
) {
  const { session } = useAuth()
  
  // Refs for callbacks to prevent dependency loops
  const onCompletedRef = useRef(options.onCompleted)
  const onErrorRef = useRef(options.onError)
  onCompletedRef.current = options.onCompleted
  onErrorRef.current = options.onError

  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [phase, setPhase] = useState<IndexingPhase>('idle')
  const [progress, setProgress] = useState<IndexingProgress>(INITIAL_PROGRESS)
  const [recentFiles, setRecentFiles] = useState<string[]>([])
  const [completedStats, setCompletedStats] = useState<IndexingStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRecoverable, setIsRecoverable] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track phase in ref to avoid effect re-running when phase changes
  const phaseRef = useRef<IndexingPhase>('idle')
  phaseRef.current = phase

  const cleanup = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WSEvent = JSON.parse(event.data)
      
      switch (data.type) {
        case 'connected':
          setConnectionState('connected')
          setPhase('connecting')
          break
          
        case 'ping':
          // Keepalive, ignore
          break
          
        case 'progress':
          setPhase('indexing')
          setProgress({
            percent: data.percent || 0,
            filesProcessed: data.files_processed || 0,
            filesTotal: data.files_total || 0,
            currentFile: data.current_file || '',
            functionsFound: data.functions_found || 0,
          })
          // Track recent files
          if (data.current_file) {
            setRecentFiles(prev => {
              const filtered = prev.filter(f => f !== data.current_file)
              return [data.current_file!, ...filtered].slice(0, 10)
            })
          }
          break
          
        case 'completed':
          setPhase('completed')
          setProgress(prev => ({ ...prev, percent: 100 }))
          if (data.stats) {
            setCompletedStats(data.stats)
            onCompletedRef.current?.(data.repo_id || '', data.stats)
          }
          break
          
        case 'error': {
          setPhase('error')
          // Prefer data.error (server error code) over data.message (human-readable)
          const errorMessage = data.error || data.message || 'Unknown error'
          setError(errorMessage)
          setIsRecoverable(data.recoverable || false)
          onErrorRef.current?.(errorMessage, data.recoverable || false)
          break
        }
      }
    } catch (err) {
      console.error('[WS] Parse error:', err)
    }
  }, [])

  const connect = useCallback((rid: string) => {
    if (!session?.access_token) {
      console.error('[WS] No auth token available')
      setConnectionState('error')
      setPhase('error')
      setError('Authentication required - no access token')
      return
    }

    cleanup()
    setConnectionState('connecting')
    setPhase('connecting')
    setError(null)

    const wsUrl = buildWsUrl(`/ws/repos/${rid}/indexing?token=${session.access_token}`)
    console.log('[WS] Connecting to repo indexing:', rid)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        // Guard against stale socket callbacks after cleanup/reconnect
        if (ws !== wsRef.current) return
        console.log('[WS] Connected')
        reconnectAttempts.current = 0
        setConnectionState('connected')
      }

      ws.onmessage = (event) => {
        // Guard against stale socket callbacks
        if (ws !== wsRef.current) return
        handleMessage(event)
      }

      ws.onerror = () => {
        // Guard against stale socket callbacks
        if (ws !== wsRef.current) return
        setConnectionState('error')
        setPhase('error')
        setError('WebSocket connection error')
      }

      ws.onclose = (event) => {
        // Guard against stale socket callbacks after cleanup/reconnect
        if (ws !== wsRef.current) return
        
        console.log('[WS] Closed:', event.code, event.reason)
        
        // Normal closure or auth failure - don't reconnect
        if (event.code === 1000 || event.code === 4001 || event.code === 4004) {
          setConnectionState('disconnected')
          return
        }
        
        // Try to reconnect (max 3 attempts)
        if (reconnectAttempts.current < 3) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 5000)
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++
            connect(rid)
          }, delay)
        } else {
          setConnectionState('error')
          setPhase('error')
          setError('Connection failed after multiple attempts')
        }
      }
    } catch (err) {
      console.error('[WS] Connection error:', err)
      setConnectionState('error')
      setPhase('error')
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket')
    }
  }, [session?.access_token, cleanup, handleMessage])

  // Connect when repoId changes
  // Note: phase intentionally excluded from deps - we use phaseRef to check completion
  // without triggering reconnects when phase changes to 'completed'
  useEffect(() => {
    if (repoId && session?.access_token) {
      connect(repoId)
    } else {
      cleanup()
      // Only reset if not completed (use ref to avoid dependency)
      if (phaseRef.current !== 'completed') {
        setConnectionState('idle')
        setPhase('idle')
        setProgress(INITIAL_PROGRESS)
        setRecentFiles([])
        setError(null)
      }
    }
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId, session?.access_token, connect, cleanup])

  const reset = useCallback(() => {
    cleanup()
    setConnectionState('idle')
    setPhase('idle')
    setProgress(INITIAL_PROGRESS)
    setRecentFiles([])
    setCompletedStats(null)
    setError(null)
    setIsRecoverable(false)
  }, [cleanup])

  return {
    connectionState,
    phase,
    progress,
    recentFiles,
    completedStats,
    error,
    isRecoverable,
    reset,
    isConnected: connectionState === 'connected',
    isIndexing: phase === 'indexing',
    isCompleted: phase === 'completed',
    hasError: phase === 'error',
  }
}

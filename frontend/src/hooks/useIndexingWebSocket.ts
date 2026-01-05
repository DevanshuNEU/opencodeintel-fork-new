/**
 * useIndexingWebSocket
 * 
 * WebSocket hook for real-time indexing progress updates.
 * Connects to the playground WebSocket endpoint and streams
 * progress events as files are processed.
 * 
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Fallback to polling if WS unavailable
 * - Type-safe event handling
 * - Connection state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildWsUrl, API_URL } from '@/config/api';

// =============================================================================
// TYPES
// =============================================================================

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WSProgressEvent {
  type: 'progress';
  job_id: string;
  files_processed: number;
  files_total: number;
  current_file: string;
  functions_found: number;
  percent: number;
}

export interface WSCompletedEvent {
  type: 'completed';
  job_id: string;
  repo_id: string;
  stats: {
    files_processed: number;
    functions_indexed: number;
    indexing_time_seconds: number;
  };
}

export interface WSErrorEvent {
  type: 'error';
  job_id: string;
  error: string;
  message: string;
  recoverable: boolean;
}

export interface WSCloningEvent {
  type: 'cloning';
  job_id: string;
  repo_name: string;
  message: string;
}

export interface WSConnectedEvent {
  type: 'connected';
  job_id: string;
  message: string;
}

export interface WSPingEvent {
  type: 'ping';
  job_id: string;
}

export type WSEvent = 
  | WSProgressEvent 
  | WSCompletedEvent 
  | WSErrorEvent 
  | WSCloningEvent 
  | WSConnectedEvent
  | WSPingEvent;

export interface IndexingState {
  connectionState: WSConnectionState;
  phase: 'idle' | 'connecting' | 'cloning' | 'indexing' | 'completed' | 'error';
  progress: {
    percent: number;
    filesProcessed: number;
    filesTotal: number;
    currentFile: string;
    functionsFound: number;
  };
  recentFiles: string[];  // Last N files processed (for streaming effect)
  completedStats: WSCompletedEvent['stats'] | null;
  repoId: string | null;
  error: string | null;
  isRecoverable: boolean;
}

interface UseIndexingWebSocketOptions {
  maxRecentFiles?: number;  // How many recent files to keep in list
  onCompleted?: (repoId: string, stats: WSCompletedEvent['stats']) => void;
  onError?: (error: string, recoverable: boolean) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useIndexingWebSocket(
  jobId: string | null,
  options: UseIndexingWebSocketOptions = {}
) {
  const { 
    maxRecentFiles = 15, 
    onCompleted, 
    onError 
  } = options;

  // State
  const [state, setState] = useState<IndexingState>({
    connectionState: 'disconnected',
    phase: 'idle',
    progress: {
      percent: 0,
      filesProcessed: 0,
      filesTotal: 0,
      currentFile: '',
      functionsFound: 0,
    },
    recentFiles: [],
    completedStats: null,
    repoId: null,
    error: null,
    isRecoverable: false,
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Fallback polling (if WebSocket fails)
  const startPolling = useCallback((jid: string) => {
    if (pollingInterval.current) return;

    console.log('[WS] Falling back to polling for job:', jid);
    
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/playground/job/${jid}/status`);
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (data.status === 'completed') {
          clearInterval(pollingInterval.current!);
          pollingInterval.current = null;
          setState(prev => ({
            ...prev,
            phase: 'completed',
            repoId: data.repo_id,
            completedStats: {
              files_processed: data.files_processed || 0,
              functions_indexed: data.functions_indexed || 0,
              indexing_time_seconds: data.indexing_time || 0,
            },
          }));
          onCompleted?.(data.repo_id, {
            files_processed: data.files_processed || 0,
            functions_indexed: data.functions_indexed || 0,
            indexing_time_seconds: data.indexing_time || 0,
          });
        } else if (data.status === 'failed') {
          clearInterval(pollingInterval.current!);
          pollingInterval.current = null;
          setState(prev => ({
            ...prev,
            phase: 'error',
            error: data.error || 'Indexing failed',
            isRecoverable: false,
          }));
          onError?.(data.error || 'Indexing failed', false);
        } else if (data.status === 'indexing') {
          setState(prev => ({
            ...prev,
            phase: 'indexing',
            progress: {
              percent: data.percent || 0,
              filesProcessed: data.files_processed || 0,
              filesTotal: data.files_total || 0,
              currentFile: data.current_file || '',
              functionsFound: data.functions_found || 0,
            },
          }));
        }
      } catch (err) {
        console.error('[Polling] Error:', err);
      }
    }, 2000);
  }, [onCompleted, onError]);

  // Handle WebSocket message
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WSEvent = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          setState(prev => ({
            ...prev,
            connectionState: 'connected',
            phase: 'connecting',
          }));
          break;

        case 'ping':
          // Keepalive, ignore
          break;

        case 'cloning':
          setState(prev => ({
            ...prev,
            phase: 'cloning',
          }));
          break;

        case 'progress':
          setState(prev => {
            // Add current file to recent files list (for streaming effect)
            const newRecentFiles = data.current_file 
              ? [data.current_file, ...prev.recentFiles.filter(f => f !== data.current_file)].slice(0, maxRecentFiles)
              : prev.recentFiles;

            return {
              ...prev,
              phase: 'indexing',
              progress: {
                percent: data.percent,
                filesProcessed: data.files_processed,
                filesTotal: data.files_total,
                currentFile: data.current_file,
                functionsFound: data.functions_found,
              },
              recentFiles: newRecentFiles,
            };
          });
          break;

        case 'completed':
          setState(prev => ({
            ...prev,
            phase: 'completed',
            repoId: data.repo_id,
            completedStats: data.stats,
            progress: {
              ...prev.progress,
              percent: 100,
            },
          }));
          onCompleted?.(data.repo_id, data.stats);
          break;

        case 'error':
          setState(prev => ({
            ...prev,
            phase: 'error',
            error: data.message,
            isRecoverable: data.recoverable,
          }));
          onError?.(data.message, data.recoverable);
          break;
      }
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  }, [maxRecentFiles, onCompleted, onError]);

  // Connect to WebSocket
  const connect = useCallback((jid: string) => {
    cleanup();
    
    setState(prev => ({
      ...prev,
      connectionState: 'connecting',
      phase: 'connecting',
      error: null,
    }));

    const wsUrl = buildWsUrl(`/ws/playground/${jid}`);
    console.log('[WS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        reconnectAttempts.current = 0;
        setState(prev => ({
          ...prev,
          connectionState: 'connected',
        }));
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setState(prev => ({
          ...prev,
          connectionState: 'error',
        }));
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event.reason);
        
        // If closed cleanly (1000) or job doesn't exist (4404), don't reconnect
        if (event.code === 1000 || event.code === 4404) {
          setState(prev => ({
            ...prev,
            connectionState: 'disconnected',
          }));
          return;
        }

        // Try to reconnect with exponential backoff
        if (reconnectAttempts.current < 3) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 5000);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect(jid);
          }, delay);
        } else {
          // Fallback to polling after 3 failed attempts
          console.log('[WS] Max reconnect attempts reached, falling back to polling');
          startPolling(jid);
        }
      };
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      startPolling(jid);
    }
  }, [cleanup, handleMessage, startPolling]);

  // Connect when jobId changes
  useEffect(() => {
    if (jobId) {
      connect(jobId);
    } else {
      cleanup();
      setState({
        connectionState: 'disconnected',
        phase: 'idle',
        progress: {
          percent: 0,
          filesProcessed: 0,
          filesTotal: 0,
          currentFile: '',
          functionsFound: 0,
        },
        recentFiles: [],
        completedStats: null,
        repoId: null,
        error: null,
        isRecoverable: false,
      });
    }

    return cleanup;
  }, [jobId, connect, cleanup]);

  // Reset function
  const reset = useCallback(() => {
    cleanup();
    setState({
      connectionState: 'disconnected',
      phase: 'idle',
      progress: {
        percent: 0,
        filesProcessed: 0,
        filesTotal: 0,
        currentFile: '',
        functionsFound: 0,
      },
      recentFiles: [],
      completedStats: null,
      repoId: null,
      error: null,
      isRecoverable: false,
    });
  }, [cleanup]);

  return {
    ...state,
    reset,
    isConnected: state.connectionState === 'connected',
    isIndexing: state.phase === 'indexing' || state.phase === 'cloning',
    isCompleted: state.phase === 'completed',
    hasError: state.phase === 'error',
  };
}

export default useIndexingWebSocket;

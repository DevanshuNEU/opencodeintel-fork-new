/**
 * useIndexingWebSocket
 * 
 * WebSocket hook for real-time indexing progress updates.
 * Uses refs for callbacks to prevent infinite render loops.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildWsUrl, API_URL } from '@/config/api';

// Types
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

export type WSEvent = 
  | WSProgressEvent 
  | WSCompletedEvent 
  | WSErrorEvent 
  | { type: 'cloning'; job_id: string; repo_name: string; message: string }
  | { type: 'connected'; job_id: string; message: string }
  | { type: 'ping'; job_id: string };

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
  recentFiles: string[];
  completedStats: WSCompletedEvent['stats'] | null;
  repoId: string | null;
  error: string | null;
  isRecoverable: boolean;
}

interface UseIndexingWebSocketOptions {
  maxRecentFiles?: number;
  onCompleted?: (repoId: string, stats: WSCompletedEvent['stats']) => void;
  onError?: (error: string, recoverable: boolean) => void;
}

const INITIAL_STATE: IndexingState = {
  connectionState: 'disconnected',
  phase: 'idle',
  progress: { percent: 0, filesProcessed: 0, filesTotal: 0, currentFile: '', functionsFound: 0 },
  recentFiles: [],
  completedStats: null,
  repoId: null,
  error: null,
  isRecoverable: false,
};

export function useIndexingWebSocket(
  jobId: string | null,
  options: UseIndexingWebSocketOptions = {}
) {
  const { maxRecentFiles = 15 } = options;

  // CRITICAL: Use refs for callbacks to avoid dependency loops
  const onCompletedRef = useRef(options.onCompleted);
  const onErrorRef = useRef(options.onError);
  onCompletedRef.current = options.onCompleted;
  onErrorRef.current = options.onError;

  const [state, setState] = useState<IndexingState>(INITIAL_STATE);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    reconnectTimeout.current = null;
    pollingInterval.current = null;
  }, []);

  const startPolling = useCallback((jid: string) => {
    if (pollingInterval.current) return;
    console.log('[WS] Falling back to polling');
    
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/playground/job/${jid}/status`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.status === 'completed') {
          clearInterval(pollingInterval.current!);
          pollingInterval.current = null;
          const stats = {
            files_processed: data.files_processed || 0,
            functions_indexed: data.functions_indexed || 0,
            indexing_time_seconds: data.indexing_time || 0,
          };
          setState(prev => ({ ...prev, phase: 'completed', repoId: data.repo_id, completedStats: stats }));
          onCompletedRef.current?.(data.repo_id, stats);
        } else if (data.status === 'failed') {
          clearInterval(pollingInterval.current!);
          pollingInterval.current = null;
          setState(prev => ({ ...prev, phase: 'error', error: data.error || 'Failed', isRecoverable: false }));
          onErrorRef.current?.(data.error || 'Failed', false);
        } else {
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
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WSEvent = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        setState(prev => ({ ...prev, connectionState: 'connected', phase: 'connecting' }));
      } else if (data.type === 'ping') {
        // Keepalive
      } else if (data.type === 'cloning') {
        setState(prev => ({ ...prev, phase: 'cloning' }));
      } else if (data.type === 'progress') {
        setState(prev => {
          const newFiles = data.current_file 
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
            recentFiles: newFiles,
          };
        });
      } else if (data.type === 'completed') {
        setState(prev => ({
          ...prev,
          phase: 'completed',
          repoId: data.repo_id,
          completedStats: data.stats,
          progress: { ...prev.progress, percent: 100 },
        }));
        onCompletedRef.current?.(data.repo_id, data.stats);
      } else if (data.type === 'error') {
        setState(prev => ({ ...prev, phase: 'error', error: data.message, isRecoverable: data.recoverable }));
        onErrorRef.current?.(data.message, data.recoverable);
      }
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  }, [maxRecentFiles]);

  const connect = useCallback((jid: string) => {
    cleanup();
    setState(prev => ({ ...prev, connectionState: 'connecting', phase: 'connecting', error: null }));

    const wsUrl = buildWsUrl(`/ws/playground/${jid}`);
    console.log('[WS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        reconnectAttempts.current = 0;
        setState(prev => ({ ...prev, connectionState: 'connected' }));
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        setState(prev => ({ ...prev, connectionState: 'error' }));
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code);
        if (event.code === 1000 || event.code === 4404) {
          setState(prev => ({ ...prev, connectionState: 'disconnected' }));
          return;
        }
        if (reconnectAttempts.current < 3) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 5000);
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect(jid);
          }, delay);
        } else {
          startPolling(jid);
        }
      };
    } catch {
      startPolling(jid);
    }
  }, [cleanup, handleMessage, startPolling]);

  useEffect(() => {
    if (jobId) {
      connect(jobId);
    } else {
      // Only cleanup connection, DON'T reset state!
      // This preserves completedStats when jobId becomes null after completion
      cleanup();
      // Only reset if we were never completed (e.g., user navigated away during indexing)
      setState(prev => {
        if (prev.phase === 'completed') {
          // Keep completed state - just disconnect
          return { ...prev, connectionState: 'disconnected' };
        }
        // Reset if we were mid-indexing (user cancelled, navigated away, etc.)
        return INITIAL_STATE;
      });
    }
    return cleanup;
  }, [jobId, connect, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState(INITIAL_STATE);
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

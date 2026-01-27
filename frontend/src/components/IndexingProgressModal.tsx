'use client'

/**
 * IndexingProgressModal
 * 
 * Real-time indexing progress display with file streaming.
 * Uses WebSocket for live updates.
 */

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileCode2,
  X,
  RefreshCw
} from 'lucide-react'
import { 
  useRepoIndexingWebSocket
} from '@/hooks/useRepoIndexingWebSocket'
import type { 
  IndexingPhase,
  IndexingStats 
} from '@/hooks/useRepoIndexingWebSocket'

interface IndexingProgressModalProps {
  repoId: string | null
  repoName: string
  isOpen: boolean
  onClose: () => void
  onCompleted?: (repoId: string, stats: IndexingStats) => void
  onRetry?: () => void
}

export function IndexingProgressModal({
  repoId,
  repoName,
  isOpen,
  onClose,
  onCompleted,
  onRetry,
}: IndexingProgressModalProps) {
  const {
    phase,
    progress,
    recentFiles,
    completedStats,
    error,
    isRecoverable,
    reset,
  } = useRepoIndexingWebSocket(isOpen ? repoId : null, {
    onCompleted: (rid, stats) => {
      onCompleted?.(rid, stats)
    },
  })

  // Auto-close after completion (with delay for user to see success)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  useEffect(() => {
    if (phase === 'completed') {
      closeTimeoutRef.current = setTimeout(() => {
        onClose()
        reset()
      }, 3500)  // 3.5s to let user see completion stats
    }
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
    }
  }, [phase, onClose, reset])

  // Clear timeout when modal closes
  useEffect(() => {
    if (!isOpen && closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [isOpen])

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current)
          closeTimeoutRef.current = null
        }
        reset()
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, reset])

  const handleClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    reset()
    onClose()
  }

  const handleRetry = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    reset()
    onRetry?.()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg mx-4 bg-[#0d0d14] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="indexing-progress-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h3 id="indexing-progress-title" className="text-lg font-semibold text-white">
              Indexing {repoName}
            </h3>
            <button
              onClick={handleClose}
              aria-label="Close dialog"
              className="p-1 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <PhaseIndicator phase={phase} error={error} />
            
            {/* Progress bar */}
            {(phase === 'indexing' || phase === 'completed') && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Progress</span>
                  <span className="text-white font-medium">{progress.percent}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Stats */}
            {phase === 'indexing' && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <StatCard label="Files" value={`${progress.filesProcessed}/${progress.filesTotal}`} />
                <StatCard label="Functions" value={progress.functionsFound.toString()} />
              </div>
            )}

            {/* Recent files */}
            {phase === 'indexing' && recentFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-zinc-400 mb-2">Processing</p>
                <div className="space-y-1.5 overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {recentFiles.slice(0, 5).map((file, i) => (
                      <motion.div
                        key={file}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ 
                          opacity: i === 0 ? 1 : 0.7 - i * 0.12,
                          x: 0,
                          scale: 1,
                          transition: { 
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            delay: i * 0.03
                          }
                        }}
                        exit={{ 
                          opacity: 0, 
                          x: 20,
                          scale: 0.95,
                          transition: { duration: 0.2 }
                        }}
                        className={`flex items-center gap-2 text-sm ${
                          i === 0 ? 'text-white' : 'text-zinc-400'
                        }`}
                      >
                        <FileCode2 className={`w-3.5 h-3.5 flex-shrink-0 ${
                          i === 0 ? 'text-indigo-400' : 'text-zinc-500'
                        }`} />
                        <span className="truncate">{file}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Completion stats */}
            {phase === 'completed' && completedStats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 grid grid-cols-3 gap-3"
              >
                <StatCard label="Files" value={completedStats.files_processed.toString()} />
                <StatCard label="Functions" value={completedStats.functions_indexed.toString()} />
                <StatCard label="Time" value={`${completedStats.indexing_time_seconds.toFixed(1)}s`} />
              </motion.div>
            )}

            {/* Error with retry */}
            {phase === 'error' && isRecoverable && onRetry && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleRetry}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </motion.button>
            )}
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PhaseIndicator({ phase, error }: { phase: IndexingPhase; error: string | null }) {
  const config = {
    idle: { icon: Loader2, text: 'Preparing...', color: 'text-zinc-400', spin: true },
    connecting: { icon: Loader2, text: 'Connecting...', color: 'text-zinc-400', spin: true },
    indexing: { icon: Loader2, text: 'Indexing repository...', color: 'text-indigo-400', spin: true },
    completed: { icon: CheckCircle2, text: 'Indexing complete!', color: 'text-emerald-400', spin: false },
    error: { icon: AlertCircle, text: error || 'An error occurred', color: 'text-red-400', spin: false },
  }

  const { icon: Icon, text, color, spin } = config[phase]

  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${phase === 'completed' ? 'bg-emerald-500/10' : phase === 'error' ? 'bg-red-500/10' : 'bg-zinc-800'}`}>
        <Icon className={`w-5 h-5 ${color} ${spin ? 'animate-spin' : ''}`} />
      </div>
      <span className={`text-sm font-medium ${color}`}>{text}</span>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  )
}

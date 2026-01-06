/**
 * IndexingProgress (v2 - WebSocket Enhanced)
 * 
 * Displays real-time progress during repository indexing with
 * streaming file list that shows each file as it's processed.
 * 
 * Features:
 * - Phase indicators (cloning → indexing → completed)
 * - Streaming file list with staggered animations
 * - Progress bar with gradient glow
 * - Real-time stats
 * - Premium animations
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// =============================================================================
// TYPES
// =============================================================================

export interface ProgressData {
  percent: number;
  filesProcessed: number;
  filesTotal: number;
  currentFile?: string;
  functionsFound: number;
}

export type IndexingPhase = 'connecting' | 'cloning' | 'indexing' | 'completed' | 'error';

interface IndexingProgressProps {
  progress: ProgressData;
  phase?: IndexingPhase;
  repoName?: string;
  recentFiles?: string[];  // Streaming file list from WebSocket
  onCancel?: () => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function AnimatedDots() {
  return (
    <span className="inline-flex ml-1" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="text-indigo-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

function PhaseIndicator({ phase }: { phase: IndexingPhase }) {
  const phases: { key: IndexingPhase; label: string; icon: string }[] = [
    { key: 'cloning', label: 'Clone', icon: '📥' },
    { key: 'indexing', label: 'Index', icon: '⚡' },
    { key: 'completed', label: 'Done', icon: '✓' },
  ];

  const currentIndex = phases.findIndex(p => p.key === phase);

  return (
    <div className="flex items-center gap-2 text-xs">
      {phases.map((p, i) => {
        const isActive = p.key === phase;
        const isCompleted = currentIndex > i;
        const isPending = currentIndex < i;

        return (
          <div key={p.key} className="flex items-center gap-1">
            <motion.div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors',
                isActive && 'bg-indigo-600 text-white',
                isCompleted && 'bg-emerald-600 text-white',
                isPending && 'bg-zinc-800 text-zinc-500'
              )}
              animate={isActive ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {isCompleted ? '✓' : p.icon}
            </motion.div>
            <span className={cn(
              'hidden sm:inline transition-colors',
              isActive && 'text-white',
              isCompleted && 'text-emerald-400',
              isPending && 'text-zinc-500'
            )}>
              {p.label}
            </span>
            {i < phases.length - 1 && (
              <div className={cn(
                'w-8 h-0.5 mx-1',
                isCompleted ? 'bg-emerald-600' : 'bg-zinc-800'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FileIcon({ filename }: { filename: string }) {
  // Determine icon based on file extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, string> = {
    py: '🐍',
    js: '📜',
    ts: '💠',
    tsx: '⚛️',
    jsx: '⚛️',
    go: '🔵',
    rs: '🦀',
    java: '☕',
    rb: '💎',
    php: '🐘',
    c: '⚙️',
    cpp: '⚙️',
    h: '📋',
    md: '📝',
    json: '📦',
    yaml: '📄',
    yml: '📄',
  };

  return <span className="text-sm">{iconMap[ext] || '📄'}</span>;
}

/**
 * Streaming file list - The "holy shit" feature
 * Shows files appearing in real-time as they're processed
 */
function StreamingFileList({ files, maxVisible = 8 }: { files: string[]; maxVisible?: number }) {
  const listRef = useRef<HTMLDivElement>(null);
  const visibleFiles = files.slice(0, maxVisible);
  const hiddenCount = Math.max(0, files.length - maxVisible);

  return (
    <div 
      ref={listRef}
      className="relative overflow-hidden"
      style={{ maxHeight: `${maxVisible * 32}px` }}
    >
      {/* Gradient fade at bottom if more files hidden */}
      {hiddenCount > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent z-10 pointer-events-none" />
      )}
      
      <AnimatePresence mode="popLayout">
        {visibleFiles.map((file, index) => (
          <motion.div
            key={file}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 32 }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
              delay: index * 0.02,
            }}
            className="flex items-center gap-2 px-3 py-1 overflow-hidden"
          >
            <FileIcon filename={file} />
            <span 
              className={cn(
                'font-mono text-sm truncate transition-colors duration-300',
                index === 0 ? 'text-indigo-300' : 'text-zinc-400'
              )}
              title={file}
            >
              {file}
            </span>
            {index === 0 && (
              <motion.span
                className="ml-auto text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                processing
              </motion.span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Hidden files counter */}
      {hiddenCount > 0 && (
        <div className="text-xs text-zinc-500 px-3 py-1">
          +{hiddenCount} more files processed
        </div>
      )}
    </div>
  );
}

function GlowingProgress({ value }: { value: number }) {
  return (
    <div className="relative">
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-md bg-indigo-500/30"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        style={{ width: `${value}%` }}
      />
      {/* Actual progress bar */}
      <Progress 
        value={value} 
        className="h-2 bg-zinc-800 relative z-10"
      />
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-zinc-500 text-xs mb-1">{label}</div>
      <motion.div 
        className={cn(
          'font-bold text-lg',
          highlight ? 'text-indigo-400' : 'text-white'
        )}
        key={value.toString()}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </motion.div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IndexingProgress({ 
  progress, 
  phase = 'indexing',
  repoName, 
  recentFiles = [],
  onCancel 
}: IndexingProgressProps) {
  const { percent, filesProcessed, filesTotal, currentFile, functionsFound } = progress;
  
  // Safe values to prevent NaN/division by zero
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const safeFilesProcessed = Number.isFinite(filesProcessed) ? Math.max(0, filesProcessed) : 0;
  const safeFilesTotal = Number.isFinite(filesTotal) ? Math.max(0, filesTotal) : 0;
  const safeFunctionsFound = Number.isFinite(functionsFound) ? Math.max(0, functionsFound) : 0;
  
  // Is this the initial "starting" state?
  const isStarting = safeFilesTotal === 0 || (safePercent === 0 && safeFilesProcessed === 0);
  
  // Estimate remaining time (only when we have real data)
  const estimatedRemaining = (() => {
    if (isStarting || safePercent <= 0 || safeFilesProcessed <= 0) return null;
    const remainingFiles = Math.ceil((safeFilesProcessed / safePercent) * (100 - safePercent));
    return Math.max(1, Math.ceil(remainingFiles * 0.15));
  })();

  // Use currentFile if recentFiles is empty
  const displayFiles = recentFiles.length > 0 
    ? recentFiles 
    : currentFile 
      ? [currentFile] 
      : [];

  return (
    <motion.div 
      className="rounded-2xl bg-zinc-900/90 border border-zinc-800 overflow-hidden backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      aria-label={`Indexing ${repoName || 'repository'}: ${safePercent}% complete`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 bg-gradient-to-r from-zinc-900 to-zinc-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-xl"
              animate={{ rotate: phase === 'indexing' ? [0, 360] : 0 }}
              transition={{ duration: 2, repeat: phase === 'indexing' ? Infinity : 0, ease: 'linear' }}
            >
              {phase === 'cloning' ? '📥' : phase === 'completed' ? '✅' : '⚡'}
            </motion.span>
            <span className="text-white font-semibold">
              {phase === 'cloning' ? 'Cloning' : phase === 'completed' ? 'Indexed' : 'Indexing'}
              {' '}{repoName || 'repository'}
              {phase !== 'completed' && <AnimatedDots />}
            </span>
          </div>
          <motion.span 
            className="text-3xl font-bold text-indigo-400"
            key={safePercent}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {safePercent}%
          </motion.span>
        </div>
        
        {/* Phase indicator */}
        <PhaseIndicator phase={phase} />
      </div>

      {/* Progress bar */}
      <div className="px-5 py-4">
        <GlowingProgress value={safePercent} />
      </div>

      {/* Stats grid */}
      <div className="px-5 py-4 bg-zinc-900/50 border-t border-b border-zinc-800/50">
        <div className="grid grid-cols-4 gap-4">
          <StatCard 
            label="Files" 
            value={isStarting ? 'Starting...' : `${safeFilesProcessed}/${safeFilesTotal}`} 
          />
          <StatCard 
            label="Functions" 
            value={isStarting ? '—' : safeFunctionsFound} 
            highlight={!isStarting && safeFunctionsFound > 0} 
          />
          <StatCard 
            label="Remaining" 
            value={estimatedRemaining ? `~${estimatedRemaining}s` : '—'} 
          />
          <StatCard 
            label="Speed" 
            value={safeFilesProcessed > 0 ? `${Math.round(safeFunctionsFound / safeFilesProcessed)}/file` : '—'} 
          />
        </div>
      </div>

      {/* Streaming file list - THE FEATURE */}
      {displayFiles.length > 0 && (
        <div className="border-t border-zinc-800/50">
          <div className="px-4 py-2 text-xs text-zinc-500 font-medium uppercase tracking-wider">
            Processing Files
          </div>
          <StreamingFileList files={displayFiles} />
        </div>
      )}

      {/* Cancel button */}
      {onCancel && phase !== 'completed' && (
        <div className="px-5 py-3 border-t border-zinc-800/50">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'w-full py-2.5 px-4 rounded-xl text-sm font-medium',
              'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200',
              'border border-zinc-700/50 hover:border-zinc-600',
              'transition-all duration-200'
            )}
          >
            Cancel Indexing
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default IndexingProgress;

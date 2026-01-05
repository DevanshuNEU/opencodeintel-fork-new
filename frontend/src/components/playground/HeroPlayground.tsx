/**
 * HeroPlayground (v2 - WebSocket Enhanced)
 * 
 * Combined demo + custom repo experience for the landing page hero.
 * Now with real-time WebSocket progress updates and streaming file list.
 * 
 * Features:
 * - Mode switching (demo/custom)
 * - URL validation
 * - Real-time indexing progress via WebSocket
 * - Streaming file list (the "holy shit" moment)
 * - Celebration screen on completion
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  RepoModeSelector, 
  RepoUrlInput, 
  ValidationStatus, 
  IndexingProgress,
  IndexingComplete,
  type RepoMode,
  type IndexingPhase,
} from '@/components/playground';
import { useAnonymousSession } from '@/hooks/useAnonymousSession';
import { useIndexingWebSocket } from '@/hooks/useIndexingWebSocket';
import { cn } from '@/lib/utils';

// Demo repos config
const DEMO_REPOS = [
  { id: 'flask', name: 'Flask', icon: '🐍' },
  { id: 'fastapi', name: 'FastAPI', icon: '⚡' },
  { id: 'express', name: 'Express', icon: '🟢' },
];

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

interface HeroPlaygroundProps {
  onSearch: (query: string, repoId: string, isCustom: boolean) => void;
  availableRepos?: string[];
  remaining?: number;
  loading?: boolean;
}

export function HeroPlayground({ 
  onSearch, 
  availableRepos = [], 
  remaining = 50,
  loading = false 
}: HeroPlaygroundProps) {
  const navigate = useNavigate();
  
  // Mode: demo repos or custom repo
  const [mode, setMode] = useState<RepoMode>('demo');
  const [selectedDemo, setSelectedDemo] = useState(DEMO_REPOS[0].id);
  const [customUrl, setCustomUrl] = useState('');
  const [query, setQuery] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Anonymous session hook for validation and job creation
  const { state, validateUrl, startIndexing, reset: resetSession, session } = useAnonymousSession();

  // Extract jobId for WebSocket connection
  const jobId = state.status === 'indexing' ? state.jobId : null;
  const repoName = customUrl.split('/').pop()?.replace('.git', '') || 'repository';

  // WebSocket hook for real-time progress
  const wsState = useIndexingWebSocket(jobId, {
    maxRecentFiles: 12,
    onCompleted: (repoId, stats) => {
      console.log('[HeroPlayground] Indexing completed:', repoId, stats);
      setShowCelebration(true);
    },
    onError: (error, recoverable) => {
      console.error('[HeroPlayground] Indexing error:', error, recoverable);
    },
  });

  // Map WebSocket phase to IndexingProgress phase
  const getIndexingPhase = (): IndexingPhase => {
    if (wsState.phase === 'cloning') return 'cloning';
    if (wsState.phase === 'indexing') return 'indexing';
    if (wsState.phase === 'completed') return 'completed';
    if (wsState.phase === 'error') return 'error';
    return 'connecting';
  };

  // Handle mode change
  const handleModeChange = useCallback((newMode: RepoMode) => {
    setMode(newMode);
    if (newMode === 'demo') {
      resetSession();
      wsState.reset();
      setCustomUrl('');
      setShowCelebration(false);
    }
  }, [resetSession, wsState]);

  // Handle search submit
  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    if (mode === 'demo') {
      onSearch(query, selectedDemo, false);
    } else if (state.status === 'ready') {
      onSearch(query, state.repoId, true);
    } else if (wsState.isCompleted && wsState.repoId) {
      // Search using repo from completed WebSocket state
      onSearch(query, wsState.repoId, true);
    }
  }, [query, mode, selectedDemo, state, wsState, loading, onSearch]);

  // Start searching after celebration
  const handleStartSearching = useCallback(() => {
    setShowCelebration(false);
  }, []);

  // Index another repo
  const handleIndexAnother = useCallback(() => {
    resetSession();
    wsState.reset();
    setCustomUrl('');
    setShowCelebration(false);
  }, [resetSession, wsState]);

  // Get validation state for ValidationStatus component
  const getValidationState = () => {
    if (state.status === 'idle') return { type: 'idle' as const };
    if (state.status === 'validating') return { type: 'validating' as const };
    if (state.status === 'valid') return { type: 'valid' as const, validation: state.validation };
    if (state.status === 'invalid') return { type: 'invalid' as const, error: state.error, reason: state.reason };
    return { type: 'idle' as const };
  };

  // Determine visibility states
  const showDemoSelector = mode === 'demo';
  const showUrlInput = mode === 'custom' && !['indexing', 'ready'].includes(state.status) && !showCelebration && !wsState.isCompleted;
  const showValidation = mode === 'custom' && ['validating', 'valid', 'invalid'].includes(state.status) && !showCelebration;
  const showIndexing = mode === 'custom' && state.status === 'indexing' && !showCelebration && !wsState.isCompleted;
  const showReady = (mode === 'custom' && state.status === 'ready') || (wsState.isCompleted && !showCelebration);
  const isSearchDisabled = mode === 'custom' && state.status !== 'ready' && !wsState.isCompleted;

  // Can search?
  const canSearch = mode === 'demo' 
    ? remaining > 0 && query.trim().length > 0
    : (state.status === 'ready' || wsState.isCompleted) && remaining > 0 && query.trim().length > 0;

  // Get contextual placeholder text
  const getPlaceholder = () => {
    if (mode === 'demo') {
      return "Search for authentication, error handling...";
    }
    if (state.status === 'idle') return "Enter a GitHub URL above to start...";
    if (state.status === 'validating') return "Validating repository...";
    if (state.status === 'valid') return "Click 'Index Repository' to continue...";
    if (state.status === 'invalid') return "Fix the URL above to continue...";
    if (state.status === 'indexing') return "Indexing in progress...";
    if (state.status === 'ready' || wsState.isCompleted) return `Search in ${repoName}...`;
    return "Enter a GitHub URL to search...";
  };

  // Compute ready state info
  const readyInfo = wsState.isCompleted && wsState.completedStats ? {
    repoName,
    fileCount: wsState.completedStats.files_processed,
    functionsFound: wsState.completedStats.functions_indexed,
  } : state.status === 'ready' ? {
    repoName: state.repoName,
    fileCount: state.fileCount,
    functionsFound: state.functionsFound,
  } : null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Mode Selector */}
      <div className="flex justify-center mb-6">
        <RepoModeSelector 
          mode={mode} 
          onModeChange={handleModeChange}
          disabled={state.status === 'indexing'}
        />
      </div>

      {/* Demo Repo Buttons */}
      {showDemoSelector && (
        <div className="flex justify-center gap-3 mb-6">
          {DEMO_REPOS.map(repo => {
            const isAvailable = availableRepos.length === 0 || availableRepos.includes(repo.id);
            const isSelected = selectedDemo === repo.id;
            return (
              <button
                key={repo.id}
                type="button"
                onClick={() => isAvailable && setSelectedDemo(repo.id)}
                disabled={!isAvailable}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800',
                  !isAvailable && 'opacity-40 cursor-not-allowed'
                )}
              >
                <span className="mr-2">{repo.icon}</span>
                {repo.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom URL Input */}
      <AnimatePresence mode="wait">
        {showUrlInput && (
          <motion.div
            key="url-input"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4"
          >
            <RepoUrlInput
              value={customUrl}
              onChange={setCustomUrl}
              onValidate={validateUrl}
              placeholder="https://github.com/owner/repo"
              disabled={state.status === 'validating'}
            />
          </motion.div>
        )}

        {/* Validation Status */}
        {showValidation && (
          <motion.div
            key="validation"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4"
          >
            <ValidationStatus 
              state={getValidationState()}
              onStartIndexing={state.status === 'valid' ? startIndexing : undefined}
            />
          </motion.div>
        )}

        {/* Indexing Progress with WebSocket streaming */}
        {showIndexing && (
          <motion.div
            key="indexing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4"
          >
            <IndexingProgress
              progress={wsState.progress}
              phase={getIndexingPhase()}
              repoName={repoName}
              recentFiles={wsState.recentFiles}
              onCancel={() => {
                resetSession();
                wsState.reset();
              }}
            />
          </motion.div>
        )}

        {/* Celebration Screen */}
        {showCelebration && wsState.completedStats && (
          <motion.div
            key="celebration"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-4"
          >
            <IndexingComplete
              repoName={repoName}
              stats={wsState.completedStats}
              onStartSearching={handleStartSearching}
              onIndexAnother={handleIndexAnother}
            />
          </motion.div>
        )}

        {/* Ready State Banner */}
        {showReady && !showCelebration && readyInfo && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-300 text-sm">
                <strong>{readyInfo.repoName}</strong> indexed · {readyInfo.fileCount} files · {readyInfo.functionsFound.toLocaleString()} functions
              </span>
            </div>
            <button 
              type="button"
              onClick={handleIndexAnother}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Index different repo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Box */}
      {!showCelebration && (
        <>
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-50" />
            <div className={cn(
              "relative bg-zinc-900/80 rounded-2xl border border-zinc-800 p-3 transition-opacity duration-300",
              isSearchDisabled && "opacity-60"
            )}>
              <form onSubmit={handleSearch} className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3">
                  <div className="text-zinc-500 ml-2"><SearchIcon /></div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={getPlaceholder()}
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none text-base py-3"
                    disabled={isSearchDisabled}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!canSearch || loading || isSearchDisabled}
                  className={cn(
                    "px-6 py-3 h-auto rounded-xl transition-all",
                    canSearch && !loading && !isSearchDisabled
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Search'
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <ZapIcon />
              <span>~100ms</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>No signup required</span>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>{session?.searches.remaining ?? remaining} searches left</span>
          </div>
        </>
      )}

      {/* Error State */}
      {(state.status === 'error' || wsState.hasError) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <p className="text-red-300 text-sm">
            {state.status === 'error' ? state.message : wsState.error}
          </p>
          <button 
            type="button"
            onClick={handleIndexAnother}
            className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Upgrade CTA (when limit reached) */}
      {remaining <= 0 && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-center">
          <p className="text-zinc-300 mb-3">You've used all your free searches today</p>
          <Button 
            onClick={() => navigate('/signup')}
            className="bg-white text-black hover:bg-zinc-100"
          >
            Sign up for unlimited
          </Button>
        </div>
      )}
    </div>
  );
}

export default HeroPlayground;

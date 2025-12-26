/**
 * HeroPlayground
 * 
 * Combined demo + custom repo experience for the landing page hero.
 * Handles mode switching, URL validation, indexing, and search.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  RepoModeSelector, 
  RepoUrlInput, 
  ValidationStatus, 
  IndexingProgress,
  type RepoMode 
} from '@/components/playground';
import { useAnonymousSession } from '@/hooks/useAnonymousSession';
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
  
  // Anonymous session hook for custom repos
  const { state, validateUrl, startIndexing, reset, session } = useAnonymousSession();

  // Handle mode change
  const handleModeChange = useCallback((newMode: RepoMode) => {
    setMode(newMode);
    if (newMode === 'demo') {
      reset();
      setCustomUrl('');
    }
  }, [reset]);

  // Handle search submit
  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    if (mode === 'demo') {
      onSearch(query, selectedDemo, false);
    } else if (state.status === 'ready') {
      onSearch(query, state.repoId, true);
    }
  }, [query, mode, selectedDemo, state, loading, onSearch]);

  // Get validation state for ValidationStatus component
  const getValidationState = () => {
    if (state.status === 'idle') return { type: 'idle' as const };
    if (state.status === 'validating') return { type: 'validating' as const };
    if (state.status === 'valid') return { type: 'valid' as const, validation: state.validation };
    if (state.status === 'invalid') return { type: 'invalid' as const, error: state.error, reason: state.reason };
    return { type: 'idle' as const };
  };

  // Can search?
  const canSearch = mode === 'demo' 
    ? remaining > 0 && query.trim().length > 0
    : state.status === 'ready' && remaining > 0 && query.trim().length > 0;

  // Determine what to show based on state
  const showDemoSelector = mode === 'demo';
  const showUrlInput = mode === 'custom' && !['indexing', 'ready'].includes(state.status);
  const showValidation = mode === 'custom' && ['validating', 'valid', 'invalid'].includes(state.status);
  const showIndexing = mode === 'custom' && state.status === 'indexing';
  const showSearch = mode === 'demo' || state.status === 'ready';

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
      {showUrlInput && (
        <div className="mb-4">
          <RepoUrlInput
            value={customUrl}
            onChange={setCustomUrl}
            onValidate={validateUrl}
            placeholder="https://github.com/owner/repo"
            disabled={state.status === 'validating'}
          />
        </div>
      )}

      {/* Validation Status */}
      {showValidation && (
        <div className="mb-4">
          <ValidationStatus 
            state={getValidationState()}
            onStartIndexing={state.status === 'valid' ? startIndexing : undefined}
          />
        </div>
      )}

      {/* Indexing Progress */}
      {showIndexing && (
        <div className="mb-4">
          <IndexingProgress
            progress={state.progress}
            repoName={customUrl.split('/').pop()?.replace('.git', '')}
            onCancel={reset}
          />
        </div>
      )}

      {/* Ready State Banner */}
      {mode === 'custom' && state.status === 'ready' && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span className="text-emerald-300 text-sm">
              <strong>{state.repoName}</strong> indexed · {state.fileCount} files · {state.functionsFound} functions
            </span>
          </div>
          <button 
            type="button"
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Index different repo
          </button>
        </div>
      )}

      {/* Search Box */}
      {showSearch && (
        <>
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-50" />
            <div className="relative bg-zinc-900/80 rounded-2xl border border-zinc-800 p-3">
              <form onSubmit={handleSearch} className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3">
                  <div className="text-zinc-500 ml-2"><SearchIcon /></div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={mode === 'demo' 
                      ? "Search for authentication, error handling..." 
                      : `Search in ${state.status === 'ready' ? state.repoName : 'your repo'}...`
                    }
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none text-base py-3"
                    disabled={!canSearch && query.length === 0}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!canSearch || loading}
                  className="px-6 py-3 h-auto bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50"
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
      {state.status === 'error' && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 text-sm">{state.message}</p>
          {state.canRetry && (
            <button 
              type="button"
              onClick={reset}
              className="mt-2 text-xs text-red-400 hover:text-red-300"
            >
              Try again
            </button>
          )}
        </div>
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

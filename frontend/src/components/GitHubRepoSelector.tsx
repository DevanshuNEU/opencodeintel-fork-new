import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Search, Lock, Star, Loader2, X, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGitHubRepos, GitHubRepo } from '@/hooks/useGitHubRepos';

interface GitHubRepoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (repos: GitHubRepo[]) => void;
  maxSelectable?: number;
  currentRepoCount?: number;
}

export function GitHubRepoSelector({
  isOpen,
  onClose,
  onImport,
  maxSelectable = 3,
  currentRepoCount = 0,
}: GitHubRepoSelectorProps) {
  const { repos, status, loading, error, checkStatus, fetchRepos, initiateConnect, clearError } = useGitHubRepos();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [connecting, setConnecting] = useState(false);

  const remainingSlots = maxSelectable - currentRepoCount;

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setSelected(new Set());
      setSearchQuery('');
      clearError();
    }
  }, [isOpen, checkStatus, clearError]);

  useEffect(() => {
    if (isOpen && status?.connected) {
      fetchRepos();
    }
  }, [isOpen, status?.connected, fetchRepos]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const authUrl = await initiateConnect();
      if (authUrl) {
        // Redirect to GitHub OAuth
        window.location.href = authUrl;
      }
    } catch (err) {
      console.error('Failed to initiate GitHub connection:', err);
    } finally {
      setConnecting(false);
    }
  };

  const toggleSelect = (repoId: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else if (newSelected.size < remainingSlots) {
      newSelected.add(repoId);
    }
    setSelected(newSelected);
  };

  const handleImport = () => {
    const selectedRepos = repos.filter(r => selected.has(r.id));
    onImport(selectedRepos);
    setSelected(new Set());
    onClose();
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Github className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Import from GitHub</h3>
                <p className="text-sm text-muted-foreground">
                  {status?.connected ? `Connected as ${status.username}` : 'Connect to import repositories'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!status?.connected ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Github className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-medium text-foreground mb-2">Connect Your GitHub</h4>
                <p className="text-sm text-muted-foreground mb-2 max-w-sm">
                  Grant access to your repositories for one-click import. We only read repository metadata.
                </p>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm">
                  You can revoke access anytime in{' '}
                  <a 
                    href="https://github.com/settings/applications" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    GitHub Settings <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <Button onClick={handleConnect} disabled={connecting || loading} className="gap-2">
                  {connecting || loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Github className="w-4 h-4" />
                  )}
                  {connecting ? 'Redirecting...' : 'Connect GitHub'}
                </Button>
                {error && (
                  <p className="mt-4 text-sm text-destructive">{error}</p>
                )}
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search repositories..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {remainingSlots <= 0 && (
                    <p className="mt-2 text-sm text-amber-500">
                      You've reached your repository limit. Upgrade to add more.
                    </p>
                  )}
                </div>

                {/* Repo List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {loading && repos.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchRepos()}>
                        Try Again
                      </Button>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No repositories match your search' : 'No repositories found'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredRepos.map(repo => {
                        const isSelected = selected.has(repo.id);
                        const canSelect = remainingSlots > 0 && (isSelected || selected.size < remainingSlots);
                        
                        return (
                          <button
                            key={repo.id}
                            onClick={() => canSelect && toggleSelect(repo.id)}
                            disabled={!canSelect && !isSelected}
                            className={`w-full p-3 rounded-lg text-left transition-colors flex items-start gap-3 ${
                              isSelected
                                ? 'bg-primary/10 border border-primary/30'
                                : canSelect
                                ? 'hover:bg-muted border border-transparent'
                                : 'opacity-50 cursor-not-allowed border border-transparent'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isSelected ? 'bg-primary border-primary' : 'border-border'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground truncate">{repo.name}</span>
                                {repo.private && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                              </div>
                              {repo.description && (
                                <p className="text-sm text-muted-foreground truncate">{repo.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {repo.language && <span>{repo.language}</span>}
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3" /> {repo.stars}
                                </span>
                                <span>{(repo.size_kb / 1024).toFixed(1)} MB</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {status?.connected && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selected.size} selected • {Math.max(0, remainingSlots - selected.size)} slots remaining
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleImport} disabled={selected.size === 0}>
                  Import {selected.size > 0 ? `(${selected.size})` : ''}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

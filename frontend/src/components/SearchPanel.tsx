import { useState } from 'react';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { SearchBox } from './search';
import type { SearchResult } from '../types';

interface SearchPanelProps {
  repoId: string;
  apiUrl: string;
  apiKey: string;
}

export function SearchPanel({ repoId, apiUrl, apiKey }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [cached, setCached] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch(`${apiUrl}/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          repo_id: repoId,
          max_results: 10,
        }),
      });

      const data = await response.json();
      setResults(data.results || []);
      setSearchTime(Date.now() - startTime);
      setCached(data.cached || false);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed', {
        description: 'Please check your query and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search Box */}
      <div className="card p-5">
        <SearchBox
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          loading={loading}
          autoFocus
        />

        {searchTime !== null && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-sm text-text-secondary">
            <span>
              <span className="font-semibold text-text-primary">{results.length}</span> results
            </span>
            <span className="text-text-muted">•</span>
            <span>
              <span className="font-mono font-semibold text-text-primary">{searchTime}ms</span>
            </span>
            {cached && (
              <>
                <span className="text-text-muted">•</span>
                <span className="badge-success">⚡ Cached</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.map((result, idx) => (
          <div
            key={idx}
            className="card p-5 hover:border-border-accent transition-all duration-normal group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-mono font-semibold text-sm text-text-primary">
                    {result.name}
                  </h3>
                  <span className="badge-neutral text-[10px] uppercase tracking-wide">
                    {result.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-text-muted font-mono">
                  {result.file_path.split('/').slice(-3).join('/')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-mono text-text-muted">Match</div>
                  <div className="text-sm font-mono font-semibold text-accent">
                    {(result.score * 100).toFixed(0)}%
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(result.code);
                    toast.success('Code copied!');
                  }}
                  className="btn-ghost px-3 py-1.5 text-sm opacity-0 group-hover:opacity-100"
                  title="Copy code"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Code */}
            <div className="relative rounded-lg overflow-hidden">
              <SyntaxHighlighter
                language={result.language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                  background: 'var(--color-bg-secondary)',
                }}
                showLineNumbers
                startingLineNumber={result.line_start}
              >
                {result.code}
              </SyntaxHighlighter>

              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase glass text-text-muted rounded">
                  {result.language}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
              <span className="font-mono">
                Lines {result.line_start}–{result.line_end}
              </span>
              <span>•</span>
              <span className="truncate">{result.file_path}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {results.length === 0 && query && !loading && (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl glass flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="text-base font-semibold mb-2 text-text-primary">No results found</h3>
          <p className="text-sm text-text-secondary">
            Try a different query or check if the repository is fully indexed
          </p>
        </div>
      )}
    </div>
  );
}

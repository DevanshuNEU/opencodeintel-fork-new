import { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';
import { Sparkles, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import type { SearchResult } from '../../types';

interface ResultCardProps {
  result: SearchResult;
  rank: number;
  isExpanded?: boolean;
  aiSummary?: string;
  repoUrl?: string;
}

export function ResultCard({ result, rank, isExpanded: initialExpanded = false, aiSummary, repoUrl }: ResultCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(initialExpanded ? undefined : 0);
  const { resolvedTheme } = useTheme();
  
  const matchPercent = Math.round(result.score * 100);
  const isTopResult = rank === 1;
  
  const cleanFilePath = result.file_path.replace(/^repos\/[a-f0-9-]+\//, '');
  const displayPath = cleanFilePath.split('/').slice(-3).join('/');
  const githubUrl = repoUrl ? `${repoUrl}/blob/main/${cleanFilePath}#L${result.line_start}-L${result.line_end}` : null;

  useEffect(() => {
    if (expanded) {
      const height = contentRef.current?.scrollHeight;
      setContentHeight(height);
      const timer = setTimeout(() => setContentHeight(undefined), 200);
      return () => clearTimeout(timer);
    } else {
      const height = contentRef.current?.scrollHeight;
      setContentHeight(height);
      requestAnimationFrame(() => setContentHeight(0));
    }
  }, [expanded]);

  const copyCode = () => {
    navigator.clipboard.writeText(result.code);
    toast.success('Copied to clipboard');
  };

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 ${expanded ? 'ring-1 ring-primary/20' : 'hover:border-primary/30'} ${isTopResult ? 'border-primary/30' : ''}`}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-start justify-between text-left hover:bg-muted/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isTopResult && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-primary/10 text-primary border border-primary/20 rounded">TOP MATCH</span>
            )}
            <h3 className="font-mono font-semibold text-sm text-foreground truncate">{result.name || 'anonymous'}</h3>
            <span className="px-2 py-0.5 text-[10px] font-medium uppercase bg-muted text-muted-foreground border border-border rounded">{result.type.replace('_', ' ')}</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">{displayPath}</p>
        </div>

        <div className="flex items-center gap-3 ml-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${matchPercent}%` }} />
            </div>
            <span className="text-sm font-mono font-semibold text-primary w-10 text-right">{matchPercent}%</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expandable content */}
      <div ref={contentRef} className="overflow-hidden transition-all duration-200 ease-out" style={{ height: contentHeight !== undefined ? contentHeight : 'auto' }}>
        <div className="border-t border-border">
          {aiSummary && isTopResult && (
            <div className="px-4 py-3 bg-primary/5 border-b border-border">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">AI Summary</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <SyntaxHighlighter
              language={result.language || 'text'}
              style={resolvedTheme === 'dark' ? oneDark : oneLight}
              customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.75rem', lineHeight: '1.6', padding: '1rem' }}
              showLineNumbers
              startingLineNumber={result.line_start}
              wrapLines
            >
              {result.code}
            </SyntaxHighlighter>
            <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-mono uppercase bg-muted text-muted-foreground rounded">{result.language}</span>
          </div>

          <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">Lines {result.line_start}–{result.line_end}</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyCode} className="h-7 text-xs">
                <Copy className="w-3.5 h-3.5 mr-1.5" />Copy
              </Button>
              {githubUrl && (
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />View
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

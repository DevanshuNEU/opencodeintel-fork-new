import { HTMLAttributes, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { syntax, codeBg } from '@/lib/python-theme';
import { lineHighlightVariants } from '@/lib/animations';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: 'python' | 'text';
  filename?: string;
  lineStart?: number;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  maxHeight?: string;
  onCopy?: () => void;
  githubUrl?: string;
}

type Token = { type: string; value: string };

// Dead simple tokenizer - not trying to be a full parser, just good enough for display
function tokenizePython(code: string): Token[] {
  const tokens: Token[] = [];
  
  // Order matters here - more specific patterns first
  const patterns: [string, RegExp][] = [
    ['comment', /^#.*/],
    ['docstring', /^("""[\s\S]*?"""|'''[\s\S]*?''')/],
    ['fstring', /^f(['"])((?:\\.|(?!\1)[^\\])*)\1/],
    ['string', /^(['"])((?:\\.|(?!\1)[^\\])*)\1/],
    ['decorator', /^@[\w.]+/],
    ['keyword', /^\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|yield|lambda|pass|break|continue|raise|assert|global|nonlocal|del|in|not|and|or|is|True|False|None|async|await)\b/],
    ['builtin', /^\b(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|input|super|self|cls)\b/],
    ['number', /^\b\d+(\.\d+)?\b/],
    ['function', /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/],
    ['className', /^\b([A-Z][a-zA-Z0-9_]*)\b/],
    ['parameter', /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*[=:])/],
    ['operator', /^(==|!=|<=|>=|<|>|\+|-|\*|\/|%|\*\*|=|\+=|-=|\|\||&&)/],
    ['punctuation', /^[()[\]{}:,.;]/],
    ['variable', /^[a-zA-Z_][a-zA-Z0-9_]*/],
    ['whitespace', /^\s+/],
  ];
  
  let remaining = code;
  while (remaining.length > 0) {
    let matched = false;
    for (const [type, pattern] of patterns) {
      const match = remaining.match(pattern);
      if (match) {
        tokens.push({ type, value: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  
  return tokens;
}

const tokenColors: Record<string, string> = {
  keyword: syntax.keyword,
  builtin: syntax.builtin,
  function: syntax.function,
  className: syntax.className,
  decorator: syntax.decorator,
  string: syntax.string,
  fstring: syntax.string,
  docstring: syntax.docstring,
  comment: syntax.comment,
  number: syntax.number,
  parameter: syntax.parameter,
  operator: syntax.operator,
  punctuation: syntax.punctuation,
  variable: syntax.variable,
};

// Python code block with syntax highlighting and copy button
export function CodeBlock({
  code,
  language = 'python',
  filename,
  lineStart = 1,
  highlightLines = [],
  showLineNumbers = true,
  maxHeight = '400px',
  onCopy,
  githubUrl,
  className,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div
      className={cn('rounded-lg overflow-hidden border border-white/[0.08]', className)}
      style={{ backgroundColor: codeBg.elevated }}
      {...props}
    >
      {(filename || githubUrl) && (
        <div
          className="px-4 py-2 flex items-center justify-between border-b border-white/[0.08]"
          style={{ backgroundColor: codeBg.primary }}
        >
          {filename && (
            <span className="text-sm text-text-secondary font-mono">{filename}</span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-white/[0.05] transition-colors text-text-muted hover:text-text-primary"
              title="Copy code"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={copied ? 'check' : 'copy'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  {copied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-white/[0.05] transition-colors text-text-muted hover:text-text-primary"
                title="View on GitHub"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      )}
      
      <div className="overflow-auto scrollbar-thin" style={{ maxHeight }}>
        <pre className="p-4 text-sm font-mono leading-relaxed">
          <code>
            {lines.map((line, index) => {
              const lineNumber = lineStart + index;
              const isHighlighted = highlightLines.includes(lineNumber);
              const tokens = language === 'python' 
                ? tokenizePython(line) 
                : [{ type: 'text', value: line }];
              
              return (
                <motion.div
                  key={index}
                  className={cn('flex', isHighlighted && 'rounded')}
                  variants={lineHighlightVariants}
                  initial="idle"
                  whileHover="hover"
                  style={{
                    backgroundColor: isHighlighted ? syntax.matchHighlight : undefined,
                  }}
                >
                  {showLineNumbers && (
                    <span
                      className="select-none pr-4 text-right min-w-[3rem]"
                      style={{
                        color: isHighlighted ? syntax.lineNumberActive : syntax.lineNumber,
                      }}
                    >
                      {lineNumber}
                    </span>
                  )}
                  <span className="flex-1">
                    {tokens.map((token, i) => (
                      <span key={i} style={{ color: tokenColors[token.type] || syntax.variable }}>
                        {token.value}
                      </span>
                    ))}
                    {line === '' && '\u200B'}
                  </span>
                </motion.div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default CodeBlock;

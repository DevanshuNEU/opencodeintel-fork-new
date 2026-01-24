import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Command, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const PLACEHOLDER_EXAMPLES = [
  'Search for authentication logic...',
  'Find API endpoints...',
  'Look up database queries...',
  'Discover React hooks...',
  'Find error handling patterns...',
];

export function SearchBox({
  value,
  onChange,
  onSubmit,
  placeholder,
  loading = false,
  disabled = false,
  autoFocus = false,
  className,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (placeholder || value) return;
    const currentText = PLACEHOLDER_EXAMPLES[placeholderIndex];
    let charIndex = 0;
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      const typeChar = () => {
        if (charIndex <= currentText.length) {
          setAnimatedPlaceholder(currentText.slice(0, charIndex));
          charIndex++;
          timeout = setTimeout(typeChar, 50);
        } else {
          timeout = setTimeout(() => setIsTyping(false), 2000);
        }
      };
      typeChar();
    } else {
      charIndex = currentText.length;
      const deleteChar = () => {
        if (charIndex >= 0) {
          setAnimatedPlaceholder(currentText.slice(0, charIndex));
          charIndex--;
          timeout = setTimeout(deleteChar, 30);
        } else {
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
          setIsTyping(true);
        }
      };
      deleteChar();
    }
    return () => clearTimeout(timeout);
  }, [placeholderIndex, isTyping, placeholder, value]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading || disabled) return;
    onSubmit();
  }, [value, loading, disabled, onSubmit]);

  const displayPlaceholder = placeholder || animatedPlaceholder || PLACEHOLDER_EXAMPLES[0];

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-3.5',
          'bg-background border border-border rounded-xl',
          'transition-all duration-200',
          isFocused && 'border-primary ring-2 ring-primary/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className={cn('flex-shrink-0 transition-colors', isFocused ? 'text-primary' : 'text-muted-foreground')}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={displayPlaceholder}
          disabled={disabled || loading}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-foreground text-base placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />

        {!isFocused && !value && (
          <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
              <Command className="w-3 h-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">K</kbd>
          </div>
        )}

        {value && (
          <Button type="submit" disabled={loading || disabled} size="sm">
            {loading ? 'Searching...' : 'Search'}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground px-1">Semantic search — finds code by meaning, not just keywords</p>
    </form>
  );
}

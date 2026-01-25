import { Search, Lightbulb, ArrowRight, Code2, FileSearch, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchEmptyStateProps {
  query: string
  onSuggestionClick: (suggestion: string) => void
}

const EXAMPLE_QUERIES = [
  { query: 'authentication', description: 'Find auth logic' },
  { query: 'error handling', description: 'Locate error handlers' },
  { query: 'api routes', description: 'Discover API endpoints' },
  { query: 'database', description: 'Find DB operations' },
]

const SEARCH_TIPS = [
  'Use natural language: "function that handles user login"',
  'Search by concept: "error handling" or "validation"',
  'Find patterns: "async function" or "useEffect hook"',
  'Be specific: "parse JSON response" beats "parse"',
]

export function SearchEmptyState({ query, onSuggestionClick }: SearchEmptyStateProps) {
  // Generate query-specific suggestions
  const getSuggestions = (q: string): string[] => {
    const lowerQ = q.toLowerCase()
    const suggestions: string[] = []
    
    // If query is very short, suggest expanding
    if (q.length < 4) {
      suggestions.push(`${q} function`, `${q} handler`, `${q} component`)
    }
    
    // Common refinements
    if (lowerQ.includes('auth')) {
      suggestions.push('login handler', 'authentication middleware', 'session management')
    } else if (lowerQ.includes('api') || lowerQ.includes('route')) {
      suggestions.push('REST endpoint', 'API handler', 'route middleware')
    } else if (lowerQ.includes('error')) {
      suggestions.push('error boundary', 'try catch block', 'error middleware')
    } else if (lowerQ.includes('test')) {
      suggestions.push('unit test', 'test helper', 'mock function')
    } else {
      // Generic suggestions based on query
      suggestions.push(
        `${q} implementation`,
        `${q} helper function`,
        `how to ${q}`
      )
    }
    
    return suggestions.slice(0, 3)
  }

  const suggestions = query ? getSuggestions(query) : []

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-8 text-center border-b border-border bg-muted/30">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <FileSearch className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">No results for "{query}"</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We couldn't find any code matching your query. Try one of the suggestions below or refine your search.
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Query Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Try these instead
            </h4>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors group"
                >
                  <span className="text-sm text-foreground">{suggestion}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Example Queries */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            Popular searches
          </h4>
          <div className="space-y-2">
            {EXAMPLE_QUERIES.map((example, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick(example.query)}
                className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors group"
              >
                <div>
                  <span className="text-sm text-foreground">{example.query}</span>
                  <span className="text-xs text-muted-foreground ml-2">— {example.description}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Tips */}
      <div className="p-5 bg-muted/30 border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5" />
          Search Tips
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SEARCH_TIPS.map((tip, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

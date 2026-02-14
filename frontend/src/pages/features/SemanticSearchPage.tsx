import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'how-it-works', title: 'How It Works', level: 2 },
  { id: 'usage', title: 'Usage', level: 2 },
  { id: 'examples', title: 'Examples', level: 2 },
  { id: 'tips', title: 'Tips for Better Results', level: 2 },
]

export function SemanticSearchPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={4} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Semantic Search</h1>
        <p className="text-xl text-gray-400">
          Find code by meaning, not keywords. Search for "error handling" and find <code className="text-blue-400">processFailure()</code>.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-6">
        Traditional code search is like using Ctrl+F - you find exactly what you type, nothing more.
        Semantic search understands what you mean. Ask for "authentication middleware" and it finds 
        <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm mx-1">verifyToken()</code>, 
        <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm mx-1">checkAuth()</code>, and 
        <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm mx-1">requireLogin()</code>.
      </p>

      <h2 id="how-it-works" className="text-2xl font-semibold text-white mt-12 mb-4">How It Works</h2>
      
      <p className="text-gray-300 mb-4">
        When you index a repository, OpenCodeIntel:
      </p>
      <ol className="space-y-3 text-gray-300 mb-6">
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-mono">1.</span>
          <span><strong className="text-white">Parses your code</strong> using Tree-sitter to understand structure (functions, classes, imports)</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-mono">2.</span>
          <span><strong className="text-white">Generates summaries</strong> using GPT-4o-mini to describe what each chunk does in plain English</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-mono">3.</span>
          <span><strong className="text-white">Creates embeddings</strong> using OpenAI's embedding model and stores them in Pinecone</span>
        </li>
      </ol>
      <p className="text-gray-300 mb-6">
        When you search, your query gets embedded and matched against the stored vectors. 
        The result? Code that means what you are looking for, even if it does not contain your exact words.
      </p>

      <h2 id="usage" className="text-2xl font-semibold text-white mt-12 mb-4">Usage</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Via MCP (Claude Desktop)</h3>
      <p className="text-gray-300 mb-4">Just ask Claude naturally:</p>
      <DocsCodeBlock language="text">
{`"Find the authentication logic in this codebase"
"Where is error handling implemented?"
"Show me the database connection setup"`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Via API</h3>
      <DocsCodeBlock language="bash">
{`curl -X POST "http://localhost:8000/api/search" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repo_id": "your-repo-id",
    "query": "authentication middleware",
    "max_results": 10
  }'`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Via Dashboard</h3>
      <p className="text-gray-300 mb-4">
        Use the search bar in the dashboard. Results show file path, code snippet, and relevance score.
      </p>

      <h2 id="examples" className="text-2xl font-semibold text-white mt-12 mb-4">Examples</h2>
      
      <div className="space-y-6">
        <SearchExample
          query="payment processing"
          finds={[
            'stripe_handler.py - processPayment()',
            'billing/checkout.ts - handlePaymentIntent()',
            'services/payment.js - chargeCustomer()',
          ]}
        />
        <SearchExample
          query="user signup flow"
          finds={[
            'auth/register.tsx - SignupForm component',
            'api/users.py - create_user()',
            'services/onboarding.ts - initiateOnboarding()',
          ]}
        />
        <SearchExample
          query="rate limiting"
          finds={[
            'middleware/ratelimit.py - RateLimiter class',
            'utils/throttle.ts - throttleRequests()',
            'config/limits.yaml - rate limit configuration',
          ]}
        />
      </div>

      <h2 id="tips" className="text-2xl font-semibold text-white mt-12 mb-4">Tips for Better Results</h2>
      
      <ul className="space-y-3 text-gray-300">
        <li className="flex items-start gap-3">
          <span className="text-green-400">✓</span>
          <span><strong className="text-white">Be descriptive:</strong> "user authentication flow" works better than just "auth"</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-green-400">✓</span>
          <span><strong className="text-white">Use domain language:</strong> Search in the terms your codebase uses</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-green-400">✓</span>
          <span><strong className="text-white">Ask questions:</strong> "How does the app handle failed payments?" works great</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-red-400">✗</span>
          <span><strong className="text-white">Avoid exact syntax:</strong> Do not search for "function handleAuth(" - describe what it does instead</span>
        </li>
      </ul>

      <DocsCallout type="tip" title="Pro tip">
        If you are not finding what you expect, try rephrasing. "Error handling" and "exception management" 
        might return different results depending on how your code is written.
      </DocsCallout>

      <DocsPagination
        prev={{ title: 'MCP Examples', href: '/docs/mcp-examples' }}
        next={{ title: 'Dependency Analysis', href: '/docs/features/dependencies' }}
      />
    </DocsLayout>
  )
}

function SearchExample({ query, finds }: { query: string; finds: string[] }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
      <p className="text-sm text-gray-400 mb-2">Query:</p>
      <p className="text-white font-medium mb-3">"{query}"</p>
      <p className="text-sm text-gray-400 mb-2">Finds:</p>
      <ul className="space-y-1">
        {finds.map((find, i) => (
          <li key={i} className="text-sm text-gray-300 font-mono">{find}</li>
        ))}
      </ul>
    </div>
  )
}

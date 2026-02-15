import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'search', title: 'Semantic Search', level: 2 },
  { id: 'parameters', title: 'Parameters', level: 2 },
  { id: 'response', title: 'Response', level: 2 },
  { id: 'examples', title: 'Examples', level: 2 },
]

export function APISearchPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={4} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Search API</h1>
        <p className="text-xl text-gray-400">
          Semantic code search across indexed repositories.
        </p>
      </div>

      <h2 id="search" className="text-2xl font-semibold text-white mt-12 mb-4">Semantic Search</h2>
      
      <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg mb-4">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded text-blue-400 bg-blue-500/10">
          POST
        </span>
        <code className="text-sm text-gray-300">/api/v1/search</code>
      </div>
      
      <p className="text-gray-300 mb-4">
        Search code by meaning, not just keywords. The query is converted to an embedding 
        and matched against indexed code chunks.
      </p>

      <h2 id="parameters" className="text-2xl font-semibold text-white mt-12 mb-4">Parameters</h2>
      
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Request Body</h4>
      
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-gray-400 font-medium">Field</th>
              <th className="text-left py-2 text-gray-400 font-medium">Type</th>
              <th className="text-left py-2 text-gray-400 font-medium">Required</th>
              <th className="text-left py-2 text-gray-400 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-blue-400">query</td>
              <td className="py-2 font-mono text-xs">string</td>
              <td className="py-2"><span className="text-amber-400">Yes</span></td>
              <td className="py-2">Natural language search query</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-blue-400">repo_id</td>
              <td className="py-2 font-mono text-xs">string</td>
              <td className="py-2"><span className="text-amber-400">Yes</span></td>
              <td className="py-2">Repository to search in</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-blue-400">max_results</td>
              <td className="py-2 font-mono text-xs">integer</td>
              <td className="py-2">No</td>
              <td className="py-2">Maximum results to return (default: 10, max: 50)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-blue-400">min_score</td>
              <td className="py-2 font-mono text-xs">float</td>
              <td className="py-2">No</td>
              <td className="py-2">Minimum relevance score 0-1 (default: 0.5)</td>
            </tr>
            <tr>
              <td className="py-2 font-mono text-blue-400">file_filter</td>
              <td className="py-2 font-mono text-xs">string</td>
              <td className="py-2">No</td>
              <td className="py-2">Glob pattern to filter files (e.g., "*.py", "src/**")</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsCodeBlock language="json">
{`{
  "query": "authentication middleware",
  "repo_id": "repo_abc123",
  "max_results": 10,
  "min_score": 0.6,
  "file_filter": "src/**/*.ts"
}`}
      </DocsCodeBlock>

      <h2 id="response" className="text-2xl font-semibold text-white mt-12 mb-4">Response</h2>
      
      <DocsCodeBlock language="json">
{`{
  "results": [
    {
      "file_path": "src/middleware/auth.ts",
      "content": "export async function verifyToken(req, res, next) {\\n  const token = req.headers.authorization;\\n  // ... verification logic\\n}",
      "start_line": 15,
      "end_line": 42,
      "score": 0.89,
      "summary": "Token verification middleware that validates JWT tokens and attaches user to request",
      "language": "typescript"
    },
    {
      "file_path": "src/utils/jwt.ts",
      "content": "export function decodeToken(token: string) { ... }",
      "start_line": 1,
      "end_line": 20,
      "score": 0.75,
      "summary": "JWT utility functions for encoding and decoding tokens",
      "language": "typescript"
    }
  ],
  "total": 2,
  "query": "authentication middleware",
  "search_time_ms": 145
}`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Result Fields</h3>
      
      <ul className="space-y-2 text-gray-300 mb-6">
        <li className="flex items-start gap-2">
          <code className="text-blue-400 text-sm">file_path</code>
          <span>- Path to the file containing the match</span>
        </li>
        <li className="flex items-start gap-2">
          <code className="text-blue-400 text-sm">content</code>
          <span>- The matching code chunk</span>
        </li>
        <li className="flex items-start gap-2">
          <code className="text-blue-400 text-sm">start_line / end_line</code>
          <span>- Line numbers in the original file</span>
        </li>
        <li className="flex items-start gap-2">
          <code className="text-blue-400 text-sm">score</code>
          <span>- Relevance score from 0 to 1</span>
        </li>
        <li className="flex items-start gap-2">
          <code className="text-blue-400 text-sm">summary</code>
          <span>- AI-generated description of what the code does</span>
        </li>
      </ul>

      <h2 id="examples" className="text-2xl font-semibold text-white mt-12 mb-4">Examples</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Basic Search</h3>
      <DocsCodeBlock language="bash">
{`curl -X POST \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "error handling", "repo_id": "repo_abc123"}' \\
  http://localhost:8000/api/v1/search`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Search with Filters</h3>
      <DocsCodeBlock language="bash">
{`curl -X POST \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "database connection pool",
    "repo_id": "repo_abc123",
    "max_results": 5,
    "min_score": 0.7,
    "file_filter": "**/*.py"
  }' \\
  http://localhost:8000/api/v1/search`}
      </DocsCodeBlock>

      <DocsCallout type="tip">
        For best results, use natural language queries that describe what the code does, 
        not exact function names. "handles user login" works better than "handleLogin".
      </DocsCallout>

      <DocsPagination
        prev={{ title: 'Repositories', href: '/docs/api/repositories' }}
        next={{ title: 'Analysis', href: '/docs/api/analysis' }}
      />
    </DocsLayout>
  )
}

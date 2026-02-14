import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'
import { Link } from 'react-router-dom'

const tocItems: TOCItem[] = [
  { id: 'base-url', title: 'Base URL', level: 2 },
  { id: 'authentication', title: 'Authentication', level: 2 },
  { id: 'endpoints', title: 'Endpoints', level: 2 },
  { id: 'errors', title: 'Error Handling', level: 2 },
  { id: 'rate-limits', title: 'Rate Limits', level: 2 },
]

export function APIOverviewPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={5} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">API Reference</h1>
        <p className="text-xl text-gray-400">
          REST API for programmatic access to OpenCodeIntel features.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-8">
        The OpenCodeIntel API lets you integrate code intelligence into your own tools.
        Search code, analyze dependencies, and predict impact programmatically.
      </p>

      <DocsCallout type="info">
        Interactive API docs available at <code>http://localhost:8000/docs</code> when running locally.
      </DocsCallout>

      <h2 id="base-url" className="text-2xl font-semibold text-white mt-12 mb-4">Base URL</h2>
      
      <DocsCodeBlock language="text">
{`# Local development
http://localhost:8000/api

# Hosted version
https://api.opencodeintel.com/api`}
      </DocsCodeBlock>

      <h2 id="authentication" className="text-2xl font-semibold text-white mt-12 mb-4">Authentication</h2>
      
      <p className="text-gray-300 mb-4">
        All API requests require an API key passed in the <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">Authorization</code> header:
      </p>

      <DocsCodeBlock language="bash">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  http://localhost:8000/api/repos`}
      </DocsCodeBlock>

      <p className="text-gray-300 mt-4 mb-4">
        Get your API key from the dashboard under Settings → API Keys.
      </p>

      <h2 id="endpoints" className="text-2xl font-semibold text-white mt-12 mb-4">Endpoints</h2>
      
      <div className="space-y-3 mb-8">
        <EndpointLink
          method="GET"
          path="/repos"
          description="List all repositories"
          href="/docs/api/repositories"
        />
        <EndpointLink
          method="POST"
          path="/repos"
          description="Add a new repository"
          href="/docs/api/repositories"
        />
        <EndpointLink
          method="POST"
          path="/search"
          description="Semantic code search"
          href="/docs/api/search"
        />
        <EndpointLink
          method="GET"
          path="/repos/{id}/dependencies"
          description="Get dependency graph"
          href="/docs/api/analysis"
        />
        <EndpointLink
          method="GET"
          path="/repos/{id}/impact"
          description="Analyze change impact"
          href="/docs/api/analysis"
        />
        <EndpointLink
          method="GET"
          path="/repos/{id}/style"
          description="Analyze code style"
          href="/docs/api/analysis"
        />
        <EndpointLink
          method="GET"
          path="/repos/{id}/insights"
          description="Get repository insights"
          href="/docs/api/analysis"
        />
      </div>

      <h2 id="errors" className="text-2xl font-semibold text-white mt-12 mb-4">Error Handling</h2>
      
      <p className="text-gray-300 mb-4">
        The API returns standard HTTP status codes. Errors include a JSON body with details:
      </p>

      <DocsCodeBlock language="json">
{`{
  "error": "not_found",
  "message": "Repository not found",
  "status": 404
}`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Common Status Codes</h3>
      
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-gray-400 font-medium">Code</th>
              <th className="text-left py-2 text-gray-400 font-medium">Meaning</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-green-400">200</td>
              <td className="py-2">Success</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-green-400">201</td>
              <td className="py-2">Created</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-amber-400">400</td>
              <td className="py-2">Bad request - check your parameters</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-amber-400">401</td>
              <td className="py-2">Unauthorized - invalid or missing API key</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-amber-400">404</td>
              <td className="py-2">Not found - resource doesn't exist</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-amber-400">429</td>
              <td className="py-2">Rate limited - slow down</td>
            </tr>
            <tr>
              <td className="py-2 font-mono text-red-400">500</td>
              <td className="py-2">Server error - try again or contact support</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="rate-limits" className="text-2xl font-semibold text-white mt-12 mb-4">Rate Limits</h2>
      
      <p className="text-gray-300 mb-4">
        API requests are rate limited to ensure fair usage:
      </p>

      <ul className="space-y-2 text-gray-300 mb-6">
        <li className="flex items-start gap-2">
          <span className="text-blue-400">→</span>
          <span><strong className="text-white">Search:</strong> 100 requests/minute</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-400">→</span>
          <span><strong className="text-white">Analysis:</strong> 60 requests/minute</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-400">→</span>
          <span><strong className="text-white">Indexing:</strong> 10 repositories/hour</span>
        </li>
      </ul>

      <p className="text-gray-300 mb-4">
        Rate limit info is included in response headers:
      </p>

      <DocsCodeBlock language="text">
{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1620000000`}
      </DocsCodeBlock>

      <DocsPagination
        prev={{ title: 'Self-Hosting', href: '/docs/deployment/self-host' }}
        next={{ title: 'Repositories', href: '/docs/api/repositories' }}
      />
    </DocsLayout>
  )
}

function EndpointLink({ method, path, description, href }: { method: string; path: string; description: string; href: string }) {
  const methodColors: Record<string, string> = {
    GET: 'text-green-400 bg-green-500/10',
    POST: 'text-blue-400 bg-blue-500/10',
    PUT: 'text-amber-400 bg-amber-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
  }

  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/[0.04] hover:border-blue-500/30 transition-all"
    >
      <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${methodColors[method]}`}>
        {method}
      </span>
      <code className="text-sm text-gray-300 flex-1">{path}</code>
      <span className="text-sm text-gray-500">{description}</span>
    </Link>
  )
}

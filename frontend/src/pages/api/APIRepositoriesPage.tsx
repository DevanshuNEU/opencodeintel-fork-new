import { 
  DocsLayout,
  DocsCodeBlock,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'list', title: 'List Repositories', level: 2 },
  { id: 'get', title: 'Get Repository', level: 2 },
  { id: 'create', title: 'Add Repository', level: 2 },
  { id: 'delete', title: 'Delete Repository', level: 2 },
  { id: 'reindex', title: 'Reindex Repository', level: 2 },
]

export function APIRepositoriesPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={5} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Repositories API</h1>
        <p className="text-xl text-gray-400">
          Manage repositories: list, add, delete, and reindex.
        </p>
      </div>

      {/* List Repositories */}
      <h2 id="list" className="text-2xl font-semibold text-white mt-12 mb-4">List Repositories</h2>
      <EndpointHeader method="GET" path="/api/v1/repos" />
      
      <p className="text-gray-300 mb-4">Returns all repositories accessible to your account.</p>
      
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "repositories": [
    {
      "id": "repo_abc123",
      "name": "my-project",
      "url": "https://github.com/user/my-project",
      "status": "indexed",
      "file_count": 142,
      "last_indexed": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-10T08:00:00Z"
    }
  ],
  "total": 1
}`}
      </DocsCodeBlock>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Example</h4>
      <DocsCodeBlock language="bash">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  http://localhost:8000/api/v1/repos`}
      </DocsCodeBlock>

      {/* Get Repository */}
      <h2 id="get" className="text-2xl font-semibold text-white mt-12 mb-4">Get Repository</h2>
      <EndpointHeader method="GET" path="/api/v1/repos/{repo_id}" />
      
      <p className="text-gray-300 mb-4">Get details for a specific repository.</p>
      
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Parameters</h4>
      <ParamTable params={[
        { name: 'repo_id', location: 'path', type: 'string', required: true, description: 'Repository ID' },
      ]} />

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "id": "repo_abc123",
  "name": "my-project",
  "url": "https://github.com/user/my-project",
  "status": "indexed",
  "file_count": 142,
  "languages": {
    "TypeScript": 65,
    "Python": 42,
    "JavaScript": 35
  },
  "last_indexed": "2024-01-15T10:30:00Z",
  "indexing_duration_ms": 45000,
  "created_at": "2024-01-10T08:00:00Z"
}`}
      </DocsCodeBlock>

      {/* Add Repository */}
      <h2 id="create" className="text-2xl font-semibold text-white mt-12 mb-4">Add Repository</h2>
      <EndpointHeader method="POST" path="/api/v1/repos" />
      
      <p className="text-gray-300 mb-4">Add a new repository for indexing.</p>
      
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Request Body</h4>
      <DocsCodeBlock language="json">
{`{
  "url": "https://github.com/user/my-project",
  "branch": "main"  // optional, defaults to default branch
}`}
      </DocsCodeBlock>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "id": "repo_abc123",
  "name": "my-project",
  "status": "indexing",
  "message": "Repository added. Indexing in progress."
}`}
      </DocsCodeBlock>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Example</h4>
      <DocsCodeBlock language="bash">
{`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://github.com/user/my-project"}' \\
  http://localhost:8000/api/v1/repos`}
      </DocsCodeBlock>

      {/* Delete Repository */}
      <h2 id="delete" className="text-2xl font-semibold text-white mt-12 mb-4">Delete Repository</h2>
      <EndpointHeader method="DELETE" path="/api/v1/repos/{repo_id}" />
      
      <p className="text-gray-300 mb-4">Remove a repository and all its indexed data.</p>
      
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Parameters</h4>
      <ParamTable params={[
        { name: 'repo_id', location: 'path', type: 'string', required: true, description: 'Repository ID' },
      ]} />

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "message": "Repository deleted successfully"
}`}
      </DocsCodeBlock>

      {/* Reindex Repository */}
      <h2 id="reindex" className="text-2xl font-semibold text-white mt-12 mb-4">Reindex Repository</h2>
      <EndpointHeader method="POST" path="/api/v1/repos/{repo_id}/reindex" />
      
      <p className="text-gray-300 mb-4">Trigger a fresh index of the repository. Use after major code changes.</p>
      
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Parameters</h4>
      <ParamTable params={[
        { name: 'repo_id', location: 'path', type: 'string', required: true, description: 'Repository ID' },
        { name: 'force', location: 'query', type: 'boolean', required: false, description: 'Force full reindex even if no changes detected' },
      ]} />

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "id": "repo_abc123",
  "status": "indexing",
  "message": "Reindexing started"
}`}
      </DocsCodeBlock>

      <DocsPagination
        prev={{ title: 'API Overview', href: '/docs/api' }}
        next={{ title: 'Search API', href: '/docs/api/search' }}
      />
    </DocsLayout>
  )
}

function EndpointHeader({ method, path }: { method: string; path: string }) {
  const methodColors: Record<string, string> = {
    GET: 'text-green-400 bg-green-500/10',
    POST: 'text-blue-400 bg-blue-500/10',
    PUT: 'text-amber-400 bg-amber-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg mb-4">
      <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${methodColors[method]}`}>
        {method}
      </span>
      <code className="text-sm text-gray-300">{path}</code>
    </div>
  )
}

interface Param {
  name: string
  location: string
  type: string
  required: boolean
  description: string
}

function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 text-gray-400 font-medium">Name</th>
            <th className="text-left py-2 text-gray-400 font-medium">Location</th>
            <th className="text-left py-2 text-gray-400 font-medium">Type</th>
            <th className="text-left py-2 text-gray-400 font-medium">Required</th>
            <th className="text-left py-2 text-gray-400 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {params.map((param) => (
            <tr key={param.name} className="border-b border-white/5">
              <td className="py-2 font-mono text-blue-400">{param.name}</td>
              <td className="py-2 text-xs">{param.location}</td>
              <td className="py-2 font-mono text-xs">{param.type}</td>
              <td className="py-2">{param.required ? <span className="text-amber-400">Yes</span> : 'No'}</td>
              <td className="py-2">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

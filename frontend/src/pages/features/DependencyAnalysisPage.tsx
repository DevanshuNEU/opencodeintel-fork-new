import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'what-it-shows', title: 'What It Shows', level: 2 },
  { id: 'usage', title: 'Usage', level: 2 },
  { id: 'reading-the-graph', title: 'Reading the Graph', level: 2 },
  { id: 'api-response', title: 'API Response', level: 2 },
]

export function DependencyAnalysisPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={5} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Dependency Analysis</h1>
        <p className="text-xl text-gray-400">
          Visualize your architecture. See what connects to what and identify the critical files.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-6">
        Every codebase has hidden structure. Some files are imported everywhere (hub files).
        Some import everything (aggregator files). Some are isolated. Understanding this 
        structure helps you make better decisions about where to make changes.
      </p>

      <h2 id="what-it-shows" className="text-2xl font-semibold text-white mt-12 mb-4">What It Shows</h2>
      
      <p className="text-gray-300 mb-4">
        The dependency graph gives you:
      </p>
      
      <ul className="space-y-4 text-gray-300 mb-6">
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-bold">→</span>
          <div>
            <strong className="text-white">Import relationships:</strong>
            <p className="text-gray-400 text-sm mt-1">Which files import which. Follow the arrows to trace data flow.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-bold">→</span>
          <div>
            <strong className="text-white">Hub files:</strong>
            <p className="text-gray-400 text-sm mt-1">Files with many dependents. Change these carefully - lots of things depend on them.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-bold">→</span>
          <div>
            <strong className="text-white">Leaf files:</strong>
            <p className="text-gray-400 text-sm mt-1">Files with no dependents. Safe to modify - nothing else uses them.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-bold">→</span>
          <div>
            <strong className="text-white">Circular dependencies:</strong>
            <p className="text-gray-400 text-sm mt-1">A imports B, B imports A. Usually a sign of tangled architecture.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-blue-400 font-bold">→</span>
          <div>
            <strong className="text-white">Directory clusters:</strong>
            <p className="text-gray-400 text-sm mt-1">Files grouped by folder show natural module boundaries.</p>
          </div>
        </li>
      </ul>

      <h2 id="usage" className="text-2xl font-semibold text-white mt-12 mb-4">Usage</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Via MCP (Claude Desktop)</h3>
      <DocsCodeBlock language="text">
{`"Show me the dependency graph for this repo"
"What files depend on auth/middleware.py?"
"Find the most connected files in the codebase"`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Via API</h3>
      <DocsCodeBlock language="bash">
{`curl "http://localhost:8000/api/repos/{repo_id}/dependencies"`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Via Dashboard</h3>
      <p className="text-gray-300 mb-4">
        Click on any repository and navigate to the "Dependencies" tab. You will see an interactive 
        graph you can zoom, pan, and click on nodes to explore.
      </p>

      <h2 id="reading-the-graph" className="text-2xl font-semibold text-white mt-12 mb-4">Reading the Graph</h2>
      
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-gray-400 font-medium">Visual</th>
              <th className="text-left py-3 text-gray-400 font-medium">Meaning</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-3">Large node</td>
              <td className="py-3">Many files depend on this one (high in-degree)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3">Many outgoing arrows</td>
              <td className="py-3">This file imports many others (high out-degree)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3">Cluster of nodes</td>
              <td className="py-3">Files in same directory or tightly coupled</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3">Isolated node</td>
              <td className="py-3">Standalone file with no dependencies</td>
            </tr>
            <tr>
              <td className="py-3">Bidirectional arrow</td>
              <td className="py-3">Circular dependency (A→B and B→A)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsCallout type="info">
        The graph uses force-directed layout. Related files naturally cluster together.
        If you see two clusters far apart, they are probably independent modules.
      </DocsCallout>

      <h2 id="api-response" className="text-2xl font-semibold text-white mt-12 mb-4">API Response</h2>
      
      <p className="text-gray-300 mb-4">The API returns nodes and edges:</p>
      
      <DocsCodeBlock language="json">
{`{
  "nodes": [
    {
      "id": "src/auth/middleware.py",
      "label": "middleware.py",
      "directory": "src/auth",
      "in_degree": 12,
      "out_degree": 3
    }
  ],
  "edges": [
    {
      "source": "src/api/routes.py",
      "target": "src/auth/middleware.py"
    }
  ],
  "stats": {
    "total_files": 47,
    "total_edges": 89,
    "hub_files": ["src/utils/index.ts", "src/auth/middleware.py"],
    "leaf_files": ["src/config.py", "src/constants.ts"]
  }
}`}
      </DocsCodeBlock>

      <DocsPagination
        prev={{ title: 'Semantic Search', href: '/docs/features/search' }}
        next={{ title: 'Impact Prediction', href: '/docs/features/impact' }}
      />
    </DocsLayout>
  )
}

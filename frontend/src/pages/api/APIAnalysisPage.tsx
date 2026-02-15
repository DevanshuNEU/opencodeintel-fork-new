import { 
  DocsLayout,
  DocsCodeBlock,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'dependencies', title: 'Dependency Graph', level: 2 },
  { id: 'impact', title: 'Impact Analysis', level: 2 },
  { id: 'style', title: 'Code Style', level: 2 },
  { id: 'insights', title: 'Repository Insights', level: 2 },
]

export function APIAnalysisPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={6} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Analysis API</h1>
        <p className="text-xl text-gray-400">
          Dependency graphs, impact analysis, code style, and repository insights.
        </p>
      </div>

      {/* Dependency Graph */}
      <h2 id="dependencies" className="text-2xl font-semibold text-white mt-12 mb-4">Dependency Graph</h2>
      
      <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg mb-4">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded text-green-400 bg-green-500/10">
          GET
        </span>
        <code className="text-sm text-gray-300">/api/v1/repos/{'{repo_id}'}/dependencies</code>
      </div>
      
      <p className="text-gray-300 mb-4">
        Get the complete import/dependency graph for a repository.
      </p>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "nodes": [
    {
      "id": "src/auth/middleware.py",
      "label": "middleware.py",
      "directory": "src/auth",
      "in_degree": 12,
      "out_degree": 3,
      "is_hub": true
    }
  ],
  "edges": [
    {
      "source": "src/api/routes.py",
      "target": "src/auth/middleware.py",
      "type": "import"
    }
  ],
  "stats": {
    "total_files": 47,
    "total_edges": 89,
    "hub_files": ["src/utils/index.ts"],
    "leaf_files": ["src/config.py"],
    "circular_dependencies": []
  }
}`}
      </DocsCodeBlock>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Example</h4>
      <DocsCodeBlock language="bash">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  http://localhost:8000/api/v1/repos/repo_abc123/dependencies`}
      </DocsCodeBlock>

      {/* Impact Analysis */}
      <h2 id="impact" className="text-2xl font-semibold text-white mt-12 mb-4">Impact Analysis</h2>
      
      <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg mb-4">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded text-blue-400 bg-blue-500/10">
          POST
        </span>
        <code className="text-sm text-gray-300">/api/v1/repos/{'{repo_id}'}/impact</code>
      </div>
      
      <p className="text-gray-300 mb-4">
        Analyze the impact of changing a specific file.
      </p>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Request Body</h4>
      <DocsCodeBlock language="json">
{`{
  "file_path": "src/auth/middleware.py"
}`}
      </DocsCodeBlock>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "file": "src/auth/middleware.py",
  "risk_level": "high",
  "risk_score": 0.85,
  "direct_dependents": [
    "src/api/routes.py",
    "src/api/admin.py"
  ],
  "indirect_dependents": [
    "src/main.py"
  ],
  "related_tests": [
    "tests/test_auth.py"
  ],
  "test_coverage": {
    "has_tests": true,
    "test_count": 2
  },
  "recommendations": [
    "High-impact file with 5 dependents",
    "Run tests before deploying changes"
  ]
}`}
      </DocsCodeBlock>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Example</h4>
      <DocsCodeBlock language="bash">
{`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"file_path": "src/auth/middleware.py"}' \\
  http://localhost:8000/api/v1/repos/repo_abc123/impact`}
      </DocsCodeBlock>

      {/* Code Style */}
      <h2 id="style" className="text-2xl font-semibold text-white mt-12 mb-4">Code Style</h2>
      
      <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg mb-4">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded text-green-400 bg-green-500/10">
          GET
        </span>
        <code className="text-sm text-gray-300">/api/v1/repos/{'{repo_id}'}/style-analysis</code>
      </div>
      
      <p className="text-gray-300 mb-4">
        Analyze coding conventions and patterns in the repository.
      </p>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "naming": {
    "variables": "snake_case",
    "functions": "snake_case",
    "classes": "PascalCase",
    "confidence": 0.92
  },
  "patterns": {
    "async_style": "async/await",
    "error_handling": "try/except",
    "imports": "absolute"
  },
  "type_system": {
    "type_hint_usage": 0.78,
    "common_types": ["Optional", "List", "Dict"]
  },
  "common_imports": [
    { "module": "fastapi", "count": 34 },
    { "module": "pydantic", "count": 28 }
  ]
}`}
      </DocsCodeBlock>

      {/* Repository Insights */}
      <h2 id="insights" className="text-2xl font-semibold text-white mt-12 mb-4">Repository Insights</h2>
      
      <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg mb-4">
        <span className="text-xs font-mono font-bold px-2 py-1 rounded text-green-400 bg-green-500/10">
          GET
        </span>
        <code className="text-sm text-gray-300">/api/v1/repos/{'{repo_id}'}/insights</code>
      </div>
      
      <p className="text-gray-300 mb-4">
        Get high-level insights and metrics about a repository.
      </p>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Response</h4>
      <DocsCodeBlock language="json">
{`{
  "overview": {
    "total_files": 142,
    "total_lines": 28500,
    "languages": {
      "TypeScript": 65,
      "Python": 42,
      "JavaScript": 35
    }
  },
  "architecture": {
    "pattern": "monolith with service layer",
    "entry_points": ["src/main.py", "src/cli.py"],
    "critical_files": [
      "src/core/engine.py",
      "src/api/routes.py"
    ]
  },
  "health": {
    "test_coverage_estimate": "partial",
    "documentation_coverage": 0.45,
    "circular_dependencies": 0
  }
}`}
      </DocsCodeBlock>

      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Example</h4>
      <DocsCodeBlock language="bash">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  http://localhost:8000/api/v1/repos/repo_abc123/insights`}
      </DocsCodeBlock>

      <DocsPagination
        prev={{ title: 'Search API', href: '/docs/api/search' }}
        next={{ title: 'Architecture', href: '/docs/architecture' }}
      />
    </DocsLayout>
  )
}

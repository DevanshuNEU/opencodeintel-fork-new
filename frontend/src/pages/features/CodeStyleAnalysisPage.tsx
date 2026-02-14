import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'what-it-analyzes', title: 'What It Analyzes', level: 2 },
  { id: 'usage', title: 'Usage', level: 2 },
  { id: 'api-response', title: 'API Response', level: 2 },
  { id: 'use-cases', title: 'Use Cases', level: 2 },
]

export function CodeStyleAnalysisPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={3} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Code Style Analysis</h1>
        <p className="text-xl text-gray-400">
          Understand team conventions. Write code that fits in with existing patterns.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-6">
        Every codebase has conventions. Some use snake_case, others camelCase. Some teams 
        love type hints, others hate them. Code style analysis extracts these patterns 
        so you (or your AI assistant) can write code that fits in.
      </p>

      <h2 id="what-it-analyzes" className="text-2xl font-semibold text-white mt-12 mb-4">What It Analyzes</h2>
      
      <div className="space-y-4 mb-6">
        <StyleCategory
          title="Naming Conventions"
          items={[
            'Variable naming: snake_case vs camelCase vs PascalCase',
            'Function naming patterns',
            'Class naming conventions',
            'File naming style',
          ]}
        />
        <StyleCategory
          title="Code Patterns"
          items={[
            'Async/await usage vs callbacks vs promises',
            'Error handling style (try/catch vs result types)',
            'Import organization (absolute vs relative)',
            'Module structure (classes vs functions)',
          ]}
        />
        <StyleCategory
          title="Type System"
          items={[
            'Type hint usage percentage',
            'Any type usage (strict vs loose typing)',
            'Interface vs type preference (TypeScript)',
            'Generic usage patterns',
          ]}
        />
        <StyleCategory
          title="Common Imports"
          items={[
            'Most frequently imported modules',
            'Internal vs external dependency ratio',
            'Testing framework preferences',
            'Utility libraries used',
          ]}
        />
      </div>

      <h2 id="usage" className="text-2xl font-semibold text-white mt-12 mb-4">Usage</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Via MCP (Claude Desktop)</h3>
      <DocsCodeBlock language="text">
{`"What coding conventions does this repo use?"
"Is this codebase using snake_case or camelCase?"
"How should I structure a new module to fit this codebase?"
"What testing patterns does this team follow?"`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Via API</h3>
      <DocsCodeBlock language="bash">
{`curl "http://localhost:8000/api/repos/{repo_id}/style"`}
      </DocsCodeBlock>

      <h2 id="api-response" className="text-2xl font-semibold text-white mt-12 mb-4">API Response</h2>
      
      <DocsCodeBlock language="json">
{`{
  "naming": {
    "variables": "snake_case",
    "functions": "snake_case",
    "classes": "PascalCase",
    "files": "snake_case",
    "confidence": 0.92
  },
  "patterns": {
    "async_style": "async/await",
    "error_handling": "try/except with custom exceptions",
    "imports": "absolute with __init__.py exports",
    "structure": "class-based services with dependency injection"
  },
  "type_system": {
    "type_hint_usage": 0.78,
    "strict_mode": false,
    "common_types": ["Optional", "List", "Dict", "Union"]
  },
  "common_imports": [
    { "module": "fastapi", "count": 34 },
    { "module": "pydantic", "count": 28 },
    { "module": "sqlalchemy", "count": 22 },
    { "module": "pytest", "count": 18 }
  ],
  "recommendations": [
    "Use snake_case for variables and functions",
    "Add type hints - team uses them 78% of the time",
    "Follow existing pattern: services as classes, utilities as functions"
  ]
}`}
      </DocsCodeBlock>

      <h2 id="use-cases" className="text-2xl font-semibold text-white mt-12 mb-4">Use Cases</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Onboarding</h3>
      <p className="text-gray-300 mb-4">
        New to a codebase? Run style analysis to instantly learn the conventions.
        No more guessing if you should use tabs or spaces.
      </p>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">AI Code Generation</h3>
      <p className="text-gray-300 mb-4">
        When Claude generates code, it can use style analysis to match your team's patterns.
        The generated code looks like your team wrote it.
      </p>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Code Review</h3>
      <p className="text-gray-300 mb-4">
        Check if a PR follows team conventions. "This uses camelCase but we use snake_case."
      </p>

      <DocsCallout type="tip">
        Style analysis works best on codebases with consistent patterns. If your codebase 
        is a mix of styles (happens during migrations), the confidence scores will be lower.
      </DocsCallout>

      <DocsPagination
        prev={{ title: 'Impact Prediction', href: '/docs/features/impact' }}
        next={{ title: 'Docker Setup', href: '/docs/deployment/docker' }}
      />
    </DocsLayout>
  )
}

function StyleCategory({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
      <h4 className="font-medium text-white mb-3">{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
            <span className="text-gray-600 mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

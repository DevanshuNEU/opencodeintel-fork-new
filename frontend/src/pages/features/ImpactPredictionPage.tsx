import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'why-it-matters', title: 'Why It Matters', level: 2 },
  { id: 'what-you-get', title: 'What You Get', level: 2 },
  { id: 'usage', title: 'Usage', level: 2 },
  { id: 'api-response', title: 'API Response', level: 2 },
]

export function ImpactPredictionPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={4} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Impact Prediction</h1>
        <p className="text-xl text-gray-400">
          Know what breaks before you change it. See the blast radius of any modification.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-6">
        You are about to refactor <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">UserService.ts</code>. 
        Will anything break? Impact prediction tells you exactly which files depend on it, 
        which tests cover it, and how risky the change is.
      </p>

      <h2 id="why-it-matters" className="text-2xl font-semibold text-white mt-12 mb-4">Why It Matters</h2>
      
      <p className="text-gray-300 mb-4">
        Without impact analysis, you are guessing. You make a change, run the tests, 
        and hope nothing breaks in production. With impact analysis:
      </p>
      
      <ul className="space-y-2 text-gray-300 mb-6">
        <li className="flex items-start gap-2">
          <span className="text-green-400">✓</span>
          <span>Know exactly which files will be affected</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-400">✓</span>
          <span>See if tests exist for the affected code</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-400">✓</span>
          <span>Get a risk score to help prioritize review</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-400">✓</span>
          <span>Find blind spots where test coverage is missing</span>
        </li>
      </ul>

      <h2 id="what-you-get" className="text-2xl font-semibold text-white mt-12 mb-4">What You Get</h2>
      
      <div className="space-y-4 mb-6">
        <ImpactSection
          title="Direct Dependents"
          description="Files that directly import the file you are changing. These will definitely be affected."
        />
        <ImpactSection
          title="Indirect Dependents"
          description="Files that depend on the direct dependents. Ripple effects that might not be obvious."
        />
        <ImpactSection
          title="Related Tests"
          description="Test files that might cover this code. Run these to verify your changes."
        />
        <ImpactSection
          title="Risk Level"
          description="High, medium, or low based on number of dependents and test coverage."
        />
      </div>

      <DocsCallout type="warning" title="High-risk changes">
        If a file has 10+ dependents and no tests, think twice before making big changes.
        Consider adding tests first, or breaking the change into smaller pieces.
      </DocsCallout>

      <h2 id="usage" className="text-2xl font-semibold text-white mt-12 mb-4">Usage</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Via MCP (Claude Desktop)</h3>
      <DocsCodeBlock language="text">
{`"What is the impact of changing src/auth/middleware.py?"
"What happens if I modify the UserService?"
"Show me the blast radius of database.ts"`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Via API</h3>
      <DocsCodeBlock language="bash">
{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"file_path": "src/auth/middleware.py"}' \\
  http://localhost:8000/api/v1/repos/{repo_id}/impact`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Via Dashboard</h3>
      <p className="text-gray-300 mb-4">
        Click any file in the dependency graph and select "Analyze Impact" from the context menu.
      </p>

      <h2 id="api-response" className="text-2xl font-semibold text-white mt-12 mb-4">API Response</h2>
      
      <DocsCodeBlock language="json">
{`{
  "file": "src/auth/middleware.py",
  "risk_level": "high",
  "risk_score": 0.85,
  "direct_dependents": [
    "src/api/routes.py",
    "src/api/admin.py",
    "src/api/webhooks.py"
  ],
  "indirect_dependents": [
    "src/main.py",
    "src/server.py"
  ],
  "related_tests": [
    "tests/test_auth.py",
    "tests/integration/test_api.py"
  ],
  "test_coverage": {
    "has_tests": true,
    "test_count": 2,
    "coverage_estimate": "partial"
  },
  "recommendations": [
    "High-impact file with 5 dependents",
    "Consider adding more test coverage before major changes",
    "Related tests found - run these after modification"
  ]
}`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Risk Levels</h3>
      
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-gray-400 font-medium">Level</th>
              <th className="text-left py-3 text-gray-400 font-medium">Score</th>
              <th className="text-left py-3 text-gray-400 font-medium">Meaning</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-3"><span className="text-green-400">Low</span></td>
              <td className="py-3">0.0 - 0.3</td>
              <td className="py-3">Few or no dependents. Safe to modify.</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3"><span className="text-amber-400">Medium</span></td>
              <td className="py-3">0.3 - 0.7</td>
              <td className="py-3">Some dependents. Test after changes.</td>
            </tr>
            <tr>
              <td className="py-3"><span className="text-red-400">High</span></td>
              <td className="py-3">0.7 - 1.0</td>
              <td className="py-3">Many dependents or missing tests. Proceed carefully.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsPagination
        prev={{ title: 'Dependency Analysis', href: '/docs/features/dependencies' }}
        next={{ title: 'Code Style Analysis', href: '/docs/features/style' }}
      />
    </DocsLayout>
  )
}

function ImpactSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
      <h4 className="font-medium text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

import { 
  DocsLayout,
  DocsCodeBlock,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'search-code', title: 'search_code', level: 2 },
  { id: 'list-repositories', title: 'list_repositories', level: 2 },
  { id: 'get-dependency-graph', title: 'get_dependency_graph', level: 2 },
  { id: 'analyze-impact', title: 'analyze_impact', level: 2 },
  { id: 'analyze-code-style', title: 'analyze_code_style', level: 2 },
  { id: 'get-repository-insights', title: 'get_repository_insights', level: 2 },
  { id: 'get-codebase-dna', title: 'get_codebase_dna', level: 2 },
]

export function MCPToolsPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={6} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">MCP Tools Reference</h1>
        <p className="text-xl text-gray-400">
          Complete reference for all MCP tools available to Claude and other AI assistants.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-8">
        When you connect OpenCodeIntel via MCP, your AI assistant gets access to these tools.
        Each tool has specific parameters and returns structured data.
      </p>

      {/* search_code */}
      <ToolSection
        id="search-code"
        name="search_code"
        description="Semantic search across your codebase. Finds code by meaning, not just keywords."
        parameters={[
          { name: 'query', type: 'string', required: true, description: 'Natural language search query' },
          { name: 'repo_id', type: 'string', required: true, description: 'Repository identifier' },
          { name: 'max_results', type: 'integer', required: false, description: 'Maximum results to return (default: 10)' },
        ]}
        returns="Array of code chunks with file path, content, and relevance score"
        example={`Claude, search for "authentication middleware" in my codebase`}
      />

      {/* list_repositories */}
      <ToolSection
        id="list-repositories"
        name="list_repositories"
        description="Get all indexed repositories available for analysis."
        parameters={[]}
        returns="Array of repositories with id, name, status, and file count"
        example={`What repositories do you have access to?`}
      />

      {/* get_dependency_graph */}
      <ToolSection
        id="get-dependency-graph"
        name="get_dependency_graph"
        description="Get the complete import/dependency graph for a repository."
        parameters={[
          { name: 'repo_id', type: 'string', required: true, description: 'Repository identifier' },
        ]}
        returns="Nodes (files) and edges (imports) with statistics about hub files and isolated files"
        example={`Show me the dependency graph for this repo`}
      />

      {/* analyze_impact */}
      <ToolSection
        id="analyze-impact"
        name="analyze_impact"
        description="Analyze the impact of changing a specific file. Shows dependents, risk level, and related tests."
        parameters={[
          { name: 'repo_id', type: 'string', required: true, description: 'Repository identifier' },
          { name: 'file_path', type: 'string', required: true, description: 'Path to the file to analyze' },
        ]}
        returns="Direct dependents, indirect dependents, related tests, risk score, and recommendations"
        example={`What happens if I modify src/auth/middleware.py?`}
      />

      {/* analyze_code_style */}
      <ToolSection
        id="analyze-code-style"
        name="analyze_code_style"
        description="Analyze team coding patterns and conventions in a repository."
        parameters={[
          { name: 'repo_id', type: 'string', required: true, description: 'Repository identifier' },
        ]}
        returns="Naming conventions, async patterns, type hint usage, common imports, and style recommendations"
        example={`What coding conventions does this codebase use?`}
      />

      {/* get_repository_insights */}
      <ToolSection
        id="get-repository-insights"
        name="get_repository_insights"
        description="Get high-level insights about a repository including architecture overview and key metrics."
        parameters={[
          { name: 'repo_id', type: 'string', required: true, description: 'Repository identifier' },
        ]}
        returns="File count, language breakdown, critical files, architecture patterns, and dependency metrics"
        example={`Give me an overview of this codebase`}
      />

      {/* get_codebase_dna */}
      <ToolSection
        id="get-codebase-dna"
        name="get_codebase_dna"
        description="Extract the architectural DNA - patterns, conventions, and constraints that define how code should be written."
        parameters={[
          { name: 'repo_id', type: 'string', required: true, description: 'Repository identifier' },
        ]}
        returns="Authentication patterns, service layer structure, database conventions, error handling, and common imports"
        example={`What patterns should I follow when adding new code to this repo?`}
      />

      <DocsPagination
        prev={{ title: 'MCP Setup', href: '/docs/mcp-setup' }}
        next={{ title: 'Example Prompts', href: '/docs/mcp-examples' }}
      />
    </DocsLayout>
  )
}

interface Parameter {
  name: string
  type: string
  required: boolean
  description: string
}

interface ToolSectionProps {
  id: string
  name: string
  description: string
  parameters: Parameter[]
  returns: string
  example: string
}

function ToolSection({ id, name, description, parameters, returns, example }: ToolSectionProps) {
  return (
    <section id={id} className="mb-12 pb-8 border-b border-white/5 last:border-0">
      <h2 className="text-2xl font-semibold text-white mb-2 font-mono">{name}</h2>
      <p className="text-gray-300 mb-6">{description}</p>
      
      {parameters.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Parameters</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-400 font-medium">Name</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Required</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {parameters.map((param) => (
                  <tr key={param.name} className="border-b border-white/5">
                    <td className="py-2 font-mono text-blue-400">{param.name}</td>
                    <td className="py-2 font-mono text-xs">{param.type}</td>
                    <td className="py-2">{param.required ? <span className="text-amber-400">Yes</span> : 'No'}</td>
                    <td className="py-2">{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {parameters.length === 0 && (
        <p className="text-gray-500 text-sm mb-6">No parameters required.</p>
      )}
      
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Returns</h3>
      <p className="text-gray-300 mb-6">{returns}</p>
      
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Example Prompt</h3>
      <DocsCodeBlock language="text">{example}</DocsCodeBlock>
    </section>
  )
}

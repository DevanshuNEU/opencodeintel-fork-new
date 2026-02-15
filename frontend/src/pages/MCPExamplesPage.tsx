import { 
  DocsLayout,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'onboarding', title: 'Onboarding to New Codebase', level: 2 },
  { id: 'refactoring', title: 'Before Refactoring', level: 2 },
  { id: 'debugging', title: 'Debugging', level: 2 },
  { id: 'code-review', title: 'Code Review', level: 2 },
  { id: 'writing-new-code', title: 'Writing New Code', level: 2 },
  { id: 'documentation', title: 'Documentation', level: 2 },
]

export function MCPExamplesPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={5} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Example Prompts</h1>
        <p className="text-xl text-gray-400">
          Real-world prompts for using OpenCodeIntel with Claude. Copy, paste, adapt.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-8">
        These are actual prompts that work well with OpenCodeIntel. They show how to 
        leverage semantic search, dependency analysis, and impact prediction in real workflows.
      </p>

      {/* Onboarding */}
      <h2 id="onboarding" className="text-2xl font-semibold text-white mt-12 mb-4">
        Onboarding to New Codebase
      </h2>
      <p className="text-gray-300 mb-6">First day on a new project? Start here.</p>
      
      <PromptCard
        title="Architecture Overview"
        prompt="Give me an overview of this codebase. What are the main components? How is it structured?"
        explanation="Uses get_repository_insights to show file breakdown, critical files, and architecture patterns."
      />
      <PromptCard
        title="Find Entry Points"
        prompt="Search for the main entry points of this application. Where does execution start?"
        explanation="Semantic search for 'main entry point', 'app initialization', 'server start'."
      />
      <PromptCard
        title="Understand Data Flow"
        prompt="Show me the dependency graph. I want to understand how different parts of the codebase connect."
        explanation="Uses get_dependency_graph to visualize imports and identify hub files."
      />

      {/* Refactoring */}
      <h2 id="refactoring" className="text-2xl font-semibold text-white mt-12 mb-4">
        Before Refactoring
      </h2>
      <p className="text-gray-300 mb-6">Know what will break before you break it.</p>
      
      <PromptCard
        title="Impact Analysis"
        prompt="I want to refactor UserService.ts. What is the impact? What files depend on it? What tests cover it?"
        explanation="Uses analyze_impact to show dependents, risk level, and related tests."
      />
      <PromptCard
        title="Find All Usages"
        prompt="Search for all places that use the deprecated oldAuth() function. I need to update them all."
        explanation="Semantic search finds usages even if function is wrapped or aliased."
      />
      <PromptCard
        title="Safe to Delete?"
        prompt="Is src/utils/legacy.ts safe to delete? What depends on it?"
        explanation="Impact analysis shows if anything imports this file."
      />

      {/* Debugging */}
      <h2 id="debugging" className="text-2xl font-semibold text-white mt-12 mb-4">
        Debugging
      </h2>
      <p className="text-gray-300 mb-6">Find the source of bugs faster.</p>
      
      <PromptCard
        title="Find Error Handling"
        prompt="Where is error handling implemented in this codebase? I am seeing unhandled exceptions."
        explanation="Semantic search for error handling patterns, try/catch blocks, error middleware."
      />
      <PromptCard
        title="Trace Data Flow"
        prompt="How does user data flow from the login form to the database? Show me the path."
        explanation="Combines search with dependency analysis to trace the flow."
      />
      <PromptCard
        title="Find Similar Code"
        prompt="Search for code similar to this payment processing logic. Maybe there is a pattern I should follow."
        explanation="Semantic search finds conceptually similar code even with different naming."
      />

      {/* Code Review */}
      <h2 id="code-review" className="text-2xl font-semibold text-white mt-12 mb-4">
        Code Review
      </h2>
      <p className="text-gray-300 mb-6">Review PRs with context.</p>
      
      <PromptCard
        title="Check Conventions"
        prompt="Does this new code follow the team's coding conventions? Analyze the code style of this repo."
        explanation="Uses analyze_code_style to show naming patterns, async style, type usage."
      />
      <PromptCard
        title="Risk Assessment"
        prompt="This PR modifies auth/middleware.py. How risky is this change? What else might break?"
        explanation="Impact analysis shows blast radius of the change."
      />
      <PromptCard
        title="Missing Tests?"
        prompt="The PR changes UserService. Are there tests that cover this? What is the test coverage like?"
        explanation="Impact analysis includes related test files."
      />

      {/* Writing New Code */}
      <h2 id="writing-new-code" className="text-2xl font-semibold text-white mt-12 mb-4">
        Writing New Code
      </h2>
      <p className="text-gray-300 mb-6">Write code that fits in.</p>
      
      <PromptCard
        title="Match Team Style"
        prompt="I need to write a new API endpoint. Show me examples of how existing endpoints are structured in this codebase."
        explanation="Search for 'API endpoint' combined with code style analysis."
      />
      <PromptCard
        title="Find Patterns"
        prompt="How does this codebase handle database transactions? I want to follow the same pattern."
        explanation="Semantic search for 'database transaction', 'commit', 'rollback'."
      />
      <PromptCard
        title="Codebase DNA"
        prompt="What patterns should I follow when adding new code? Give me the codebase DNA."
        explanation="Uses get_codebase_dna to extract architectural patterns and conventions."
      />

      {/* Documentation */}
      <h2 id="documentation" className="text-2xl font-semibold text-white mt-12 mb-4">
        Documentation
      </h2>
      <p className="text-gray-300 mb-6">Understand and document.</p>
      
      <PromptCard
        title="Explain a Module"
        prompt="Explain what the src/services/billing/ module does. Give me a high-level overview."
        explanation="Search within the module combined with dependency analysis."
      />
      <PromptCard
        title="Generate Docs"
        prompt="I need to write documentation for the API. Search for all API routes and their handlers."
        explanation="Semantic search for 'API route', 'endpoint', 'handler'."
      />

      <DocsCallout type="tip">
        These prompts work best when you have already indexed your repository. 
        The more code indexed, the better the results.
      </DocsCallout>

      <DocsPagination
        prev={{ title: 'MCP Tools', href: '/docs/mcp-tools' }}
        next={{ title: 'Semantic Search', href: '/docs/features/search' }}
      />
    </DocsLayout>
  )
}

function PromptCard({ title, prompt, explanation }: { title: string; prompt: string; explanation: string }) {
  return (
    <div className="mb-4 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
      <h4 className="font-medium text-white mb-2">{title}</h4>
      <p className="text-blue-400 mb-2 italic">"{prompt}"</p>
      <p className="text-sm text-gray-500">{explanation}</p>
    </div>
  )
}

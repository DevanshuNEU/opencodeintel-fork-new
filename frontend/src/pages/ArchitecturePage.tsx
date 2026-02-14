import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'overview', title: 'Overview', level: 2 },
  { id: 'tech-stack', title: 'Tech Stack', level: 2 },
  { id: 'data-flow', title: 'Data Flow', level: 2 },
  { id: 'backend-services', title: 'Backend Services', level: 2 },
  { id: 'frontend-structure', title: 'Frontend Structure', level: 2 },
  { id: 'mcp-server', title: 'MCP Server', level: 2 },
  { id: 'database-schema', title: 'Database Schema', level: 2 },
]

export function ArchitecturePage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={10} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Architecture</h1>
        <p className="text-xl text-gray-400">
          How OpenCodeIntel is built. Technical deep-dive for contributors.
        </p>
      </div>

      <h2 id="overview" className="text-2xl font-semibold text-white mt-12 mb-4">Overview</h2>
      
      <p className="text-gray-300 mb-6">
        OpenCodeIntel is a monorepo with three main components: a FastAPI backend, 
        a React frontend, and a standalone MCP server. The backend handles code indexing, 
        semantic search, and analysis. The frontend provides the dashboard UI. The MCP 
        server exposes tools to AI assistants like Claude.
      </p>

      <DocsCodeBlock language="text">
{`opencodeintel/
├── backend/          # FastAPI API server (Python 3.11+)
├── frontend/         # React dashboard (TypeScript, Vite, Bun)
├── mcp-server/       # MCP protocol server (Python)
├── supabase/         # Database migrations
├── docs/             # Additional documentation
└── docker-compose.yml`}
      </DocsCodeBlock>

      <h2 id="tech-stack" className="text-2xl font-semibold text-white mt-12 mb-4">Tech Stack</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Backend</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-gray-400 font-medium">Component</th>
              <th className="text-left py-2 text-gray-400 font-medium">Technology</th>
              <th className="text-left py-2 text-gray-400 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-2">Framework</td>
              <td className="py-2 font-mono text-blue-400">FastAPI</td>
              <td className="py-2">Async REST API with automatic OpenAPI docs</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Runtime</td>
              <td className="py-2 font-mono text-blue-400">Python 3.11+</td>
              <td className="py-2">Required for tree-sitter bindings</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Code Parsing</td>
              <td className="py-2 font-mono text-blue-400">Tree-sitter</td>
              <td className="py-2">AST extraction for Python, JS, TS</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Embeddings</td>
              <td className="py-2 font-mono text-blue-400">OpenAI text-embedding-3-small</td>
              <td className="py-2">1536-dim vectors for semantic search</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Summaries</td>
              <td className="py-2 font-mono text-blue-400">GPT-4o-mini</td>
              <td className="py-2">Natural language code descriptions</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Vector DB</td>
              <td className="py-2 font-mono text-blue-400">Pinecone</td>
              <td className="py-2">Serverless vector storage and search</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Cache</td>
              <td className="py-2 font-mono text-blue-400">Redis</td>
              <td className="py-2">Query caching, rate limiting</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Database</td>
              <td className="py-2 font-mono text-blue-400">Supabase (PostgreSQL)</td>
              <td className="py-2">User data, repo metadata, API keys</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Auth</td>
              <td className="py-2 font-mono text-blue-400">Supabase Auth</td>
              <td className="py-2">JWT-based authentication</td>
            </tr>
            <tr>
              <td className="py-2">Reranking</td>
              <td className="py-2 font-mono text-blue-400">Cohere (optional)</td>
              <td className="py-2">Improves search result ordering</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Frontend</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-gray-400 font-medium">Component</th>
              <th className="text-left py-2 text-gray-400 font-medium">Technology</th>
              <th className="text-left py-2 text-gray-400 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-2">Framework</td>
              <td className="py-2 font-mono text-blue-400">React 18</td>
              <td className="py-2">UI framework</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Language</td>
              <td className="py-2 font-mono text-blue-400">TypeScript</td>
              <td className="py-2">Type safety</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Build Tool</td>
              <td className="py-2 font-mono text-blue-400">Vite</td>
              <td className="py-2">Fast dev server and bundling</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Package Manager</td>
              <td className="py-2 font-mono text-blue-400">Bun</td>
              <td className="py-2">Fast installs (do NOT use npm)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Styling</td>
              <td className="py-2 font-mono text-blue-400">Tailwind CSS</td>
              <td className="py-2">Utility-first CSS</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Components</td>
              <td className="py-2 font-mono text-blue-400">shadcn/ui + Radix</td>
              <td className="py-2">Accessible component primitives</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Data Fetching</td>
              <td className="py-2 font-mono text-blue-400">TanStack Query</td>
              <td className="py-2">Caching, background refetch</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2">Routing</td>
              <td className="py-2 font-mono text-blue-400">React Router v7</td>
              <td className="py-2">Client-side navigation</td>
            </tr>
            <tr>
              <td className="py-2">Graph Visualization</td>
              <td className="py-2 font-mono text-blue-400">React Flow + Dagre</td>
              <td className="py-2">Dependency graph rendering</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsCallout type="warning" title="Important">
        The frontend uses <strong>Bun</strong> exclusively. Never use npm or yarn. 
        Always run <code>bun install</code>, not <code>npm install</code>.
      </DocsCallout>

      <h2 id="data-flow" className="text-2xl font-semibold text-white mt-12 mb-4">Data Flow</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Indexing Pipeline</h3>
      <p className="text-gray-300 mb-4">When a repository is added:</p>
      
      <DocsCodeBlock language="text">
{`1. Clone repo to backend/repos/{uuid}/
2. Walk file tree, filter by language (Python, JS, TS)
3. For each file:
   a. Parse with Tree-sitter → Extract functions/classes
   b. Generate summary with GPT-4o-mini
   c. Create embedding with text-embedding-3-small
   d. Store in Pinecone with metadata
4. Build dependency graph from import statements
5. Cache graph in Redis
6. Update repo status in Supabase`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Search Pipeline</h3>
      <DocsCodeBlock language="text">
{`1. Receive query from user/MCP
2. Check Redis cache for identical query
3. If miss:
   a. Embed query with text-embedding-3-small
   b. Query Pinecone for top-k similar chunks
   c. (Optional) Rerank with Cohere
   d. Cache results in Redis (5 min TTL)
4. Return formatted results`}
      </DocsCodeBlock>

      <h2 id="backend-services" className="text-2xl font-semibold text-white mt-12 mb-4">Backend Services</h2>
      
      <p className="text-gray-300 mb-4">
        Key services in <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">backend/services/</code>:
      </p>

      <div className="space-y-4 mb-6">
        <ServiceCard
          name="indexer_optimized.py"
          description="Main indexing engine. Handles file parsing, embedding generation, and Pinecone upserts. Uses batch processing for performance."
        />
        <ServiceCard
          name="dependency_analyzer.py"
          description="Extracts import statements using Tree-sitter. Builds directed graph of file dependencies. Identifies hub files and circular dependencies."
        />
        <ServiceCard
          name="style_analyzer.py"
          description="Analyzes coding conventions: naming patterns (snake_case vs camelCase), async usage, type hint coverage, common imports."
        />
        <ServiceCard
          name="dna_extractor.py"
          description="Generates 'codebase DNA' - architectural patterns, auth conventions, database patterns, error handling. Used to help AI write consistent code."
        />
        <ServiceCard
          name="search_v2/"
          description="Hybrid search implementation. Combines BM25 keyword search with semantic embeddings. Optional Cohere reranking."
        />
        <ServiceCard
          name="cache.py"
          description="Redis wrapper for caching search results, dependency graphs, and style analysis."
        />
      </div>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">API Routes</h3>
      <p className="text-gray-300 mb-4">
        Routes in <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">backend/routes/</code>. 
        All prefixed with <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">/api/v1</code>:
      </p>

      <DocsCodeBlock language="text">
{`repos.py      → /api/v1/repos/*        # CRUD for repositories
search.py     → /api/v1/search         # Semantic search
analysis.py   → /api/v1/repos/{id}/*   # Dependencies, impact, style, DNA
auth.py       → /api/v1/auth/*         # Login, signup, session
github.py     → /api/v1/github/*       # GitHub OAuth, repo import
health.py     → /health                # Health check (no prefix)`}
      </DocsCodeBlock>

      <h2 id="frontend-structure" className="text-2xl font-semibold text-white mt-12 mb-4">Frontend Structure</h2>
      
      <DocsCodeBlock language="text">
{`frontend/src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── docs/            # Documentation components
│   ├── dashboard/       # Dashboard-specific components
│   ├── landing/         # Landing page components
│   └── DependencyGraph/ # React Flow graph components
├── pages/               # Route components
├── contexts/            # React contexts (AuthContext)
├── hooks/               # Custom hooks
├── services/            # API client
├── lib/                 # Utilities
└── config/              # App configuration`}
      </DocsCodeBlock>

      <h2 id="mcp-server" className="text-2xl font-semibold text-white mt-12 mb-4">MCP Server</h2>
      
      <p className="text-gray-300 mb-4">
        The MCP server (<code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">mcp-server/server.py</code>) 
        is a standalone Python process that exposes 7 tools to AI assistants:
      </p>

      <DocsCodeBlock language="python">
{`# Tools exposed via MCP protocol
search_code           # Semantic code search
list_repositories     # List indexed repos
get_dependency_graph  # File dependency graph
analyze_code_style    # Team coding conventions
analyze_impact        # Change impact analysis
get_repository_insights  # High-level repo metrics
get_codebase_dna      # Architectural patterns`}
      </DocsCodeBlock>

      <p className="text-gray-300 mt-4 mb-4">
        The MCP server is a thin proxy - it forwards requests to the FastAPI backend 
        and formats responses for AI consumption. It uses <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">httpx</code> for 
        async HTTP calls and the <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">mcp</code> library 
        for protocol handling.
      </p>

      <h2 id="database-schema" className="text-2xl font-semibold text-white mt-12 mb-4">Database Schema</h2>
      
      <p className="text-gray-300 mb-4">
        Supabase tables (see <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">supabase/migrations/</code>):
      </p>

      <DocsCodeBlock language="sql">
{`-- Core tables in codeintel schema
codeintel.repositories    # Repo metadata, status, user_id
codeintel.api_keys        # User API keys for programmatic access
codeintel.user_limits     # Rate limits and quotas per user

-- Auth handled by Supabase Auth (auth.users)
-- Row Level Security (RLS) enforces user isolation`}
      </DocsCodeBlock>

      <DocsCallout type="info">
        Vector embeddings are stored in Pinecone, not PostgreSQL. 
        This allows efficient similarity search at scale.
      </DocsCallout>

      <DocsPagination
        prev={{ title: 'Analysis API', href: '/docs/api/analysis' }}
        next={{ title: 'Contributing', href: '/docs/contributing' }}
      />
    </DocsLayout>
  )
}

function ServiceCard({ name, description }: { name: string; description: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
      <h4 className="font-mono text-blue-400 mb-2">{name}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

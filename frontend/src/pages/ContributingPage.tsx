import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPrerequisites,
  DocsPagination,
  TimeEstimate,
  Step,
  StepList,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'prerequisites', title: 'Prerequisites', level: 2 },
  { id: 'local-setup', title: 'Local Setup', level: 2 },
  { id: 'running-tests', title: 'Running Tests', level: 2 },
  { id: 'code-style', title: 'Code Style', level: 2 },
  { id: 'pull-requests', title: 'Pull Requests', level: 2 },
  { id: 'project-structure', title: 'Project Structure', level: 2 },
]

export function ContributingPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={8} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Contributing</h1>
        <p className="text-xl text-gray-400">
          How to set up your development environment and contribute to OpenCodeIntel.
        </p>
      </div>

      <h2 id="prerequisites" className="text-2xl font-semibold text-white mt-12 mb-4">Prerequisites</h2>
      
      <DocsPrerequisites 
        defaultOpen={true}
        items={[
          { text: 'Python 3.11+', href: 'https://www.python.org/downloads/' },
          { text: 'Bun (for frontend)', href: 'https://bun.sh/' },
          { text: 'Docker Desktop (optional)', href: 'https://www.docker.com/products/docker-desktop/' },
          { text: 'Git' },
          { text: 'OpenAI API key', href: 'https://platform.openai.com/api-keys' },
          { text: 'Pinecone account', href: 'https://www.pinecone.io/' },
        ]} 
      />

      <DocsCallout type="warning" title="Important">
        The frontend uses <strong>Bun</strong> exclusively. Do NOT use npm or yarn.
        If you don't have Bun, install it: <code>curl -fsSL https://bun.sh/install | bash</code>
      </DocsCallout>

      <h2 id="local-setup" className="text-2xl font-semibold text-white mt-12 mb-4">Local Setup</h2>
      
      <StepList>
        <Step number={1} title="Fork and Clone">
          <DocsCodeBlock language="bash">
{`git clone https://github.com/YOUR_USERNAME/opencodeintel.git
cd opencodeintel`}
          </DocsCodeBlock>
        </Step>

        <Step number={2} title="Set Up Backend">
          <DocsCodeBlock language="bash">
{`cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY
# - PINECONE_API_KEY
# - PINECONE_INDEX_NAME`}
          </DocsCodeBlock>
        </Step>

        <Step number={3} title="Set Up Frontend">
          <DocsCodeBlock language="bash">
{`cd ../frontend
bun install  # NOT npm install!

# Configure environment
cp .env.example .env`}
          </DocsCodeBlock>
        </Step>

        <Step number={4} title="Start Development Servers">
          <p className="mb-4">Option A: Run services individually</p>
          <DocsCodeBlock language="bash">
{`# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
bun run dev`}
          </DocsCodeBlock>
          
          <p className="mt-6 mb-4">Option B: Use Docker Compose</p>
          <DocsCodeBlock language="bash">
{`docker compose up -d`}
          </DocsCodeBlock>
        </Step>

        <Step number={5} title="Verify Setup">
          <ul className="space-y-2 text-gray-300">
            <li>Frontend: <a href="http://localhost:3000" className="text-blue-400 hover:underline">localhost:3000</a> (or 5173 if running directly)</li>
            <li>Backend API: <a href="http://localhost:8000/docs" className="text-blue-400 hover:underline">localhost:8000/docs</a></li>
            <li>Health check: <a href="http://localhost:8000/health" className="text-blue-400 hover:underline">localhost:8000/health</a></li>
          </ul>
        </Step>
      </StepList>

      <h2 id="running-tests" className="text-2xl font-semibold text-white mt-12 mb-4">Running Tests</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Backend Tests</h3>
      <DocsCodeBlock language="bash">
{`cd backend
source venv/bin/activate

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=services --cov-report=term-missing

# Run specific test file
pytest tests/test_validation.py -v

# Run tests matching a pattern
pytest tests/ -v -k "test_search"`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Frontend Type Check</h3>
      <DocsCodeBlock language="bash">
{`cd frontend
bun run build        # Build check
bun run typecheck    # TypeScript only`}
      </DocsCodeBlock>

      <DocsCallout type="info">
        Tests use mocked external services (OpenAI, Pinecone, Supabase). 
        See <code>backend/tests/conftest.py</code> for mock setup.
      </DocsCallout>

      <h2 id="code-style" className="text-2xl font-semibold text-white mt-12 mb-4">Code Style</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Python (Backend)</h3>
      <ul className="space-y-2 text-gray-300 mb-6">
        <li>Follow PEP 8</li>
        <li>Use type hints for function signatures</li>
        <li>Max line length: 120 characters</li>
        <li>Use <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">async/await</code> for I/O operations</li>
        <li>Docstrings for public functions</li>
      </ul>

      <DocsCodeBlock language="bash">
{`# Lint check
flake8 services/ --max-line-length=120`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">TypeScript (Frontend)</h3>
      <ul className="space-y-2 text-gray-300 mb-6">
        <li>TypeScript strict mode enabled</li>
        <li>Prefer functional components with hooks</li>
        <li>Use Tailwind for styling (no CSS files)</li>
        <li>Prefer shadcn/ui components over custom UI</li>
        <li>No <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">any</code> types without justification</li>
      </ul>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Commit Messages</h3>
      <p className="text-gray-300 mb-4">Use conventional commits:</p>
      <DocsCodeBlock language="text">
{`feat: add new feature
fix: bug fix
docs: documentation changes
refactor: code restructuring
test: adding tests
chore: maintenance tasks`}
      </DocsCodeBlock>

      <h2 id="pull-requests" className="text-2xl font-semibold text-white mt-12 mb-4">Pull Requests</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Before Submitting</h3>
      <ul className="space-y-2 text-gray-300 mb-6">
        <li>Create an issue first to discuss the approach</li>
        <li>Fork the repo and create a feature branch</li>
        <li>Write tests for new functionality</li>
        <li>Ensure all tests pass: <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">pytest tests/ -v</code></li>
        <li>Update documentation if needed</li>
      </ul>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">PR Guidelines</h3>
      <ul className="space-y-2 text-gray-300 mb-6">
        <li>Keep changes focused (one feature/fix per PR)</li>
        <li>Write clear commit messages</li>
        <li>Reference the issue number in the PR description</li>
        <li>Add tests for new code</li>
        <li>Respond to review feedback promptly</li>
      </ul>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Branch Naming</h3>
      <DocsCodeBlock language="text">
{`feature/add-rust-support
fix/search-cache-bug
docs/update-api-reference
refactor/simplify-indexer`}
      </DocsCodeBlock>

      <h2 id="project-structure" className="text-2xl font-semibold text-white mt-12 mb-4">Project Structure</h2>
      
      <DocsCodeBlock language="text">
{`opencodeintel/
├── backend/
│   ├── main.py           # FastAPI app entry point
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, rate limiting
│   ├── tests/            # pytest test suite
│   ├── config/           # API versioning config
│   └── requirements.txt  # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom hooks
│   │   ├── contexts/     # React contexts
│   │   └── services/     # API client
│   ├── package.json      # Dependencies
│   └── bun.lock          # Bun lockfile (NOT package-lock.json)
│
├── mcp-server/
│   ├── server.py         # MCP protocol implementation
│   └── config.py         # API URL config
│
├── supabase/
│   └── migrations/       # Database schema
│
├── docker-compose.yml    # Local development stack
├── Makefile              # Common commands
└── CONTRIBUTING.md       # This guide (markdown version)`}
      </DocsCodeBlock>

      <DocsCallout type="tip">
        Use <code>make</code> commands for common tasks:
        <code className="block mt-2">make f</code> - Rebuild frontend
        <code className="block">make b</code> - Rebuild backend
        <code className="block">make logs</code> - View frontend logs
      </DocsCallout>

      <DocsPagination
        prev={{ title: 'Architecture', href: '/docs/architecture' }}
        next={{ title: 'Documentation Home', href: '/docs' }}
      />
    </DocsLayout>
  )
}

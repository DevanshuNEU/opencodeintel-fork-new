import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPrerequisites,
  DocsLearningObjectives,
  DocsPagination,
  TimeEstimate,
  Step,
  StepList,
  TOCItem
} from '@/components/docs'
import { Zap } from 'lucide-react'

const tocItems: TOCItem[] = [
  { id: 'hosted', title: 'Option 1: Hosted (Fastest)', level: 2 },
  { id: 'docker', title: 'Option 2: Docker', level: 2 },
  { id: 'manual', title: 'Option 3: Manual Setup', level: 2 },
  { id: 'next-steps', title: 'Next Steps', level: 2 },
]

export function QuickStartPage() {
  return (
    <DocsLayout toc={tocItems}>
      {/* Header */}
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={5} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Quick Start</h1>
        <p className="text-xl text-gray-400">
          Get OpenCodeIntel running and search your first codebase in under 5 minutes.
        </p>
      </div>

      <DocsLearningObjectives items={[
        { text: 'Set up OpenCodeIntel (hosted or self-hosted)' },
        { text: 'Index your first repository' },
        { text: 'Run your first semantic search' },
      ]} />

      <p className="text-gray-300 text-lg leading-relaxed mb-8">
        Pick the setup that works for you. Hosted is fastest if you just want to try it out.
        Docker is great for local development. Manual gives you the most control.
      </p>

      {/* Option 1: Hosted */}
      <h2 id="hosted" className="text-2xl font-semibold text-white mt-12 mb-4">
        Option 1: Hosted (Fastest)
      </h2>
      <p className="text-gray-300 mb-6">
        Zero setup. Just sign in and start searching.
      </p>

      <StepList>
        <Step number={1} title="Go to opencodeintel.com">
          <p>
            Head to <a href="https://opencodeintel.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">opencodeintel.com</a> and 
            sign in with GitHub.
          </p>
        </Step>

        <Step number={2} title="Add a Repository">
          <p>
            Click "Add Repository" and paste a GitHub URL. Public repos work immediately.
            For private repos, you will need to connect your GitHub account.
          </p>
        </Step>

        <Step number={3} title="Wait for Indexing">
          <p>
            Indexing takes 30 seconds to a few minutes depending on repo size.
            You will see a progress bar. Grab a coffee if it is a big one.
          </p>
        </Step>

        <Step number={4} title="Search">
          <p>
            Once indexed, type a query like "authentication logic" or "error handling" 
            and see the magic happen.
          </p>
          <DocsCallout type="success" title="You are done!">
            That is it. You can now search your codebase by meaning, not keywords.
          </DocsCallout>
        </Step>
      </StepList>

      {/* Option 2: Docker */}
      <h2 id="docker" className="text-2xl font-semibold text-white mt-12 mb-4">
        Option 2: Docker
      </h2>
      <p className="text-gray-300 mb-6">
        Run everything locally with one command. Great for development or keeping data on your machine.
      </p>

      <DocsPrerequisites 
        defaultOpen={true}
        items={[
          { text: 'Docker Desktop installed', href: 'https://www.docker.com/products/docker-desktop/' },
          { text: 'OpenAI API key (for embeddings)' },
          { text: 'Pinecone account (free tier works)', href: 'https://www.pinecone.io/' },
        ]} 
      />

      <StepList>
        <Step number={1} title="Clone the Repository">
          <DocsCodeBlock language="bash">
{`git clone https://github.com/OpenCodeIntel/opencodeintel.git
cd opencodeintel`}
          </DocsCodeBlock>
        </Step>

        <Step number={2} title="Configure Environment">
          <DocsCodeBlock language="bash">
{`cp .env.example .env`}
          </DocsCodeBlock>
          <p>Edit <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">.env</code> and add your API keys:</p>
          <DocsCodeBlock language="bash" filename=".env">
{`OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=codeintel`}
          </DocsCodeBlock>
        </Step>

        <Step number={3} title="Start the Stack">
          <DocsCodeBlock language="bash">
{`docker compose up -d`}
          </DocsCodeBlock>
          <p>This starts the backend, frontend, and Redis. First run takes a few minutes to build.</p>
        </Step>

        <Step number={4} title="Open the Dashboard">
          <p>
            Go to <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">localhost:3000</a> and 
            you will see the OpenCodeIntel dashboard.
          </p>
          <DocsCallout type="info">
            Backend API runs on <code>localhost:8000</code>. API docs at <code>localhost:8000/docs</code>.
          </DocsCallout>
        </Step>
      </StepList>

      {/* Option 3: Manual */}
      <h2 id="manual" className="text-2xl font-semibold text-white mt-12 mb-4">
        Option 3: Manual Setup
      </h2>
      <p className="text-gray-300 mb-6">
        Run backend and frontend separately. Best for active development.
      </p>

      <DocsPrerequisites 
        items={[
          { text: 'Python 3.11+' },
          { text: 'Node.js 20+ (or Bun)' },
          { text: 'Redis running locally' },
          { text: 'OpenAI and Pinecone API keys' },
        ]} 
      />

      <StepList>
        <Step number={1} title="Start Redis">
          <DocsCodeBlock language="bash">
{`# macOS with Homebrew
brew install redis
brew services start redis

# Or with Docker
docker run -d -p 6379:6379 redis:7-alpine`}
          </DocsCodeBlock>
        </Step>

        <Step number={2} title="Backend Setup">
          <DocsCodeBlock language="bash">
{`cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn main:app --reload`}
          </DocsCodeBlock>
          <p>Backend will be running on <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">localhost:8000</code>.</p>
        </Step>

        <Step number={3} title="Frontend Setup">
          <DocsCodeBlock language="bash">
{`cd frontend
bun install
bun run dev`}
          </DocsCodeBlock>
          <p>Frontend will be running on <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">localhost:5173</code>.</p>
        </Step>
      </StepList>

      {/* Next Steps */}
      <h2 id="next-steps" className="text-2xl font-semibold text-white mt-12 mb-4">
        Next Steps
      </h2>
      <p className="text-gray-300 mb-4">
        Now that you have OpenCodeIntel running, here is what to do next:
      </p>
      <ul className="space-y-2 text-gray-300 mb-8">
        <li className="flex items-start gap-2">
          <span className="text-blue-400 mt-1">→</span>
          <span><strong className="text-white">Connect to Claude:</strong> Set up MCP to give Claude access to your codebase. <a href="/docs/mcp-setup" className="text-blue-400 hover:underline">MCP Setup Guide</a></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-400 mt-1">→</span>
          <span><strong className="text-white">Explore features:</strong> Learn about dependency graphs, impact analysis, and code style detection. <a href="/docs/features/search" className="text-blue-400 hover:underline">Features</a></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-400 mt-1">→</span>
          <span><strong className="text-white">Use the API:</strong> Build integrations with the REST API. <a href="/docs/api" className="text-blue-400 hover:underline">API Reference</a></span>
        </li>
      </ul>

      {/* Pagination */}
      <DocsPagination
        prev={{ title: 'Introduction', href: '/docs' }}
        next={{ title: 'MCP Setup', href: '/docs/mcp-setup' }}
      />
    </DocsLayout>
  )
}

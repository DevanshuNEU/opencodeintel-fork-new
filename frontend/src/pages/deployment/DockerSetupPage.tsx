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
  { id: 'quick-start', title: 'Quick Start', level: 2 },
  { id: 'configuration', title: 'Configuration', level: 2 },
  { id: 'services', title: 'Services', level: 2 },
  { id: 'commands', title: 'Useful Commands', level: 2 },
  { id: 'troubleshooting', title: 'Troubleshooting', level: 2 },
]

export function DockerSetupPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={10} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Docker Setup</h1>
        <p className="text-xl text-gray-400">
          Run the entire OpenCodeIntel stack locally with Docker Compose.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-8">
        Docker is the fastest way to run OpenCodeIntel locally. One command spins up the 
        backend, frontend, and Redis. No Python versions to manage, no Node versions to worry about.
      </p>

      <h2 id="prerequisites" className="text-2xl font-semibold text-white mt-12 mb-4">Prerequisites</h2>
      
      <DocsPrerequisites 
        defaultOpen={true}
        items={[
          { text: 'Docker Desktop installed and running', href: 'https://www.docker.com/products/docker-desktop/' },
          { text: 'OpenAI API key', href: 'https://platform.openai.com/api-keys' },
          { text: 'Pinecone account and API key', href: 'https://www.pinecone.io/' },
          { text: '4GB+ RAM available for Docker' },
        ]} 
      />

      <h2 id="quick-start" className="text-2xl font-semibold text-white mt-12 mb-4">Quick Start</h2>
      
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
          <p>Edit <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">.env</code> with your API keys:</p>
          <DocsCodeBlock language="bash" filename=".env">
{`# Required
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=codeintel

# Optional - for GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Optional - for Supabase auth
SUPABASE_URL=...
SUPABASE_ANON_KEY=...`}
          </DocsCodeBlock>
        </Step>

        <Step number={3} title="Start the Stack">
          <DocsCodeBlock language="bash">
{`docker compose up -d`}
          </DocsCodeBlock>
          <p>First run downloads images and builds containers. Takes 2-5 minutes.</p>
        </Step>

        <Step number={4} title="Verify It's Running">
          <DocsCodeBlock language="bash">
{`docker compose ps`}
          </DocsCodeBlock>
          <p>You should see three containers running:</p>
          <ul className="space-y-1 text-gray-300 mt-2">
            <li><code className="text-blue-400">codeintel-frontend</code> - Port 3000</li>
            <li><code className="text-blue-400">codeintel-backend</code> - Port 8000</li>
            <li><code className="text-blue-400">codeintel-redis</code> - Port 6379</li>
          </ul>
        </Step>

        <Step number={5} title="Open the Dashboard">
          <p>Go to <a href="http://localhost:3000" className="text-blue-400 hover:underline">localhost:3000</a></p>
          <DocsCallout type="success">
            You are running OpenCodeIntel locally!
          </DocsCallout>
        </Step>
      </StepList>

      <h2 id="configuration" className="text-2xl font-semibold text-white mt-12 mb-4">Configuration</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Environment Variables</h3>
      
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-gray-400 font-medium">Variable</th>
              <th className="text-left py-2 text-gray-400 font-medium">Required</th>
              <th className="text-left py-2 text-gray-400 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-xs">OPENAI_API_KEY</td>
              <td className="py-2"><span className="text-amber-400">Yes</span></td>
              <td className="py-2">For embeddings and code summaries</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-xs">PINECONE_API_KEY</td>
              <td className="py-2"><span className="text-amber-400">Yes</span></td>
              <td className="py-2">Vector database for semantic search</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-xs">PINECONE_INDEX_NAME</td>
              <td className="py-2"><span className="text-amber-400">Yes</span></td>
              <td className="py-2">Name of your Pinecone index</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-xs">REDIS_URL</td>
              <td className="py-2">No</td>
              <td className="py-2">Defaults to redis://redis:6379</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 font-mono text-xs">GITHUB_CLIENT_ID</td>
              <td className="py-2">No</td>
              <td className="py-2">For GitHub OAuth login</td>
            </tr>
            <tr>
              <td className="py-2 font-mono text-xs">GITHUB_CLIENT_SECRET</td>
              <td className="py-2">No</td>
              <td className="py-2">For GitHub OAuth login</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="services" className="text-2xl font-semibold text-white mt-12 mb-4">Services</h2>
      
      <div className="space-y-4 mb-6">
        <ServiceCard
          name="Frontend"
          port="3000"
          description="React dashboard for managing repos and viewing results"
          healthCheck="http://localhost:3000"
        />
        <ServiceCard
          name="Backend"
          port="8000"
          description="FastAPI server handling indexing, search, and analysis"
          healthCheck="http://localhost:8000/health"
        />
        <ServiceCard
          name="Redis"
          port="6379"
          description="Caching and job queue for background tasks"
          healthCheck="redis-cli ping"
        />
      </div>

      <h2 id="commands" className="text-2xl font-semibold text-white mt-12 mb-4">Useful Commands</h2>
      
      <DocsCodeBlock language="bash">
{`# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend

# Rebuild after code changes
docker compose up -d --build

# Reset everything (including volumes)
docker compose down -v`}
      </DocsCodeBlock>

      <h2 id="troubleshooting" className="text-2xl font-semibold text-white mt-12 mb-4">Troubleshooting</h2>
      
      <h3 className="text-lg font-medium text-white mt-6 mb-3">Container won't start</h3>
      <p className="text-gray-300 mb-4">
        Check logs: <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">docker compose logs backend</code>
      </p>
      <p className="text-gray-300 mb-4">
        Common causes: missing .env file, invalid API keys, port already in use.
      </p>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Port already in use</h3>
      <p className="text-gray-300 mb-4">
        Something else is using port 3000 or 8000. Either stop that service or change ports in docker-compose.yml.
      </p>

      <h3 className="text-lg font-medium text-white mt-6 mb-3">Out of memory</h3>
      <p className="text-gray-300 mb-4">
        Increase Docker Desktop memory allocation in Settings → Resources. Recommend 4GB+.
      </p>

      <DocsPagination
        prev={{ title: 'Code Style Analysis', href: '/docs/features/style' }}
        next={{ title: 'Self-Hosting', href: '/docs/deployment/self-host' }}
      />
    </DocsLayout>
  )
}

function ServiceCard({ name, port, description, healthCheck }: { name: string; port: string; description: string; healthCheck: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-white">{name}</h4>
        <span className="text-xs font-mono text-blue-400">:{port}</span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{description}</p>
      <p className="text-xs text-gray-500">Health check: <code>{healthCheck}</code></p>
    </div>
  )
}

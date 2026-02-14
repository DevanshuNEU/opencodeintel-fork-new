import { 
  DocsLayout,
  DocsCodeBlock,
  DocsCallout,
  DocsPagination,
  TimeEstimate,
  TOCItem
} from '@/components/docs'

const tocItems: TOCItem[] = [
  { id: 'options', title: 'Deployment Options', level: 2 },
  { id: 'railway', title: 'Railway', level: 2 },
  { id: 'fly', title: 'Fly.io', level: 2 },
  { id: 'vps', title: 'VPS / Bare Metal', level: 2 },
  { id: 'production', title: 'Production Checklist', level: 2 },
]

export function SelfHostingPage() {
  return (
    <DocsLayout toc={tocItems}>
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <TimeEstimate minutes={15} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Self-Hosting</h1>
        <p className="text-xl text-gray-400">
          Deploy OpenCodeIntel on your own infrastructure for full control and data privacy.
        </p>
      </div>

      <p className="text-gray-300 text-lg leading-relaxed mb-8">
        Self-hosting gives you complete control over your data. Your code never leaves your infrastructure.
        Choose from several deployment options depending on your needs.
      </p>

      <h2 id="options" className="text-2xl font-semibold text-white mt-12 mb-4">Deployment Options</h2>
      
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-gray-400 font-medium">Option</th>
              <th className="text-left py-3 text-gray-400 font-medium">Best For</th>
              <th className="text-left py-3 text-gray-400 font-medium">Effort</th>
              <th className="text-left py-3 text-gray-400 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-white/5">
              <td className="py-3 font-medium text-white">Railway</td>
              <td className="py-3">Quick setup, small teams</td>
              <td className="py-3"><span className="text-green-400">Low</span></td>
              <td className="py-3">~$20/mo</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-3 font-medium text-white">Fly.io</td>
              <td className="py-3">Global distribution, scaling</td>
              <td className="py-3"><span className="text-amber-400">Medium</span></td>
              <td className="py-3">~$15/mo</td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-white">VPS</td>
              <td className="py-3">Full control, existing infra</td>
              <td className="py-3"><span className="text-red-400">Higher</span></td>
              <td className="py-3">~$10/mo</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="railway" className="text-2xl font-semibold text-white mt-12 mb-4">Railway</h2>
      <p className="text-gray-300 mb-4">
        Railway is the easiest way to deploy. Connect your repo and it handles the rest.
      </p>

      <DocsCodeBlock language="bash">
{`# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
cd opencodeintel
railway init

# 4. Add Redis
railway add --plugin redis

# 5. Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set PINECONE_API_KEY=...
railway variables set PINECONE_INDEX_NAME=codeintel

# 6. Deploy
railway up`}
      </DocsCodeBlock>

      <DocsCallout type="tip">
        Railway auto-detects Dockerfile and docker-compose.yml. It will deploy all services automatically.
      </DocsCallout>

      <h2 id="fly" className="text-2xl font-semibold text-white mt-12 mb-4">Fly.io</h2>
      <p className="text-gray-300 mb-4">
        Fly.io is great for global distribution. Deploy close to your users.
      </p>

      <DocsCodeBlock language="bash">
{`# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Create apps
cd backend
fly launch --name codeintel-backend

cd ../frontend
fly launch --name codeintel-frontend

# 4. Set secrets
fly secrets set OPENAI_API_KEY=sk-... -a codeintel-backend
fly secrets set PINECONE_API_KEY=... -a codeintel-backend

# 5. Create Redis (Upstash recommended)
# Or use Fly's built-in Redis: fly redis create

# 6. Deploy
fly deploy -a codeintel-backend
fly deploy -a codeintel-frontend`}
      </DocsCodeBlock>

      <h2 id="vps" className="text-2xl font-semibold text-white mt-12 mb-4">VPS / Bare Metal</h2>
      <p className="text-gray-300 mb-4">
        For full control, deploy on any Linux server with Docker.
      </p>

      <DocsCodeBlock language="bash">
{`# 1. SSH into your server
ssh user@your-server.com

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone repo
git clone https://github.com/OpenCodeIntel/opencodeintel.git
cd opencodeintel

# 4. Configure
cp .env.example .env
nano .env  # Add your API keys

# 5. Start with production config
docker compose -f docker-compose.prod.yml up -d

# 6. Set up reverse proxy (nginx/caddy)
# Point your domain to the server`}
      </DocsCodeBlock>

      <h3 className="text-lg font-medium text-white mt-8 mb-3">Nginx Config</h3>
      <DocsCodeBlock language="nginx">
{`server {
    listen 80;
    server_name codeintel.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`}
      </DocsCodeBlock>

      <h2 id="production" className="text-2xl font-semibold text-white mt-12 mb-4">Production Checklist</h2>
      
      <ul className="space-y-3 text-gray-300 mb-8">
        <li className="flex items-start gap-3">
          <span className="text-white">□</span>
          <span><strong className="text-white">HTTPS:</strong> Use SSL/TLS. Let's Encrypt is free.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white">□</span>
          <span><strong className="text-white">Backups:</strong> Back up your Pinecone index and any persistent data.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white">□</span>
          <span><strong className="text-white">Monitoring:</strong> Set up health checks and alerts.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white">□</span>
          <span><strong className="text-white">Rate Limiting:</strong> Protect your API endpoints.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white">□</span>
          <span><strong className="text-white">Auth:</strong> Configure proper authentication if exposing publicly.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-white">□</span>
          <span><strong className="text-white">Secrets:</strong> Never commit API keys. Use environment variables or secret managers.</span>
        </li>
      </ul>

      <DocsCallout type="warning" title="Security Note">
        If you are exposing OpenCodeIntel to the internet, make sure authentication is properly configured.
        The default setup is for local development and does not enforce auth on all endpoints.
      </DocsCallout>

      <DocsPagination
        prev={{ title: 'Docker Setup', href: '/docs/deployment/docker' }}
        next={{ title: 'Architecture', href: '/docs/architecture' }}
      />
    </DocsLayout>
  )
}

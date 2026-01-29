import { DocsLayout } from '../components/docs/DocsLayout'

// Code block component with copy button
function CodeBlock({ children, language = 'bash' }: { children: string; language?: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
  }

  return (
    <div className="relative group my-4">
      <pre className="bg-[#111113] border border-white/10 rounded-lg p-4 overflow-x-auto">
        <code className={`language-${language} text-sm text-gray-300`}>
          {children}
        </code>
      </pre>
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-2 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
        title="Copy to clipboard"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  )
}

// Callout component for tips and warnings
function Callout({ type = 'info', children }: { type?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
    tip: 'bg-green-500/10 border-green-500/30 text-green-200',
  }

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    tip: '💡',
  }

  return (
    <div className={`my-4 p-4 rounded-lg border ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>
      {children}
    </div>
  )
}

export function MCPSetupPage() {
  return (
    <DocsLayout>
      <article className="prose prose-invert max-w-none">
        {/* Header */}
        <div className="mb-8 pb-8 border-b border-white/10">
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            MCP Integration
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">MCP Setup Guide</h1>
          <p className="text-xl text-gray-400">
            Connect OpenCodeIntel to Claude Desktop in under 5 minutes. Give your AI assistant 
            persistent memory of your entire codebase.
          </p>
        </div>

        {/* The Problem */}
        <section className="mb-12">
          <p className="text-gray-300 text-lg leading-relaxed">
            Most AI coding assistants forget your codebase the moment you close the chat. 
            You explain your auth flow, close the window, come back tomorrow - and Claude 
            has no idea what you're talking about.
          </p>
          <p className="text-gray-300 text-lg leading-relaxed mt-4">
            OpenCodeIntel fixes this. It's an MCP server that gives Claude (or any MCP-compatible AI) 
            persistent access to your codebase - semantic search, dependency graphs, impact analysis, 
            the works.
          </p>
        </section>

        {/* What is MCP */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">What is MCP?</h2>
          <p className="text-gray-300 leading-relaxed">
            MCP (Model Context Protocol) is Anthropic's open standard for connecting AI assistants 
            to external tools and data sources. Think of it as USB for AI - a universal way to 
            plug in capabilities.
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            Instead of copy-pasting code into Claude, MCP lets Claude directly search your codebase, 
            analyze dependencies, and understand impact of changes. <strong className="text-white">The result?</strong> Claude that actually knows your code.
          </p>
        </section>

        {/* Prerequisites */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Prerequisites</h2>
          <p className="text-gray-300 mb-4">Before you start, make sure you have:</p>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span><strong className="text-white">Claude Desktop</strong> installed (<a href="https://claude.ai/download" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">download here</a>)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span><strong className="text-white">OpenCodeIntel backend</strong> running (local or hosted)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span><strong className="text-white">Python 3.11+</strong> for the MCP server</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span><strong className="text-white">5 minutes</strong> of your time</span>
            </li>
          </ul>
        </section>

        {/* Setup Steps */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Setup Steps</h2>

          {/* Step 1 */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">1</span>
              Clone the MCP Server
            </h3>
            <p className="text-gray-300 mb-3">If you haven't already, grab the OpenCodeIntel repo:</p>
            <CodeBlock language="bash">{`git clone https://github.com/OpenOpenCodeIntel/opencodeintel.git
cd opencodeintel/mcp-server`}</CodeBlock>
          </div>

          {/* Step 2 */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">2</span>
              Install Dependencies
            </h3>
            <CodeBlock language="bash">{`pip install -r requirements.txt`}</CodeBlock>
            <p className="text-gray-400 text-sm mt-2">That's it. No virtual environment drama for a simple MCP server.</p>
          </div>

          {/* Step 3 */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">3</span>
              Configure Environment
            </h3>
            <p className="text-gray-300 mb-3">Create your <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm">.env</code> file:</p>
            <CodeBlock language="bash">{`cp .env.example .env`}</CodeBlock>
            <p className="text-gray-300 mb-3 mt-4">Edit <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm">.env</code> with your settings:</p>
            <CodeBlock language="env">{`# Where's your OpenCodeIntel backend running?
BACKEND_API_URL=http://localhost:8000

# Your API key (get this from the OpenCodeIntel dashboard)
API_KEY=your-api-key-here`}</CodeBlock>
            <Callout type="tip">
              Using hosted OpenCodeIntel? Replace <code className="bg-white/10 px-1 rounded text-sm">localhost:8000</code> with your hosted URL.
            </Callout>
          </div>

          {/* Step 4 */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">4</span>
              Configure Claude Desktop
            </h3>
            <p className="text-gray-300 mb-4">This is where the magic happens. You need to tell Claude Desktop about the MCP server.</p>
            
            <p className="text-gray-300 mb-3"><strong className="text-white">Find your config file:</strong></p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">OS</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Config Location</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-2 px-3">macOS</td>
                    <td className="py-2 px-3 font-mono text-xs bg-white/5 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 px-3">Windows</td>
                    <td className="py-2 px-3 font-mono text-xs bg-white/5 rounded">%APPDATA%\Claude\claude_desktop_config.json</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Linux</td>
                    <td className="py-2 px-3 font-mono text-xs bg-white/5 rounded">~/.config/Claude/claude_desktop_config.json</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-300 mb-3"><strong className="text-white">Add OpenCodeIntel to your config:</strong></p>
            <CodeBlock language="json">{`{
  "mcpServers": {
    "codeintel": {
      "command": "python",
      "args": ["/absolute/path/to/opencodeintel/mcp-server/server.py"],
      "env": {
        "BACKEND_API_URL": "http://localhost:8000",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}`}</CodeBlock>
            <Callout type="warning">
              <strong>Important:</strong> Use the absolute path to <code className="bg-white/10 px-1 rounded text-sm">server.py</code>. Relative paths won't work.
            </Callout>

            <p className="text-gray-300 mb-3 mt-6"><strong className="text-white">Example for macOS:</strong></p>
            <CodeBlock language="json">{`{
  "mcpServers": {
    "codeintel": {
      "command": "python3",
      "args": ["/Users/yourname/projects/opencodeintel/mcp-server/server.py"],
      "env": {
        "BACKEND_API_URL": "http://localhost:8000",
        "API_KEY": "dev-secret-key"
      }
    }
  }
}`}</CodeBlock>
          </div>

          {/* Step 5 */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-white mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">5</span>
              Restart Claude Desktop
            </h3>
            <p className="text-gray-300 mb-3">
              Completely quit Claude Desktop (not just close the window) and reopen it.
            </p>
            <p className="text-gray-300">
              You should see a <span className="text-lg">🔧</span> icon in the chat input - that means MCP tools are available.
            </p>
          </div>
        </section>

        {/* Available Tools */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Available Tools</h2>
          <p className="text-gray-300 mb-6">Once connected, Claude has access to these tools:</p>

          <div className="space-y-6">
            {/* search_code */}
            <div className="p-4 bg-[#111113] border border-white/10 rounded-lg">
              <h3 className="text-lg font-mono text-blue-400 mb-2">search_code</h3>
              <p className="text-gray-300 mb-3">Semantic search across your codebase. Finds code by meaning, not just keywords.</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>"Find authentication middleware"</p>
                <p>"Show me error handling patterns"</p>
                <p>"Where's the database connection logic?"</p>
              </div>
            </div>

            {/* list_repositories */}
            <div className="p-4 bg-[#111113] border border-white/10 rounded-lg">
              <h3 className="text-lg font-mono text-blue-400 mb-2">list_repositories</h3>
              <p className="text-gray-300 mb-3">See all indexed repositories.</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>"What repos do you have access to?"</p>
                <p>"List my codebases"</p>
              </div>
            </div>

            {/* get_dependency_graph */}
            <div className="p-4 bg-[#111113] border border-white/10 rounded-lg">
              <h3 className="text-lg font-mono text-blue-400 mb-2">get_dependency_graph</h3>
              <p className="text-gray-300 mb-3">Understand how files connect. See which files are critical vs isolated.</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>"Show me the dependency graph for this repo"</p>
                <p>"What files does auth.py depend on?"</p>
              </div>
            </div>

            {/* analyze_code_style */}
            <div className="p-4 bg-[#111113] border border-white/10 rounded-lg">
              <h3 className="text-lg font-mono text-blue-400 mb-2">analyze_code_style</h3>
              <p className="text-gray-300 mb-3">Team patterns: naming conventions, async usage, type hints, common imports.</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>"What coding conventions does this repo use?"</p>
                <p>"Is this team using snake_case or camelCase?"</p>
              </div>
            </div>

            {/* analyze_impact */}
            <div className="p-4 bg-[#111113] border border-white/10 rounded-lg">
              <h3 className="text-lg font-mono text-blue-400 mb-2">analyze_impact</h3>
              <p className="text-gray-300 mb-3">Before you change a file, know what breaks. Shows dependents, impact, and related tests.</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>"What happens if I modify src/auth/middleware.py?"</p>
                <p>"What's the blast radius of changing this file?"</p>
              </div>
            </div>

            {/* get_repository_insights */}
            <div className="p-4 bg-[#111113] border border-white/10 rounded-lg">
              <h3 className="text-lg font-mono text-blue-400 mb-2">get_repository_insights</h3>
              <p className="text-gray-300 mb-3">High-level overview: file count, critical files, architecture patterns.</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>"Give me an overview of this codebase"</p>
                <p>"What are the most important files here?"</p>
              </div>
            </div>
          </div>
        </section>

        {/* Example Prompts */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Example Prompts</h2>
          <p className="text-gray-300 mb-6">Here's how to actually use OpenCodeIntel with Claude:</p>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500 rounded-r-lg">
              <p className="text-sm text-gray-400 mb-1">Understanding new code:</p>
              <p className="text-gray-200">"I just joined this project. Search for the main entry points and explain the architecture."</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500 rounded-r-lg">
              <p className="text-sm text-gray-400 mb-1">Before refactoring:</p>
              <p className="text-gray-200">"I want to refactor UserService. What's the impact? What tests cover it?"</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500 rounded-r-lg">
              <p className="text-sm text-gray-400 mb-1">Finding patterns:</p>
              <p className="text-gray-200">"How does this codebase handle errors? Find examples of error handling."</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500 rounded-r-lg">
              <p className="text-sm text-gray-400 mb-1">Code review prep:</p>
              <p className="text-gray-200">"Search for all usages of the deprecated oldAuth() function."</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500 rounded-r-lg">
              <p className="text-sm text-gray-400 mb-1">Matching team style:</p>
              <p className="text-gray-200">"Analyze the code style. I want to write a new module that fits in."</p>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Troubleshooting</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Claude doesn't show the 🔧 icon</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Check the config path - Make sure you're editing the right config file</li>
                <li>• Validate JSON - A single missing comma breaks everything</li>
                <li>• Use absolute paths - Relative paths don't work</li>
                <li>• Restart fully - Quit Claude Desktop completely, not just close window</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">"Connection refused" errors</h3>
              <p className="text-gray-300 mb-2">Your OpenCodeIntel backend isn't running. Start it:</p>
              <CodeBlock language="bash">{`cd opencodeintel/backend
python main.py`}</CodeBlock>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">"Unauthorized" errors</h3>
              <p className="text-gray-300">
                Check your <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm">API_KEY</code> in both 
                the <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm">.env</code> file and Claude Desktop config. 
                They need to match what your backend expects.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">Tools work but return no results</h3>
              <p className="text-gray-300">
                You probably haven't indexed any repositories yet. Open the OpenCodeIntel dashboard and add a repo first.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">Python command not found</h3>
              <p className="text-gray-300 mb-2">On macOS, you might need <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm">python3</code> instead of <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm">python</code>:</p>
              <CodeBlock language="json">{`{
  "command": "python3",
  "args": ["/path/to/server.py"]
}`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* What's Next */}
        <section className="mb-8 p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-semibold text-white mb-4">What's Next?</h2>
          <p className="text-gray-300 mb-4">Once you're set up:</p>
          <ol className="text-gray-300 space-y-2 ml-4">
            <li>1. <strong className="text-white">Index a repository</strong> through the OpenCodeIntel dashboard</li>
            <li>2. <strong className="text-white">Start chatting</strong> with Claude about your code</li>
            <li>3. <strong className="text-white">Try impact analysis</strong> before your next refactor</li>
          </ol>
          <p className="text-gray-400 mt-4 text-sm">
            Questions? Issues? <a href="https://github.com/OpenOpenCodeIntel/opencodeintel/issues" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">Open a GitHub issue</a> or reach out.
          </p>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm pt-8 border-t border-white/10">
          Built because AI assistants shouldn't have amnesia about your code.
        </footer>
      </article>
    </DocsLayout>
  )
}

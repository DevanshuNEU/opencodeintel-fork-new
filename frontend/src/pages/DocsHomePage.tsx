import { Link } from 'react-router-dom'
import { DocsLayout } from '../components/docs/DocsLayout'

function FeatureCard({ title, description, href, icon }: { 
  title: string
  description: string
  href: string
  icon: React.ReactNode 
}) {
  return (
    <Link 
      to={href}
      className="block p-5 bg-[#111113] border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-medium text-white mb-1 group-hover:text-blue-400 transition-colors">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
    </Link>
  )
}

export function DocsHomePage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">CodeIntel Documentation</h1>
          <p className="text-xl text-gray-400">
            Give your AI assistant deep understanding of your codebase. Semantic search, 
            dependency analysis, and impact prediction - all through MCP.
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Get Started</h2>
          <p className="text-gray-300 mb-6">
            New to CodeIntel? Start here. Most developers are up and running in under 5 minutes.
          </p>
          
          <div className="grid gap-4">
            <FeatureCard
              title="MCP Setup Guide"
              description="Connect CodeIntel to Claude Desktop. The complete walkthrough."
              href="/docs/mcp-setup"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <FeatureCard
              title="Quick Start with Docker"
              description="Spin up the entire stack with a single command."
              href="/docs/quickstart"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Core Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Core Features</h2>
          <p className="text-gray-300 mb-6">
            What CodeIntel actually does for you.
          </p>
          
          <div className="grid gap-4">
            <FeatureCard
              title="Semantic Code Search"
              description="Find code by meaning, not keywords. 'error handling' finds processFailure()."
              href="/docs/features/search"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <FeatureCard
              title="Dependency Analysis"
              description="Visualize your architecture. See what connects to what."
              href="/docs/features/dependencies"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              }
            />
            <FeatureCard
              title="Impact Prediction"
              description="Know what breaks before you change it. See the blast radius."
              href="/docs/features/impact"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <FeatureCard
              title="Code Style Analysis"
              description="Understand team conventions. Write code that fits in."
              href="/docs/features/style"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Why CodeIntel */}
        <section className="mb-12 p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl">
          <h2 className="text-2xl font-semibold text-white mb-4">Why CodeIntel?</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              <strong className="text-white">The problem:</strong> AI coding assistants are powerful, 
              but they're flying blind. They can't search your actual codebase, don't understand 
              your architecture, and have no clue what breaks when you change something.
            </p>
            <p>
              <strong className="text-white">The solution:</strong> CodeIntel is an MCP server that 
              gives AI assistants persistent memory of your codebase. Not just file contents - 
              semantic understanding, dependency graphs, and impact analysis.
            </p>
            <p>
              <strong className="text-white">The result:</strong> Claude that actually knows your code. 
              Ask "where's the auth middleware?" and get real answers, not guesses.
            </p>
          </div>
        </section>

        {/* Resources */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Resources</h2>
          <div className="flex flex-wrap gap-4">
            <a 
              href="https://github.com/OpenCodeIntel/opencodeintel" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <a 
              href="https://github.com/OpenCodeIntel/opencodeintel/issues" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Report Issue
            </a>
          </div>
        </section>
      </div>
    </DocsLayout>
  )
}

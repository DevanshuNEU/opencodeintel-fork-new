import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DocsSearch } from './DocsSearch'
import { 
  BookOpen, 
  Zap, 
  Terminal, 
  Code, 
  FileText, 
  Search, 
  GitBranch, 
  AlertTriangle, 
  Palette,
  Server,
  ChevronLeft
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon?: React.ReactNode
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs', icon: <BookOpen className="w-4 h-4" /> },
      { title: 'Quick Start', href: '/docs/quickstart', icon: <Zap className="w-4 h-4" /> },
    ],
  },
  {
    title: 'MCP Integration',
    items: [
      { title: 'MCP Setup Guide', href: '/docs/mcp-setup', icon: <Terminal className="w-4 h-4" /> },
      { title: 'Tools Reference', href: '/docs/mcp-tools', icon: <Code className="w-4 h-4" /> },
      { title: 'Example Prompts', href: '/docs/mcp-examples', icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'Semantic Search', href: '/docs/features/search', icon: <Search className="w-4 h-4" /> },
      { title: 'Dependency Analysis', href: '/docs/features/dependencies', icon: <GitBranch className="w-4 h-4" /> },
      { title: 'Impact Prediction', href: '/docs/features/impact', icon: <AlertTriangle className="w-4 h-4" /> },
      { title: 'Code Style Analysis', href: '/docs/features/style', icon: <Palette className="w-4 h-4" /> },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', href: '/docs/api', icon: <Code className="w-4 h-4" /> },
      { title: 'Repositories', href: '/docs/api/repositories', icon: <GitBranch className="w-4 h-4" /> },
      { title: 'Search', href: '/docs/api/search', icon: <Search className="w-4 h-4" /> },
      { title: 'Analysis', href: '/docs/api/analysis', icon: <AlertTriangle className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Deployment',
    items: [
      { title: 'Docker Setup', href: '/docs/deployment/docker', icon: <Server className="w-4 h-4" /> },
      { title: 'Self-Hosting', href: '/docs/deployment/self-host', icon: <Server className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Contributing',
    items: [
      { title: 'Architecture', href: '/docs/architecture', icon: <GitBranch className="w-4 h-4" /> },
      { title: 'Development Setup', href: '/docs/contributing', icon: <Code className="w-4 h-4" /> },
    ],
  },
]

export function DocsSidebar() {
  const location = useLocation()

  const isActive = (href: string) => {
    if (href === '/docs') {
      return location.pathname === '/docs'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-[#09090b] hidden lg:block">
      <div className="sticky top-0 h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <Link 
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          
          <Link to="/docs" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">OpenCodeIntel</p>
              <p className="text-xs text-gray-500">Documentation</p>
            </div>
          </Link>
          
          <DocsSearch />
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-4 space-y-6">
            {navigation.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                  {section.title}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                          isActive(item.href)
                            ? 'bg-blue-500/10 text-blue-400 font-medium'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        {item.icon && (
                          <span className={cn(
                            'shrink-0',
                            isActive(item.href) ? 'text-blue-400' : 'text-gray-500'
                          )}>
                            {item.icon}
                          </span>
                        )}
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <a 
            href="https://github.com/OpenCodeIntel/opencodeintel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </div>
    </aside>
  )
}

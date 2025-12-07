import { Link, useLocation } from 'react-router-dom'

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
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quickstart' },
    ],
  },
  {
    title: 'MCP Integration',
    items: [
      { title: 'MCP Setup Guide', href: '/docs/mcp-setup' },
      { title: 'Available Tools', href: '/docs/mcp-tools' },
      { title: 'Example Prompts', href: '/docs/mcp-examples' },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'Semantic Search', href: '/docs/features/search' },
      { title: 'Dependency Analysis', href: '/docs/features/dependencies' },
      { title: 'Impact Prediction', href: '/docs/features/impact' },
      { title: 'Code Style Analysis', href: '/docs/features/style' },
    ],
  },
  {
    title: 'Deployment',
    items: [
      { title: 'Docker Setup', href: '/docs/deployment/docker' },
      { title: 'Self-Hosting', href: '/docs/deployment/self-host' },
    ],
  },
]

export function DocsSidebar() {
  const location = useLocation()

  const isActive = (href: string) => {
    return location.pathname === href
  }

  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-[#09090b] overflow-y-auto">
      <div className="sticky top-0 p-4">
        <Link 
          to="/"
          className="flex items-center gap-2 text-white font-semibold mb-6 hover:text-blue-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to App
        </Link>

        <nav className="space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-500/10 text-blue-400 font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}

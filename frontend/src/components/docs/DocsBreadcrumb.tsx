import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

// Map paths to readable labels
const pathLabels: Record<string, string> = {
  'docs': 'Documentation',
  'quickstart': 'Quick Start',
  'mcp-setup': 'MCP Setup',
  'mcp-tools': 'MCP Tools',
  'mcp-examples': 'Examples',
  'features': 'Features',
  'search': 'Semantic Search',
  'dependencies': 'Dependencies',
  'impact': 'Impact Analysis',
  'style': 'Code Style',
  'deployment': 'Deployment',
  'docker': 'Docker',
  'self-host': 'Self-Hosting',
  'api': 'API Reference',
  'authentication': 'Authentication',
  'repositories': 'Repositories',
  'architecture': 'Architecture',
  'contributing': 'Contributing',
}

export function DocsBreadcrumb() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)
  
  // Build breadcrumb items
  const items: BreadcrumbItem[] = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    return { label, href }
  })

  // Don't show breadcrumb on docs home
  if (pathSegments.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-400 mb-6">
      <Link 
        to="/docs" 
        className="flex items-center hover:text-white transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {items.slice(1).map((item, index) => (
        <div key={item.href} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-gray-600" />
          {index === items.length - 2 ? (
            <span className="text-white font-medium">{item.label}</span>
          ) : (
            <Link 
              to={item.href} 
              className="hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

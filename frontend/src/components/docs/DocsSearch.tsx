import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { 
  FileText, 
  Zap, 
  GitBranch, 
  Search as SearchIcon, 
  AlertTriangle,
  Palette,
  Terminal,
  Server,
  Code,
  BookOpen
} from 'lucide-react'

interface DocPage {
  title: string
  href: string
  description: string
  icon: React.ReactNode
  category: string
}

const docsPages: DocPage[] = [
  // Getting Started
  { 
    title: 'Introduction', 
    href: '/docs', 
    description: 'Overview of OpenCodeIntel',
    icon: <BookOpen className="w-4 h-4" />,
    category: 'Getting Started'
  },
  { 
    title: 'Quick Start', 
    href: '/docs/quickstart', 
    description: 'Get up and running in 5 minutes',
    icon: <Zap className="w-4 h-4" />,
    category: 'Getting Started'
  },
  
  // MCP Integration
  { 
    title: 'MCP Setup Guide', 
    href: '/docs/mcp-setup', 
    description: 'Connect to Claude Desktop',
    icon: <Terminal className="w-4 h-4" />,
    category: 'MCP Integration'
  },
  { 
    title: 'MCP Tools Reference', 
    href: '/docs/mcp-tools', 
    description: 'All available MCP tools',
    icon: <Code className="w-4 h-4" />,
    category: 'MCP Integration'
  },
  { 
    title: 'Example Prompts', 
    href: '/docs/mcp-examples', 
    description: 'Real prompts that work',
    icon: <FileText className="w-4 h-4" />,
    category: 'MCP Integration'
  },
  
  // Features
  { 
    title: 'Semantic Search', 
    href: '/docs/features/search', 
    description: 'Find code by meaning',
    icon: <SearchIcon className="w-4 h-4" />,
    category: 'Features'
  },
  { 
    title: 'Dependency Analysis', 
    href: '/docs/features/dependencies', 
    description: 'Visualize architecture',
    icon: <GitBranch className="w-4 h-4" />,
    category: 'Features'
  },
  { 
    title: 'Impact Prediction', 
    href: '/docs/features/impact', 
    description: 'Know what breaks',
    icon: <AlertTriangle className="w-4 h-4" />,
    category: 'Features'
  },
  { 
    title: 'Code Style Analysis', 
    href: '/docs/features/style', 
    description: 'Team conventions',
    icon: <Palette className="w-4 h-4" />,
    category: 'Features'
  },
  
  // Deployment
  { 
    title: 'Docker Setup', 
    href: '/docs/deployment/docker', 
    description: 'Run with Docker Compose',
    icon: <Server className="w-4 h-4" />,
    category: 'Deployment'
  },
  { 
    title: 'Self-Hosting Guide', 
    href: '/docs/deployment/self-host', 
    description: 'Full deployment guide',
    icon: <Server className="w-4 h-4" />,
    category: 'Deployment'
  },
  
  // API Reference
  { 
    title: 'API Overview', 
    href: '/docs/api', 
    description: 'REST API introduction',
    icon: <Code className="w-4 h-4" />,
    category: 'API Reference'
  },
  { 
    title: 'Repositories API', 
    href: '/docs/api/repositories', 
    description: 'Manage indexed repositories',
    icon: <Code className="w-4 h-4" />,
    category: 'API Reference'
  },
  { 
    title: 'Search API', 
    href: '/docs/api/search', 
    description: 'Semantic code search',
    icon: <SearchIcon className="w-4 h-4" />,
    category: 'API Reference'
  },
  { 
    title: 'Analysis API', 
    href: '/docs/api/analysis', 
    description: 'Dependencies, impact, style',
    icon: <Code className="w-4 h-4" />,
    category: 'API Reference'
  },
  
  // Contributing
  { 
    title: 'Architecture', 
    href: '/docs/architecture', 
    description: 'System design and tech stack',
    icon: <GitBranch className="w-4 h-4" />,
    category: 'Contributing'
  },
  { 
    title: 'Development Setup', 
    href: '/docs/contributing', 
    description: 'Local dev environment',
    icon: <Terminal className="w-4 h-4" />,
    category: 'Contributing'
  },
]

// Pre-compute grouped pages at module level since docsPages is constant
const groupedPages = docsPages.reduce((acc, page) => {
  if (!acc[page.category]) {
    acc[page.category] = []
  }
  acc[page.category].push(page)
  return acc
}, {} as Record<string, DocPage[]>)

export function DocsSearch() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
      >
        <SearchIcon className="w-4 h-4" />
        <span className="flex-1 text-left">Search docs...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-white/5 border border-white/10 rounded">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search documentation..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedPages).map(([category, pages]) => (
            <CommandGroup key={category} heading={category}>
              {pages.map((page) => (
                <CommandItem
                  key={page.href}
                  value={`${page.title} ${page.description}`}
                  onSelect={() => runCommand(() => navigate(page.href))}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <span className="text-gray-400">{page.icon}</span>
                  <div className="flex flex-col">
                    <span>{page.title}</span>
                    <span className="text-xs text-gray-500">{page.description}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

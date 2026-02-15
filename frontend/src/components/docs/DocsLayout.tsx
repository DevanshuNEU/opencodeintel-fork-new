import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DocsSidebar } from './DocsSidebar'
import { DocsBreadcrumb } from './DocsBreadcrumb'
import { DocsTableOfContents, TOCItem } from './DocsTableOfContents'
import { DocsSearch } from './DocsSearch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocsLayoutProps {
  children: React.ReactNode
  toc?: TOCItem[]
  showToc?: boolean
}

export function DocsLayout({ children, toc = [], showToc = true }: DocsLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#09090b]/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -ml-2 text-gray-400 hover:text-white">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 bg-[#09090b] border-white/5">
              <MobileSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          
          <Link to="/docs" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="font-semibold text-white text-sm">Docs</span>
          </Link>
        </div>
        
        <div className="w-48">
          <DocsSearch />
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <DocsSidebar />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex gap-8">
              {/* Article content */}
              <article className="flex-1 min-w-0 max-w-3xl">
                <DocsBreadcrumb />
                <div className="prose prose-invert max-w-none">
                  {children}
                </div>
              </article>

              {/* Table of contents - desktop only */}
              {showToc && toc.length > 0 && (
                <aside className="hidden xl:block w-56 shrink-0">
                  <div className="sticky top-8">
                    <DocsTableOfContents items={toc} />
                  </div>
                </aside>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Mobile sidebar content
function MobileSidebar({ onNavigate }: { onNavigate: () => void }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Link 
          to="/docs" 
          onClick={onNavigate}
          className="flex items-center gap-2 mb-6"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">OpenCodeIntel</p>
            <p className="text-xs text-gray-500">Documentation</p>
          </div>
        </Link>
        
        <MobileNavigation onNavigate={onNavigate} />
      </div>
    </ScrollArea>
  )
}

// Mobile navigation items
const mobileNavigation = [
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
      { title: 'Tools Reference', href: '/docs/mcp-tools' },
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
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', href: '/docs/api' },
      { title: 'Repositories', href: '/docs/api/repositories' },
      { title: 'Search', href: '/docs/api/search' },
      { title: 'Analysis', href: '/docs/api/analysis' },
    ],
  },
  {
    title: 'Contributing',
    items: [
      { title: 'Architecture', href: '/docs/architecture' },
      { title: 'Development Setup', href: '/docs/contributing' },
    ],
  },
]

function MobileNavigation({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation()

  const isActive = (href: string) => {
    if (href === '/docs') return location.pathname === '/docs'
    return location.pathname.startsWith(href)
  }

  return (
    <nav className="space-y-6">
      {mobileNavigation.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {section.title}
          </h3>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'block px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-500/10 text-blue-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

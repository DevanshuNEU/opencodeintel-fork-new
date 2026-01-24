import { Link, useLocation } from 'react-router-dom'
import { 
  FolderGit2, 
  Search, 
  Settings, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  external?: boolean
}

const mainNavItems: NavItem[] = [
  { name: 'Repositories', href: '/dashboard', icon: <FolderGit2 className="w-5 h-5" /> },
  { name: 'Global Search', href: '/dashboard/search', icon: <Search className="w-5 h-5" /> },
]

const bottomNavItems: NavItem[] = [
  { name: 'Documentation', href: '/docs', icon: <BookOpen className="w-5 h-5" />, external: true },
  { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/repo/')
    }
    return location.pathname === href
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href)
    
    const baseClasses = `
      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
      ${active 
        ? 'bg-primary/10 text-primary' 
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }
    `

    if (item.external) {
      return (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClasses}
        >
          <span className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}>
            {item.icon}
          </span>
          {!collapsed && (
            <>
              <span className="text-sm font-medium truncate">{item.name}</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </>
          )}
        </a>
      )
    }

    return (
      <Link to={item.href} className={baseClasses}>
        <span className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}>
          {item.icon}
        </span>
        {!collapsed && (
          <span className="text-sm font-medium truncate">{item.name}</span>
        )}
      </Link>
    )
  }

  return (
    <aside 
      className={`
        fixed left-0 top-14 bottom-0 z-40 
        flex flex-col border-r border-border bg-background 
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      <nav className="flex-1 p-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

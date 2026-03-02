import { Link, useLocation } from 'react-router-dom'
import { 
  FolderGit2, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  external?: boolean
}

const mainNavItems: NavItem[] = [
  { name: 'Repositories', href: '/dashboard', icon: <FolderGit2 className="w-5 h-5" /> },
]

const bottomNavItems: NavItem[] = [
  { name: 'Documentation', href: '/docs', icon: <BookOpen className="w-5 h-5" />, external: true },
]

// defined at module scope so React can reconcile it across renders
function NavLink({
  item,
  active,
  showLabels,
  onClick,
}: {
  item: NavItem
  active: boolean
  showLabels: boolean
  onClick?: () => void
}) {
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
        onClick={onClick}
      >
        <span className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}>
          {item.icon}
        </span>
        {showLabels && (
          <>
            <span className="text-sm font-medium truncate">{item.name}</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </>
        )}
      </a>
    )
  }

  return (
    <Link to={item.href} className={baseClasses} onClick={onClick}>
      <span className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}>
        {item.icon}
      </span>
      {showLabels && (
        <span className="text-sm font-medium truncate">{item.name}</span>
      )}
    </Link>
  )
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/repo/')
    }
    return location.pathname === href
  }

  const showLabels = !collapsed || !!mobileOpen

  const getWidthClass = () => {
    if (mobileOpen) return 'w-[var(--sidebar-width)]'
    if (collapsed) return 'w-[var(--sidebar-width-collapsed)]'
    return 'w-[var(--sidebar-width)]'
  }

  return (
    <aside 
      className={`
        fixed left-0 top-[var(--navbar-height)] bottom-0 z-40 
        flex flex-col border-r border-border bg-background 
        transition-all duration-300
        ${getWidthClass()}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* mobile close */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-border">
        <span className="font-semibold text-foreground">Menu</span>
        <button
          onClick={onMobileClose}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            showLabels={showLabels}
            onClick={onMobileClose}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            showLabels={showLabels}
            onClick={onMobileClose}
          />
        ))}

        <button
          onClick={onToggle}
          className="hidden lg:flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
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

import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { CommandPalette } from './CommandPalette'
import { Toaster } from '@/components/ui/sonner'
import { FeedbackWidget } from '@/components/FeedbackWidget'
import { useKeyboardShortcut, SHORTCUTS } from '../../hooks/useKeyboardShortcut'
import { useTheme } from 'next-themes'

interface DashboardLayoutProps {
  children?: React.ReactNode
}

const SIDEBAR_STORAGE_KEY = 'codeintel-sidebar-collapsed'

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme } = useTheme()
  const location = useLocation()
  
  // Desktop: collapsed state (narrow sidebar)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      return stored ? JSON.parse(stored) : false
    } catch {
      return false
    }
  })
  
  // Mobile: open/closed state (overlay)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Persist desktop collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(sidebarCollapsed))
    } catch {
      // Ignore storage errors
    }
  }, [sidebarCollapsed])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  useKeyboardShortcut(SHORTCUTS.COMMAND_PALETTE, () => {
    setCommandPaletteOpen(true)
  })

  useKeyboardShortcut(SHORTCUTS.TOGGLE_SIDEBAR, () => {
    setSidebarCollapsed((prev: boolean) => !prev)
  })

  const handleToggleSidebar = () => {
    // On mobile: toggle overlay menu
    // On desktop: toggle collapsed state
    if (window.innerWidth < 1024) {
      setMobileMenuOpen(!mobileMenuOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav 
        onToggleSidebar={handleToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <div className="flex">
        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={handleToggleSidebar}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main content - no margin on mobile, dynamic margin on desktop */}
        <main 
          className={`
            flex-1 transition-all duration-300 pt-[var(--navbar-height)]
            ml-0 ${sidebarCollapsed ? 'lg:ml-[var(--sidebar-width-collapsed)]' : 'lg:ml-[var(--sidebar-width)]'}
          `}
        >
          <div className="p-4 md:p-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />

      <Toaster 
        theme={theme === 'dark' ? 'dark' : 'light'}
        position="bottom-right"
      />

      <FeedbackWidget />
    </div>
  )
}

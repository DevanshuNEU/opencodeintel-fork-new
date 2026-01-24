import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { CommandPalette } from './CommandPalette'
import { Toaster } from '@/components/ui/sonner'
import { useKeyboardShortcut, SHORTCUTS } from '../../hooks/useKeyboardShortcut'
import { useTheme } from 'next-themes'

interface DashboardLayoutProps {
  children?: React.ReactNode
}

const SIDEBAR_STORAGE_KEY = 'codeintel-sidebar-collapsed'

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme } = useTheme()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return stored ? JSON.parse(stored) : false
  })
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  useKeyboardShortcut(SHORTCUTS.COMMAND_PALETTE, () => {
    setCommandPaletteOpen(true)
  })

  useKeyboardShortcut(SHORTCUTS.TOGGLE_SIDEBAR, () => {
    setSidebarCollapsed((prev: boolean) => !prev)
  })

  return (
    <div className="min-h-screen bg-background">
      <TopNav 
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <div className="flex">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main 
          className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-60'
          }`}
        >
          <div className="p-6">
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
    </div>
  )
}

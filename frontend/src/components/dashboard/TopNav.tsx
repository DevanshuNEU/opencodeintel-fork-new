import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'
import { 
  Menu, 
  Search, 
  Github, 
  Sun, 
  Moon, 
  LogOut, 
  Settings, 
  BookOpen, 
  ExternalLink 
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

interface TopNavProps {
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
  onOpenCommandPalette?: () => void
}

export function TopNav({ onToggleSidebar, sidebarCollapsed, onOpenCommandPalette }: TopNavProps) {
  const { session, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const userEmail = session?.user?.email || 'User'
  const userInitial = userEmail.charAt(0).toUpperCase()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[var(--navbar-height)] border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CI</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">CodeIntel</span>
            <span className="text-xs text-muted-foreground hidden md:block">MCP Server</span>
          </Link>
        </div>

        {/* Center - Command Palette Trigger */}
        <button 
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all max-w-xs"
          onClick={onOpenCommandPalette}
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search...</span>
          <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
        </button>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* GitHub Link */}
          <a
            href="https://github.com/opencodeintel/opencodeintel"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <Github className="w-5 h-5" />
          </a>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">{userInitial}</span>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 py-2">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm text-foreground font-medium truncate">{userEmail}</p>
                    <p className="text-xs text-muted-foreground">Free Plan</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/dashboard/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <a
                      href="/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <BookOpen className="w-4 h-4" />
                      Documentation
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </a>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => {
                        signOut()
                        setShowUserMenu(false)
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

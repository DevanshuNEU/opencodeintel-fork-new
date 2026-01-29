import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Menu, Search, Github, Sun, Moon, LogOut, Settings, BookOpen, ExternalLink } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopNavProps {
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
  onOpenCommandPalette?: () => void
}

export function TopNav({ onToggleSidebar, sidebarCollapsed, onOpenCommandPalette }: TopNavProps) {
  const { session, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

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
              <span className="text-primary-foreground font-bold text-xs">OCI</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">OpenCodeIntel</span>
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
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {/* User Menu - using shadcn DropdownMenu for proper click-outside handling */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">{userInitial}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium truncate">{userEmail}</p>
                  <p className="text-xs text-muted-foreground">Free Plan</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/docs" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Documentation
                  <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}

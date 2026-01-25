import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface Repository {
  id: string
  name: string
  branch: string
  status: string
}

interface CommandItem {
  id: string
  type: 'repo' | 'action' | 'navigation'
  title: string
  subtitle?: string
  icon: string
  shortcut?: string
  action: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [repos, setRepos] = useState<Repository[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  useEffect(() => {
    if (isOpen && session?.access_token) fetchRepos()
  }, [isOpen, session])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action()
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, query])

  const fetchRepos = async () => {
    try {
      const response = await fetch(`${API_URL}/repos`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      const data = await response.json()
      setRepos(data.repositories || [])
    } catch (error) {
      console.error('Error fetching repos:', error)
    }
  }

  const allItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = []
    repos.forEach(repo => {
      items.push({
        id: `repo-${repo.id}`,
        type: 'repo',
        title: repo.name,
        subtitle: `${repo.branch} • ${repo.status}`,
        icon: '📦',
        action: () => navigate(`/dashboard/repo/${repo.id}`)
      })
    })
    items.push({ id: 'action-add-repo', type: 'action', title: 'Add Repository', subtitle: 'Clone and index a new repository', icon: '➕', action: () => { window.dispatchEvent(new CustomEvent('openAddRepo')); navigate('/dashboard') } })
    items.push({ id: 'action-refresh', type: 'action', title: 'Refresh Repositories', subtitle: 'Reload the repository list', icon: '🔄', action: () => window.location.reload() })
    items.push({ id: 'nav-dashboard', type: 'navigation', title: 'Go to Dashboard', subtitle: 'View all repositories', icon: '🏠', action: () => navigate('/dashboard') })
    items.push({ id: 'nav-settings', type: 'navigation', title: 'Settings', subtitle: 'Account and preferences', icon: '⚙️', action: () => navigate('/dashboard/settings') })
    items.push({ id: 'nav-docs', type: 'navigation', title: 'Documentation', subtitle: 'Learn how to use CodeIntel', icon: '📚', action: () => window.open('/docs', '_blank') })
    items.push({ id: 'action-signout', type: 'action', title: 'Sign Out', subtitle: 'Log out of your account', icon: '🚪', action: () => signOut() })
    return items
  }, [repos, navigate, signOut])

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems
    const lowerQuery = query.toLowerCase()
    return allItems.filter(item => item.title.toLowerCase().includes(lowerQuery) || item.subtitle?.toLowerCase().includes(lowerQuery))
  }, [allItems, query])

  useEffect(() => { setSelectedIndex(0) }, [query])

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = { repo: [], action: [], navigation: [] }
    filteredItems.forEach(item => groups[item.type].push(item))
    return groups
  }, [filteredItems])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, repos, actions..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
          />
          <kbd className="px-2 py-1 text-xs text-muted-foreground bg-muted border border-border rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">No results found for "{query}"</div>
          ) : (
            <>
              {groupedItems.repo.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Repositories</div>
                  {groupedItems.repo.map((item) => {
                    const globalIndex = filteredItems.indexOf(item)
                    return <CommandItemRow key={item.id} item={item} isSelected={selectedIndex === globalIndex} onClick={() => { item.action(); onClose() }} onMouseEnter={() => setSelectedIndex(globalIndex)} />
                  })}
                </div>
              )}
              {groupedItems.action.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</div>
                  {groupedItems.action.map((item) => {
                    const globalIndex = filteredItems.indexOf(item)
                    return <CommandItemRow key={item.id} item={item} isSelected={selectedIndex === globalIndex} onClick={() => { item.action(); onClose() }} onMouseEnter={() => setSelectedIndex(globalIndex)} />
                  })}
                </div>
              )}
              {groupedItems.navigation.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Navigation</div>
                  {groupedItems.navigation.map((item) => {
                    const globalIndex = filteredItems.indexOf(item)
                    return <CommandItemRow key={item.id} item={item} isSelected={selectedIndex === globalIndex} onClick={() => { item.action(); onClose() }} onMouseEnter={() => setSelectedIndex(globalIndex)} />
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted border border-border rounded">↑↓</kbd>navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted border border-border rounded">↵</kbd>select</span>
          </div>
          <span className="text-muted-foreground/60">CodeIntel</span>
        </div>
      </div>
    </div>
  )
}

function CommandItemRow({ item, isSelected, onClick, onMouseEnter }: { item: CommandItem; isSelected: boolean; onClick: () => void; onMouseEnter: () => void }) {
  return (
    <button onClick={onClick} onMouseEnter={onMouseEnter} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}>
      <span className="text-lg">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>{item.title}</div>
        {item.subtitle && <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>}
      </div>
      {item.shortcut && <kbd className="px-2 py-1 text-xs text-muted-foreground bg-muted border border-border rounded">{item.shortcut}</kbd>}
    </button>
  )
}

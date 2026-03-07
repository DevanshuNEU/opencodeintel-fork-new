import { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FolderGit2, Plus, Files, FunctionSquare, Clock, MoreVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import type { Repository } from '../types'
import { RepoGridSkeleton } from './ui/Skeleton'

interface RepoListProps {
  repos: Repository[]
  selectedRepo: string | null
  onSelect: (repoId: string) => void
  onDelete?: (repoId: string) => void
  onAddClick?: () => void
  loading?: boolean
}

type SortMode = 'recent' | 'name' | 'size'

/** Extract "owner/repo" from a GitHub URL */
function parseRepoSlug(gitUrl: string): string {
  try {
    const cleaned = gitUrl.replace(/\.git$/, '')
    // Match HTTPS: github.com/owner/repo
    const https = cleaned.match(/github\.com\/([^/]+\/[^/]+)/)
    if (https) return https[1]
    // Match SSH: git@github.com:owner/repo
    const ssh = cleaned.match(/github\.com:([^/]+\/[^/]+)/)
    if (ssh) return ssh[1]
    return ''
  } catch {
    return ''
  }
}

/** Relative time: "2h ago", "3d ago", "just now" */
function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  if (diff < 0) return ''

  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const StatusDot = ({ status }: { status: string }) => {
  const isIndexed = status === 'indexed'
  const isFailed = status === 'failed'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs',
      isIndexed ? 'text-primary' : isFailed ? 'text-destructive' : 'text-muted-foreground',
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        isIndexed ? 'bg-primary' : isFailed ? 'bg-destructive' : 'bg-muted-foreground animate-pulse',
      )} />
      {isIndexed ? 'Indexed' : isFailed ? 'Failed' : 'Pending'}
    </span>
  )
}

const RepoCard = ({ repo, index, onSelect, onDeleteClick }: {
  repo: Repository
  index: number
  onSelect: () => void
  onDeleteClick?: () => void
}) => {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)
  const slug = parseRepoSlug(repo.git_url)
  const indexed = timeAgo(repo.last_indexed_at)

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      onMouseMove={(e) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative text-left rounded-xl overflow-hidden w-full
        bg-card border border-border hover:border-primary/40
        focus:outline-none focus:ring-2 focus:ring-primary/50 p-5 transition-colors"
    >
      {hovering && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary) / 0.08), transparent 50%)`,
          }}
        />
      )}

      <div className="relative">
        {/* Top row: icon + status + menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <FolderGit2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-1">
            <StatusDot status={repo.status} />
            {onDeleteClick && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDeleteClick() }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete repository
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Repo name + slug */}
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {repo.name}
        </h3>
        {slug && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{slug}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Files className="w-3 h-3" />
            {(repo.file_count || 0).toLocaleString()}
          </span>
          {repo.function_count != null && repo.function_count > 0 && (
            <span className="flex items-center gap-1">
              <FunctionSquare className="w-3 h-3" />
              {repo.function_count.toLocaleString()}
            </span>
          )}
          {indexed && (
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              {indexed}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

export function RepoList({ repos, selectedRepo, onSelect, onDelete, onAddClick, loading }: RepoListProps) {
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [deleteTarget, setDeleteTarget] = useState<Repository | null>(null)

  const sortedRepos = useMemo(() => {
    const sorted = [...repos]
    if (sortMode === 'recent') {
      sorted.sort((a, b) => {
        const aTime = a.last_indexed_at || a.created_at || ''
        const bTime = b.last_indexed_at || b.created_at || ''
        return bTime.localeCompare(aTime)
      })
    } else if (sortMode === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      sorted.sort((a, b) => (b.file_count || 0) - (a.file_count || 0))
    }
    return sorted
  }, [repos, sortMode])

  if (loading) return <RepoGridSkeleton count={3} />

  if (repos.length === 0) {
    const isClickable = !!onAddClick
    return (
      <motion.button
        onClick={onAddClick}
        disabled={!isClickable}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={isClickable ? { scale: 1.01 } : undefined}
        whileTap={isClickable ? { scale: 0.99 } : undefined}
        className={`w-full bg-card border border-dashed border-border rounded-xl p-16 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          isClickable ? 'hover:border-primary/40 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">No repositories yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Add your first repository to start searching code with AI
        </p>
      </motion.button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sort bar */}
      <div className="flex items-center">
        <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="recent" className="text-xs px-3">Recent</TabsTrigger>
            <TabsTrigger value="name" className="text-xs px-3">Name</TabsTrigger>
            <TabsTrigger value="size" className="text-xs px-3">Size</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="ml-auto text-xs text-muted-foreground">{repos.length} repos</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedRepos.map((repo, index) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            index={index}
            onSelect={() => onSelect(repo.id)}
            onDeleteClick={onDelete ? () => setDeleteTarget(repo) : undefined}
          />
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        repo={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget && onDelete) {
            onDelete(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}


export function DeleteConfirmDialog({
  repo,
  onCancel,
  onConfirm,
}: {
  repo: Repository | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const [confirmText, setConfirmText] = useState('')
  const repoName = repo?.name || ''
  const isMatch = confirmText === repoName

  return (
    <Dialog
      open={!!repo}
      onOpenChange={(open) => { if (!open) { setConfirmText(''); onCancel() } }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete repository</DialogTitle>
          <DialogDescription>
            This will permanently remove <strong>{repoName}</strong> and all its
            indexed data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-2">
            Type <strong className="text-foreground">{repoName}</strong> to confirm
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={repoName}
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setConfirmText(''); onCancel() }}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!isMatch}
            onClick={() => { setConfirmText(''); onConfirm() }}
          >
            Delete {repoName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

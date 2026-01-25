import { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FolderGit2, Plus } from 'lucide-react'
import type { Repository } from '../types'
import { RepoGridSkeleton } from './ui/Skeleton'

interface RepoListProps {
  repos: Repository[]
  selectedRepo: string | null
  onSelect: (repoId: string) => void
  loading?: boolean
}

const StatusBadge = ({ status }: { status: string }) => {
  const isIndexed = status === 'indexed'
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border
      ${isIndexed 
        ? 'bg-primary/10 text-primary border-primary/20' 
        : 'bg-muted text-muted-foreground border-border'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isIndexed ? 'bg-primary' : 'bg-muted-foreground animate-pulse'}`} />
      {isIndexed ? 'Indexed' : 'Pending'}
    </span>
  )
}

const RepoCard = ({ repo, index, onSelect }: { 
  repo: Repository
  index: number
  onSelect: () => void 
}) => {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -3 }}
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
      {/* Mouse glow effect */}
      {hovering && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary) / 0.08), transparent 50%)`,
          }}
        />
      )}
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <FolderGit2 className="w-5 h-5 text-primary" />
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-0.5 group-hover:text-primary transition-colors">
          {repo.name}
        </h3>
        <p className="text-xs text-muted-foreground font-mono mb-5">{repo.branch}</p>

        {/* Stats */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Files</span>
            <span className="text-2xl font-bold text-primary">
              {(repo.file_count || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

export function RepoList({ repos, selectedRepo, onSelect, loading }: RepoListProps) {
  if (loading) return <RepoGridSkeleton count={3} />

  if (repos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border border-border rounded-xl p-16 text-center"
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">No repositories yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Add your first repository to start searching code with AI
        </p>
      </motion.div>
    )
  }

  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => {
      if (a.status === 'indexed' && b.status !== 'indexed') return -1
      if (b.status === 'indexed' && a.status !== 'indexed') return 1
      return (b.file_count || 0) - (a.file_count || 0)
    })
  }, [repos])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedRepos.map((repo, index) => (
        <RepoCard 
          key={repo.id}
          repo={repo} 
          index={index}
          onSelect={() => onSelect(repo.id)}
        />
      ))}
    </div>
  )
}

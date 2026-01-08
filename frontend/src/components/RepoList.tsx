import { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
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
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isIndexed ? 'bg-blue-400' : 'bg-zinc-500 animate-pulse'}`} />
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
      className="group relative text-left rounded-2xl overflow-hidden w-full
        bg-[#111113] border border-white/[0.06] hover:border-blue-500/40
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 p-5 transition-colors"
    >
      {/* Mouse glow */}
      {hovering && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, rgba(37, 99, 235, 0.08), transparent 50%)`,
          }}
        />
      )}
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/15 transition-colors">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-0.5 group-hover:text-blue-400 transition-colors">
          {repo.name}
        </h3>
        <p className="text-xs text-zinc-500 font-mono mb-5">{repo.branch}</p>

        {/* Stats */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Functions</span>
            <span className="text-2xl font-bold text-blue-500">
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
        className="bg-[#111113] border border-white/[0.06] rounded-2xl p-16 text-center"
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white">No repositories yet</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
          Add your first repository to start searching code with AI
        </p>
      </motion.div>
    )
  }

  // Sort: indexed first, then by function count desc
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

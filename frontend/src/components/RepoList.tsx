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
  const isPending = status === 'cloned' || status === 'cloning' || status === 'indexing'
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border
      ${isIndexed 
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
        : isPending
          ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isIndexed ? 'bg-blue-400' : isPending ? 'bg-zinc-400 animate-pulse' : 'bg-red-400'}`} />
      {isIndexed ? 'Indexed' : isPending ? 'Pending' : 'Error'}
    </span>
  )
}

const FeaturedRepoCard = ({ repo, totalFunctions, onSelect }: { 
  repo: Repository
  totalFunctions: number
  onSelect: () => void 
}) => {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const percentage = totalFunctions > 0 ? Math.round((repo.file_count || 0) / totalFunctions * 100) : 0

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group relative text-left rounded-2xl overflow-hidden w-full h-full
        bg-[#111113] border border-white/[0.06] hover:border-blue-500/30
        focus:outline-none focus:ring-2 focus:ring-blue-500/40 p-6"
    >
      {/* Mouse glow */}
      {isHovering && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.08), transparent 50%)`,
          }}
        />
      )}
      
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-violet-500" />
      
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/[0.08] flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
          {repo.name}
        </h3>
        <p className="text-sm text-zinc-500 font-mono mb-auto">{repo.branch}</p>

        {/* Stats */}
        <div className="pt-6 mt-6 border-t border-white/[0.06]">
          <div className="flex items-end justify-between mb-3">
            <span className="text-sm text-zinc-500">Functions indexed</span>
            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              {(repo.file_count || 0).toLocaleString()}
            </span>
          </div>
          
          {totalFunctions > 0 && repo.file_count > 0 && (
            <div className="space-y-2">
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                />
              </div>
              <p className="text-xs text-zinc-600">{percentage}% of total</p>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
}

const RepoCard = ({ repo, index, onSelect }: { 
  repo: Repository
  index: number
  onSelect: () => void 
}) => {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group relative text-left rounded-2xl overflow-hidden w-full
        bg-[#111113] border border-white/[0.06] hover:border-white/[0.12]
        focus:outline-none focus:ring-2 focus:ring-blue-500/40 p-5"
    >
      {/* Mouse glow */}
      {isHovering && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(250px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.06), transparent 50%)`,
          }}
        />
      )}
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/[0.08] flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white mb-0.5 group-hover:text-blue-400 transition-colors">
          {repo.name}
        </h3>
        <p className="text-xs text-zinc-500 font-mono mb-4">{repo.branch}</p>

        {/* Stats */}
        <div className="pt-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Functions</span>
            <span className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
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
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center">
          <span className="text-2xl">📦</span>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white">No repositories yet</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
          Add your first repository to start searching code with AI
        </p>
      </motion.div>
    )
  }

  // Sort: indexed first, then by function count
  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => {
      if (a.status === 'indexed' && b.status !== 'indexed') return -1
      if (b.status === 'indexed' && a.status !== 'indexed') return 1
      return (b.file_count || 0) - (a.file_count || 0)
    })
  }, [repos])

  const totalFunctions = repos.reduce((acc, r) => acc + (r.file_count || 0), 0)
  const [featured, ...rest] = sortedRepos

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Featured - spans 2 rows */}
      {featured && (
        <div className="lg:row-span-2 min-h-[320px]">
          <FeaturedRepoCard 
            repo={featured} 
            totalFunctions={totalFunctions}
            onSelect={() => onSelect(featured.id)}
          />
        </div>
      )}
      
      {/* Rest */}
      {rest.map((repo, index) => (
        <RepoCard 
          key={repo.id}
          repo={repo} 
          index={index + 1}
          onSelect={() => onSelect(repo.id)}
        />
      ))}
    </div>
  )
}

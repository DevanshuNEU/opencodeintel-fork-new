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
  const config = {
    indexed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Indexed', dot: 'bg-emerald-400' },
    cloned: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'Pending Index', dot: 'bg-blue-400' },
    indexing: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Indexing...', dot: 'bg-amber-400 animate-pulse' },
    cloning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Cloning...', dot: 'bg-amber-400 animate-pulse' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Error', dot: 'bg-red-400' },
  }[status] || { bg: 'bg-white/5', text: 'text-gray-400', border: 'border-white/10', label: status, dot: 'bg-gray-400' }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

// Featured card - larger, more info
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
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group relative text-left rounded-2xl overflow-hidden h-full min-h-[280px]
        bg-gradient-to-br from-[#0f1114] via-[#0d0f12] to-[#0a0c0f] 
        border border-white/[0.08] hover:border-blue-500/30
        hover:shadow-2xl hover:shadow-blue-500/10
        focus:outline-none focus:ring-2 focus:ring-blue-500/40 p-7"
    >
      {/* Mouse-following glow */}
      {isHovering && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(500px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), transparent 50%)`,
          }}
        />
      )}
      
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60" />
      
      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-blue-400 font-medium px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
            ★ Most Functions
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:scale-105 group-hover:border-blue-500/30 transition-all duration-300">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors duration-200">
            {repo.name}
          </h3>
          <p className="text-sm text-gray-500 font-mono">{repo.branch}</p>
        </div>

        {/* Stats */}
        <div className="pt-5 mt-auto border-t border-white/[0.06] space-y-4">
          <div className="flex items-end justify-between">
            <span className="text-sm text-gray-400">Functions indexed</span>
            <span className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {(repo.file_count || 0).toLocaleString()}
            </span>
          </div>
          
          {/* Progress bar */}
          {totalFunctions > 0 && (
            <div className="space-y-2">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500">{percentage}% of total indexed functions</p>
            </div>
          )}
        </div>

        {/* Hover CTA */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
          <span className="text-sm text-white flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-500/30 backdrop-blur-sm">
            Explore <span>→</span>
          </span>
        </div>
      </div>
    </motion.button>
  )
}

// Regular card - compact
const RepoCard = ({ repo, index, onSelect }: { 
  repo: Repository
  index: number
  onSelect: () => void 
}) => {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const isPending = repo.status === 'cloned' || repo.status === 'cloning'

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
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`group relative text-left rounded-2xl overflow-hidden h-full min-h-[140px]
        border transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-blue-500/40 p-5
        ${isPending 
          ? 'bg-gradient-to-br from-[#0f1114] to-[#0d0f12] border-dashed border-white/[0.08] hover:border-blue-500/30' 
          : 'bg-gradient-to-br from-[#0f1114] to-[#0d0f12] border-white/[0.08] hover:border-white/[0.15]'
        }
        hover:shadow-xl hover:shadow-blue-500/[0.06]`}
    >
      {/* Mouse-following glow */}
      {isHovering && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.1), transparent 50%)`,
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-white/[0.08] flex items-center justify-center group-hover:scale-105 group-hover:border-blue-500/20 transition-all duration-300">
            <svg className="w-5 h-5 text-blue-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-0.5 truncate group-hover:text-blue-400 transition-colors duration-200">
            {repo.name}
          </h3>
          <p className="text-xs text-gray-500 font-mono">{repo.branch}</p>
        </div>

        {/* Stats */}
        <div className="pt-3 mt-auto border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Functions</span>
            <span className={`text-lg font-bold font-mono ${isPending ? 'text-gray-500' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400'}`}>
              {(repo.file_count || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

export function RepoList({ repos, selectedRepo, onSelect, loading }: RepoListProps) {
  if (loading) {
    return <RepoGridSkeleton count={3} />
  }

  if (repos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-[#111113] to-[#0a0a0c] border border-white/[0.06] rounded-2xl p-16 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/[0.06] flex items-center justify-center">
          <span className="text-4xl">📦</span>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white">No repositories yet</h3>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          Add your first repository to start searching code semantically with AI
        </p>
      </motion.div>
    )
  }

  // Sort repos: indexed first, then by file_count descending
  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => {
      // Indexed repos first
      if (a.status === 'indexed' && b.status !== 'indexed') return -1
      if (b.status === 'indexed' && a.status !== 'indexed') return 1
      // Then by file count
      return (b.file_count || 0) - (a.file_count || 0)
    })
  }, [repos])

  const totalFunctions = repos.reduce((acc, r) => acc + (r.file_count || 0), 0)
  const [featured, ...rest] = sortedRepos

  // Determine grid layout based on repo count
  const gridClass = rest.length === 0 
    ? 'grid-cols-1' 
    : rest.length === 1 
      ? 'grid-cols-1 lg:grid-cols-2' 
      : 'grid-cols-1 lg:grid-cols-3'

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {/* Featured repo - spans full width on mobile, left column on desktop */}
      {featured && (
        <div className={rest.length > 0 ? 'lg:row-span-2' : ''}>
          <FeaturedRepoCard 
            repo={featured} 
            totalFunctions={totalFunctions}
            onSelect={() => onSelect(featured.id)}
          />
        </div>
      )}
      
      {/* Rest of repos */}
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

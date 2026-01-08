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
  
  if (isIndexed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        Indexed
      </span>
    )
  }
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
      Pending
    </span>
  )
}

// Featured card - tall, prominent
const FeaturedRepoCard = ({ repo, totalFunctions, onSelect }: { 
  repo: Repository
  totalFunctions: number
  onSelect: () => void 
}) => {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)
  const pct = totalFunctions > 0 ? Math.round((repo.file_count || 0) / totalFunctions * 100) : 0

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      onClick={onSelect}
      onMouseMove={(e) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative text-left rounded-2xl overflow-hidden w-full h-full min-h-[300px]
        bg-[#111113] border border-white/[0.06] hover:border-blue-500/40
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 p-6 transition-colors"
    >
      {/* Mouse glow - BLUE only */}
      {hovering && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(37, 99, 235, 0.1), transparent 50%)`,
          }}
        />
      )}
      
      {/* Top accent - solid blue */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500" />
      
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
          {repo.name}
        </h3>
        <p className="text-sm text-zinc-500 font-mono mb-auto">{repo.branch}</p>

        {/* Stats */}
        <div className="pt-6 mt-6 border-t border-white/[0.06]">
          <div className="flex items-end justify-between mb-3">
            <span className="text-sm text-zinc-500">Functions indexed</span>
            <span className="text-4xl font-bold text-blue-500">
              {(repo.file_count || 0).toLocaleString()}
            </span>
          </div>
          
          {/* Progress bar */}
          {totalFunctions > 0 && repo.file_count > 0 && (
            <div className="space-y-2">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <p className="text-xs text-zinc-600">{pct}% of total indexed</p>
            </div>
          )}
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -3 }}
      onClick={onSelect}
      onMouseMove={(e) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative text-left rounded-2xl overflow-hidden w-full h-full
        bg-[#111113] border border-white/[0.06] hover:border-white/[0.15]
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
      
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white mb-0.5 group-hover:text-blue-400 transition-colors">
          {repo.name}
        </h3>
        <p className="text-xs text-zinc-500 font-mono mb-auto">{repo.branch}</p>

        {/* Stats */}
        <div className="pt-4 mt-4 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Functions</span>
            <span className="text-xl font-bold text-blue-500">
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

  const totalFunctions = repos.reduce((acc, r) => acc + (r.file_count || 0), 0)
  const [featured, ...rest] = sortedRepos

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 auto-rows-fr">
      {/* Featured - spans 2 rows on desktop */}
      {featured && (
        <div className="lg:row-span-2">
          <FeaturedRepoCard 
            repo={featured} 
            totalFunctions={totalFunctions}
            onSelect={() => onSelect(featured.id)}
          />
        </div>
      )}
      
      {/* Other repos */}
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

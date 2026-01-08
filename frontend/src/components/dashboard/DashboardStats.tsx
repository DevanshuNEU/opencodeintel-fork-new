import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Repository } from '../../types'

interface DashboardStatsProps {
  repos: Repository[]
}

const useAnimatedCounter = (end: number, duration: number = 1200) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    if (end === 0) { setCount(0); return }
    let startTime: number | null = null
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [end, duration])
  
  return count
}

export function DashboardStats({ repos }: DashboardStatsProps) {
  const totalRepos = repos.length
  const indexedRepos = repos.filter(r => r.status === 'indexed').length
  const totalFunctions = repos.reduce((acc, r) => acc + (r.file_count || 0), 0)
  const indexingCount = repos.filter(r => r.status === 'indexing' || r.status === 'cloning').length

  const animatedTotal = useAnimatedCounter(totalRepos)
  const animatedIndexed = useAnimatedCounter(indexedRepos)
  const animatedFunctions = useAnimatedCounter(totalFunctions)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Total Repos */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-[#111113] border border-white/[0.06] p-6"
      >
        <p className="text-sm text-zinc-500 mb-2">Total Repositories</p>
        <p className="text-4xl font-bold text-blue-500">{animatedTotal}</p>
      </motion.div>

      {/* Indexed */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl bg-[#111113] border border-white/[0.06] p-6"
      >
        <p className="text-sm text-zinc-500 mb-2">Indexed</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-blue-500">{animatedIndexed}</span>
          <span className="text-xl text-zinc-600">/{totalRepos}</span>
        </div>
        {indexingCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {indexingCount} indexing...
          </div>
        )}
      </motion.div>

      {/* Functions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-[#111113] border border-white/[0.06] p-6"
      >
        <p className="text-sm text-zinc-500 mb-2">Functions Indexed</p>
        <p className="text-4xl font-bold text-blue-500">{animatedFunctions.toLocaleString()}</p>
      </motion.div>
    </div>
  )
}

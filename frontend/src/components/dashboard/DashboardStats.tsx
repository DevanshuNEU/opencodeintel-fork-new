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
  const indexingRepos = repos.filter(r => r.status === 'indexing' || r.status === 'cloning').length

  const animatedTotal = useAnimatedCounter(totalRepos)
  const animatedIndexed = useAnimatedCounter(indexedRepos)
  const animatedFunctions = useAnimatedCounter(totalFunctions)

  const stats = [
    { label: 'Total Repositories', value: animatedTotal, suffix: '' },
    { label: 'Indexed', value: animatedIndexed, suffix: `/${totalRepos}`, hasIndicator: indexingRepos > 0, indicatorText: `${indexingRepos} indexing...` },
    { label: 'Functions Indexed', value: animatedFunctions, suffix: '' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-[#111113] border border-white/[0.06] p-6"
        >
          {/* Subtle glow - same blue-violet for all */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-3xl" />
          
          <div className="relative">
            <p className="text-sm text-zinc-500 mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
                {stat.value.toLocaleString()}
              </span>
              {stat.suffix && (
                <span className="text-xl text-zinc-600">{stat.suffix}</span>
              )}
            </div>
            
            {stat.hasIndicator && (
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {stat.indicatorText}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

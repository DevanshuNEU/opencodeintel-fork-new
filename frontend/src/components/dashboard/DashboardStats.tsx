import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FolderGit2, CheckCircle, Code2 } from 'lucide-react'
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
  const totalFiles = repos.reduce((acc, r) => acc + (r.file_count || 0), 0)
  const indexingCount = repos.filter(r => r.status === 'indexing' || r.status === 'cloning').length

  const animatedTotal = useAnimatedCounter(totalRepos)
  const animatedIndexed = useAnimatedCounter(indexedRepos)
  const animatedFiles = useAnimatedCounter(totalFiles)

  const stats = [
    {
      label: 'Total Repositories',
      value: animatedTotal,
      icon: FolderGit2,
      suffix: '',
    },
    {
      label: 'Indexed',
      value: animatedIndexed,
      icon: CheckCircle,
      suffix: `/${totalRepos}`,
      extra: indexingCount > 0 ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {indexingCount} indexing...
        </div>
      ) : null,
    },
    {
      label: 'Files Indexed',
      value: animatedFiles,
      icon: Code2,
      suffix: '',
      format: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative overflow-hidden rounded-xl bg-card border border-border p-6 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <stat.icon className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-primary">
              {stat.format ? stat.value.toLocaleString() : stat.value}
            </span>
            {stat.suffix && (
              <span className="text-xl text-muted-foreground">{stat.suffix}</span>
            )}
          </div>
          {stat.extra}
        </motion.div>
      ))}
    </div>
  )
}

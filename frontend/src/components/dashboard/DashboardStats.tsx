import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Repository } from '../../types'

interface DashboardStatsProps {
  repos: Repository[]
}

// Animated counter hook
const useAnimatedCounter = (end: number, duration: number = 1500) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    if (end === 0) { setCount(0); return }
    
    let startTime: number | null = null
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [end, duration])
  
  return count
}

const StatCard = ({ label, value, suffix, gradient, glowColor, icon, delay = 0 }: { 
  label: string
  value: number
  suffix?: string
  gradient: string
  glowColor: string
  icon: string
  delay?: number
}) => {
  const animatedValue = useAnimatedCounter(value)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1114] to-[#0a0c0f] border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all duration-300"
    >
      {/* Glow effect */}
      <div className={`absolute -top-16 -right-16 w-40 h-40 ${glowColor} opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-500`} />
      
      {/* Icon */}
      <div className="absolute top-5 right-5 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
        {icon}
      </div>
      
      <div className="relative">
        <p className="text-sm text-gray-400 mb-3 font-medium">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${gradient}`}>
            {animatedValue.toLocaleString()}
          </span>
          {suffix && (
            <span className="text-xl text-gray-500 font-medium">{suffix}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function DashboardStats({ repos }: DashboardStatsProps) {
  const totalRepos = repos.length
  const indexedRepos = repos.filter(r => r.status === 'indexed').length
  const totalFunctions = repos.reduce((acc, r) => acc + (r.file_count || 0), 0)
  const indexingRepos = repos.filter(r => r.status === 'indexing' || r.status === 'cloning').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <StatCard 
        label="Total Repositories"
        value={totalRepos}
        gradient="from-blue-400 to-cyan-400"
        glowColor="bg-blue-500"
        icon="📦"
        delay={0}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1114] to-[#0a0c0f] border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all duration-300"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500 opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-500" />
        <div className="absolute top-5 right-5 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">✓</div>
        
        <div className="relative">
          <p className="text-sm text-gray-400 mb-3 font-medium">Indexed</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">
              {indexedRepos}
            </span>
            <span className="text-xl text-gray-500 font-medium">/{totalRepos}</span>
          </div>
          
          {/* Indexing indicator */}
          {indexingRepos > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {indexingRepos} indexing...
            </div>
          )}
        </div>
      </motion.div>
      
      <StatCard 
        label="Functions Indexed"
        value={totalFunctions}
        gradient="from-purple-400 to-pink-400"
        glowColor="bg-purple-500"
        icon="⚡"
        delay={0.2}
      />
    </div>
  )
}

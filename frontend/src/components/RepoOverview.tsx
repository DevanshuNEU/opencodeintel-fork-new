import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import type { Repository } from '../types'
import { WS_URL } from '../config/api'
import { useInvalidateRepoCache } from '../hooks/useCachedQuery'

interface RepoOverviewProps {
  repo: Repository
  onReindex: () => void
  apiUrl: string
  apiKey: string
}

interface IndexProgress {
  files_processed: number
  functions_indexed: number
  total_files: number
  progress_pct: number
}

const StatCard = ({ label, value, icon, gradient, delay = 0 }: { 
  label: string
  value: string | number
  icon: string
  gradient: string
  delay?: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} border border-white/5 p-5`}
  >
    <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  </motion.div>
)

export function RepoOverview({ repo, onReindex, apiUrl, apiKey }: RepoOverviewProps) {
  const [indexing, setIndexing] = useState(false)
  const [progress, setProgress] = useState<IndexProgress | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const completedRef = useRef(false)
  const invalidateCache = useInvalidateRepoCache()

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  const handleReindex = async () => {
    setIndexing(true)
    setProgress({ files_processed: 0, functions_indexed: 0, total_files: 0, progress_pct: 0 })
    completedRef.current = false
    
    try {
      const ws = new WebSocket(`${WS_URL}/ws/index/${repo.id}?token=${apiKey}`)
      wsRef.current = ws
      ws.onopen = () => toast.loading('Indexing started...', { id: 'reindex' })
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'progress') {
          setProgress({ files_processed: data.files_processed, functions_indexed: data.functions_indexed, total_files: data.total_files, progress_pct: data.progress_pct })
        } else if (data.type === 'complete') {
          completedRef.current = true
          toast.success(`Indexing complete! ${data.total_functions} functions indexed.`, { id: 'reindex' })
          setIndexing(false)
          setProgress(null)
          invalidateCache(repo.id)
          onReindex()
        } else if (data.type === 'error') {
          completedRef.current = true
          toast.error(`Indexing failed: ${data.message}`, { id: 'reindex' })
          setIndexing(false)
          setProgress(null)
        }
      }
      ws.onerror = () => { if (!completedRef.current) { toast.dismiss('reindex'); fallbackToHttp() } }
      ws.onclose = () => { if (!completedRef.current) fallbackToHttp() }
    } catch {
      fallbackToHttp()
    }
  }

  const fallbackToHttp = async () => {
    if (completedRef.current) return
    toast.loading('Using fallback indexing...', { id: 'reindex' })
    try {
      await onReindex()
      toast.success('Re-indexing started!', { id: 'reindex' })
      let pct = 10
      const interval = setInterval(() => { pct = Math.min(pct + 10, 90); setProgress(prev => prev ? { ...prev, progress_pct: pct } : null) }, 1000)
      setTimeout(() => { clearInterval(interval); setProgress(null); setIndexing(false); completedRef.current = true }, 8000)
    } catch {
      setIndexing(false)
      setProgress(null)
      toast.error('Failed to start re-indexing', { id: 'reindex' })
    }
  }

  const statusConfig = {
    indexed: { label: 'Indexed', color: 'text-emerald-400', bg: 'from-emerald-500/10 to-green-500/10', icon: '✓' },
    cloned: { label: 'Ready', color: 'text-blue-400', bg: 'from-blue-500/10 to-cyan-500/10', icon: '✓' },
    indexing: { label: 'Indexing', color: 'text-amber-400', bg: 'from-amber-500/10 to-orange-500/10', icon: '⏳' },
  }[repo.status] || { label: repo.status, color: 'text-gray-400', bg: 'from-gray-500/10 to-gray-500/10', icon: '•' }

  return (
    <div className="p-6 space-y-6">
      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="Status" 
          value={statusConfig.label}
          icon={statusConfig.icon}
          gradient={statusConfig.bg}
          delay={0}
        />
        <StatCard 
          label="Functions Indexed" 
          value={repo.file_count?.toLocaleString() || '0'}
          icon="📊"
          gradient="from-purple-500/10 to-pink-500/10"
          delay={0.1}
        />
        <StatCard 
          label="Branch" 
          value={repo.branch}
          icon="🌿"
          gradient="from-cyan-500/10 to-blue-500/10"
          delay={0.2}
        />
      </div>

      {/* Indexing Progress */}
      {indexing && progress && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <h3 className="font-semibold text-white">Indexing in Progress</h3>
            </div>
            <span className="text-sm font-mono text-blue-400">{progress.progress_pct}%</span>
          </div>
          <Progress value={progress.progress_pct} className="h-2 mb-3" />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Files: {progress.files_processed}/{progress.total_files || '?'}</span>
            <span>Functions: {progress.functions_indexed}</span>
          </div>
        </motion.div>
      )}

      {/* Repository Details */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/[0.02] border border-white/5 rounded-xl p-5"
      >
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span>📋</span> Repository Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-gray-500 block">Name</span>
            <span className="text-white font-medium">{repo.name}</span>
          </div>
          <div className="space-y-1">
            <span className="text-gray-500 block">Git URL</span>
            <a href={repo.git_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-mono text-xs truncate block transition-colors">
              {repo.git_url}
            </a>
          </div>
          <div className="space-y-1 md:col-span-2">
            <span className="text-gray-500 block">Local Path</span>
            <span className="text-gray-300 font-mono text-xs">{repo.local_path}</span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/[0.02] border border-white/5 rounded-xl p-5"
      >
        <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
          <span>⚡</span> Actions
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Re-indexing uses <span className="text-white font-medium">incremental mode</span> - only processes changed files for 100x faster updates!
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleReindex}
            disabled={indexing}
            className="group px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <span className={indexing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}>🔄</span>
            {indexing ? 'Indexing...' : 'Re-index Repository'}
          </button>
          <button
            className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 text-sm font-medium rounded-lg hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all flex items-center gap-2"
            onClick={() => toast.info('Delete functionality coming soon')}
          >
            <span>🗑️</span> Remove
          </button>
        </div>
      </motion.div>

      {/* Quick Guide */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 border border-blue-500/20 rounded-xl p-5"
      >
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span>💡</span> Quick Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            { icon: '🔍', title: 'Search', desc: 'Find code by meaning, not keywords' },
            { icon: '🔗', title: 'Dependencies', desc: 'Visualize code architecture' },
            { icon: '✨', title: 'Code Style', desc: 'Analyze team coding patterns' },
            { icon: '💥', title: 'Impact', desc: 'See what breaks when you change a file' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <span className="text-lg">{item.icon}</span>
              <div>
                <span className="text-white font-medium block">{item.title}</span>
                <span className="text-gray-400 text-xs">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

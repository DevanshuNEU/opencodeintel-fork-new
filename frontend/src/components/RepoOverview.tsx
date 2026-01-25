import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CodebaseIntelligence } from './CodebaseIntelligence'
import type { Repository } from '../types'
import { WS_URL } from '../config/api'
import { useInvalidateRepoCache } from '../hooks/useCachedQuery'

interface RepoOverviewProps {
  repo: Repository
  onReindex: () => void
  apiUrl: string
  apiKey: string
  onTabChange?: (tab: string) => void
}

interface IndexProgress {
  files_processed: number
  functions_indexed: number
  total_files: number
  progress_pct: number
}

export function RepoOverview({ repo, onReindex, apiUrl, apiKey, onTabChange }: RepoOverviewProps) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Codebase Intelligence - Hero Section */}
      {repo.status === 'indexed' && (
        <CodebaseIntelligence repo={repo} apiKey={apiKey} onTabChange={onTabChange} />
      )}

      {/* Pending State */}
      {repo.status !== 'indexed' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted border border-border rounded-xl p-8 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Repository Not Indexed</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Index this repository to unlock codebase intelligence, semantic search, and dependency analysis.
          </p>
          <Button onClick={handleReindex} disabled={indexing}>
            {indexing ? 'Indexing...' : 'Start Indexing'}
          </Button>
        </motion.div>
      )}

      {/* Indexing Progress */}
      {indexing && progress && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-medium text-foreground">Indexing in Progress</span>
            </div>
            <span className="text-sm font-mono text-primary">{progress.progress_pct}%</span>
          </div>
          <Progress value={progress.progress_pct} className="h-1.5 mb-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Files: {progress.files_processed}/{progress.total_files || '?'}</span>
            <span>Functions: {progress.functions_indexed}</span>
          </div>
        </motion.div>
      )}

      {/* Repository Details */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-muted border border-border rounded-xl p-5"
      >
        <h3 className="text-sm font-medium text-foreground mb-4">Repository Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground w-20">Name</span>
            <span className="text-foreground">{repo.name}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground w-20">Git URL</span>
            <a href={repo.git_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 font-mono text-xs truncate transition-colors">
              {repo.git_url}
            </a>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground w-20">Local Path</span>
            <span className="text-muted-foreground font-mono text-xs truncate">{repo.local_path}</span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-muted border border-border rounded-xl p-5"
      >
        <h3 className="text-sm font-medium text-foreground mb-2">Actions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Re-indexing uses incremental mode — only processes changed files.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleReindex}
            disabled={indexing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {indexing ? 'Indexing...' : 'Re-index Repository'}
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Delete functionality coming soon')}
          >
            Remove
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

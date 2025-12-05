import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import type { Repository } from '../types'
import { WS_URL } from '../config/api'

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

export function RepoOverview({ repo, onReindex, apiUrl, apiKey }: RepoOverviewProps) {
  const [indexing, setIndexing] = useState(false)
  const [progress, setProgress] = useState<IndexProgress | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const handleReindex = async () => {
    setIndexing(true)
    setProgress({ files_processed: 0, functions_indexed: 0, total_files: 0, progress_pct: 0 })
    
    // Connect to WebSocket for real-time progress
    const wsUrl = `${WS_URL}/ws/index/${repo.id}?token=${apiKey}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        toast.loading('Indexing started...', { id: 'reindex' })
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'progress') {
          setProgress({
            files_processed: data.files_processed,
            functions_indexed: data.functions_indexed,
            total_files: data.total_files,
            progress_pct: data.progress_pct
          })
        } else if (data.type === 'complete') {
          setProgress(prev => prev ? { ...prev, progress_pct: 100 } : null)
          toast.success(`Indexing complete! ${data.total_functions} functions indexed.`, { id: 'reindex' })
          setIndexing(false)
          onReindex() // Refresh repo data
        } else if (data.type === 'error') {
          toast.error(`Indexing failed: ${data.message}`, { id: 'reindex' })
          setIndexing(false)
        }
      }

      ws.onerror = () => {
        // WebSocket error - fall back to HTTP
        toast.dismiss('reindex')
        fallbackToHttp()
      }

      ws.onclose = (event) => {
        if (event.code !== 1000 && indexing) {
          // Abnormal close while still indexing - fall back to HTTP
          fallbackToHttp()
        }
      }

    } catch {
      // WebSocket connection failed - fall back to HTTP
      fallbackToHttp()
    }
  }

  const fallbackToHttp = async () => {
    // Fallback: Use HTTP endpoint with simulated progress
    toast.loading('Using fallback indexing...', { id: 'reindex' })
    
    try {
      await onReindex()
      toast.success('Re-indexing started!', { id: 'reindex' })
      
      // Simulate progress for HTTP fallback
      let pct = 10
      const interval = setInterval(() => {
        pct = Math.min(pct + 10, 90)
        setProgress(prev => prev ? { ...prev, progress_pct: pct } : null)
      }, 1000)
      
      setTimeout(() => {
        clearInterval(interval)
        setProgress(prev => prev ? { ...prev, progress_pct: 100 } : null)
        setIndexing(false)
      }, 8000)
      
    } catch {
      setIndexing(false)
      toast.error('Failed to start re-indexing', { id: 'reindex' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-600 mb-1">Status</div>
          <div className="flex items-center gap-2 mt-2">
            {repo.status === 'indexed' && (
              <span className="badge-success text-sm">✓ Indexed</span>
            )}
            {repo.status === 'cloned' && (
              <span className="badge-success text-sm">✓ Ready</span>
            )}
            {repo.status === 'indexing' && (
              <span className="badge-warning text-sm">🔄 Indexing</span>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-600 mb-1">Functions Indexed</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">
            {repo.file_count?.toLocaleString() || 0}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-600 mb-1">Branch</div>
          <div className="text-lg font-mono text-gray-900 mt-2">
            {repo.branch}
          </div>
        </div>
      </div>

      {/* Indexing Progress */}
      {indexing && progress && (
        <div className="card p-6 border-2 border-blue-500 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">🔄 Indexing in Progress</h3>
            <span className="text-sm font-mono text-blue-600">{progress.progress_pct}%</span>
          </div>
          <Progress value={progress.progress_pct} className="h-2" />
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>Files: {progress.files_processed}/{progress.total_files || '?'}</span>
            <span>Functions: {progress.functions_indexed}</span>
          </div>
        </div>
      )}

      {/* Repository Info */}
      <div className="card p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Repository Details</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-gray-600 w-24">Name:</span>
            <span className="text-gray-900 font-medium">{repo.name}</span>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-gray-600 w-24">Git URL:</span>
            <a 
              href={repo.git_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono text-xs break-all"
            >
              {repo.git_url}
            </a>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-gray-600 w-24">Local Path:</span>
            <span className="text-gray-700 font-mono text-xs">{repo.local_path}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Actions</h3>
        <p className="text-sm text-gray-600 mb-4">
          Re-indexing uses <strong>incremental mode</strong> - only processes changed files for 100x faster updates!
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleReindex}
            disabled={indexing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {indexing ? '🔄 Indexing...' : '🔄 Re-index Repository'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => toast.info('Delete functionality coming soon')}
          >
            🗑️ Remove
          </button>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-base font-semibold text-gray-900 mb-2">💡 Quick Guide</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• <strong>Search</strong> tab - Find code by meaning, not keywords</li>
          <li>• <strong>Dependencies</strong> tab - Visualize code architecture</li>
          <li>• <strong>Code Style</strong> tab - Analyze team coding patterns</li>
          <li>• <strong>Impact</strong> tab - See what breaks when you change a file</li>
          <li>• Use with Claude Desktop via MCP for AI-powered code understanding</li>
        </ul>
      </div>
    </div>
  )
}

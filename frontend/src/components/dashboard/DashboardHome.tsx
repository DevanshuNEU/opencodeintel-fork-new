import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { 
  LayoutDashboard, 
  Search, 
  GitFork, 
  Code2, 
  Zap, 
  ArrowLeft,
  FolderGit2,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { RepoList } from '../RepoList'
import { AddRepoForm } from '../AddRepoForm'
import { SearchPanel } from '../SearchPanel'
import { DependencyGraph } from '../DependencyGraph'
import { RepoOverview } from '../RepoOverview'
import { StyleInsights } from '../StyleInsights'
import { ImpactAnalyzer } from '../ImpactAnalyzer'
import { DashboardStats } from './DashboardStats'
import type { Repository } from '../../types'
import { API_URL } from '../../config/api'

type RepoTab = 'overview' | 'search' | 'dependencies' | 'insights' | 'impact'

export function DashboardHome() {
  const { session } = useAuth()
  const [repos, setRepos] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RepoTab>('overview')
  const [loading, setLoading] = useState(false)
  const [reposLoading, setReposLoading] = useState(true)

  const fetchRepos = async () => {
    if (!session?.access_token) return
    try {
      const response = await fetch(`${API_URL}/repos`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await response.json()
      setRepos(data.repositories || [])
    } catch (error) {
      console.error('Error fetching repos:', error)
    } finally {
      setReposLoading(false)
    }
  }

  useEffect(() => {
    fetchRepos()
    const interval = setInterval(fetchRepos, 30000)
    return () => clearInterval(interval)
  }, [session])

  const handleAddRepo = async (gitUrl: string, branch: string) => {
    try {
      setLoading(true)
      const name = gitUrl.split('/').pop()?.replace('.git', '') || 'unknown'
      const response = await fetch(`${API_URL}/repos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, git_url: gitUrl, branch })
      })
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to add repository')
      }
      
      const data = await response.json()
      if (!data.repo_id) throw new Error('Missing repo_id in response')
      
      await fetch(`${API_URL}/repos/${data.repo_id}/index`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      await fetchRepos()
      toast.success('Repository added!', { description: `${name} is now being indexed` })
    } catch (error) {
      console.error('Error adding repo:', error)
      toast.error('Failed to add repository', { description: 'Please check the Git URL and try again' })
    } finally {
      setLoading(false)
    }
  }

  const handleReindex = async () => {
    if (!selectedRepo) return
    try {
      setLoading(true)
      await fetch(`${API_URL}/repos/${selectedRepo}/index`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      await fetchRepos()
    } catch (error) {
      toast.error('Re-indexing failed', { description: 'Please check the console for details' })
    } finally {
      setLoading(false)
    }
  }

  const selectedRepoData = repos.find(r => r.id === selectedRepo)
  const isRepoView = selectedRepo && selectedRepoData

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'dependencies', label: 'Dependencies', icon: GitFork },
    { id: 'insights', label: 'Code Style', icon: Code2 },
    { id: 'impact', label: 'Impact', icon: Zap },
  ] as const

  return (
    <div className="pt-14 min-h-screen">
      <AnimatePresence mode="wait">
        {/* Repository List View */}
        {!isRepoView && (
          <motion.div
            key="repo-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">Repositories</h1>
                <p className="text-muted-foreground">
                  Semantic code search powered by AI
                </p>
              </div>
              <AddRepoForm onAdd={handleAddRepo} loading={loading} />
            </div>
            
            {/* Stats */}
            {repos.length > 0 && <DashboardStats repos={repos} />}
            
            {/* Repo Grid */}
            <RepoList 
              repos={repos} 
              selectedRepo={selectedRepo}
              loading={reposLoading}
              onSelect={(id) => {
                setSelectedRepo(id)
                setActiveTab('overview')
              }}
            />
          </motion.div>
        )}

        {/* Single Repo View */}
        {isRepoView && (
          <motion.div
            key="repo-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={() => { setSelectedRepo(null); setActiveTab('overview') }}
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Repositories</span>
              </button>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <FolderGit2 className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{selectedRepoData.name}</h1>
                    <a 
                      href={selectedRepoData.git_url?.replace('.git', '')} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
                    >
                      {selectedRepoData.git_url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1.5 bg-muted rounded-xl w-fit border border-border">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-primary/20 text-primary shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {activeTab === 'overview' && (
                <RepoOverview 
                  repo={selectedRepoData} 
                  onReindex={handleReindex}
                  apiUrl={API_URL}
                  apiKey={session?.access_token || ''}
                  onTabChange={(tab) => setActiveTab(tab as RepoTab)}
                />
              )}
              {activeTab === 'search' && (
                <SearchPanel 
                  repoId={selectedRepo} 
                  apiUrl={API_URL} 
                  apiKey={session?.access_token || ''}
                  repoUrl={selectedRepoData?.git_url?.replace('.git', '')}
                />
              )}
              {activeTab === 'dependencies' && (
                <DependencyGraph 
                  repoId={selectedRepo} 
                  apiUrl={API_URL} 
                  apiKey={session?.access_token || ''} 
                />
              )}
              {activeTab === 'insights' && (
                <StyleInsights 
                  repoId={selectedRepo} 
                  apiUrl={API_URL} 
                  apiKey={session?.access_token || ''} 
                />
              )}
              {activeTab === 'impact' && (
                <ImpactAnalyzer 
                  repoId={selectedRepo} 
                  apiUrl={API_URL} 
                  apiKey={session?.access_token || ''} 
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

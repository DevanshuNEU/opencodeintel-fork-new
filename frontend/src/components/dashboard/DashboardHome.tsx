import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  ExternalLink,
  Plus,
  Github
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { RepoList } from '../RepoList'
import { AddRepoForm } from '../AddRepoForm'
import { GitHubRepoSelector } from '../GitHubRepoSelector'
import { SearchPanel } from '../SearchPanel'
import { DependencyGraph } from '../DependencyGraph'
import { RepoOverview } from '../RepoOverview'
import { StyleInsights } from '../StyleInsights'
import { ImpactAnalyzer } from '../ImpactAnalyzer'
import { DashboardStats } from './DashboardStats'
import { IndexingProgressModal } from '../IndexingProgressModal'
import type { Repository } from '../../types'
import type { GitHubRepo } from '../../hooks/useGitHubRepos'
import { API_URL } from '../../config/api'

const MAX_FREE_REPOS = 3

type RepoTab = 'overview' | 'search' | 'dependencies' | 'insights' | 'impact'

export function DashboardHome() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [repos, setRepos] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RepoTab>('overview')
  const [loading, setLoading] = useState(false)
  const [reposLoading, setReposLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showGitHubSelector, setShowGitHubSelector] = useState(false)
  
  // Indexing progress modal state
  const [indexingRepoId, setIndexingRepoId] = useState<string | null>(null)
  const [indexingRepoName, setIndexingRepoName] = useState<string>('')
  const [showIndexingModal, setShowIndexingModal] = useState(false)

  // Auto-open GitHub import modal if redirected from OAuth callback
  useEffect(() => {
    if (searchParams.get('openGitHubImport') === 'true') {
      setShowGitHubSelector(true)
      // Clear the param from URL without triggering navigation
      searchParams.delete('openGitHubImport')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

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
      
      // Trigger async indexing
      const indexResponse = await fetch(`${API_URL}/repos/${data.repo_id}/index/async`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      
      if (!indexResponse.ok) {
        const err = await indexResponse.json().catch(() => ({}))
        throw new Error(err.detail?.message || err.detail || 'Failed to start indexing')
      }
      
      // Show indexing progress modal
      setIndexingRepoId(data.repo_id)
      setIndexingRepoName(name)
      setShowIndexingModal(true)
      setShowAddForm(false)
      
      await fetchRepos()
    } catch (error) {
      console.error('Error adding repo:', error)
      toast.error('Failed to add repository', { description: error instanceof Error ? error.message : 'Please check the Git URL and try again' })
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubImport = async (githubRepos: GitHubRepo[]) => {
    if (githubRepos.length === 0) return
    
    // Import repos one at a time
    for (const repo of githubRepos) {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/repos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            name: repo.name, 
            git_url: repo.clone_url, 
            branch: repo.default_branch 
          })
        })
        
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.detail || `Failed to add ${repo.name}`)
        }
        
        const data = await response.json()
        if (!data.repo_id) throw new Error('Missing repo_id in response')
        
        // Trigger async indexing
        const indexResponse = await fetch(`${API_URL}/repos/${data.repo_id}/index/async`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        
        if (!indexResponse.ok) {
          const err = await indexResponse.json().catch(() => ({}))
          const errMsg = err.detail?.message || err.detail || 'Indexing failed to start'
          console.error(`Failed to start indexing for ${repo.name}:`, err)
          toast.warning(`${repo.name} added but indexing failed`, { 
            description: errMsg 
          })
        } else if (repo === githubRepos[githubRepos.length - 1]) {
          // Only show progress modal for last repo if indexing started successfully
          setIndexingRepoId(data.repo_id)
          setIndexingRepoName(repo.name)
          setShowIndexingModal(true)
        }
        
        toast.success(`Added ${repo.name}`)
      } catch (error) {
        console.error(`Error importing ${repo.name}:`, error)
        toast.error(`Failed to import ${repo.name}`, { 
          description: error instanceof Error ? error.message : 'Please try again' 
        })
      }
    }
    
    setLoading(false)
    await fetchRepos()
  }

  const handleIndexingComplete = async () => {
    await fetchRepos()
    toast.success('Indexing complete!', { description: `${indexingRepoName} is ready for search` })
  }

  const handleCloseIndexingModal = () => {
    setShowIndexingModal(false)
    setIndexingRepoId(null)
    setIndexingRepoName('')
  }

  const handleRetryIndexing = async () => {
    if (!indexingRepoId) return
    
    try {
      const response = await fetch(`${API_URL}/repos/${indexingRepoId}/index/async`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      
      if (!response.ok) {
        throw new Error('Failed to restart indexing')
      }
      
      // Modal will reconnect via WebSocket
    } catch (error) {
      toast.error('Failed to retry indexing')
    }
  }

  const handleReindex = async () => {
    if (!selectedRepo || !selectedRepoData) return
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/repos/${selectedRepo}/index/async`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      
      if (!response.ok) {
        throw new Error('Failed to start re-indexing')
      }
      
      // Show indexing progress modal
      setIndexingRepoId(selectedRepo)
      setIndexingRepoName(selectedRepoData.name)
      setShowIndexingModal(true)
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
    <div className="min-h-screen">
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
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowGitHubSelector(true)}
                  variant="outline"
                  disabled={loading || repos.length >= MAX_FREE_REPOS}
                  className="gap-2"
                >
                  <Github className="w-4 h-4" />
                  Import from GitHub
                </Button>
                <Button
                  onClick={() => setShowAddForm(true)}
                  disabled={loading || repos.length >= MAX_FREE_REPOS}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Repository
                </Button>
              </div>
              <AddRepoForm 
                onAdd={handleAddRepo} 
                loading={loading}
                isOpen={showAddForm}
                onOpenChange={setShowAddForm}
              />
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
              onAddClick={() => setShowAddForm(true)}
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
            <div className="bg-card border border-border rounded-xl overflow-hidden min-h-[700px]">
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
                  defaultBranch={selectedRepoData?.branch}
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
      
      {/* Indexing Progress Modal */}
      <IndexingProgressModal
        repoId={indexingRepoId}
        repoName={indexingRepoName}
        isOpen={showIndexingModal}
        onClose={handleCloseIndexingModal}
        onCompleted={handleIndexingComplete}
        onRetry={handleRetryIndexing}
      />
      
      {/* GitHub Repo Selector */}
      <GitHubRepoSelector
        isOpen={showGitHubSelector}
        onClose={() => setShowGitHubSelector(false)}
        onImport={handleGitHubImport}
        maxSelectable={MAX_FREE_REPOS}
        currentRepoCount={repos.length}
      />
    </div>
  )
}

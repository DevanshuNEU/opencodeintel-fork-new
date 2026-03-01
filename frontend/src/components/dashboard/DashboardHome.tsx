// DashboardHome -- orchestrates repo list and detail views
// State management and API handlers live here, rendering delegated to children

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useRepos } from '../../hooks/useCachedQuery'
import { API_URL, MAX_FREE_REPOS } from '../../config/api'
import { extractErrorMessage, isUpgradeError } from '../../lib/api-errors'
import { RepoListView } from './RepoListView'
import { RepoDetailView } from './RepoDetailView'
import { AddRepoForm } from '../AddRepoForm'
import { DirectoryPicker } from '../DirectoryPicker'
import { GitHubRepoSelector } from '../GitHubRepoSelector'
import { IndexingProgressModal } from '../IndexingProgressModal'
import { UpgradeLimitModal } from '../UpgradeLimitModal'
import { TIER_FUNCTION_LIMITS } from '../../config/api'
import type { GitHubRepo } from '../../hooks/useGitHubRepos'
import type { AnalyzeResult, RepoTab } from '../../types'

export function DashboardHome() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: repos = [], isLoading: reposLoading, invalidate: refreshRepos } = useRepos(session?.access_token)

  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RepoTab>('overview')
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showGitHubSelector, setShowGitHubSelector] = useState(false)

  // indexing modal
  const [indexingRepoId, setIndexingRepoId] = useState<string | null>(null)
  const [indexingRepoName, setIndexingRepoName] = useState('')
  const [showIndexingModal, setShowIndexingModal] = useState(false)

  // directory picker (monorepo subset selection)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [pendingGitUrl, setPendingGitUrl] = useState('')
  const [pendingBranch, setPendingBranch] = useState('main')
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)

  // upgrade modal
  const [upgradeModal, setUpgradeModal] = useState<{ show: boolean; message: string; repoName?: string }>({
    show: false, message: '',
  })

  // auto-open GitHub import if redirected from OAuth
  useEffect(() => {
    if (searchParams.get('openGitHubImport') === 'true') {
      setShowGitHubSelector(true)
      const cleaned = new URLSearchParams(searchParams)
      cleaned.delete('openGitHubImport')
      setSearchParams(cleaned, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const showUpgradeModal = (err: any, repoName?: string) => {
    setUpgradeModal({ show: true, message: extractErrorMessage(err, 'Repository exceeds free tier limits'), repoName })
  }

  // shared helper: add a repo and start indexing
  const addAndIndex = async (
    name: string, gitUrl: string, branch: string, includePaths?: string[],
  ): Promise<string | null> => {
    const response = await fetch(`${API_URL}/repos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, git_url: gitUrl, branch }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      if (isUpgradeError(err)) { showUpgradeModal(err, name); return null }
      throw new Error(extractErrorMessage(err, 'Failed to add repository'))
    }

    const data = await response.json()
    if (!data.repo_id) throw new Error('Missing repo_id in response')

    const indexBody = includePaths
      ? { include_paths: includePaths, incremental: false }
      : undefined

    const indexResponse = await fetch(`${API_URL}/repos/${data.repo_id}/index/async`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        ...(indexBody ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(indexBody ? { body: JSON.stringify(indexBody) } : {}),
    })

    if (!indexResponse.ok) {
      const err = await indexResponse.json().catch(() => ({}))
      if (isUpgradeError(err)) { showUpgradeModal(err, name); return null }
      throw new Error(extractErrorMessage(err, 'Failed to start indexing'))
    }

    return data.repo_id
  }

  const handleAddRepo = async (gitUrl: string, branch: string) => {
    try {
      setLoading(true)
      const name = gitUrl.split('/').pop()?.replace(/\.git$/, '') || 'unknown'
      const repoId = await addAndIndex(name, gitUrl, branch)
      setShowAddForm(false)
      if (repoId) {
        setIndexingRepoId(repoId)
        setIndexingRepoName(name)
        setShowIndexingModal(true)
      }
      refreshRepos()
    } catch (error) {
      toast.error('Failed to add repository', {
        description: error instanceof Error ? error.message : 'Please check the Git URL and try again',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubImport = async (githubRepos: GitHubRepo[]) => {
    if (githubRepos.length === 0) return

    let lastSuccessId: string | null = null
    let lastSuccessName = ''

    try {
      setLoading(true)

      for (const repo of githubRepos) {
        try {
          const repoId = await addAndIndex(repo.name, repo.clone_url, repo.default_branch)

          if (repoId) {
            lastSuccessId = repoId
            lastSuccessName = repo.name
            toast.success(`Added ${repo.name}`)
          }
        } catch (error) {
          toast.error(`Failed to import ${repo.name}`, {
            description: error instanceof Error ? error.message : 'Please try again',
          })
        }
      }

      if (lastSuccessId) {
        setIndexingRepoId(lastSuccessId)
        setIndexingRepoName(lastSuccessName)
        setShowIndexingModal(true)
      }
    } finally {
      setLoading(false)
      refreshRepos()
    }
  }

  const handleReindex = async () => {
    if (!selectedRepo || !selectedRepoData) return
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/repos/${selectedRepo}/index/async`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!response.ok) throw new Error('Failed to start re-indexing')
      setIndexingRepoId(selectedRepo)
      setIndexingRepoName(selectedRepoData.name)
      setShowIndexingModal(true)
    } catch {
      toast.error('Re-indexing failed', { description: 'Please check the console for details' })
    } finally {
      setLoading(false)
    }
  }

  // When AddRepoForm detects a large repo, show the directory picker
  const handleAnalyzed = (result: AnalyzeResult, gitUrl: string, branch: string) => {
    setAnalyzeResult(result)
    setPendingGitUrl(gitUrl)
    setPendingBranch(branch)
    setShowDirectoryPicker(true)
  }

  // User selected directories in the picker -- clone and index with subset
  const handleDirectoryConfirm = async (selectedPaths: string[]) => {
    if (!analyzeResult) return
    try {
      setLoading(true)
      const name = analyzeResult.repo
      const repoId = await addAndIndex(name, pendingGitUrl, pendingBranch, selectedPaths)
      setShowDirectoryPicker(false)
      setAnalyzeResult(null)
      if (repoId) {
        setIndexingRepoId(repoId)
        setIndexingRepoName(name)
        setShowIndexingModal(true)
      }
      refreshRepos()
    } catch (error) {
      toast.error('Failed to add repository', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedRepoData = repos.find((r) => r.id === selectedRepo)
  const isRepoView = selectedRepo && selectedRepoData

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {!isRepoView ? (
          <RepoListView
            key="repo-list"
            repos={repos}
            loading={loading}
            reposLoading={reposLoading}
            selectedRepo={selectedRepo}
            onSelectRepo={(id) => { setSelectedRepo(id); setActiveTab('overview') }}
            onAddClick={() => setShowAddForm(true)}
            onGitHubClick={() => setShowGitHubSelector(true)}
          />
        ) : (
          <RepoDetailView
            key={`repo-detail-${selectedRepo}`}
            repo={selectedRepoData}
            repoId={selectedRepo}
            activeTab={activeTab}
            apiKey={session?.access_token || ''}
            onTabChange={setActiveTab}
            onBack={() => { setSelectedRepo(null); setActiveTab('overview') }}
            onReindex={handleReindex}
          />
        )}
      </AnimatePresence>

      <AddRepoForm
        onAdd={handleAddRepo}
        onAnalyzed={handleAnalyzed}
        loading={loading}
        isOpen={showAddForm}
        onOpenChange={setShowAddForm}
      />

      {analyzeResult && (
        <DirectoryPicker
          isOpen={showDirectoryPicker}
          onClose={() => { setShowDirectoryPicker(false); setAnalyzeResult(null) }}
          repoInfo={analyzeResult}
          onConfirm={handleDirectoryConfirm}
          loading={loading}
          functionLimit={TIER_FUNCTION_LIMITS.free}
        />
      )}

      <IndexingProgressModal
        repoId={indexingRepoId}
        repoName={indexingRepoName}
        isOpen={showIndexingModal}
        onClose={() => { setShowIndexingModal(false); setIndexingRepoId(null); setIndexingRepoName('') }}
        onCompleted={() => { refreshRepos(); toast.success('Indexing complete!', { description: `${indexingRepoName} is ready for search` }) }}
        onRetry={async () => {
          if (!indexingRepoId) return
          try {
            await fetch(`${API_URL}/repos/${indexingRepoId}/index/async`, {
              method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` },
            })
          } catch { toast.error('Failed to retry indexing') }
        }}
      />

      <GitHubRepoSelector
        isOpen={showGitHubSelector}
        onClose={() => setShowGitHubSelector(false)}
        onImport={handleGitHubImport}
        maxSelectable={MAX_FREE_REPOS}
        currentRepoCount={repos.length}
      />

      <UpgradeLimitModal
        isOpen={upgradeModal.show}
        onClose={() => setUpgradeModal({ show: false, message: '' })}
        errorMessage={upgradeModal.message}
        repoName={upgradeModal.repoName}
      />
    </div>
  )
}

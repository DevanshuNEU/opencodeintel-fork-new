// Repo list header (title, buttons) and grid
// Shown when no repo is selected

import { motion } from 'framer-motion'
import { Plus, Github } from 'lucide-react'
import { Button } from '../ui/button'
import { RepoList } from '../RepoList'
import { DashboardStats } from './DashboardStats'
import type { Repository } from '../../types'

const MAX_FREE_REPOS = 3

interface RepoListViewProps {
  repos: Repository[]
  loading: boolean
  reposLoading: boolean
  selectedRepo: string | null
  onSelectRepo: (id: string) => void
  onAddClick: () => void
  onGitHubClick: () => void
}

export function RepoListView({
  repos,
  loading,
  reposLoading,
  selectedRepo,
  onSelectRepo,
  onAddClick,
  onGitHubClick,
}: RepoListViewProps) {
  return (
    <motion.div
      key="repo-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Repositories</h1>
          <p className="text-muted-foreground">
            Semantic code search powered by AI
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onGitHubClick}
            variant="outline"
            disabled={loading || repos.length >= MAX_FREE_REPOS}
            className="gap-2"
          >
            <Github className="w-4 h-4" />
            Import from GitHub
          </Button>
          <Button
            onClick={onAddClick}
            disabled={loading || repos.length >= MAX_FREE_REPOS}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Repository
          </Button>
        </div>
      </div>

      {(reposLoading || repos.length > 0) && (
        <DashboardStats repos={repos} loading={reposLoading} />
      )}

      <RepoList
        repos={repos}
        selectedRepo={selectedRepo}
        loading={reposLoading}
        onSelect={onSelectRepo}
        onAddClick={onAddClick}
      />
    </motion.div>
  )
}

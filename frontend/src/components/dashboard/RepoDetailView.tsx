// Single repo detail view with tabs (Overview, Search, Dependencies, etc.)
// Receives repo data and callbacks from DashboardHome

import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Search,
  GitFork,
  Code2,
  Zap,
  ArrowLeft,
  FolderGit2,
  ExternalLink,
} from 'lucide-react'
import { SearchPanel } from '../SearchPanel'
import { DependencyGraph } from '../DependencyGraph'
import { RepoOverview } from '../RepoOverview'
import { StyleInsights } from '../StyleInsights'
import { ImpactAnalyzer } from '../ImpactAnalyzer'
import type { Repository } from '../../types'
import { API_URL } from '../../config/api'

type RepoTab = 'overview' | 'search' | 'dependencies' | 'insights' | 'impact'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'dependencies', label: 'Dependencies', icon: GitFork },
  { id: 'insights', label: 'Code Style', icon: Code2 },
  { id: 'impact', label: 'Impact', icon: Zap },
] as const

interface RepoDetailViewProps {
  repo: Repository
  repoId: string
  activeTab: RepoTab
  apiKey: string
  onTabChange: (tab: RepoTab) => void
  onBack: () => void
  onReindex: () => void
}

export function RepoDetailView({
  repo,
  repoId,
  activeTab,
  apiKey,
  onTabChange,
  onBack,
  onReindex,
}: RepoDetailViewProps) {
  return (
    <motion.div
      key="repo-detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* back nav + repo header */}
      <div className="mb-6">
        <button
          onClick={onBack}
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
              <h1 className="text-2xl font-bold text-foreground">{repo.name}</h1>
              <a
                href={repo.git_url?.replace('.git', '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
              >
                {repo.git_url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <div className="flex gap-1 mb-6 p-1.5 bg-muted rounded-xl w-fit border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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

      {/* tab content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden min-h-[700px]">
        {activeTab === 'overview' && (
          <RepoOverview
            repo={repo}
            onReindex={onReindex}
            apiUrl={API_URL}
            apiKey={apiKey}
            onTabChange={(tab) => onTabChange(tab as RepoTab)}
          />
        )}
        {activeTab === 'search' && (
          <SearchPanel
            repoId={repoId}
            apiUrl={API_URL}
            apiKey={apiKey}
            repoUrl={repo.git_url?.replace('.git', '')}
            defaultBranch={repo.branch}
          />
        )}
        {activeTab === 'dependencies' && (
          <DependencyGraph repoId={repoId} apiKey={apiKey} />
        )}
        {activeTab === 'insights' && (
          <StyleInsights repoId={repoId} apiUrl={API_URL} apiKey={apiKey} />
        )}
        {activeTab === 'impact' && (
          <ImpactAnalyzer repoId={repoId} apiUrl={API_URL} apiKey={apiKey} />
        )}
      </div>
    </motion.div>
  )
}

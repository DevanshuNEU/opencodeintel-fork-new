export interface Repository {
  id: string
  name: string
  git_url: string
  branch: string
  status: string
  file_count: number
}

export interface SearchResult {
  code: string
  file_path: string
  name: string
  type: string
  language: string
  score: number
  line_start: number
  line_end: number
}

export type RepoTab = 'overview' | 'search' | 'dependencies' | 'insights' | 'impact'

// POST /repos/analyze response
export interface DirectoryEntry {
  name: string
  path: string
  file_count: number
  estimated_functions: number
}

export interface AnalyzeResult {
  owner: string
  repo: string
  default_branch: string
  total_files: number
  total_estimated_functions: number
  size_kb: number
  stars: number
  language: string | null
  directories: DirectoryEntry[]
  suggestion: string | null
  truncated: boolean
}

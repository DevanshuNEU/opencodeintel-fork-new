import { motion } from 'framer-motion'
import { Sparkles, GitBranch, Code2, FileCode, AlertTriangle } from 'lucide-react'
import { useRepoInsights, useStyleAnalysis } from '../hooks/useCachedQuery'
import type { Repository } from '../types'

interface RepoSummaryCardProps {
  repo: Repository
  apiKey: string
}

export function RepoSummaryCard({ repo, apiKey }: RepoSummaryCardProps) {
  const { data: insights, isLoading: insightsLoading } = useRepoInsights({ repoId: repo.id, apiKey })
  const { data: style, isLoading: styleLoading } = useStyleAnalysis({ repoId: repo.id, apiKey })

  const isLoading = insightsLoading || styleLoading

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-primary/10 to-violet-500/5 border border-primary/20 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-48 bg-primary/20 rounded animate-pulse" />
            <div className="h-4 w-full bg-primary/10 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-primary/10 rounded animate-pulse" />
          </div>
        </div>
      </motion.div>
    )
  }

  // Generate summary from insights + style data
  const summary = generateSummary(repo, insights, style)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 via-primary/10 to-violet-500/5 border border-primary/20 rounded-xl p-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
            AI Summary
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-normal">Auto-generated</span>
          </h3>
          
          <p className="text-foreground leading-relaxed mb-4">{summary.main}</p>
          
          {/* Quick Stats Pills */}
          <div className="flex flex-wrap gap-2">
            {summary.stats.map((stat, idx) => (
              <div 
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-lg text-xs"
              >
                <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{stat.label}:</span>
                <span className="font-semibold text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Critical Files Warning */}
          {summary.criticalFiles && summary.criticalFiles.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                <span>High-impact files (most dependencies)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {summary.criticalFiles.slice(0, 3).map((file, idx) => (
                  <code key={idx} className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 rounded">
                    {file}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function generateSummary(repo: Repository, insights: any, style: any) {
  const stats: { icon: any; label: string; value: string }[] = []
  const criticalFiles: string[] = []
  
  // Extract key metrics
  const fileCount = insights?.total_files || repo.file_count || 0
  const functionCount = style?.summary?.total_functions || insights?.total_functions || 0
  const languages = insights?.languages || style?.language_distribution || {}
  const primaryLang = Object.keys(languages)[0] || 'Unknown'
  const asyncAdoption = style?.summary?.async_adoption || null
  const typeHints = style?.summary?.type_hints_usage || null
  
  // Get naming convention
  const namingConventions = style?.naming_conventions?.functions || {}
  const primaryNaming = Object.entries(namingConventions)
    .sort((a: any, b: any) => parseFloat(b[1].percentage) - parseFloat(a[1].percentage))[0]
  const namingStyle = primaryNaming ? primaryNaming[0] : null

  // Get critical files
  if (insights?.most_critical_files) {
    insights.most_critical_files.slice(0, 3).forEach((f: any) => {
      criticalFiles.push(f.file.split('/').pop() || f.file)
    })
  }

  // Build stats array
  stats.push({ icon: FileCode, label: 'Files', value: fileCount.toLocaleString() })
  stats.push({ icon: Code2, label: 'Functions', value: functionCount.toLocaleString() })
  stats.push({ icon: GitBranch, label: 'Branch', value: repo.branch })
  
  if (asyncAdoption && asyncAdoption !== '0%') {
    stats.push({ icon: Code2, label: 'Async', value: asyncAdoption })
  }

  // Generate main summary text
  let main = `**${repo.name}** is a `
  
  if (functionCount > 500) main += 'large '
  else if (functionCount > 100) main += 'medium-sized '
  else main += 'compact '
  
  main += `${primaryLang} codebase with ${functionCount.toLocaleString()} functions across ${fileCount} files. `
  
  if (namingStyle) {
    main += `The code primarily uses ${namingStyle} naming conventions`
    if (primaryNaming && parseFloat((primaryNaming[1] as any).percentage) > 80) {
      main += ` (${(primaryNaming[1] as any).percentage} consistency)`
    }
    main += '. '
  }
  
  if (typeHints && typeHints !== '0%' && parseFloat(typeHints) > 50) {
    main += `Strong type coverage at ${typeHints}. `
  }
  
  if (criticalFiles.length > 0) {
    main += `Core architecture centers around ${criticalFiles[0]}.`
  }

  return { main, stats, criticalFiles }
}

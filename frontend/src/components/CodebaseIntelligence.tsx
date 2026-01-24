import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, FileCode, GitBranch, Folder, Search, 
  ArrowRight, AlertTriangle, CheckCircle2, Sparkles,
  Target, Layers, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDependencyGraph, useStyleAnalysis } from '../hooks/useCachedQuery'
import type { Repository } from '../types'

interface CodebaseIntelligenceProps {
  repo: Repository
  apiKey: string
  onTabChange?: (tab: string) => void
}

interface ArchitectureNode {
  path: string
  name: string
  type: 'file' | 'dir'
  annotation?: string
  dependents?: number
  children?: ArchitectureNode[]
}

export function CodebaseIntelligence({ repo, apiKey, onTabChange }: CodebaseIntelligenceProps) {
  const { data: deps, isLoading: depsLoading } = useDependencyGraph({ repoId: repo.id, apiKey })
  const { data: style, isLoading: styleLoading } = useStyleAnalysis({ repoId: repo.id, apiKey })

  const isLoading = depsLoading || styleLoading

  // Derive intelligence from raw data
  const intelligence = useMemo(() => {
    if (!deps?.metrics) return null

    const nodes = deps.nodes || []
    const edges = deps.edges || []

    // Calculate in-degree and out-degree from edges
    const inDegree: Record<string, number> = {}
    const outDegree: Record<string, number> = {}
    
    edges.forEach((e: any) => {
      inDegree[e.target] = (inDegree[e.target] || 0) + 1
      outDegree[e.source] = (outDegree[e.source] || 0) + 1
    })

    // Critical files: highest in-degree (most dependents)
    const criticalFiles = Object.entries(inDegree)
      .map(([file, dependents]) => ({ file, dependents }))
      .sort((a, b) => b.dependents - a.dependents)
      .slice(0, 5)

    // Entry points: imported by many, imports few (high in-degree, low out-degree)
    const entryPoints = nodes
      .map((n: any) => ({
        file: n.id,
        name: n.label,
        importedBy: inDegree[n.id] || 0,
        imports: outDegree[n.id] || 0,
        score: (inDegree[n.id] || 0) - (outDegree[n.id] || 0)
      }))
      .filter((n: any) => n.importedBy > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3)

    // Detect primary language
    const langCount: Record<string, number> = {}
    nodes.forEach((n: any) => {
      if (n.language && n.language !== 'unknown') {
        langCount[n.language] = (langCount[n.language] || 0) + 1
      }
    })
    const primaryLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'code'

    // Build simple architecture tree from file paths
    const dirs = new Map<string, { count: number, critical: boolean }>()
    nodes.forEach((n: any) => {
      const parts = n.id.split('/')
      if (parts.length > 1) {
        const dir = parts[0]
        const existing = dirs.get(dir) || { count: 0, critical: false }
        existing.count++
        if (criticalFiles.some((c: any) => c.file.startsWith(dir + '/'))) {
          existing.critical = true
        }
        dirs.set(dir, existing)
      }
    })

    // Find "start here" file - the most critical file that's also an entry point
    const startHere = criticalFiles[0]?.file || entryPoints[0]?.file || null

    // Generate smart summary
    const totalFiles = deps.total_files || nodes.length
    const totalFunctions = style?.summary?.total_functions || repo.file_count || 0
    
    let sizeDesc = 'compact'
    if (totalFunctions > 1000) sizeDesc = 'large'
    else if (totalFunctions > 200) sizeDesc = 'medium-sized'

    // Detect patterns
    const hasMiddleware = nodes.some((n: any) => 
      n.id.includes('middleware') || n.id.includes('plugin')
    )
    const hasHooks = nodes.some((n: any) => 
      n.id.includes('hooks') || n.id.includes('use')
    )

    return {
      summary: {
        size: sizeDesc,
        language: primaryLang,
        totalFiles,
        totalFunctions,
        pattern: hasMiddleware ? 'middleware/plugin architecture' : 
                 hasHooks ? 'hooks-based architecture' : null
      },
      entryPoints,
      criticalFiles: criticalFiles.slice(0, 3),
      startHere,
      architecture: Array.from(dirs.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
        .map(([dir, info]) => ({ 
          dir, 
          count: info.count, 
          critical: info.critical 
        })),
      health: {
        typeHints: style?.summary?.type_hints_usage || null,
        asyncAdoption: style?.summary?.async_adoption || null,
        namingConsistency: style?.naming_conventions?.functions ? 
          Object.values(style.naming_conventions.functions as Record<string, any>)
            .reduce((max: number, v: any) => Math.max(max, parseFloat(v.percentage) || 0), 0) : null
      }
    }
  }, [deps, style, repo])

  if (isLoading) {
    return <IntelligenceSkeleton />
  }

  if (!intelligence) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Hero: Codebase Intelligence */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-primary/10 to-violet-500/5 border border-primary/20 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              Codebase Intelligence
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-normal">
                AI-analyzed
              </span>
            </h3>
            
            <p className="text-foreground leading-relaxed mb-4">
              <strong>{repo.name}</strong> is a {intelligence.summary.size} {intelligence.summary.language} codebase 
              with <span className="text-primary font-semibold">{intelligence.summary.totalFunctions.toLocaleString()}</span> functions 
              across {intelligence.summary.totalFiles} files.
              {intelligence.summary.pattern && (
                <> Uses {intelligence.summary.pattern}.</>
              )}
              {intelligence.startHere && (
                <> Core logic centers around <code className="text-xs px-1.5 py-0.5 bg-primary/10 rounded">
                  {intelligence.startHere.split('/').pop()}
                </code>.</>
              )}
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {intelligence.startHere && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => onTabChange?.('search')}
                >
                  <Target className="w-3.5 h-3.5" />
                  Start Here: {intelligence.startHere.split('/').pop()}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => onTabChange?.('search')}
              >
                <Search className="w-3.5 h-3.5" />
                Search Code
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => onTabChange?.('dependencies')}
              >
                <Layers className="w-3.5 h-3.5" />
                View Architecture
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Critical Files */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            High-Impact Files
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Changes here affect the most code. Handle with care.
          </p>
          <div className="space-y-2">
            {intelligence.criticalFiles.map((file: any, idx: number) => (
              <div 
                key={file.file}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
                  <code className="text-xs text-foreground truncate">
                    {file.file}
                  </code>
                </div>
                <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded shrink-0">
                  {file.dependents} deps
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Architecture Overview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            Architecture
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Directory structure with file counts.
          </p>
          <div className="space-y-1.5">
            {intelligence.architecture.map((item: any) => (
              <div 
                key={item.dir}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <code className="text-xs text-foreground">{item.dir}/</code>
                  {item.critical && (
                    <span className="text-[10px] px-1 py-0.5 bg-primary/10 text-primary rounded">
                      core
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.count} files
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Health & Entry Points Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Entry Points */}
        {intelligence.entryPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              Entry Points
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Main API surface — most imported files.
            </p>
            <div className="space-y-2">
              {intelligence.entryPoints.map((entry: any) => (
                <div 
                  key={entry.file}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <code className="text-xs text-foreground truncate">
                    {entry.file}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    ← {entry.importedBy} imports
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Health Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Code Health
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <HealthIndicator 
              label="Type Coverage" 
              value={intelligence.health.typeHints}
              threshold={50}
            />
            <HealthIndicator 
              label="Async Adoption" 
              value={intelligence.health.asyncAdoption}
              threshold={20}
            />
            <HealthIndicator 
              label="Naming Consistency" 
              value={intelligence.health.namingConsistency ? `${Math.round(intelligence.health.namingConsistency)}%` : null}
              threshold={80}
            />
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Branch</p>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {repo.branch}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function HealthIndicator({ label, value, threshold }: { label: string, value: string | null, threshold: number }) {
  if (!value) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-muted-foreground">N/A</p>
      </div>
    )
  }

  const numValue = parseFloat(value)
  const isGood = numValue >= threshold

  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-semibold flex items-center gap-1 ${isGood ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
        {isGood && <CheckCircle2 className="w-3.5 h-3.5" />}
        {value}
      </p>
    </div>
  )
}

function IntelligenceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-violet-500/5 border border-primary/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-48 bg-primary/20 rounded animate-pulse" />
            <div className="h-4 w-full bg-primary/10 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-primary/10 rounded animate-pulse" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 w-32 bg-primary/10 rounded animate-pulse" />
              <div className="h-8 w-28 bg-primary/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 h-48 animate-pulse" />
        <div className="bg-card border border-border rounded-xl p-5 h-48 animate-pulse" />
      </div>
    </div>
  )
}

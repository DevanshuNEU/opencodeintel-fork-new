/**
 * UsagePage -- plan info, resource usage, and feature availability.
 *
 * Fetches from GET /users/usage. Shows tier, repo usage,
 * limits, and features. Premium design matching API Keys page.
 */

import { useAuth } from '@/contexts/AuthContext'
import { useUserUsage } from '@/hooks/useCachedQuery'
import {
  Package, FunctionSquare, Files, Zap, Search,
  Server, Sparkles, Lock, ArrowRight, TrendingUp, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TIER_STYLES: Record<string, { bg: string; text: string; accent: string; label: string }> = {
  enterprise: {
    bg: 'bg-amber-500/8 border-amber-500/15',
    text: 'text-amber-400',
    accent: 'bg-amber-400',
    label: 'Enterprise',
  },
  pro: {
    bg: 'bg-indigo-500/8 border-indigo-500/15',
    text: 'text-indigo-400',
    accent: 'bg-indigo-400',
    label: 'Pro',
  },
  free: {
    bg: 'bg-zinc-500/8 border-zinc-500/15',
    text: 'text-zinc-400',
    accent: 'bg-zinc-500',
    label: 'Free',
  },
}

export function UsagePage() {
  const { session } = useAuth()
  const { data: usage, isLoading } = useUserUsage(session?.access_token, session?.user?.id)

  if (isLoading) return <UsageSkeleton />
  if (!usage) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Failed to load usage data.
      </div>
    )
  }

  const tier = usage.tier || 'free'
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.free
  const repos = usage.repositories || { current: 0, limit: 3 }
  const limits = usage.limits || { max_files_per_repo: 500, max_functions_per_repo: 2000 }
  const features = usage.features || { priority_indexing: false, mcp_access: true }
  const isFree = tier === 'free'
  const repoPct = repos.limit ? (repos.current / repos.limit) * 100 : 0

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Usage
            </h1>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] uppercase tracking-wider font-medium border',
                tierStyle.bg, tierStyle.text
              )}
            >
              {tierStyle.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Plan details, resource limits, and feature availability.
          </p>
        </div>
        {isFree && (
          <Button
            size="sm"
            className="h-9"
            onClick={() => window.open('https://opencodeintel.com/#pricing', '_blank')}
          >
            Upgrade
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Upgrade banner for free tier */}
      {isFree && (
        <div className="rounded-lg border border-indigo-500/15 bg-indigo-500/5 px-5 py-4">
          <p className="text-sm font-medium text-foreground">
            Unlock higher limits and priority indexing
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Pro gives you 5 repos, 100K functions per repo, Cohere reranking, and priority indexing.
          </p>
        </div>
      )}

      {/* Resource usage cards */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">
          Resources
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Repositories */}
          <div className="rounded-lg border border-border/60 bg-card/40 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                Repositories
              </div>
              <span className="text-xs tabular-nums text-muted-foreground/60">
                {repos.current} / {repos.limit ?? '---'}
              </span>
            </div>
            <div className="text-2xl font-semibold tabular-nums text-foreground mb-2">
              {repos.current}
            </div>
            {repos.limit && (
              <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    repoPct > 90 ? 'bg-red-500' : repoPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${repoPct > 0 ? Math.max(repoPct, 4) : 0}%` }}
                />
              </div>
            )}
          </div>

          {/* Files per repo */}
          <div className="rounded-lg border border-border/60 bg-card/40 px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Files className="w-4 h-4" />
              Files per repo
            </div>
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {limits.max_files_per_repo.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-1">maximum</p>
          </div>

          {/* Functions per repo */}
          <div className="rounded-lg border border-border/60 bg-card/40 px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <FunctionSquare className="w-4 h-4" />
              Functions per repo
            </div>
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {limits.max_functions_per_repo.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-1">maximum</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">
          Features
        </p>
        <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
          <div className="divide-y divide-border/40">
            <FeatureRow
              icon={<Search className="w-4 h-4" />}
              label="Semantic Code Search"
              description="Find code by meaning, not just keywords"
              enabled
            />
            <FeatureRow
              icon={<Sparkles className="w-4 h-4" />}
              label="Codebase DNA"
              description="Extract architectural patterns and conventions"
              enabled
            />
            <FeatureRow
              icon={<Server className="w-4 h-4" />}
              label="MCP Server Access"
              description="Connect Claude Desktop, Claude Code, and Cursor"
              enabled={features.mcp_access}
            />
            <FeatureRow
              icon={<Zap className="w-4 h-4" />}
              label="Priority Indexing"
              description="Skip the queue on indexing and re-indexing"
              enabled={features.priority_indexing}
            />
          </div>
        </div>
      </div>

      {/* Cost tracking placeholder */}
      <div className="rounded-lg border border-dashed border-border/40 bg-card/20 px-5 py-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">API Cost Tracking</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            Token usage, cost breakdown by model, and monthly spend tracking -- coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}


function FeatureRow({
  icon,
  label,
  description,
  enabled,
}: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-3.5',
      !enabled && 'opacity-40',
    )}>
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        enabled
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/50 text-muted-foreground'
      )}>
        {enabled ? icon : <Lock className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">{description}</p>
      </div>
      {enabled ? (
        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <Badge
          variant="outline"
          className="text-[10px] uppercase tracking-wider border-indigo-500/15 bg-indigo-500/8 text-indigo-400 shrink-0"
        >
          Pro
        </Badge>
      )}
    </div>
  )
}


function UsageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted/50 animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted/30 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-lg bg-muted/20 animate-pulse" />
        ))}
      </div>
      <div className="h-52 rounded-lg bg-muted/20 animate-pulse" />
    </div>
  )
}

/**
 * UsagePage -- plan info, resource usage, and feature availability.
 *
 * Fetches from GET /users/usage. Shows tier, repo usage,
 * limits, and features in a compact two-column layout.
 */

import { useAuth } from '@/contexts/AuthContext'
import { useUserUsage } from '@/hooks/useCachedQuery'
import {
  BarChart3, Package, FunctionSquare, Files, Zap, Search,
  Server, Sparkles, Lock, ArrowRight, TrendingUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const TIER_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary border-primary/20',
  enterprise: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
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
  const repos = usage.repositories || { current: 0, limit: 3 }
  const limits = usage.limits || { max_files_per_repo: 500, max_functions_per_repo: 2000 }
  const features = usage.features || { priority_indexing: false, mcp_access: true }
  const isFree = tier === 'free'

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Usage</h1>
            <Badge variant="outline" className={cn('capitalize', TIER_COLORS[tier])}>
              {tier}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Plan details and resource limits</p>
        </div>
      </div>

      {/* Upgrade CTA for free users */}
      {isFree && (
        <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Unlock higher limits and priority indexing</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pro: 20 repos, 20K functions/repo, Cohere reranking
            </p>
          </div>
          <Button size="sm" className="ml-4 shrink-0">
            Upgrade to Pro
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Two-column: Usage + Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Resource Usage */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Resource Limits</p>
            <UsageRow
              icon={<Package className="w-4 h-4" />}
              label="Repositories"
              value={`${repos.current} / ${repos.limit ?? 'unlimited'}`}
              pct={repos.limit ? (repos.current / repos.limit) * 100 : 0}
              showBar
            />
            <UsageRow
              icon={<Files className="w-4 h-4" />}
              label="Files / repo"
              value={`up to ${limits.max_files_per_repo.toLocaleString()}`}
            />
            <UsageRow
              icon={<FunctionSquare className="w-4 h-4" />}
              label="Functions / repo"
              value={`up to ${limits.max_functions_per_repo.toLocaleString()}`}
            />
          </CardContent>
        </Card>

        {/* Right: Features */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Features</p>
            <FeatureRow icon={<Search className="w-4 h-4" />} label="Semantic Code Search" enabled />
            <FeatureRow icon={<Sparkles className="w-4 h-4" />} label="Codebase DNA" enabled />
            <FeatureRow icon={<Server className="w-4 h-4" />} label="MCP Server Access" enabled={features.mcp_access} />
            <FeatureRow icon={<Zap className="w-4 h-4" />} label="Priority Indexing" enabled={features.priority_indexing} />
          </CardContent>
        </Card>
      </div>

      {/* Cost tracking placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-5 flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">API Cost Tracking</p>
            <p className="text-xs text-muted-foreground">
              Token usage, cost breakdown by model, and monthly spend tracking -- coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


function UsageRow({
  icon,
  label,
  value,
  pct,
  showBar,
}: {
  icon: React.ReactNode
  label: string
  value: string
  pct?: number
  showBar?: boolean
}) {
  const barColor = (pct ?? 0) > 90 ? 'bg-destructive' : (pct ?? 0) > 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </div>
        <span className="tabular-nums text-muted-foreground">{value}</span>
      </div>
      {showBar && pct !== undefined && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      )}
    </div>
  )
}


function FeatureRow({
  icon,
  label,
  enabled,
}: {
  icon: React.ReactNode
  label: string
  enabled: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 text-sm py-1',
      enabled ? 'text-foreground' : 'text-muted-foreground opacity-50',
    )}>
      <span className={enabled ? 'text-primary' : ''}>
        {enabled ? icon : <Lock className="w-4 h-4" />}
      </span>
      <span className="flex-1">{label}</span>
      {!enabled && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pro</Badge>
      )}
    </div>
  )
}


function UsageSkeleton() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  )
}

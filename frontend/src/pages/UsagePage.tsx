/**
 * UsagePage -- plan info, resource usage, and feature availability.
 *
 * Fetches from GET /users/usage. Shows tier, repo usage bars,
 * function/file limits, and which features are available on the
 * user's current plan.
 */

import { useAuth } from '@/contexts/AuthContext'
import { useUserUsage } from '@/hooks/useCachedQuery'
import { BarChart3, Package, FunctionSquare, Files, Zap, Search, Server, Sparkles, Lock, ArrowRight, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-sm text-muted-foreground">Plan details and resource limits</p>
        </div>
      </div>

      <PlanCard tier={tier} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resource Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageBar
            icon={<Package className="w-4 h-4" />}
            label="Repositories"
            current={repos.current}
            limit={repos.limit}
          />
          <Separator />
          <UsageBar
            icon={<Files className="w-4 h-4" />}
            label="Files per repository"
            current={null}
            limit={limits.max_files_per_repo}
          />
          <Separator />
          <UsageBar
            icon={<FunctionSquare className="w-4 h-4" />}
            label="Functions per repository"
            current={null}
            limit={limits.max_functions_per_repo}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureItem icon={<Search className="w-4 h-4" />} label="Semantic Code Search" enabled />
            <FeatureItem icon={<Sparkles className="w-4 h-4" />} label="Codebase DNA" enabled />
            <FeatureItem icon={<Server className="w-4 h-4" />} label="MCP Server Access" enabled={features.mcp_access} />
            <FeatureItem icon={<Zap className="w-4 h-4" />} label="Priority Indexing" enabled={features.priority_indexing} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">API Cost Tracking</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Token usage, cost breakdown by model (OpenAI, Voyage, Cohere),
                and monthly spend tracking -- coming soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


function PlanCard({ tier }: { tier: string }) {
  const isFree = tier === 'free'

  return (
    <Card className={isFree ? 'border-primary/20' : ''}>
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Current plan</span>
            <Badge
              variant="outline"
              className={cn('capitalize text-sm px-3 py-1', TIER_COLORS[tier])}
            >
              {tier}
            </Badge>
          </div>
          {!isFree && (
            <span className="text-xs text-muted-foreground">Active</span>
          )}
        </div>
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
      </CardContent>
    </Card>
  )
}


function UsageBar({
  icon,
  label,
  current,
  limit,
}: {
  icon: React.ReactNode
  label: string
  current: number | null
  limit: number | null
}) {
  const hasBar = current !== null && limit !== null && limit > 0
  const pct = hasBar ? Math.min((current / limit!) * 100, 100) : 0
  const barColor = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {current !== null ? `${current.toLocaleString()} / ` : 'up to '}
          {limit !== null ? limit.toLocaleString() : 'unlimited'}
        </span>
      </div>
      {hasBar && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      )}
    </div>
  )
}


function FeatureItem({
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
      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
      enabled
        ? 'border-border text-foreground'
        : 'border-border/50 text-muted-foreground opacity-60',
    )}>
      <span className={enabled ? 'text-primary' : 'text-muted-foreground'}>
        {enabled ? icon : <Lock className="w-4 h-4" />}
      </span>
      {label}
      {!enabled && (
        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">Pro</Badge>
      )}
    </div>
  )
}


function UsageSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

/**
 * AdminPage -- user management and tier control for platform admins.
 *
 * Lists all users with their tier, repo count, and last sign-in.
 * Admins can change any user's tier with one click.
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, Users, ArrowUpCircle, ArrowDownCircle, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { API_URL } from '@/config/api'
import { cn } from '@/lib/utils'

interface AdminUser {
  id: string
  email: string
  tier: string
  repo_count: number
  created_at: string | null
  last_sign_in: string | null
}

const TIERS = ['free', 'pro', 'enterprise'] as const

const TIER_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary border-primary/20',
  enterprise: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

export function AdminPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${session?.access_token}` }

  const { data, isLoading: loading, error: queryError, refetch } = useQuery<{ users: AdminUser[] }>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const resp = await fetch(`${API_URL}/admin/users`, { headers })
      if (resp.status === 403) {
        throw new Error('Admin access required. Your email is not in the ADMIN_EMAILS list.')
      }
      if (!resp.ok) throw new Error('Failed to fetch users')
      return resp.json()
    },
    enabled: !!session?.access_token,
  })

  const users = data?.users ?? []
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load users' : null

  async function changeTier(userId: string, email: string, newTier: string) {
    setUpdating(userId)
    try {
      const resp = await fetch(`${API_URL}/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to update tier')
      }
      await resp.json()
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success(`Updated ${email} to ${newTier}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUpdating(null)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Shield className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-muted-foreground">User management and tier control</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{users.length} users</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Tier</th>
                <th className="text-center px-4 py-3 font-medium">Repos</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  updating={updating === user.id}
                  onChangeTier={(tier) => changeTier(user.id, user.email, tier)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


function UserRow({
  user,
  updating,
  onChangeTier,
}: {
  user: AdminUser
  updating: boolean
  onChangeTier: (tier: string) => void
}) {
  const currentIdx = TIERS.indexOf(user.tier as typeof TIERS[number])
  const canUpgrade = currentIdx < TIERS.length - 1
  const canDowngrade = currentIdx > 0

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : '--'

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <span className="font-medium">{user.email}</span>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={cn('capitalize', TIER_COLORS[user.tier])}>
          {user.tier}
        </Badge>
      </td>
      <td className="px-4 py-3 text-center">{user.repo_count}</td>
      <td className="px-4 py-3 text-muted-foreground">{joinDate}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {updating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canUpgrade}
                onClick={() => onChangeTier(TIERS[currentIdx + 1])}
                className="h-7 px-2 text-xs"
              >
                <ArrowUpCircle className="w-3.5 h-3.5 mr-1" />
                Upgrade
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canDowngrade}
                onClick={() => onChangeTier(TIERS[currentIdx - 1])}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <ArrowDownCircle className="w-3.5 h-3.5 mr-1" />
                Downgrade
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

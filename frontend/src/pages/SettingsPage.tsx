import { useEffect, useState } from 'react'
import { User, Github, FolderGit2, AlertTriangle, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGitHubRepos } from '@/hooks/useGitHubRepos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { API_URL } from '@/config/api'

interface Repository {
  id: string
  name: string
}

const MAX_REPOS = 3

export function SettingsPage() {
  const { user, session, signOut } = useAuth()
  const { status, checkStatus, disconnect, loading: githubLoading } = useGitHubRepos()

  const [repos, setRepos] = useState<Repository[]>([])
  const [reposLoading, setReposLoading] = useState(true)
  const [disconnectLoading, setDisconnectLoading] = useState(false)
  const [deleteReposDialog, setDeleteReposDialog] = useState(false)
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false)
  const [deleteReposLoading, setDeleteReposLoading] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)

  useEffect(() => {
    checkStatus()
    fetchRepos()
  }, [])

  const fetchRepos = async () => {
    if (!session?.access_token) return
    try {
      const response = await fetch(`${API_URL}/repos`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await response.json()
      setRepos(data.repositories || [])
    } catch (error) {
      console.error('Failed to fetch repos:', error)
    } finally {
      setReposLoading(false)
    }
  }

  const handleDisconnectGitHub = async () => {
    setDisconnectLoading(true)
    const success = await disconnect()
    setDisconnectLoading(false)
    if (success) {
      toast.success('GitHub disconnected successfully')
    } else {
      toast.error('Failed to disconnect GitHub')
    }
  }

  const handleDeleteAllRepos = async () => {
    setDeleteReposLoading(true)
    try {
      for (const repo of repos) {
        await fetch(`${API_URL}/repos/${repo.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
      }
      setRepos([])
      setDeleteReposDialog(false)
      toast.success('All repositories deleted')
    } catch (error) {
      toast.error('Failed to delete repositories')
    } finally {
      setDeleteReposLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true)
    try {
      toast.info('Account deletion coming soon. Signing you out for now.')
      await signOut()
    } catch (error) {
      toast.error('Failed to delete account')
    } finally {
      setDeleteAccountLoading(false)
      setDeleteAccountDialog(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and connections</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email || 'Not set'}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">{formatDate(user?.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Connections Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Github className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Connections</CardTitle>
              <CardDescription>Manage connected accounts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Github className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">GitHub</p>
                {githubLoading ? (
                  <Skeleton className="mt-1 h-4 w-32" />
                ) : status?.connected ? (
                  <p className="text-sm text-muted-foreground">
                    Connected as <span className="text-foreground">@{status.username}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>

            {githubLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : status?.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectGitHub}
                disabled={disconnectLoading}
              >
                {disconnectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disconnect'}
              </Button>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                Use dashboard import
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Repositories Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderGit2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Repositories</CardTitle>
              <CardDescription>Your indexed repository slots</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Repository slots</p>
              <p className="text-sm text-muted-foreground">Free tier limit</p>
            </div>
            <div className="text-right">
              {reposLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {repos.length}
                    <span className="text-lg font-normal text-muted-foreground"> / {MAX_REPOS}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {MAX_REPOS - repos.length} slot{MAX_REPOS - repos.length !== 1 ? 's' : ''} available
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">Danger Zone</AlertTitle>
        <AlertDescription className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delete all repositories</p>
              <p className="text-sm text-muted-foreground">Remove all indexed repos and their data</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setDeleteReposDialog(true)}
              disabled={repos.length === 0 || reposLoading}
            >
              Delete All
            </Button>
          </div>
          <Separator className="bg-destructive/20" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delete account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setDeleteAccountDialog(true)}
            >
              Delete Account
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Delete Repos Dialog */}
      <Dialog open={deleteReposDialog} onOpenChange={setDeleteReposDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all repositories?</DialogTitle>
            <DialogDescription>
              This will permanently delete {repos.length} repositor{repos.length === 1 ? 'y' : 'ies'} and
              all indexed data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteReposDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllRepos} disabled={deleteReposLoading}>
              {deleteReposLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete All Repositories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountDialog} onOpenChange={setDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all repositories, and all associated data. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteAccountLoading}>
              {deleteAccountLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

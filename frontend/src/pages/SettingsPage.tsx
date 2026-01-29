import { useEffect, useState } from 'react'
import { User, Github, FolderGit2, AlertTriangle, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGitHubRepos } from '@/hooks/useGitHubRepos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
const DELETE_CONFIRMATION_TEXT = 'delete all'

export function SettingsPage() {
  const { user, session } = useAuth()
  const { status, checkStatus, disconnect, loading: githubLoading } = useGitHubRepos()

  const [repos, setRepos] = useState<Repository[]>([])
  const [reposLoading, setReposLoading] = useState(true)
  const [disconnectLoading, setDisconnectLoading] = useState(false)
  const [deleteReposDialog, setDeleteReposDialog] = useState(false)
  const [deleteReposLoading, setDeleteReposLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  useEffect(() => {
    checkStatus()
    fetchRepos()
  }, [checkStatus, session?.access_token])

  const fetchRepos = async () => {
    if (!session?.access_token) {
      setReposLoading(false)
      return
    }
    setReposLoading(true)
    try {
      const response = await fetch(`${API_URL}/repos`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('Failed to fetch repos:', response.status, errorBody)
        return
      }

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
    if (deleteConfirmation !== DELETE_CONFIRMATION_TEXT) return

    setDeleteReposLoading(true)
    const failedRepos: string[] = []

    try {
      for (const repo of repos) {
        const response = await fetch(`${API_URL}/repos/${repo.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })

        if (!response.ok) {
          failedRepos.push(repo.name)
        }
      }

      if (failedRepos.length > 0) {
        // Partial failure - refetch to get accurate state
        await fetchRepos()
        toast.error(`Failed to delete ${failedRepos.length} repo(s): ${failedRepos.join(', ')}`)
      } else {
        // All succeeded
        setRepos([])
        setDeleteReposDialog(false)
        setDeleteConfirmation('')
        toast.success('All repositories deleted')
      }
    } catch (error) {
      // Network or unexpected error - refetch to reconcile state
      await fetchRepos()
      toast.error('Failed to delete repositories')
    } finally {
      setDeleteReposLoading(false)
    }
  }

  const handleCloseDeleteDialog = () => {
    setDeleteReposDialog(false)
    setDeleteConfirmation('')
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const isDeleteEnabled = deleteConfirmation === DELETE_CONFIRMATION_TEXT
  const availableSlots = Math.max(0, MAX_REPOS - repos.length)

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
                    {availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
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
        <AlertDescription className="mt-4">
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
        </AlertDescription>
      </Alert>

      {/* Delete Repos Dialog with typing confirmation */}
      <Dialog open={deleteReposDialog} onOpenChange={handleCloseDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all repositories?</DialogTitle>
            <DialogDescription>
              This will permanently delete {repos.length} repositor{repos.length === 1 ? 'y' : 'ies'} and
              all indexed data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="delete-confirmation">
              To confirm, type <span className="font-mono font-semibold text-destructive">{DELETE_CONFIRMATION_TEXT}</span> below:
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={DELETE_CONFIRMATION_TEXT}
              className="font-mono"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllRepos}
              disabled={!isDeleteEnabled || deleteReposLoading}
            >
              {deleteReposLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete All Repositories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

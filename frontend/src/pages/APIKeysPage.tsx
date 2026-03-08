import { useState } from 'react'
import { KeyRound, Plus, Copy, Check, Loader2, Trash2, Clock } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { API_URL } from '@/config/api'

interface APIKey {
  id: string
  name: string
  tier: string
  active: boolean
  created_at: string
  last_used_at: string | null
  key_preview: string
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function TierBadge({ tier }: { tier: string }) {
  const variants: Record<string, string> = {
    enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    pro: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    free: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  }
  return (
    <Badge variant="outline" className={variants[tier] || variants.free}>
      {tier}
    </Badge>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      <span className={`text-xs ${active ? 'text-emerald-400' : 'text-zinc-500'}`}>
        {active ? 'Active' : 'Revoked'}
      </span>
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy. Try selecting the text manually.')
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </Button>
  )
}

function getConfigPaths(): { label: string; path: string }[] {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) {
    return [
      { label: 'Windows', path: '%APPDATA%\\Claude\\claude_desktop_config.json' },
    ]
  }
  if (ua.includes('linux')) {
    return [
      { label: 'Linux', path: '~/.config/Claude/claude_desktop_config.json' },
    ]
  }
  return [
    { label: 'macOS', path: '~/Library/Application Support/Claude/claude_desktop_config.json' },
  ]
}

async function fetchKeys(token: string): Promise<APIKey[]> {
  const res = await fetch(`${API_URL}/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to load keys')
  const data = await res.json()
  return data.keys || []
}

export function APIKeysPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<APIKey | null>(null)

  const token = session?.access_token || ''

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => fetchKeys(token),
    enabled: !!token,
  })

  const handleGenerate = async () => {
    if (!token || !keyName.trim()) return
    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/keys/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: keyName.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to generate key')
      }
      const data = await res.json()
      setGeneratedKey(data.api_key)
      setKeyName('')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (key: APIKey) => {
    if (!token) return
    setRevoking(key.id)
    setRevokeConfirm(null)
    try {
      const res = await fetch(`${API_URL}/keys/${key.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to revoke key')
      toast.success('API key revoked')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    } catch {
      toast.error('Failed to revoke key')
    } finally {
      setRevoking(null)
    }
  }

  const closeGenerateDialog = () => {
    setGenerateOpen(false)
    setGeneratedKey(null)
    setKeyName('')
  }

  const activeKeys = keys.filter((k) => k.active)
  const configPaths = getConfigPaths()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading API keys...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
            <p className="text-sm text-muted-foreground">
              Manage keys for MCP, Claude Desktop, and API access
            </p>
          </div>
        </div>
        <Button onClick={() => setGenerateOpen(true)} disabled={activeKeys.length >= 5}>
          <Plus className="w-4 h-4 mr-2" />
          Create Key
        </Button>
      </div>

      {/* Key list */}
      {keys.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No API keys yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Generate a key to connect Claude Desktop, Claude Code, Cursor, or any MCP client to
              your indexed repositories.
            </p>
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
              {activeKeys.length >= 5 && (
                <span className="text-xs font-normal text-muted-foreground ml-2">(limit reached)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between px-6 py-4 ${
                    !key.active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-foreground truncate">{key.name}</span>
                        <TierBadge tier={key.tier} />
                        <StatusDot active={key.active} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                          {key.key_preview}
                        </code>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {key.last_used_at ? `Used ${timeAgo(key.last_used_at)}` : 'Never used'}
                        </span>
                        <span>Created {timeAgo(key.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {key.active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeConfirm(key)}
                      disabled={revoking === key.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {revoking === key.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick setup hint */}
      {activeKeys.length > 0 && (
        <Card className="bg-muted/30 border-muted">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Quick setup:</span>{' '}
              Copy your key and add it to your Claude Desktop config at{' '}
              {configPaths.map((cp) => (
                <span key={cp.label}>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{cp.path}</code>
                </span>
              ))}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={closeGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          {generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Key Created</DialogTitle>
                <DialogDescription>
                  Copy this key now. It will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                  <code className="flex-1 text-sm font-mono break-all text-foreground select-all">
                    {generatedKey}
                  </code>
                  <CopyButton text={generatedKey} />
                </div>
                <p className="text-xs text-amber-400">
                  Store this key securely. You will not be able to see it again.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeGenerateDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Name your key so you can identify it later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="key-name">Key name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Claude Desktop, CI/CD, Development"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeGenerateDialog}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={!keyName.trim() || generating}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Generate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeConfirm} onOpenChange={() => setRevokeConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke <span className="font-medium text-foreground">{revokeConfirm?.name}</span>?
              Any applications using this key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeConfirm && handleRevoke(revokeConfirm)}
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

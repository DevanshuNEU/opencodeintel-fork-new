import { useState } from 'react'
import { Plus, Copy, Check, Loader2, X, Clock, Shield, Terminal, Zap } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'

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
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TIER_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  enterprise: { bg: 'bg-amber-500/8 border-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  pro: { bg: 'bg-indigo-500/8 border-indigo-500/15', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  free: { bg: 'bg-zinc-500/8 border-zinc-500/15', text: 'text-zinc-400', dot: 'bg-zinc-500' },
}

async function fetchKeys(token: string): Promise<APIKey[]> {
  const res = await fetch(`${API_URL}/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to load keys')
  const data = await res.json()
  return data.keys || []
}

function CopyInline({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(label ? `${label} copied` : 'Copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function KeyCard({
  apiKey,
  onRevoke,
  revoking,
}: {
  apiKey: APIKey
  onRevoke: (key: APIKey) => void
  revoking: boolean
}) {
  const tier = TIER_STYLES[apiKey.tier] || TIER_STYLES.free
  const isRevoked = !apiKey.active

  return (
    <div
      className={cn(
        'group relative rounded-lg border transition-all duration-200',
        isRevoked
          ? 'border-border/50 bg-card/30 opacity-60'
          : 'border-border/80 bg-card/60 hover:border-border hover:bg-card/80'
      )}
    >
      <div className="px-5 py-4">
        {/* Top row: name + tier + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-medium text-[15px] text-foreground truncate">
              {apiKey.name}
            </span>
            <Badge
              variant="outline"
              className={cn('text-[10px] uppercase tracking-wider font-medium border', tier.bg, tier.text)}
            >
              {apiKey.tier}
            </Badge>
            {isRevoked && (
              <span className="text-[10px] uppercase tracking-wider text-destructive/70 font-medium">
                Revoked
              </span>
            )}
          </div>

          {apiKey.active && (
            <button
              onClick={() => onRevoke(apiKey)}
              disabled={revoking}
              className={cn(
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'text-xs text-muted-foreground hover:text-destructive',
                'px-2 py-1 rounded hover:bg-destructive/10',
                revoking && 'opacity-100'
              )}
            >
              {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Revoke'}
            </button>
          )}
        </div>

        {/* Key preview */}
        <div className="flex items-center gap-2 mb-3">
          <code className="text-[13px] font-mono text-muted-foreground tracking-wide select-all">
            {apiKey.key_preview}
          </code>
          <CopyInline text={apiKey.key_preview} label="Key preview" />
        </div>

        {/* Bottom metadata */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Created {timeAgo(apiKey.created_at)}
          </span>
          {apiKey.last_used_at && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Last used {timeAgo(apiKey.last_used_at)}
            </span>
          )}
          {!apiKey.last_used_at && apiKey.active && (
            <span className="italic">Not yet used</span>
          )}
        </div>
      </div>

      {/* Active indicator line */}
      {apiKey.active && (
        <div className={cn('absolute left-0 top-3 bottom-3 w-[2px] rounded-full', tier.dot)} />
      )}
    </div>
  )
}

function ConnectGuide() {
  const [tab, setTab] = useState<'desktop' | 'code' | 'cursor'>('desktop')

  const snippets: Record<string, { label: string; config: string }> = {
    desktop: {
      label: 'Claude Desktop',
      config: `{
  "mcpServers": {
    "codeintel": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.opencodeintel.com/mcp"],
      "env": {
        "API_KEY": "ci_your-key-here"
      }
    }
  }
}`,
    },
    code: {
      label: 'Claude Code',
      config: `claude mcp add codeintel \\
  --transport http \\
  https://mcp.opencodeintel.com/mcp`,
    },
    cursor: {
      label: 'Cursor',
      config: `{
  "mcpServers": {
    "codeintel": {
      "url": "https://mcp.opencodeintel.com/mcp"
    }
  }
}`,
    },
  }

  const current = snippets[tab]

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Connect to your tools</span>
        <div className="flex gap-1">
          {Object.entries(snippets).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md transition-all',
                tab === key
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <pre className="px-5 py-4 text-[12px] font-mono text-muted-foreground leading-relaxed overflow-x-auto">
          {current.config}
        </pre>
        <div className="absolute top-3 right-3">
          <CopyInline text={current.config} label="Config" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Visual element */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
          <Shield className="w-7 h-7 text-primary/70" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Terminal className="w-3 h-3 text-emerald-400" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        Connect your AI tools
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6 leading-relaxed">
        Generate an API key to connect Claude Desktop, Claude Code, Cursor,
        or any MCP-compatible client to your indexed repositories.
      </p>

      <Button onClick={onCreate} className="h-9 px-4">
        <Plus className="w-4 h-4 mr-2" />
        Create your first key
      </Button>

      {/* Feature hints */}
      <div className="flex items-center gap-6 mt-8 text-[11px] text-muted-foreground/60">
        <span className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-emerald-400/60" />
          Semantic search
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-indigo-400/60" />
          Codebase DNA
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-amber-400/60" />
          Impact analysis
        </span>
      </div>
    </div>
  )
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
      toast.success(`"${key.name}" revoked`)
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted/50 animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted/30 animate-pulse" />
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authenticate MCP clients, Claude Desktop, and programmatic access.
          </p>
        </div>
        {keys.length > 0 && (
          <Button
            onClick={() => setGenerateOpen(true)}
            disabled={activeKeys.length >= 5}
            className="h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New key
            {activeKeys.length >= 5 && (
              <span className="ml-1.5 text-[10px] opacity-60">(max 5)</span>
            )}
          </Button>
        )}
      </div>

      {/* Key list or empty state */}
      {keys.length === 0 ? (
        <EmptyState onCreate={() => setGenerateOpen(true)} />
      ) : (
        <div className="space-y-2.5">
          {keys.map((key) => (
            <KeyCard
              key={key.id}
              apiKey={key}
              onRevoke={setRevokeConfirm}
              revoking={revoking === key.id}
            />
          ))}

          {/* Usage count */}
          <p className="text-[11px] text-muted-foreground/50 pt-1">
            {activeKeys.length} of 5 keys active
          </p>
        </div>
      )}

      {/* Connect guide */}
      {activeKeys.length > 0 && <ConnectGuide />}

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={closeGenerateDialog}>
        <DialogContent className="sm:max-w-lg border-border/60">
          {generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Key created</DialogTitle>
                <DialogDescription>
                  This is the only time this key will be shown. Copy it now.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="relative rounded-lg bg-zinc-950 border border-border/60 p-4">
                  <code className="block text-sm font-mono text-emerald-400 break-all leading-relaxed select-all pr-8">
                    {generatedKey}
                  </code>
                  <div className="absolute top-3 right-3">
                    <CopyInline text={generatedKey} label="API key" />
                  </div>
                </div>
                <div className="flex items-start gap-2 px-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400/80 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/70 leading-relaxed">
                    Store this key securely. It cannot be retrieved after you close this dialog.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeGenerateDialog} className="w-full sm:w-auto">Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Create API key</DialogTitle>
                <DialogDescription>
                  Give your key a name to identify where it's used.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Input
                  placeholder="e.g. Claude Desktop, Development, CI/CD"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && keyName.trim() && handleGenerate()}
                  className="h-10 bg-background/50"
                  autoFocus
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={closeGenerateDialog}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={!keyName.trim() || generating}>
                  {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Generate key
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={!!revokeConfirm} onOpenChange={() => setRevokeConfirm(null)}>
        <DialogContent className="sm:max-w-sm border-border/60">
          <DialogHeader>
            <DialogTitle>Revoke key</DialogTitle>
            <DialogDescription className="leading-relaxed">
              <span className="font-medium text-foreground">{revokeConfirm?.name}</span> will stop
              working immediately. Any applications using it will lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRevokeConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeConfirm && handleRevoke(revokeConfirm)}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

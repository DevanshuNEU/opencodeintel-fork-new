import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Discriminated union: if isOpen is provided, onOpenChange is required
type UncontrolledProps = {
  isOpen?: undefined
  onOpenChange?: undefined
}

type ControlledProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

type AddRepoFormProps = {
  onAdd: (gitUrl: string, branch: string) => Promise<void>
  loading: boolean
} & (UncontrolledProps | ControlledProps)

export function AddRepoForm({ onAdd, loading, isOpen, onOpenChange }: AddRepoFormProps) {
  const [gitUrl, setGitUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = isOpen !== undefined
  const showForm = isControlled ? isOpen : internalOpen
  const setShowForm = isControlled ? onOpenChange : setInternalOpen

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gitUrl) return
    await onAdd(gitUrl, branch)
    setGitUrl('')
    setBranch('main')
    setShowForm(false)
  }

  return (
    <>
      {/* Only show trigger button in uncontrolled mode */}
      {!isControlled && (
        <Button
          onClick={() => setShowForm(true)}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </Button>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50"
            onClick={() => !loading && setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Add Repository</h3>
                    <p className="text-sm text-muted-foreground">Clone and index with AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="gitUrl">Git URL</Label>
                  <Input
                    id="gitUrl"
                    type="url"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">Repository will be cloned and automatically indexed</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowForm(false); setGitUrl(''); setBranch('main') }}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add & Index
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

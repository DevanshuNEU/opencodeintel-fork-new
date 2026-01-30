import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, Rocket, AlertTriangle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface UpgradeLimitModalProps {
  isOpen: boolean
  onClose: () => void
  errorMessage: string
  repoName?: string
}

export function UpgradeLimitModal({ isOpen, onClose, errorMessage, repoName }: UpgradeLimitModalProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail || sending) return

    setSending(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/v1/feedback/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: 'pro' }),
      })
      if (!response.ok) throw new Error('Failed to submit')
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      onClose()
      setEmail('')
      setError('')
      setSent(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header with warning */}
            <div className="relative p-6 pb-4 border-b border-border bg-gradient-to-br from-amber-500/10 to-transparent">
              <button
                onClick={handleClose}
                disabled={sending}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {repoName ? `Can't import ${repoName}` : 'Repository Limit Reached'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Limit comparison */}
            <div className="p-6 border-b border-border">
              <p className="text-sm font-medium text-foreground mb-3">Plan Comparison</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Free (Current)</p>
                  <p className="text-sm font-medium text-foreground">2,000 functions</p>
                  <p className="text-xs text-muted-foreground">500 files per repo</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                  <p className="text-xs text-accent mb-1">Pro</p>
                  <p className="text-sm font-medium text-foreground">20,000 functions</p>
                  <p className="text-xs text-muted-foreground">5,000 files per repo</p>
                </div>
              </div>
            </div>

            {/* Waitlist form */}
            <div className="p-6">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-4 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">You're on the list!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We'll notify you when Pro is available
                  </p>
                  <Button onClick={handleClose} variant="outline" className="mt-4">
                    Got it
                  </Button>
                </motion.div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Join the Pro waitlist to unlock higher limits
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        disabled={sending}
                      />
                      <Button type="submit" disabled={!isValidEmail || sending} className="gap-2 shrink-0">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                        {sending ? 'Joining...' : 'Join'}
                      </Button>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </form>

                  <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <Zap className="w-4 h-4 text-accent shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Early members get <span className="text-foreground font-medium">30% off</span> for the first year
                    </p>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Continue with Free tier
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

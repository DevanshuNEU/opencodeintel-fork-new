import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, Rocket, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DISCORD_WEBHOOK = import.meta.env.VITE_DISCORD_FEEDBACK_WEBHOOK

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  planName?: string
  planPrice?: string
}

export function WaitlistModal({ isOpen, onClose, planName = 'Pro', planPrice = '$19/mo' }: WaitlistModalProps) {
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
      const embed = {
        title: '🚀 New Waitlist Signup',
        color: 0x3b82f6,
        fields: [
          { name: 'Email', value: email, inline: true },
          { name: 'Plan Interest', value: `${planName} (${planPrice})`, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'OpenCodeIntel Waitlist' },
      }

      if (DISCORD_WEBHOOK) {
        const response = await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        })

        if (!response.ok) throw new Error('Failed to submit')
      } else {
        console.log('Waitlist signup (no webhook):', { email, planName, planPrice })
      }

      setSent(true)
      setTimeout(() => {
        onClose()
        setSent(false)
        setEmail('')
      }, 2500)
    } catch (err) {
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

  if (!isOpen) return null

  return (
    <AnimatePresence>
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
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-border bg-gradient-to-br from-accent/10 to-transparent">
            <button
              onClick={handleClose}
              disabled={sending}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Join the Waitlist</h3>
                <p className="text-sm text-muted-foreground">Be first to access {planName}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center"
              >
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">You're on the list!</p>
                <p className="text-sm text-muted-foreground mt-1">We'll notify you when {planName} is ready 🎉</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    disabled={sending}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <Sparkles className="w-4 h-4 text-accent shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Early access members get <span className="text-foreground font-medium">30% off</span> for the first year
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={!isValidEmail || sending}
                  className="w-full gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {sending ? 'Joining...' : 'Join Waitlist'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  No spam, unsubscribe anytime
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

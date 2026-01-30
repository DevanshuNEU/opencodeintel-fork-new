import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, Rocket, Sparkles, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

  const isEnterprise = planName === 'Enterprise'
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
        body: JSON.stringify({
          email,
          plan: isEnterprise ? 'enterprise' : 'pro',
        }),
      })

      if (!response.ok) throw new Error('Failed to submit')

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

  const Icon = isEnterprise ? Building2 : Rocket

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
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  isEnterprise 
                    ? 'bg-violet-500/20 border-violet-500/30' 
                    : 'bg-accent/20 border-accent/30'
                }`}>
                  <Icon className={`w-5 h-5 ${isEnterprise ? 'text-violet-400' : 'text-accent'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {isEnterprise ? 'Contact Sales' : 'Join the Waitlist'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isEnterprise ? "Let's discuss your team's needs" : `Be first to access ${planName}`}
                  </p>
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
                  <p className="text-lg font-medium text-foreground">
                    {isEnterprise ? "We'll be in touch!" : "You're on the list!"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isEnterprise 
                      ? "Our team will reach out within 24 hours" 
                      : `We'll notify you when ${planName} is ready`}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {isEnterprise ? 'Work email' : 'Email address'}
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

                  {!isEnterprise && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <Sparkles className="w-4 h-4 text-accent shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Early access members get <span className="text-foreground font-medium">30% off</span> for the first year
                      </p>
                    </div>
                  )}

                  {isEnterprise && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                      <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Custom pricing based on team size and requirements
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!isValidEmail || sending}
                    className="w-full gap-2"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    {sending 
                      ? (isEnterprise ? 'Sending...' : 'Joining...') 
                      : (isEnterprise ? 'Get in Touch' : 'Join Waitlist')}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    No spam, unsubscribe anytime
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

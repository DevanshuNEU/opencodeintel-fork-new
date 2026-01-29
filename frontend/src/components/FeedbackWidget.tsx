import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, X, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

const DISCORD_WEBHOOK = import.meta.env.VITE_DISCORD_FEEDBACK_WEBHOOK

type Mood = 'angry' | 'meh' | 'good' | 'love' | null

const moods: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 'angry', emoji: '😠', label: 'Frustrated', color: 'hover:bg-red-500/20' },
  { value: 'meh', emoji: '😐', label: 'Meh', color: 'hover:bg-yellow-500/20' },
  { value: 'good', emoji: '😊', label: 'Good', color: 'hover:bg-green-500/20' },
  { value: 'love', emoji: '🤩', label: 'Love it!', color: 'hover:bg-purple-500/20' },
]

export function FeedbackWidget() {
  const { session } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [mood, setMood] = useState<Mood>(null)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const userEmail = session?.user?.email || ''

  const handleSubmit = async () => {
    if (!mood && !message.trim()) return
    
    setSending(true)
    
    try {
      const moodInfo = moods.find(m => m.value === mood)
      
      const embed = {
        title: '💬 New Feedback',
        color: mood === 'love' ? 0x9333ea : mood === 'good' ? 0x22c55e : mood === 'meh' ? 0xeab308 : mood === 'angry' ? 0xef4444 : 0x6b7280,
        fields: [
          { name: 'Mood', value: moodInfo ? `${moodInfo.emoji} ${moodInfo.label}` : 'Not selected', inline: true },
          { name: 'User', value: userEmail || email || 'Anonymous', inline: true },
          ...(message.trim() ? [{ name: 'Message', value: message.slice(0, 1000) }] : []),
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'OpenCodeIntel Feedback' },
      }

      if (DISCORD_WEBHOOK) {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        })
      } else {
        console.log('Feedback (no webhook configured):', { mood, message, email: email || userEmail })
      }
      
      setSent(true)
      setTimeout(() => {
        setIsOpen(false)
        setSent(false)
        setMood(null)
        setMessage('')
        setEmail('')
      }, 2000)
    } catch (error) {
      console.error('Failed to send feedback:', error)
    } finally {
      setSending(false)
    }
  }

  const canSubmit = mood || message.trim()

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="text-sm font-medium">Feedback</span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !sending && setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Send Feedback</h3>
                  <p className="text-sm text-muted-foreground">Help us make OpenCodeIntel better</p>
                </div>
                <button
                  onClick={() => !sending && setIsOpen(false)}
                  disabled={sending}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                {sent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center"
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium text-foreground">Thank you!</p>
                    <p className="text-sm text-muted-foreground">Your feedback means a lot to us 💜</p>
                  </motion.div>
                ) : (
                  <>
                    {/* Mood Selector */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        How's your experience?
                      </label>
                      <div className="flex gap-2">
                        {moods.map(m => (
                          <button
                            key={m.value}
                            onClick={() => setMood(mood === m.value ? null : m.value)}
                            className={`flex-1 py-3 rounded-xl text-2xl transition-all border-2 ${
                              mood === m.value
                                ? 'border-primary bg-primary/10 scale-110'
                                : `border-transparent bg-muted/50 ${m.color}`
                            }`}
                          >
                            {m.emoji}
                          </button>
                        ))}
                      </div>
                      {mood && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-muted-foreground mt-2 text-center"
                        >
                          {moods.find(m => m.value === mood)?.label}
                        </motion.p>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tell us more <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="What's on your mind? Bug reports, feature requests, or just say hi..."
                        rows={3}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>

                    {/* Email (only if not logged in) */}
                    {!userEmail && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email <span className="text-muted-foreground font-normal">(for follow-up)</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {!sent && (
                <div className="p-5 pt-0">
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || sending}
                    className="w-full gap-2"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {sending ? 'Sending...' : 'Send Feedback'}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

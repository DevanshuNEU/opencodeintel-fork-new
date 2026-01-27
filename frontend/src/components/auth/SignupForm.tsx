import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Navbar } from '@/components/landing'
import { Github, Loader2, Mail, Lock, CheckCircle2, Send, ArrowLeft } from 'lucide-react'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const { signUp, signInWithGitHub, signInWithGoogle, resendVerification } = useAuth()
  const navigate = useNavigate()

  const handleResend = async () => {
    setError('')
    setResendLoading(true)
    setResendSuccess(false)
    try {
      await resendVerification(email)
      setResendSuccess(true)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email')
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoBack = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setEmailSent(false)
    setResendSuccess(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      setEmailSent(true)
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    setError('')
    setOauthLoading('github')
    try {
      await signInWithGitHub()
    } catch (err: any) {
      setError(err.message || 'GitHub sign in failed')
    } finally {
      setOauthLoading(null)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setOauthLoading('google')
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google sign in failed')
    } finally {
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Email Verification Sent */}
          {emailSent ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {/* Animated Icon */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Outer glow ring */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl"
                />
                {/* Icon container */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/30 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
                  >
                    <Send className="w-10 h-10 text-primary" />
                  </motion.div>
                </motion.div>
              </div>

              {/* Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-foreground mb-3"
              >
                Check your inbox
              </motion.h1>

              {/* Email display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <p className="text-muted-foreground mb-2">We sent a verification link to</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="font-mono text-sm text-foreground">{email}</span>
                </div>
                {error && (
                  <p className="text-sm text-destructive mt-3">{error}</p>
                )}
              </motion.div>

              {/* Instructions card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6 mb-6"
              >
                <div className="flex items-start gap-4 text-left">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium mb-1">
                      Click the link in the email to verify your account
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Didn't receive it? Check your spam folder.
                    </p>
                    
                    {/* Resend success message */}
                    {resendSuccess && (
                      <p className="text-sm text-green-500 mb-3">
                        ✓ Verification email resent!
                      </p>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleResend}
                        disabled={resendLoading}
                        className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
                      >
                        {resendLoading ? 'Sending...' : 'Resend email'}
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button 
                        onClick={handleGoBack}
                        disabled={resendLoading}
                        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Use different email
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Back link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Link 
                  to="/login" 
                  className={`inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors ${
                    resendLoading ? 'opacity-50 pointer-events-none' : 'hover:text-foreground'
                  }`}
                  onClick={(e) => resendLoading && e.preventDefault()}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  Create your account
                </h1>
                <p className="text-sm text-muted-foreground">
                  Free for open source projects
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-10 bg-accent hover:bg-accent/90 text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By signing up, you agree to our{' '}
                <a href="#" className="underline hover:text-foreground">Terms</a>
                {' '}and{' '}
                <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
              </p>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-card text-muted-foreground">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                type="button"
                variant="outline"
                className="h-10"
                onClick={handleGitHubSignIn}
                disabled={loading || oauthLoading !== null}
                aria-label={oauthLoading === 'github' ? 'Signing in with GitHub' : undefined}
              >
                {oauthLoading === 'github' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="sr-only">Signing in with GitHub</span>
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </>
                )}
              </Button>
              <Button 
                type="button"
                variant="outline"
                className="h-10"
                onClick={handleGoogleSignIn}
                disabled={loading || oauthLoading !== null}
                aria-label={oauthLoading === 'google' ? 'Signing in with Google' : undefined}
              >
                {oauthLoading === 'google' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="sr-only">Signing in with Google</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

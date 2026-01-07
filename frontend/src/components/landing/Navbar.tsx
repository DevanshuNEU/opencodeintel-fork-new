import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface NavbarProps {
  minimal?: boolean
}

export function Navbar({ minimal }: NavbarProps) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${scrolled 
        ? 'bg-black/80 backdrop-blur-xl border-b border-white/[0.06]' 
        : 'bg-transparent'
      }
    `}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">CI</span>
          </div>
          <span className="font-semibold text-white">CodeIntel</span>
        </a>

        {/* Right side */}
        {!minimal && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
            >
              Get started
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

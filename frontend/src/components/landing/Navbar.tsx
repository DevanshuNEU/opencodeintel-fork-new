import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, Star } from 'lucide-react'

interface NavbarProps {
  minimal?: boolean
}

export function Navbar({ minimal }: NavbarProps) {
  const navigate = useNavigate()
  const [stars] = useState<number>(1247)
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      // hide on scroll down, show on scroll up
      setVisible(currentScrollY < lastScrollY || currentScrollY < 100)
      setLastScrollY(currentScrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const formatStars = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n.toString()

  return (
    <div className={`
      fixed top-4 left-1/2 -translate-x-1/2 z-50
      transition-all duration-500 ease-out
      ${visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}
    `}>
      {/* outer glow */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-60" />
      
      {/* glass container */}
      <nav className="relative px-2 py-2 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/20">
        {/* inner gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
        
        <div className="relative flex items-center gap-1">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors group">
            <div className="relative">
              <div className="absolute -inset-1 bg-blue-500/30 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">CI</span>
              </div>
            </div>
            <span className="font-semibold text-white/90">CodeIntel</span>
            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/20">
              BETA
            </span>
          </a>

          {/* divider */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* GitHub stars */}
          <a
            href="https://github.com/opencodeintel/opencodeintel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors group"
          >
            <Github className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors">{formatStars(stars)}</span>
            </div>
          </a>

          {!minimal && (
            <>
              {/* divider */}
              <div className="w-px h-6 bg-white/10 mx-1" />

              <button
                onClick={() => navigate('/login')}
                className="px-4 py-1.5 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] rounded-xl transition-all"
              >
                Sign in
              </button>

              <button
                onClick={() => navigate('/signup')}
                className="relative px-4 py-1.5 text-sm font-medium text-white rounded-xl overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-400" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">Get started</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

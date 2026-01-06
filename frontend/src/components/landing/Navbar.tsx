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
      setVisible(currentScrollY < lastScrollY || currentScrollY < 100)
      setLastScrollY(currentScrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const formatStars = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n.toString()

  return (
    <div className={`
      fixed top-5 left-1/2 -translate-x-1/2 z-50
      transition-all duration-500 ease-out
      ${visible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'}
    `}>
      {/* animated gradient border */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-cyan-500/50 opacity-75" />
      
      {/* outer glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-cyan-500/20 rounded-3xl blur-2xl" />
      
      {/* glass container */}
      <nav className="relative px-3 py-2.5 rounded-2xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.1] shadow-2xl">
        {/* shimmer effect on top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        <div className="relative flex items-center gap-2">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-all group">
            <div className="relative">
              <div className="absolute -inset-1.5 bg-blue-500/40 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-sm">CI</span>
              </div>
            </div>
            <span className="font-semibold text-[15px] text-white">CodeIntel</span>
            <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wide">
              Beta
            </span>
          </a>

          {/* divider */}
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

          {/* GitHub stars */}
          <a
            href="https://github.com/opencodeintel/opencodeintel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl hover:bg-white/[0.06] transition-all group"
          >
            <Github className="w-[18px] h-[18px] text-white/70 group-hover:text-white transition-colors" />
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                {formatStars(stars)}
              </span>
            </div>
          </a>

          {!minimal && (
            <>
              {/* divider */}
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
              >
                Sign in
              </button>

              <button
                onClick={() => navigate('/signup')}
                className="relative group"
              >
                {/* button glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity" />
                <div className="relative px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-cyan-400 transition-all shadow-lg">
                  Get started
                </div>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

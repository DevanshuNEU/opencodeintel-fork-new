import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, Star } from 'lucide-react'

interface NavbarProps {
  minimal?: boolean
}

export function Navbar({ minimal }: NavbarProps) {
  const navigate = useNavigate()
  const [stars] = useState<number>(1247)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatStars = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n.toString()

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
      {/* glow - more visible when scrolled */}
      <div className={`
        absolute -inset-3 rounded-[28px] blur-2xl transition-opacity duration-500
        bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-cyan-500/30
        ${scrolled ? 'opacity-100' : 'opacity-60'}
      `} />
      
      {/* glass container */}
      <nav className={`
        relative rounded-2xl transition-all duration-300
        ${scrolled 
          ? 'bg-[#0a0a12]/90 shadow-2xl shadow-black/50' 
          : 'bg-[#0f0f18]/70'
        }
        backdrop-blur-2xl border border-white/[0.08]
      `}>
        {/* top highlight */}
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        
        {/* inner content with generous padding */}
        <div className="px-4 py-3 flex items-center gap-6">
          
          {/* Logo section */}
          <a href="/" className="flex items-center gap-3 pr-2 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-blue-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <div className="relative w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                <span className="text-white font-bold text-[15px]">CI</span>
              </div>
            </div>
            <span className="font-semibold text-[17px] text-white tracking-tight">CodeIntel</span>
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/25 uppercase tracking-wider">
              Beta
            </span>
          </a>

          {/* subtle divider */}
          <div className="w-px h-7 bg-white/10" />

          {/* GitHub stars */}
          <a
            href="https://github.com/opencodeintel/opencodeintel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 -mx-2 rounded-xl hover:bg-white/[0.06] transition-all duration-200 group"
          >
            <Github className="w-5 h-5 text-white/50 group-hover:text-white/80 transition-colors" />
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-[15px] font-medium text-white/50 group-hover:text-white/80 transition-colors tabular-nums">
                {formatStars(stars)}
              </span>
            </div>
          </a>

          {!minimal && (
            <>
              <div className="w-px h-7 bg-white/10" />

              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-[15px] font-medium text-white/50 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all duration-200"
              >
                Sign in
              </button>

              <button
                onClick={() => navigate('/signup')}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl blur-lg opacity-50 group-hover:opacity-80 transition-all duration-300" />
                <div className="relative px-6 py-2.5 text-[15px] font-semibold text-white rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 shadow-lg transition-all duration-200 group-hover:shadow-blue-500/30 group-hover:scale-[1.02]">
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

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, Star } from 'lucide-react'

interface NavbarProps {
  minimal?: boolean
}

export function Navbar({ minimal }: NavbarProps) {
  const navigate = useNavigate()
  const [stars, setStars] = useState<number | null>(1247) // fallback display
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const cached = sessionStorage.getItem('gh-stars')
    if (cached) {
      setStars(parseInt(cached))
      return
    }
    
    fetch('https://api.github.com/repos/opencodeintel/opencodeintel')
      .then(r => r.json())
      .then(data => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count)
          sessionStorage.setItem('gh-stars', data.stargazers_count.toString())
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatStars = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n.toString()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* gradient border at bottom when scrolled */}
      <div className={`
        absolute inset-0 transition-all duration-500
        ${scrolled 
          ? 'bg-[#09090b]/80 backdrop-blur-2xl' 
          : 'bg-gradient-to-b from-[#09090b] to-transparent'
        }
      `} />
      <div className={`
        absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500
        bg-gradient-to-r from-transparent via-blue-500/50 to-transparent
        ${scrolled ? 'opacity-100' : 'opacity-0'}
      `} />
      
      <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative">
            {/* glow behind logo */}
            <div className="absolute -inset-1 bg-blue-500/20 rounded-xl blur-md group-hover:bg-blue-500/30 transition-colors" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-sm">CI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg text-white">CodeIntel</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30">
              BETA
            </span>
          </div>
        </a>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* GitHub with stars - always visible */}
          <a
            href="https://github.com/opencodeintel/opencodeintel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
          >
            <Github className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
            {stars !== null && (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  {formatStars(stars)}
                </span>
              </div>
            )}
          </a>

          {!minimal && (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="relative px-5 py-2 text-sm font-semibold text-white rounded-xl overflow-hidden group"
              >
                {/* animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <span className="relative">Get started</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

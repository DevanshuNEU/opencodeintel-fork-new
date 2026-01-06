import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavbarProps {
  minimal?: boolean // for results page - less prominent
}

export function Navbar({ minimal }: NavbarProps) {
  const navigate = useNavigate()
  const [stars, setStars] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // fetch github stars - cache it
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
      .catch(() => {}) // silent fail, stars just won't show
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatStars = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n.toString()

  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${scrolled ? 'bg-[#09090b]/90 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'}
    `}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden">
            <span className="text-white font-bold text-sm relative z-10">CI</span>
            {/* subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </div>
          <span className="font-semibold text-white">CodeIntel</span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            BETA
          </span>
        </a>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* GitHub with stars */}
          <a
            href="https://github.com/opencodeintel/opencodeintel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Github className="w-4 h-4 text-gray-400" />
            {stars !== null && (
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                <span>{formatStars(stars)}</span>
              </div>
            )}
          </a>

          {!minimal && (
            <>
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => navigate('/login')}
              >
                Sign in
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0"
                onClick={() => navigate('/signup')}
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

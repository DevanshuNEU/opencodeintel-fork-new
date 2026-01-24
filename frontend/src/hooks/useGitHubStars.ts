import { useState, useEffect } from 'react'

const REPO = 'OpenCodeIntel/opencodeintel'
const CACHE_KEY = 'github-stars-cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CacheData {
  stars: number
  timestamp: number
}

export function useGitHubStars() {
  const [stars, setStars] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStars = async () => {
      // check cache first
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data: CacheData = JSON.parse(cached)
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          setStars(data.stars)
          setLoading(false)
          return
        }
      }

      try {
        const res = await fetch(`https://api.github.com/repos/${REPO}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const starCount = data.stargazers_count || 0
        
        // cache it
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          stars: starCount,
          timestamp: Date.now()
        }))
        
        setStars(starCount)
      } catch {
        // fallback to cached even if expired
        if (cached) {
          setStars(JSON.parse(cached).stars)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStars()
  }, [])

  return { stars, loading }
}

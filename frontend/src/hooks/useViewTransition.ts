import { useCallback, useEffect, useState } from 'react'

/**
 * Hook for using View Transitions API with fallback support
 * 
 * View Transitions API provides native browser animations for DOM changes.
 * Supported in Chrome 111+, Safari 18+, Edge 111+
 * 
 * @returns Object with transition utilities and browser support status
 */
export function useViewTransition() {
  const [isSupported, setIsSupported] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if View Transitions API is supported
    setIsSupported(typeof document !== 'undefined' && 'startViewTransition' in document)

    // Check user's motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  /**
   * Execute a callback with View Transition if supported
   * Falls back to direct execution if not supported or reduced motion preferred
   */
  const startTransition = useCallback(
    async (callback: () => void | Promise<void>) => {
      // Skip animation if user prefers reduced motion
      if (prefersReducedMotion) {
        await callback()
        return
      }

      // Use View Transitions API if supported
      if (isSupported && document.startViewTransition) {
        const transition = document.startViewTransition(async () => {
          await callback()
        })
        
        try {
          await transition.finished
        } catch (e) {
          // Transition was skipped, but callback still executed
        }
      } else {
        // Fallback: just execute the callback
        await callback()
      }
    },
    [isSupported, prefersReducedMotion]
  )

  return {
    isSupported,
    prefersReducedMotion,
    startTransition,
  }
}

/**
 * Hook for staggered animation timing
 * Returns delay value based on index for cascading effects
 */
export function useStaggeredDelay(index: number, baseDelay = 75) {
  return index * baseDelay
}

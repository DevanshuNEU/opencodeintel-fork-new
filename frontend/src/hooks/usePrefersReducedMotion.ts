import { useState, useEffect } from 'react';

// Respects user's OS-level motion preferences
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    
    mq.addEventListener?.('change', onChange) ?? mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.('change', onChange) ?? mq.removeListener?.(onChange);
    };
  }, []);

  return prefersReducedMotion;
}

export default usePrefersReducedMotion;

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();

    // Debounce resize to avoid thrashing
    let timeout: NodeJS.Timeout;
    const onResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(check, 100);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timeout);
    };
  }, []);

  return isMobile;
}

export default useIsMobile;

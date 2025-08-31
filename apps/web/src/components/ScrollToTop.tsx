import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If there's a hash (#section), let the browser handle anchor scrolling instead
    if (hash) return;

    // Respect reduced motion users
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Jump to top on every route/search change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReduced ? 'auto' : 'auto', // keep 'auto' to avoid footer jumps
    });
  }, [pathname, search, hash]);

  return null;
}

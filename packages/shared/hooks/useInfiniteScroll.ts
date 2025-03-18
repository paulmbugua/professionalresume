// /packages/shared/hooks/useInfiniteScroll.ts
import { useState, useEffect, useRef } from 'react';

export const useInfiniteScroll = (initialCount: number = 10, increment: number = 10) => {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => prev + increment);
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [increment]);

  return { visibleCount, loadMoreRef };
};

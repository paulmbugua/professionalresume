import { useState, useMemo, useCallback } from 'react';
import type { Profile } from '@mytutorapp/shared/types';
import { fetchTutorProfiles, fetchTutorReviews } from '@mytutorapp/shared/api';
import { useShopContext } from '@mytutorapp/shared/context';
import useAppQuery from './useAppQuery';

type Filters = Record<string, string[]>;
const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const;

const getField = (obj: Record<string, unknown>, key: string): unknown => {
  if (key.includes('.')) {
    return key.split('.').reduce<unknown>(
      (acc, seg) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[seg] : undefined,
      obj
    );
  }
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
  return obj[key] ?? (obj as any)[snake];
};

const throttle = (ms: number) => new Promise((r) => setTimeout(r, ms));

const useHomePage = () => {
  const { backendUrl } = useShopContext();

  // ✅ useAppQuery with positional args (queryKey, queryFn, options)
  const {
    data,
    isLoading: loading,
    refetch: reloadProfiles,
  } = useAppQuery<Profile[]>(
    ['tutorProfiles', backendUrl],
    async (): Promise<Profile[]> => {
      if (!backendUrl) return []; // guest mode safety
      const baseProfiles = await fetchTutorProfiles(backendUrl);

      // Group tutors by SUBJECTS to pick a small sample for rating lookups
      const bySubject: Record<string, Profile[]> = {};
      SUBJECTS.forEach((s) => (bySubject[s] = []));
      for (const p of baseProfiles) {
        if ((p as any).role !== 'tutor') continue;
        const cat = String((p as any)?.category || '').toLowerCase();
        for (const s of SUBJECTS) {
          if (cat.includes(s.toLowerCase())) {
            bySubject[s].push(p);
            break;
          }
        }
      }

      const candidates: Profile[] = [];
      for (const s of SUBJECTS) candidates.push(...bySubject[s].slice(0, 5));
      const candidateIds = new Set(
        candidates.map((p) => (p as any).user_id ?? (p as any).id)
      );

      // Limited-concurrency review fetch for candidates only
      const queue = candidates.slice();
      const results = new Map<string | number, { avg: number; total: number }>();
      const CONCURRENCY = 3;

      async function worker() {
        while (queue.length) {
          const p = queue.shift()!;
          try {
            const rid = (p as any).user_id ?? (p as any).id;
            const review = await fetchTutorReviews(backendUrl, rid); // (backendUrl, id)
            results.set(rid, {
              avg: Number(review?.avgRating ?? 0),
              total: Number(review?.totalReviews ?? 0),
            });
          } catch {
            /* ignore per-candidate failure */
          }
          await throttle(120);
        }
      }

      const workerCount = Math.min(CONCURRENCY, queue.length);
      await Promise.all(Array.from({ length: workerCount }).map(() => worker()));

      // Merge ratings back into base list
      return baseProfiles.map((p) => {
        if ((p as any).role !== 'tutor') return p;
        const rid = (p as any).user_id ?? (p as any).id;
        if (candidateIds.has(rid)) {
          const hit = results.get(rid);
          return {
            ...p,
            avgRating: Number(hit?.avg ?? 0),
            totalReviews: Number(hit?.total ?? 0),
          } as Profile;
        }
        return { ...p, avgRating: 0, totalReviews: 0 } as Profile;
      });
    },
    {
      enabled: Boolean(backendUrl), // allow unauthenticated visitors (backendUrl present)
      retry: false,
    }
  );

  // Ensure strong typing for downstream usage
  const profiles: Profile[] = data ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({});

  const handleSearch = useCallback((term: string) => setSearchTerm(term), []);
  const onFilterChange = useCallback((filterType: string, value: string) => {
    setFilters((prev) => {
      const existing = prev[filterType] || [];
      if (existing.includes(value)) {
        const next = { ...prev };
        delete next[filterType];
        return next;
      }
      return { ...prev, [filterType]: [value] };
    });
  }, []);
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({});
  }, []);

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return profiles.filter((p: Profile) => {
      const r = p as any;

      if (q) {
        const nameMatch = String(getField(r, 'name') ?? '').toLowerCase().includes(q);
        const catMatch = String(getField(r, 'category') ?? '').toLowerCase().includes(q);
        if (!(nameMatch || catMatch)) return false;
      }

      for (const [key, values] of Object.entries(filters)) {
        if (!values.length) continue;
        const sel = values[0].toLowerCase();

        if (key === 'rating') {
          const want = parseInt(values[0], 10);
          const rounded = Math.round(Number((r as any).avgRating ?? 0));
          if (rounded !== want) return false;
          continue;
        }

        if (key === 'status') {
          const raw = String(getField(r, 'status') ?? '').toLowerCase();
          const norm = raw === 'online' || raw === 'new' ? 'free' : raw;
          if (norm !== sel) return false;
          continue;
        }

        if (key === 'category') {
          const cat = String(getField(r, 'category') ?? '').toLowerCase();
          if (!(cat.includes(sel) || sel.includes(cat))) return false;
          continue;
        }
      }

      return true;
    });
  }, [profiles, searchTerm, filters]);

  return {
    filteredProfiles,
    filters,
    loading,
    handleSearch,
    onFilterChange,
    clearFilters,
    reloadProfiles,
  };
};

export default useHomePage;

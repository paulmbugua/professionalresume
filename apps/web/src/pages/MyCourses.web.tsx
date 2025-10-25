// apps/web/src/pages/MyCourses.web.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import debounce from 'lodash.debounce';
import { useNavigate, Link } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useEnrollments, useOerCourses, useWrapOerBook } from '@mytutorapp/shared/hooks';
import type { Course } from '@mytutorapp/shared/types';
import ClassVaultList from '../components/ClassVaultList.web';

type TabKey = 'library' | 'courses';

/* ------------------------- Debug logger (toggle) ------------------------- */
const DEBUG_TUTORS = false;
const dlog = (...args: any[]) => {
  if (DEBUG_TUTORS && typeof window !== 'undefined') {
    console.log('%c[MyCourses][Tutor]', 'color:#3d99f5;font-weight:bold;', ...args);
  }
};

/* --------------------- OER debug logger (toggle) --------------------- */
const DEBUG_OER = true; // <- flip to false to silence
const olog = (...args: any[]) => {
  if (DEBUG_OER && typeof window !== 'undefined') {
    console.log('%c[MyCourses][OER]', 'color:#9b59b6;font-weight:bold;', ...args);
  }
};

// Normalizes slugs/ids coming from route params or mixed sources
const sanitizeId = (routeId?: string): string => {
  let s = routeId ?? '';
  try { s = decodeURIComponent(s); } catch {}
  if (s.startsWith(':id')) s = s.slice(3);
  if (s.startsWith(':')) s = s.slice(1);
  return s;
};

/** Log status + short body preview safely, then return parsed JSON */
const logAndJson = async (url: string, res: Response) => {
  let bodyPreview = '';
  try {
    const clone = res.clone();
    bodyPreview = (await clone.text()).slice(0, 400);
  } catch {}
  dlog('HTTP', res.status, url, 'preview:', bodyPreview);
  try {
    return await res.json();
  } catch (e) {
    dlog('JSON parse error for', url, e);
    return null;
  }
};

const makeApiUrl = (base: string) => (path: string) => {
  const b = (base || '').replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;

  // exactly one "/api" between base and path
  const baseHasApi = /\/api$/.test(b);
  const pathHasApi = /^\/api(\/|$)/.test(p);

  if (baseHasApi && pathHasApi) return b + p.replace(/^\/api/, '');   // strip duplicate
  if (!baseHasApi && !pathHasApi) return `${b}/api${p}`;              // add missing
  return b + p;                                                        // already good
};

const pickId = (it: any, keyHint?: string | number) =>
  String(it?.user_id ?? it?.userId ?? it?.user ?? it?.tutor_id ?? it?.id ?? (keyHint ?? ''));

const pickName = (it: any) =>
  it?.name ??
  it?.fullName ??
  it?.displayName ??
  it?.username ??
  it?.profile?.name ??
  it?.tutor_profile?.name ??
  it?.instructor?.name ??
  '—';

/** Try to collect {id->name} from many response shapes (TS-safe for forEach) */
const collectPairs = (payload: any): Record<string, string> => {
  const map: Record<string, string> = {};
  const add = (it: any, keyHint?: string | number) => {
    const id = pickId(it, typeof keyHint === 'number' ? String(keyHint) : keyHint);
    const name = pickName(it);
    if (id && name && name !== '—') map[id] = name;
  };

  if (Array.isArray(payload)) {
    (payload as any[]).forEach((it, idx) => add(it, idx));
    return map;
  }

  if (payload && typeof payload === 'object') {
    const maybeArray =
      payload.items ??
      payload.data ??
      payload.users ??
      payload.tutors ??
      payload.results ??
      payload.rows ??
      payload.cards ??
      payload.profiles ??
      payload.result ??
      payload.payload;

    if (Array.isArray(maybeArray)) {
      (maybeArray as any[]).forEach((it, idx) => add(it, idx));
      return map;
    }

    for (const [k, v] of Object.entries(payload)) {
      if (v && typeof v === 'object') add(v, k);
    }
  }

  return map;
};

const CaretDown = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 256 256">
    <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
  </svg>
);

// Compact star text (mobile-safe; no extra deps)
function StarRow({ avg, count }: { avg?: number; count?: number }) {
  const a = Math.round((avg ?? 0) * 2) / 2;
  const stars = [1, 2, 3, 4, 5]
    .map((i) => (a >= i ? '★' : a + 0.5 === i ? '☆' : '☆'))
    .join('');
  return (
    <span className="whitespace-nowrap" title={`${avg?.toFixed?.(1) ?? '0.0'} (${count ?? 0})`}>
      {stars} {avg ? avg.toFixed(1) : '—'} ({count ?? 0})
    </span>
  );
}

// Coerce possible JSON-string objects (e.g., course.user) into real objects
function coerceObj<T = any>(v: unknown): T | undefined {
  if (!v) return undefined;
  if (typeof v === 'object') return v as T;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('{') && s.endsWith('}')) {
      try {
        const parsed = JSON.parse(s) as T;
        dlog('coerceObj parsed JSON string -> object with keys:', Object.keys(parsed as any));
        return parsed;
      } catch (e) {
        dlog('coerceObj JSON.parse failed for string:', s.slice(0, 200), e);
      }
    } else {
      dlog('coerceObj saw non-JSON string:', s.slice(0, 200));
    }
  }
  return undefined;
}

// Centralized extractor so tutor name always renders even if backend fields vary
function getTutorInfo(c: unknown): { name: string; id?: string | number } {
  const obj = (c ?? {}) as Record<string, any>;
  const userObj = coerceObj(obj.user);

  const name =
    (typeof obj.tutor === 'string' && obj.tutor) ||
    (typeof obj.tutorName === 'string' && obj.tutorName) ||
    (obj.instructor && typeof obj.instructor.name === 'string' && obj.instructor.name) ||
    (obj.tutor_profile && typeof obj.tutor_profile.name === 'string' && obj.tutor_profile.name) ||
    (obj.profile && typeof obj.profile.name === 'string' && obj.profile.name) ||
    (userObj && typeof (userObj as any).name === 'string' && (userObj as any).name) ||
    '—';

  const id =
    obj.tutorId ??
    obj.tutor_id ??
    obj.instructor?.id ??
    obj.tutor_profile?.id ??
    obj.profile?.id ??
    (userObj ? (userObj as any).id : undefined) ??
    obj.user_id ??
    undefined;

  dlog('getTutorInfo ->', { id, name, userObjKeys: userObj ? Object.keys(userObj as any) : null });
  return { name, id };
}

/** Canonical way to pull the tutor's user id from a course row */
function getTutorUserId(c: any): string | undefined {
  const userObj = coerceObj(c?.user);
  const raw =
    c?.tutor_id ??
    c?.tutorId ??
    c?.instructor?.id ??
    c?.tutor_profile?.id ??
    c?.profile?.id ??
    (userObj ? userObj.id : undefined) ??
    c?.user_id;

  const s = raw == null ? '' : String(raw);
  const resolved = s || undefined;
  dlog('getTutorUserId ->', resolved);
  return resolved;
}

/** Flag wrapped/ingested OER items so we can exclude them from Explore Courses */
function isOerCourse(c: any): boolean {
  const s = (x: any) => String(x || '').toLowerCase();
  const provider = s(c?.provider);
  const source = s(c?.source || c?.origin || c?.type || c?.category);
  const codeish = s(c?.code || c?.slug || c?.oer_slug);

  return Boolean(
    c?.is_oer ||
      c?.isOer ||
      c?.wrapped_oer ||
      source.includes('oer') ||
      (source.includes('open') && source.includes('text')) ||
      provider.includes('oer') ||
      provider.includes('openstax') ||
      provider.includes('khan') ||
      provider.includes('ck-12') ||
      codeish.includes('oer')
  );
}

/** Only show courses that were uploaded/owned by tutors (not system/OER ingests) */
function wasUploadedByTutor(c: any): boolean {
  const role = String(c?.uploader_role || c?.created_by_role || c?.owner_role || c?.creatorRole || '').toLowerCase();

  const hasTutorLink =
    Boolean(c?.tutor_id || c?.tutorId || c?.tutor_profile || c?.instructor?.id) ||
    typeof c?.tutor === 'string' ||
    typeof c?.tutorName === 'string';

  if (role) {
    if (['tutor', 'instructor', 'teacher'].includes(role)) return true;
    if (['system', 'oer', 'ingest', 'auto', 'robot'].includes(role)) return false;
  }
  return hasTutorLink;
}

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const { backendUrl, token, profile } = useShopContext();
  const myId = String(profile?.id ?? '');

  // Courses catalog
  const { courses = [], loading, error, fetchCourses } = useCourses({ backendUrl, token });

  // My enrollments
  const { enrollments, fetchMine } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: ('me' as unknown) as string | number,
  });

  const [tab, setTab] = useState<TabKey>('library');

  // Lightweight client-side filters
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<string>(''); // free-form
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');

  // Ratings cache { [courseId]: { avg, count, my } }
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number; my: boolean }>>({});
  const [openReview, setOpenReview] = useState<{ id: string; title: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Tutor name cache { [userId]: name }
  const [tutorNameById, setTutorNameById] = useState<Record<string, string>>({}); // <- fixed

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (token) void fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!DEBUG_TUTORS) return;
    dlog('courses snapshot (first 3):', (courses as any[]).slice(0, 3));
  }, [courses]);

  // Fast lookup: set of enrolled course IDs (tolerate snake_case / camelCase)
  const enrolledCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of enrollments as any[]) {
      const cid = String(e?.course_id ?? e?.courseId ?? '');
      if (cid) set.add(cid);
    }
    return set;
  }, [enrollments]);

  // 1) Hard filter out OER/wrapped items; keep only tutor-uploaded
  const filteredRows = useMemo(() => {
    return (courses as Course[])
      .filter((c: any) => !isOerCourse(c) && wasUploadedByTutor(c))
      .filter((c) => {
        const title = String(c.title ?? '').toLowerCase();
        const cLevel = String(c.level ?? '');
        const cDuration = String(c.duration ?? '').toLowerCase();
        const cPrice = typeof c.price === 'number' ? `$${c.price}` : String(c.price ?? '');

        const okLevel = level ? cLevel === level : true;
        const okSubject = subject ? title.includes(subject.toLowerCase()) : true;
        const okDuration = duration ? cDuration.includes(duration.toLowerCase()) : true;
        const okPrice = price ? cPrice.toLowerCase().includes(price.toLowerCase()) : true;

        return okLevel && okSubject && okDuration && okPrice;
      });
  }, [courses, subject, level, duration, price]);

  useEffect(() => {
    if (!DEBUG_TUTORS) return;
    dlog('filteredRows snapshot (first 3):', (filteredRows as any[]).slice(0, 3));
  }, [filteredRows]);

  // ---------- Tutor name resolution (via tutor_id == user_id) ----------
  const tutorUserIdsInCourses = useMemo(() => {
    const set = new Set<string>();
    (filteredRows as any[]).forEach((c) => {
      const id = getTutorUserId(c);
      if (id) set.add(id);
    });
    return Array.from(set);
  }, [filteredRows]);

  useEffect(() => {
    if (!DEBUG_TUTORS) return;
    dlog('tutorUserIdsInCourses:', tutorUserIdsInCourses);
  }, [tutorUserIdsInCourses]);

  const missingTutorUserIds = useMemo(
    () => tutorUserIdsInCourses.filter((id) => !tutorNameById[id]),
    [tutorUserIdsInCourses, tutorNameById]
  );

  const fetchTutorNamesByUserIds = useCallback(
  async (ids: string[]): Promise<Record<string, string>> => {
    if (!ids.length) return {};

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const api = makeApiUrl(backendUrl || '');

    const tryGET = async (path: string) => {
      const url = api(path);
      const res = await fetch(url, { headers });
      let preview = '';
      try { preview = (await res.clone().text()).slice(0, 200); } catch {}
      dlog('HTTP', res.status, url, 'preview:', preview);
      if (!res.ok) return null;
      try { return await res.json(); } catch { return null; }
    };

    const collectPairsLocal = (payload: any) => {
      const out: Record<string, string> = {};
      const pickIdLocal = (it: any) =>
        String(it?.user_id ?? it?.userId ?? it?.user ?? it?.id ?? '');
      const pickNameLocal = (it: any) =>
        it?.name ?? it?.fullName ?? it?.displayName ?? it?.username ?? '—';

      const add = (it: any) => {
        const id = pickIdLocal(it);
        const name = pickNameLocal(it);
        if (id && name && name !== '—') out[id] = name;
      };

      if (Array.isArray(payload)) payload.forEach(add);
      else if (payload && typeof payload === 'object') {
        const arr =
          payload.profiles ??
          payload.items ?? payload.data ?? payload.results ?? payload.rows;
        if (Array.isArray(arr)) arr.forEach(add);
        else for (const v of Object.values(payload)) if (v && typeof v === 'object') add(v);
      }
      return out;
    };

    // Batch endpoint (works for multiple or a single id)
    const join = encodeURIComponent(ids.join(','));
    const j = await tryGET(`/api/profile?userIds=${join}`);
    const map = collectPairsLocal(j);
    return map;
  },
  [backendUrl, token]
);


      // ✅ 2) Per-ID via /api/profile/user/:userId (existing route)
      
  // Seed from embedded user objects (parsed)
  useEffect(() => {
    const seed: Record<string, string> = {};
    (filteredRows as any[]).forEach((c) => {
      const u = coerceObj<{ id?: string | number; name?: string }>((c as any).user);
      const id = u?.id != null ? String(u.id) : '';
      if (id && typeof u?.name === 'string' && !tutorNameById[id]) {
        seed[id] = u.name;
      }
    });
    if (Object.keys(seed).length) {
      dlog('seeding tutorNameById from embedded user:', seed);
      setTutorNameById((prev) => ({ ...prev, ...seed }));
    } else {
      dlog('seeding tutorNameById: nothing to add this pass');
    }
  }, [filteredRows, tutorNameById]);

  // Fetch missing tutor names
  useEffect(() => {
    if (!missingTutorUserIds.length) {
      dlog('no missingTutorUserIds');
      return;
    }
    dlog('missingTutorUserIds:', missingTutorUserIds);

    let cancelled = false;
    (async () => {
      try {
        const map = await fetchTutorNamesByUserIds(missingTutorUserIds);
        dlog('batch fetch map:', map);
        if (!cancelled && Object.keys(map).length) {
          setTutorNameById((prev) => ({ ...prev, ...map }));
        }
      } catch (e) {
        dlog('batch fetch failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missingTutorUserIds, fetchTutorNamesByUserIds]);

  useEffect(() => {
    if (!DEBUG_TUTORS) return;
    dlog('tutorNameById keys:', Object.keys(tutorNameById));
  }, [tutorNameById]);

  // OER courses (collections + books)
  const { courses: oerCourses = [], loading: oerLoading, error: oerError } = useOerCourses();
  // Wrap a book into a course
  const { wrapBook } = useWrapOerBook();

  // One-off probe to see what the server returns for /oer/courses
  useEffect(() => {
    if (!DEBUG_OER) return;
    const api = makeApiUrl(backendUrl || '');
    const url = api('/oer/courses?limit=12'); // public endpoint; no auth header needed

    (async () => {
      const t0 = performance.now();
      olog('probe GET', { backendUrl, url });
      try {
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        const t1 = performance.now();
        const text = await res.text();
        olog('probe HTTP', res.status, `${(t1 - t0).toFixed(0)}ms`, 'bodyPreview:', text.slice(0, 800));

        try {
          const json = JSON.parse(text);
          olog('probe JSON parsed', {
            isArray: Array.isArray(json),
            length: Array.isArray(json) ? json.length : undefined,
            keys: json && !Array.isArray(json) ? Object.keys(json) : undefined,
            sample: Array.isArray(json) ? json[0] : json,
          });
        } catch (e) {
          olog('probe JSON parse error', e);
        }
      } catch (e) {
        olog('probe network error', e);
      }
    })();
  }, [backendUrl]);

  // Log hook state transitions
  useEffect(() => {
    olog('hook state changed', {
      loading: oerLoading,
      error: oerError,
      total: (oerCourses as any[]).length,
      sample: (oerCourses as any[])[0],
    });
  }, [oerLoading, oerError, oerCourses]);

  // Derived OER "books" list (+ logs)
  const oerBooks = useMemo(() => {
    const arr = (oerCourses as any[]).filter((c) => c?.kind === 'book');
    olog('derived books list', {
      totalFromApi: (oerCourses as any[]).length,
      booksCount: arr.length,
      sampleBook: arr[0],
    });
    return arr;
  }, [oerCourses]);

  // ------- Reviews wiring --------
  const fetchCourseRatings = useCallback(
    async (courseId: string) => {
      try {
        const res = await fetch(`${backendUrl}/api/reviews/courses/${courseId}`);
        if (!res.ok) return;
        const data = await res.json();
        const avg = Number(data?.avgRating ?? 0);
        const count = Number(data?.totalReviews ?? 0);
        const my = Array.isArray(data?.reviews)
          ? data.reviews.some((r: any) => String(r.studentId) === myId)
          : false;
        setRatings((prev) => ({ ...prev, [courseId]: { avg, count, my } }));
      } catch {
        // silent
      }
    },
    [backendUrl, myId]
  );

  const debouncedFetchCourseRatings = useRef(
    debounce((courseId: string, cb?: () => void) => {
      void fetchCourseRatings(courseId).finally(() => cb?.());
    }, 200)
  );

  useEffect(() => {
    const d = debouncedFetchCourseRatings.current;
    return () => d.cancel();
  }, []);

  // 2) Resolve the tutor name for a course (from embedded user or fetched map)
  const resolveTutorName = useCallback((c: any): string | undefined => {
    const rawInfo = getTutorInfo(c);
    const userId = getTutorUserId(c) ?? (rawInfo.id != null ? String(rawInfo.id) : '');
    const name =
      (userId && tutorNameById[userId]) ? tutorNameById[userId] : rawInfo.name;

    return name && name !== '—' ? name : undefined;
  }, [tutorNameById]);

  // 3) Only show courses that have a resolved tutor name
  const displayRows = useMemo(
    () => filteredRows.filter(c => !!resolveTutorName(c)),
    [filteredRows, resolveTutorName]
  );

  // Prefetch ratings when visible
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.courseId;
            if (id && !ratings[id]) {
              debouncedFetchCourseRatings.current(id);
            }
          }
        });
      },
      { rootMargin: '120px' }
    );

    displayRows.forEach((c) => {
      const id = String(c.id);
      const el = itemRefs.current[id];
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, [displayRows, ratings]);

  const prefetchOnHover = useCallback(
    (cid: string) => {
      if (!ratings[cid]) debouncedFetchCourseRatings.current(cid);
    },
    [ratings]
  );

  const openReviewFor = useCallback((courseId: string, title: string) => {
    setOpenReview({ id: courseId, title });
    setReviewRating(0);
    setReviewComment('');
  }, []);

  const submitCourseReview = useCallback(async () => {
    if (!openReview || reviewRating < 1) return;
    setPosting(true);
    try {
      const res = await fetch(`${backendUrl}/api/reviews/courses/${openReview.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || 'Failed to submit review');
      }
      await fetchCourseRatings(openReview.id);
      setOpenReview(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to submit review');
    } finally {
      setPosting(false);
    }
  }, [backendUrl, token, openReview, reviewRating, reviewComment, fetchCourseRatings]);

  /* --------------------------------- UI ---------------------------------- */
  const TAB_BTN_BASE =
    'group relative inline-flex items-center justify-center h-11 sm:h-12 px-4 sm:px-6 rounded-xl ' +
    'font-bold text-sm sm:text-base tracking-wide transition-all ' +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3d99f5]/60 ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-[#0a0f15]';

  return (
    <div
      className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary overflow-x-hidden"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      <main className="flex-1 flex justify-center py-6 px-3 sm:px-4 lg:px-10">
        <div className="flex flex-col w-full max-w-[1200px]">
          {/* Header + tabs */}
          <section className="px-1 sm:px-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-60 sm:min-w-72 flex-col gap-1">
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold leading-tight">My Courses</h1>
                <p className="text-[#49739c] dark:text-darkTextSecondary text-xs sm:text-sm">
                  Access your learning library or discover structured courses to level up.
                </p>
              </div>

              {/* Tabs */}
              <div
                role="tablist"
                aria-label="Explore content"
                className="inline-flex items-center rounded-2xl p-1.5 bg-white/80 dark:bg-[#0b1420]/80 ring-2 ring-[#3d99f5] dark:ring-[#3d99f5]/90 shadow-xl backdrop-blur supports-[backdrop-filter]:backdrop-blur"
              >
                <button
                  role="tab"
                  aria-selected={tab === 'library'}
                  aria-pressed={tab === 'library'}
                  onClick={() => setTab('library')}
                  title="Explore Videos & Notes"
                  className={[
                    TAB_BTN_BASE,
                    tab === 'library'
                      ? 'bg-[#3d99f5] text-white shadow-lg ring-1 ring-[#3d99f5]'
                      : 'bg-transparent text-[#0d141c] dark:text-darkTextPrimary ring-1 ring-[#3d99f5]/60 hover:bg-[#e7edf4]/80 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  Explore Videos &amp; Notes
                </button>

                <button
                  role="tab"
                  aria-selected={tab === 'courses'}
                  aria-pressed={tab === 'courses'}
                  onClick={() => setTab('courses')}
                  title="Explore Courses"
                  className={[
                    TAB_BTN_BASE,
                    'ml-1.5',
                    tab === 'courses'
                      ? 'bg-[#3d99f5] text-white shadow-lg ring-1 ring-[#3d99f5]'
                      : 'bg-transparent text-[#0d141c] dark:text-darkTextPrimary ring-1 ring-[#3d99f5]/60 hover:bg-[#e7edf4]/80 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  Explore Courses
                </button>
              </div>
            </div>
          </section>

          {/* Content */}
          <section className="mt-4 sm:mt-6">
            {tab === 'library' ? (
              <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] overflow-hidden">
                <ClassVaultList />
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Section header */}
                <div className="flex flex-wrap justify-between gap-3 p-3 sm:p-4">
                  <div className="flex min-w-60 sm:min-w-72 flex-col gap-1">
                    <p className="text-[22px] sm:text-[28px] md:text-[32px] font-bold leading-tight">Explore Courses</p>
                    <p className="text-[#49739c] dark:text-darkTextSecondary text-xs sm:text-sm">
                      Find the perfect course to enhance your skills and knowledge.
                    </p>
                  </div>
                </div>

                {/* OER Books (PDF only) */}
                <div className="px-3 sm:px-4 mt-4">
                  <h3 className="text-base font-bold mb-2">My Free OER Books</h3>

                  {/* Debug status badge */}
                  {DEBUG_OER && (
                    <div className="mb-2 text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                      <span className="px-2 py-0.5 rounded bg-[#e7edf4] dark:bg-[#172534]">
                        OER: loading={String(oerLoading)} · error={oerError || '—'} · total={(oerCourses as any[]).length} · books={oerBooks.length}
                      </span>
                    </div>
                  )}

                  {oerLoading && <div className="text-sm py-3">Loading books…</div>}
                  {oerError && !oerLoading && (
                    <div className="text-sm py-3 text-red-600">Failed to load OER books.</div>
                  )}

                  {!oerLoading && !oerError && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {oerBooks.map((c: any) => {
                        const idOrSlug = String(c.slug ?? c.id);
                        return (
                          <div
                            key={idOrSlug}
                            className="rounded-xl ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 flex flex-col"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm line-clamp-2">{c.title}</p>
                              <span className="text-[11px] bg-[#e7edf4] dark:bg-[#172534] rounded px-2 py-0.5">
                                BOOK
                              </span>
                            </div>

                            <p className="text-xs text-[#49739c] dark:text-darkTextSecondary mt-1">
                              {(c.subject ?? '—')} {c.level ? `• ${c.level}` : ''}
                            </p>

                            <div className="mt-3 flex gap-2">
                              <button
                                className="flex-1 h-9 rounded-lg bg-[#3d99f5] text-white text-xs font-semibold hover:brightness-110"
                                onClick={async () => {
                                  try {
                                    const { courseId } = await wrapBook(idOrSlug);
                                    navigate(`/progress/${courseId}`);
                                  } catch (e: any) {
                                    alert(e?.message || 'Failed to start book course');
                                  }
                                }}
                              >
                                Learn with RobotTeacher
                              </button>

                              {/* NEW: open in Reader */}
                              <Link
                          to={`/videos/${encodeURIComponent(sanitizeId(idOrSlug))}`}
                          className="h-9 px-3 rounded-lg bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-xs font-semibold inline-flex items-center justify-center"
                          aria-label={`Open reader for ${c.title}`}
                          title="Open Reader"
                        >
                          Reader
                        </Link>
                         </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!oerLoading && !oerError && oerBooks.length === 0 && (
                    <div className="py-3 text-xs text-[#49739c] dark:text-darkTextSecondary">
                      No OER books available.
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="flex gap-2 sm:gap-3 p-2 sm:p-3 flex-wrap pr-3 sm:pr-4">
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => setSubject(prompt('Filter by subject (temporary):') || '')}
                  >
                    <span className="font-medium">Subject</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => {
                      const v = prompt('Level (e.g., Beginner, Intermediate, Advanced, All Levels):') || '';
                      setLevel(v);
                    }}
                  >
                    <span className="font-medium">Level</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => setDuration(prompt('Filter by duration (e.g., "10 weeks")') || '')}
                  >
                    <span className="font-medium">Duration</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => setPrice(prompt('Filter by price (e.g., "$299")') || '')}
                  >
                    <span className="font-medium">Price</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>

                  {(subject || level || duration || price) && (
                    <button
                      className="h-9 px-3 rounded-xl bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-xs sm:text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#0f1821]"
                      onClick={() => { setSubject(''); setLevel(''); setDuration(''); setPrice(''); }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* ===================== */}
                {/* Mobile Cards ( < md ) */}
                {/* ===================== */}
                <div className="md:hidden space-y-3 px-3">
                  {loading && <div className="text-sm py-4">Loading courses…</div>}
                  {error && !loading && <div className="text-sm py-4 text-red-600">Failed to load courses.</div>}

                  {!loading && !error && displayRows.map((c) => {
                    const cid = String(c.id);

                    const rawInfo = getTutorInfo(c);
                    const userId = getTutorUserId(c) ?? (rawInfo.id != null ? String(rawInfo.id) : '');
                    const tutorName = resolveTutorName(c)!;

                    if (DEBUG_TUTORS && (!tutorName || tutorName === '—')) {
                      dlog('EMPTY tutorName (mobile) for course row', {
                        courseId: cid,
                        userId,
                        rawInfo,
                        fromMap: tutorNameById[userId as string],
                        typeofUser: typeof (c as any).user,
                        courseUser: (c as any).user,
                        tutorIdFields: { tutor_id: (c as any)?.tutor_id, tutorId: (c as any)?.tutorId, user_id: (c as any)?.user_id }
                      });
                    }

                    const priceDisplay =
                      typeof c.price === 'number' ? `$${c.price}` :
                      typeof c.price === 'string' ? c.price : '—';

                    const isEnrolled = enrolledCourseIds.has(cid);
                    const r = ratings[cid];

                    return (
                      <div
                        key={cid}
                        data-course-id={cid}
                        ref={(el) => { itemRefs.current[cid] = el; }}
                        className="rounded-xl ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 flex flex-col gap-2"
                        onTouchStart={() => prefetchOnHover(cid)}
                        onMouseEnter={() => prefetchOnHover(cid)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm">{c.title}</h3>
                          <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                            {c.level ?? '—'}
                          </div>
                        </div>

                        {/* Tutor name (mobile) */}
                        <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                          {tutorName}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#49739c] dark:text-darkTextSecondary">
                            {c.duration ?? '—'}
                          </span>
                          <span className="text-[#49739c] dark:text-darkTextSecondary">
                            {priceDisplay}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                            {r ? <StarRow avg={r.avg} count={r.count} /> : '—'}
                          </div>

                          {isEnrolled ? (
                            r?.my ? (
                              <button
                                className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                onClick={() => navigate(`/progress/${cid}`)}
                                aria-label={`Go to ${c.title} progress`}
                              >
                                Enrolled
                              </button>
                            ) : (
                              <button
                                className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                onClick={() => openReviewFor(cid, c.title)}
                                aria-label={`Review ${c.title}`}
                              >
                                Review
                              </button>
                            )
                          ) : (
                            <button
                              className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                              onClick={() => navigate(`/courses/${cid}`)}
                              aria-label={`View ${c.title}`}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {!loading && !error && displayRows.length === 0 && (
                    <div className="py-6 text-center text-sm text-[#49739c] dark:text-darkTextSecondary">
                      No courses match your filters.
                    </div>
                  )}
                </div>

                {/* ===================== */}
                {/* Desktop Table ( >= md ) */}
                {/* ===================== */}
                <div className="hidden md:block px-4 py-3 @container">
                  <div className="overflow-x-auto rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821]">
                    <table className="min-w-[900px] w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 dark:bg-[#0f1821]">
                          <th className="table-col-120 px-4 py-3 text-left text-sm font-medium w-[400px]">Course</th>
                          <th className="table-col-240 px-4 py-3 text-left text-sm font-medium w-[300px]">Tutor</th>
                          <th className="table-col-360 px-4 py-3 text-left text-sm font-medium w-60">Level</th>
                          <th className="table-col-480 px-4 py-3 text-left text-sm font-medium w-[220px]">Duration</th>
                          <th className="table-col-600 px-4 py-3 text-left text-sm font-medium w-[180px]">Price</th>
                          <th className="table-col-720 px-4 py-3 text-left text-sm font-medium w-[280px]">Rating / Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr><td colSpan={6} className="px-4 py-6 text-sm">Loading courses…</td></tr>
                        )}
                        {error && !loading && (
                          <tr><td colSpan={6} className="px-4 py-6 text-sm text-red-600">Failed to load courses.</td></tr>
                        )}
                        {!loading && !error && displayRows.map((c) => {
                          const rawInfo = getTutorInfo(c);
                          const userId = getTutorUserId(c) ?? (rawInfo.id != null ? String(rawInfo.id) : '');
                          const tutorName = resolveTutorName(c)!;

                          if (DEBUG_TUTORS && (!tutorName || tutorName === '—')) {
                            dlog('EMPTY tutorName (desktop) for course row', {
                              courseId: String(c.id),
                              userId,
                              rawInfo,
                              fromMap: tutorNameById[userId as string],
                              typeofUser: typeof (c as any).user,
                              courseUser: (c as any).user,
                              tutorIdFields: { tutor_id: (c as any)?.tutor_id, tutorId: (c as any)?.tutorId, user_id: (c as any)?.user_id }
                            });
                          }

                          const priceDisplay =
                            typeof c.price === 'number' ? `$${c.price}` :
                            typeof c.price === 'string' ? c.price : '—';

                          const cid = String(c.id);
                          const isEnrolled = enrolledCourseIds.has(cid);
                          const r = ratings[cid];

                          return (
                            <tr
                              key={cid}
                              className="border-t border-t-[#cedbe8] dark:border-darkCard"
                              onMouseEnter={() => prefetchOnHover(cid)}
                              data-course-id={cid}
                              ref={(el) => { itemRefs.current[cid] = el; }}
                            >
                              <td className="table-col-120 h-[72px] px-4 py-2 w-[400px] text-sm">{c.title}</td>
                              <td className="table-col-240 h-[72px] px-4 py-2 w-[300px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {tutorName}
                              </td>
                              <td className="table-col-360 h-[72px] px-4 py-2 w-60 text-sm">
                                <button
                                  className="flex min-w-[84px] items-center justify-center rounded-xl h-8 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm font-medium w-full"
                                  onClick={() => setLevel(String(c.level ?? ''))}
                                  title={`Filter by ${c.level ?? 'level'}`}
                                >
                                  <span className="truncate">{c.level ?? '—'}</span>
                                </button>
                              </td>
                              <td className="table-col-480 h-[72px] px-4 py-2 w-[220px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {c.duration ?? '—'}
                              </td>
                              <td className="table-col-600 h-[72px] px-4 py-2 w-[180px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {priceDisplay}
                              </td>

                              <td className="table-col-720 h-[72px] px-4 py-2 w-[280px] text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[#49739c] dark:text-darkTextSecondary">
                                    {r ? <StarRow avg={r.avg} count={r.count} /> : <span className="opacity-70">—</span>}
                                  </div>

                                  {isEnrolled ? (
                                    r?.my ? (
                                      <button
                                        className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                        onClick={() => navigate(`/progress/${cid}`)}
                                        aria-label={`Go to ${c.title} progress`}
                                      >
                                        Enrolled
                                      </button>
                                    ) : (
                                      <button
                                        className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                        onClick={() => openReviewFor(cid, c.title)}
                                        aria-label={`Review ${c.title}`}
                                      >
                                        Review
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                      onClick={() => navigate(`/courses/${cid}`)}
                                      aria-label={`View ${c.title}`}
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {!loading && !error && displayRows.length === 0 && (
                          <tr className="border-t border-t-[#cedbe8] dark:border-darkCard">
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#49739c] dark:text-darkTextSecondary">
                              No courses match your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Container query helpers */}
                  <style>{`
                    @container(max-width:120px){.table-col-120{display:none;}}
                    @container(max-width:240px){.table-col-240{display:none;}}
                    @container(max-width:360px){.table-col-360{display:none;}}
                    @container(max-width:480px){.table-col-480{display:none;}}
                    @container(max-width:600px){.table-col-600{display:none;}}
                    @container(max-width:720px){.table-col-720{display:none;}}
                  `}</style>
                </div>

                {/* Pagination placeholder */}
                <div className="flex items-center justify-center gap-1 p-3 sm:p-4">
                  <button className="flex size-9 sm:size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]" aria-label="Previous page">‹</button>
                  {[1, 2, 3].map((n) => (
                    <button key={n} className={`flex size-9 sm:size-10 items-center justify-center rounded-full text-xs sm:text-sm ${n === 1 ? 'font-bold bg-[#e7edf4] dark:bg-[#172534]' : ''}`}>
                      {n}
                    </button>
                  ))}
                  <button className="flex size-9 sm:size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]" aria-label="Next page">›</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ---------- Simple Review Modal (responsive) ---------- */}
      {openReview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] p-3 sm:p-4 ring-1 ring-[#cedbe8] dark:ring-darkCard">
            <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Rate this course</h3>
            <p className="text-xs sm:text-sm text-[#49739c] dark:text-darkTextSecondary mb-2 sm:mb-3">{openReview.title}</p>

            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setReviewRating(n)}
                  className={n <= reviewRating ? 'text-yellow-500 text-2xl' : 'text-[#49739c] text-2xl'}
                  aria-label={`${n} star`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Optional comment (max 500 chars)"
              maxLength={500}
              className="w-full text-sm rounded-lg p-2 bg-[#e7edf4] dark:bg-[#172534] min-h-[90px]"
            />

            <div className="mt-3 sm:mt-4 flex items-center gap-2">
              <button
                disabled={posting || reviewRating < 1}
                onClick={submitCourseReview}
                className="px-4 h-10 rounded-xl bg-[#3d99f5] text-white text-sm font-semibold disabled:opacity-60"
              >
                {posting ? 'Saving…' : 'Submit'}
              </button>
              <button
                onClick={() => setOpenReview(null)}
                className="px-4 h-10 rounded-xl bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;

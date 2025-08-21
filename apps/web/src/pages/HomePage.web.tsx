// apps/web/src/pages/HomePage.web.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.web'; // ⬅️ import the new Navbar
import { useHomePage } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';

const FALLBACK_AVATAR = (name = 'Tutor') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=223649&color=ffffff`;

const HERO_BG =
  'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=2000&auto=format&fit=crop';

const CARD_IMG_1 =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1600&auto=format&fit=crop';
const CARD_IMG_2 =
  'https://images.unsplash.com/photo-1523580846011-44d4d37e2cfa?q=80&w=1600&auto=format&fit=crop';

const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const;

// ⬇️ Extracted from provided HTML snippet
const RECOMMENDED_COURSES = [
  {
    title: 'Advanced Calculus',
    desc: 'Dive deep into advanced calculus concepts with expert guidance.',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9H18AzpICOzhsnZ6XLH3xFTtxRnVtWK6PpcOZiVpWWno1vwNR5S-FYJNz3zDdT1lF4p7Yoac6kwIWDz1Mfxhu5_3OZt4p8wE_zoO2qtiefuKgzHjV_Ik1rOI8y_mTQQ1ArYUq41Q1tvMkFSxk0-S312ElgxDQd7maIU3N7ElYEV_Cgct9Wjnm8r1zuat_5116CkYK-9hbfhhKsnoKnOHxQ4SMDpZZs9EvdSgHxx21_ni5aqrQI3Kf0D47kLIoPH4IiUMUn3u23_k',
  },
  {
    title: 'Creative Writing Workshop',
    desc: 'Unleash your creativity with our engaging writing workshop.',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4vtWy1R_e3yZmTv9AJrcRbldgDReHQc36HxDqffeo_FJ5nwp6af0C6wP6Kbdxgpp2efMNmU36Z2bvJHRiAQ8qyXt-hnJL4lJZHRobrxyprQ3iCMDVBVlFNDZxn1m4foDNjWn0Fn-Izs7LMtQN8WJYf8rLuZIJ9gSMS7sgCggTxDbZzWmsOanEqyUqbTa-muBtX5j5PUCDVQYDR3gXIffdFTzn-xqLfRHuNl2dW6r6400H5W63XyiJdx5r78Wfza7xH68Nz-OYw08',
  },
  {
    title: 'Physics Fundamentals',
    desc: 'Master the fundamentals of physics with our comprehensive course.',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfs3BvtPELA9FcaTOPunz04SQoiipojzXfAG_M2vx3Bf7AHAP7coft5i7RSkVeOMCoAgA79gQc6-WbO9z7yqJ5a0ZBK4ABNmMhplIPwgRdgj6v7zXk4MCiGrLWXXx0OMS7ZPvq7tAgw9LQUnKTd4FDeBTlLMxDejYAs2WaPvKw-_fNa1GMb0ZCrxylIm1DQQnndyvu2mZ3lbrT5kOavHLrCgKHBRW1BBESnURSvTVGMlImx5_AOH2RgE6jpII9mEC4cFRrLHCznBw',
  },
];

const HomePage: React.FC = () => {
  const { filteredProfiles, loading, handleSearch } = useHomePage();
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

  const tutorProfiles: Profile[] = useMemo(
    () => filteredProfiles.filter((p) => p.role === 'tutor') as unknown as Profile[],
    [filteredProfiles]
  );

  const getRating = (p: any) => Number((p?.avgRating ?? p?.rating) ?? 0);

  const resolveImage = (p: any, fallbackName?: string) => {
    const g0 = Array.isArray(p?.gallery) ? p.gallery[0] : undefined;
    if (typeof g0 === 'string' && g0.length > 0) {
      if (g0.startsWith('http://') || g0.startsWith('https://')) return g0;
      if (g0.startsWith('/') && backendUrl) {
        return `${backendUrl.replace(/\/+$/, '')}${g0}`;
      }
    }
    return FALLBACK_AVATAR(fallbackName ?? p?.name ?? 'Tutor');
  };

  const featuredTutors = useMemo(() => {
    const rows: { id: string; name: string; subject: string; image: string; category?: string }[] = [];
    SUBJECTS.forEach((subject) => {
      const matches = tutorProfiles.filter((p) =>
        (p.category ?? '').toLowerCase().includes(subject.toLowerCase())
      );
      if (matches.length === 0) return;

      const best = matches.reduce((a, b) => (getRating(b) > getRating(a) ? b : a));
      const image = resolveImage(best, best?.name || 'Tutor');
      rows.push({
        id: (best as any).user_id ?? (best as any).id ?? String(best?.name ?? subject),
        name: best?.name ?? 'Tutor',
        subject,
        image,
        category: best?.category,
      });
    });
    return rows;
  }, [tutorProfiles, backendUrl]);

  const videoCards = useMemo(() => {
    const toText = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join(', ');
      return '';
    };

    return tutorProfiles
      .filter((p) => Boolean((p as any).video))
      .slice(0, 8)
      .map((p: any) => {
        const title = p.name ? `${p.name.split(' ')[0]} • ${p.category ?? 'Lesson'}` : 'Featured Lesson';
        const rawDesc = toText(p.description || '');
        const desc =
          typeof rawDesc === 'string' && rawDesc.length > 0
            ? rawDesc.slice(0, 90)
            : 'Learn with our expert tutor in this bite-size session.';
        const thumb =
          Array.isArray(p.gallery) && typeof p.gallery[0] === 'string'
            ? resolveImage(p, p.name)
            : 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=1600&auto=format&fit=crop';
        return { id: p.user_id, title, desc, thumb, video: p.video as string };
      });
  }, [tutorProfiles, backendUrl]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-softGray dark:bg-darkBg text-darkText dark:text-darkTextPrimary">
        Loading tutor profiles...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-softGray dark:bg-darkBg text-darkText dark:text-darkTextPrimary overflow-x-hidden">
      
      <main className="flex-1">
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl">
            <div
              className="min-h-[52vh] lg:min-h-[60vh] bg-cover bg-center flex flex-col items-center justify-center gap-4 sm:gap-5 px-4 text-center"
              style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.55)), url("${HERO_BG}")` }}
            >
              <h2 className="font-black tracking-tight text-[clamp(1.75rem,4vw,3.25rem)] text-darkTextPrimary">
                Unlock Your Potential with Expert Tutors
              </h2>
              <p className="max-w-[800px] text-darkTextPrimary/90">
                Connect with top-rated tutors for personalized learning experiences.
              </p>
              <Link
                to="/find-tutor"
                className="inline-flex items-center justify-center rounded-xl h-11 px-6 bg-primary text-white font-semibold shadow-sm hover:shadow transition active:translate-y-[1px]"
              >
                Find a Tutor
              </Link>
            </div>
          </section>

          {/* Featured Tutors (highest-rated per subject) */}
          <section className="mt-10">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[22px] font-bold tracking-tight">Featured Tutors</h3>
            </div>

            {/* Mobile: horizontal snap */}
            <div className="mt-4 md:hidden">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
                {featuredTutors.length === 0 && (
                  <p className="text-darkTextSecondary px-1">No featured tutors yet.</p>
                )}
                {featuredTutors.map((t) => (
                  <Link
                    to={`/profile/${t.id}`}
                    key={`${t.id}-${t.subject}`}
                    className="snap-start shrink-0 w-32"
                  >
                    <div
                      className="bg-center bg-cover rounded-full aspect-square w-28 mx-auto ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
                      style={{ backgroundImage: `url("${t.image}")` }}
                    />
                    <div className="mt-2 text-center">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-darkTextSecondary">{t.subject}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop grid */}
            <div className="mt-4 hidden md:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {featuredTutors.length === 0 && (
                <p className="text-darkTextSecondary px-1 col-span-full">No featured tutors yet.</p>
              )}
              {featuredTutors.map((t) => (
                <Link
                  to={`/profile/${t.id}`}
                  key={`${t.id}-${t.subject}`}
                  className="group rounded-2xl ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition p-4 bg-white dark:bg-[#0f1821]"
                >
                  <div
                    className="bg-center bg-cover rounded-full aspect-square w-24 mx-auto ring-1 ring-gray-200 dark:ring-darkCard group-hover:ring-primary transition"
                    style={{ backgroundImage: `url("${t.image}")` }}
                  />
                  <div className="mt-3 text-center">
                    <p className="font-medium truncate">{t.name}</p>
                    <p className="text-darkTextSecondary">{t.subject}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Featured Videos */}
          <section className="mt-12">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[22px] font-bold tracking-tight">Featured Videos</h3>
              <Link to="/videos" className="text-primary hover:underline">See All</Link>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoCards.map((v) => (
                <div
                  key={v.id}
                  className="bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden shadow hover:shadow-lg transition"
                >
                  <div
                    className="aspect-video bg-center bg-cover"
                    style={{ backgroundImage: `url("${v.thumb}")` }}
                  />
                  <div className="p-4">
                    <h4 className="font-semibold truncate">{v.title}</h4>
                    <p className="text-sm text-darkTextSecondary">{v.desc}</p>
                  </div>
                </div>
              ))}
              {videoCards.length === 0 && (
                <p className="text-darkTextSecondary px-1">No videos to show yet.</p>
              )}
            </div>
          </section>

          {/* E-learning */}
          <section className="mt-12">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[22px] font-bold tracking-tight">E-learning</h3>
              <Link to="/courses" className="text-primary hover:underline">Explore</Link>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[CARD_IMG_1, CARD_IMG_2].map((img, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden shadow hover:shadow-lg transition"
                >
                  <div
                    className="aspect-video bg-center bg-cover"
                    style={{ backgroundImage: `url("${img}")` }}
                  />
                  <div className="p-4">
                    <h4 className="font-semibold">
                      {idx === 0 ? 'Interactive Coding Lessons' : 'Art & Design Masterclass'}
                    </h4>
                    <p className="text-sm text-darkTextSecondary">
                      {idx === 0
                        ? 'Learn programming interactively with hands-on projects.'
                        : 'Master creative techniques with expert-led design lessons.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ⭐ Recommended Courses (from snippet) */}
          <section className="mt-12">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[22px] font-bold tracking-tight">Recommended Courses</h3>
              <Link to="/courses" className="text-primary hover:underline">Browse all</Link>
            </div>

            {/* Mobile: horizontal scroll */}
            <div className="mt-4 md:hidden">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
                {RECOMMENDED_COURSES.map((c) => (
                  <div
                    key={c.title}
                    className="snap-start shrink-0 w-64 bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden shadow hover:shadow-lg transition ring-1 ring-gray-200 dark:ring-darkCard"
                  >
                    <div
                      className="aspect-video bg-center bg-cover"
                      style={{ backgroundImage: `url("${c.img}")` }}
                    />
                    <div className="p-4">
                      <h4 className="font-semibold truncate">{c.title}</h4>
                      <p className="text-sm text-darkTextSecondary">{c.desc}</p>
                      <div className="mt-3">
                        <Link
                          to="/courses"
                          className="inline-flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-medium hover:brightness-110"
                        >
                          View Course
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop grid */}
            <div className="mt-4 hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
              {RECOMMENDED_COURSES.map((c) => (
                <div
                  key={c.title}
                  className="bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden shadow hover:shadow-lg transition ring-1 ring-gray-200 dark:ring-darkCard"
                >
                  <div
                    className="aspect-video bg-center bg-cover"
                    style={{ backgroundImage: `url("${c.img}")` }}
                  />
                  <div className="p-4">
                    <h4 className="font-semibold truncate">{c.title}</h4>
                    <p className="text-sm text-darkTextSecondary">{c.desc}</p>
                    <div className="mt-3">
                      <Link
                        to="/courses"
                        className="inline-flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-medium hover:brightness-110"
                      >
                        View Course
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomePage;

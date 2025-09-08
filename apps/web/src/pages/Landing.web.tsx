// apps/web/src/pages/Landing.web.tsx
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useShopContext } from '@mytutorapp/shared/context';
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  Variants,
} from 'framer-motion';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger: Variants = {
  show: { transition: { staggerChildren: 0.08 } },
};

const SITE_URL = import.meta.env.VITE_SITE_URL ?? '';
const LANDING_BG = import.meta.env.VITE_LANDING_BG ?? '';
const HERO_BG = import.meta.env.VITE_HERO_BG ?? '';
const BRAND = 'DayBreak';

const Landing: React.FC = () => {
  const { token } = useShopContext();
  const ctaPath = token ? '/find-tutor' : '/login';
  const prefersReducedMotion = useReducedMotion() ?? false;

  // ------- JSON-LD blocks (kept inline for simplicity) -------
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: BRAND,
    url: SITE_URL || undefined,
    logo:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBgvEqh6MrQ7dVW2qwj-qjGCafebAnWEjA7iwu4aBwvJfiAvneGQcD6xH14zDIWcFdHIVF1yUOtvsMVPHKrnuxAXdqlOKj_Gbf_VBvdobGFojOpO0seljMPOx0GUF1LSkYcCU8Gd_0jz1BC4GkilnIWIs9ZGuqzsN4pO4t8xzWY2uouVckDUvvqonRhWPECRGpV5W0kGh3MF3FPXFtbXyU0DuxtazBEu50XMuUrx4CovU0y47zF1YjXjrNQg6DUZcEu_uJ1um9oLpY',
    sameAs: [], // fill when you add socials
    slogan: 'Learn anything with AI & expert tutors',
    areaServed: 'Worldwide',
  };

  // WebSite + SearchAction helps sitelinks search box
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${BRAND} – AI Learning & Expert Tutors`,
    url: SITE_URL || undefined,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={query}`,
      'query-input': 'required name=query',
    },
  };

  // HowTo to mirror “Get started in 3 steps”
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Get started with DayBreak in 3 steps',
    description:
      'Tell us your goal, match with a tutor, then learn & iterate with AI-powered feedback.',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Tell us your goal',
        text: 'Pick subject, level, and schedule preferences.',
      },
      {
        '@type': 'HowToStep',
        name: 'Match with a tutor',
        text: 'We surface vetted profiles with perfect fit.',
      },
      {
        '@type': 'HowToStep',
        name: 'Learn & iterate',
        text: 'Book, learn, review, and keep the momentum.',
      },
    ],
  };

  // FAQPage + matching on-page content (keep Q/A consistent)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the AI Robot Teacher?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'It’s an AI assistant that guides lessons, quizzes you, and gives instant feedback alongside your human tutor.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is AI learning safe and accurate?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Yes. We combine vetted human tutors with AI. Tutors review AI suggestions and your learning plan for quality.',
        },
      },
      {
        '@type': 'Question',
        name: 'How much does it cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Pricing varies by tutor and subject. You can browse transparent rates before booking your first session.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I learn exam prep with AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Absolutely. Our AI helps you practice with timed drills and targeted feedback while your tutor fine-tunes strategy.',
        },
      },
    ],
  };

  const updatedTitle = `AI Learning & Expert Tutors | ${BRAND} — Learn Anything with AI`;
  const updatedDescription =
    'Learn faster with AI + human tutors. Book a session in minutes, get personalized plans, instant AI feedback, and real results across subjects and exams.';

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-hidden"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      {/* Page background image (uses VITE_LANDING_BG) */}
      {LANDING_BG && (
        <div className="absolute inset-0 z-0">
          <img
            src={LANDING_BG}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/40" />
        </div>
      )}

      <Helmet>
        {/* Core meta with AI positioning */}
        <title>{updatedTitle}</title>
        <meta name="description" content={updatedDescription} />
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={updatedTitle} />
        <meta property="og:description" content={updatedDescription} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta property="og:locale" content="en_US" />
        <meta
          property="og:image"
          content={
            HERO_BG ||
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBgvEqh6MrQ7dVW2qwj-qjGCafebAnWEjA7iwu4aBwvJfiAvneGQcD6xH14zDIWcFdHIVF1yUOtvsMVPHKrnuxAXdqlOKj_Gbf_VBvdobGFojOpO0seljMPOx0GUF1LSkYcCU8Gd_0jz1BC4GkilnIWIs9ZGuqzsN4pO4t8xzWY2uouVckDUvvqonRhWPECRGpV5W0kGh3MF3FPXFtbXyU0DuxtazBEu50XMuUrx4CovU0y47zF1YjXjrNQg6DUZcEu_uJ1um9oLpY'
          }
        />
        {/* Optional og:updated_time could be added during build with current timestamp */}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={updatedTitle} />
        <meta name="twitter:description" content={updatedDescription} />
        <meta
          name="twitter:image"
          content={
            HERO_BG ||
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBgvEqh6MrQ7dVW2qwj-qjGCafebAnWEjA7iwu4aBwvJfiAvneGQcD6xH14zDIWcFdHIVF1yUOtvsMVPHKrnuxAXdqlOKj_Gbf_VBvdobGFojOpO0seljMPOx0GUF1LSkYcCU8Gd_0jz1BC4GkilnIWIs9ZGuqzsN4pO4t8xzWY2uouVckDUvvqonRhWPECRGpV5W0kGh3MF3FPXFtbXyU0DuxtazBEu50XMuUrx4CovU0y47zF1YjXjrNQg6DUZcEu_uJ1um9oLpY'
          }
        />
        {/* <meta name="twitter:site" content="@yourhandle" /> */}

        {/* Preload hero image for LCP if available */}
        {HERO_BG && (
        <link rel="preload" as="image" href={HERO_BG} fetchPriority="high" />
      )}


        {/* JSON-LD: Organization (EducationalOrganization) */}
        <script type="application/ld+json">
          {JSON.stringify(orgJsonLd)}
        </script>

        {/* JSON-LD: WebSite + SearchAction */}
        <script type="application/ld+json">
          {JSON.stringify(websiteJsonLd)}
        </script>

        {/* JSON-LD: HowTo (3 steps) */}
        <script type="application/ld+json">
          {JSON.stringify(howToJsonLd)}
        </script>

        {/* JSON-LD: FAQPage */}
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>

        {/* Optional: theme-color helps mobile UI */}
        <meta name="theme-color" content="#111827" />
      </Helmet>

      {/* Skip link for accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only absolute left-2 top-2 z-50 rounded bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow"
      >
        Skip to content
      </a>

      {/* Decorative floating blobs */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl bg-indigo-300/40" />
        <div className="absolute top-10 right-10 h-80 w-80 rounded-full blur-3xl bg-cyan-300/40" />
        <div className="absolute bottom-[-6rem] left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl bg-violet-200/30" />
      </div>

      {/* Main content */}
      <main id="main" className="relative z-10 flex-1">
        {/* Hero */}
        <section aria-label="Hero" className="flex justify-center py-8 lg:py-12 px-4 lg:px-40">
          <motion.div
            className="layout-content-container flex flex-col max-w-[1100px] flex-1 w-full @container"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="@[480px]:p-4">
              <Hero prefersReducedMotion={prefersReducedMotion} ctaPath={ctaPath} />
            </motion.div>
          </motion.div>
        </section>

        {/* Why choose section */}
        <section id="why" aria-label="Why choose" className="flex justify-center py-12 lg:py-16 px-4 lg:px-40">
          <div className="layout-content-container flex flex-col max-w-[1100px] flex-1 w-full">
            <motion.div
              className="flex flex-col gap-10 px-0 @container"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={stagger}
            >
              <motion.div variants={fadeUp} className="flex flex-col gap-4">
                <h2 className="text-slate-900 dark:text-slate-100 text-[32px] font-bold leading-tight tracking-[-0.033em] @[480px]:text-4xl max-w-[720px]">
                  Why choose {BRAND}?
                </h2>
                <p className="text-slate-700 dark:text-slate-300 text-base">
                  AI-powered learning + expert tutors—built for momentum and results.
                </p>
              </motion.div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <TiltCard
                  title="Interactive Virtual Classrooms"
                  text="Live voice/video, shared whiteboards, and real-time collaboration keep learning hands-on."
                  image="https://lh3.googleusercontent.com/aida-public/AB6AXuBozRV2GKWrHHA1XVoLXsGuDAkV7acHbeNLK2ea8_oo-Iop1uhSvLfF9qnwoM_T9J3VZxFYKcpMbjdpRZxDb789fcNsPV-spTZNKrl_-n1-4ira4uzLqd9oIdgp9QMzh6rRCOtK0872iIQSaETSEPiPLJONFh5mIosOcBdtgxTItSv8SHx-_ck2_SE2O1sn_rj2540TndCHxN_Taha43GCODhjOlapmrR8UEeQmNgvwgwM6FWqJXBhDl_zcMQCRcWciCH3xlz8j_cc"
                />
                <TiltCard
                  title="Personalized AI Feedback"
                  text="Instant explanations and next steps after every session so you always know your best move."
                  image="https://lh3.googleusercontent.com/aida-public/AB6AXuDYn0pGgDljerQ4cQwcFu6C3TQFn4mBFJm2EJpCZgUIAndeRz6H39268F-v4h8bA__KceAqBp1Cl73KPOz2jPyqKGclUFa8NroVMPZ53_Eu-Jc5t9X6C-xhMpxnxYQPnU8QLLK3EQ8RVBiVopR_q5sKYGx6ETcpCm9GCtg4eFMmzy8yk_8Kxv4cp-1MsUEt2CxHhG6W_-F6goKOQ58e15rxfE5XhZrnLdqYhtbDOktnhPFJsNWtFJhz0Zh1nNlZDA49qBIxFklRkKo"
                />
                <TiltCard
                  title="Achieve Your Goals"
                  text="From exams to new skills—set your target; our tutors and AI map the route and pace."
                  image="https://lh3.googleusercontent.com/aida-public/AB6AXuBgvEqh6MrQ7dVW2qwj-qjGCafebAnWEjA7iwu4aBwvJfiAvneGQcD6xH14zDIWcFdHIVF1yUOtvsMVPHKrnuxAXdqlOKj_Gbf_VBvdobGFojOpO0seljMPOx0GUF1LSkYcCU8Gd_0jz1BC4GkilnIWIs9ZGuqzsN4pO4t8xzWY2uouVckDUvvqonRhWPECRGpV5W0kGh3MF3FPXFtbXyU0DuxtazBEu50XMuUrx4CovU0y47zF1YjXjrNQg6DUZcEu_uJ1um9oLpY"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-label="How it works" className="flex justify-center py-8 lg:py-12 px-4 lg:px-40">
          <motion.div
            className="layout-content-container flex flex-col gap-6 max-w-[1100px] flex-1 w-full"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.h3 variants={fadeUp} className="text-2xl font-bold tracking-tight">
              Get started in 3 simple steps
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Step index={1} title="Tell us your goal" text="Pick subject, level, and schedule preferences." />
              <Step index={2} title="Match with a tutor" text="We surface vetted profiles with perfect fit." />
              <Step index={3} title="Learn & iterate" text="Book, learn, review, and keep the momentum." />
            </div>
          </motion.div>
        </section>

        {/* CTA band */}
        <section aria-label="Call to action" className="flex justify-center py-14 px-4 lg:px-40">
          <motion.div
              className="relative w-full max-w-[1100px] overflow-hidden rounded-2xl
                        border border-slate-200 dark:border-slate-700
                        bg-gradient-to-br from-white to-slate-50
                        dark:from-slate-900 dark:to-slate-800 shadow-sm"
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0
                              bg-[radial-gradient(60%_60%_at_100%_0%,rgba(99,102,241,0.08),transparent_60%),radial-gradient(60%_60%_at_0%_100%,rgba(34,211,238,0.08),transparent_60%)]" />
              <div className="relative flex flex-col items-center gap-3 px-6 py-10 text-center">
                <p className="text-sm font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
                  Start today
                </p>
                <h4 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Book your first session in under 2 minutes
                </h4>
                <p className="max-w-[700px] text-slate-600 dark:text-slate-300">
                  A single click to match, transparent pricing, and session reminders built-in.
                </p>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to={ctaPath}
                  className="group relative inline-flex items-center justify-center rounded-xl h-12 px-6 font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition"
                >
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition will-change-transform bg-gradient-to-r from-white/10 to-white/0" />
                  Get started
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Reviews / Testimonials */}
        <section
          id="reviews"
          aria-label="What learners say"
          className="flex justify-center py-14 lg:py-16 px-4 lg:px-40"
        >
          <motion.div
            className="relative w-full max-w-[1100px]"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <div className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10 bg-gradient-to-b from-transparent via-indigo-50/40 to-transparent dark:via-slate-800/40 rounded-3xl" />

            <motion.div variants={fadeUp} className="text-center mb-6">
              <p className="text-sm font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
                Loved by learners worldwide
              </p>
              <h3 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Real results. Real stories.
              </h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-[760px] mx-auto">
                See how students used {BRAND} to hit milestones—exams, careers, and new skills.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TESTIMONIALS.map((t, i) => (
                <TestimonialCard key={i} {...t} delay={0.05 * i} />
              ))}
            </div>
          </motion.div>
        </section>

        {/* ------------------------ SEO: AI FAQ (matches JSON-LD) ------------------------ */}
        <section
          id="ai-faq"
          aria-label="AI Learning FAQs"
          className="flex justify-center py-10 lg:py-14 px-4 lg:px-40"
        >
          <div className="w-full max-w-[1100px]">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              AI Learning FAQs
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <dt className="font-semibold">What is the AI Robot Teacher?</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
                  It’s an AI assistant that guides lessons, quizzes you, and gives instant feedback alongside your human tutor.
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <dt className="font-semibold">Is AI learning safe and accurate?</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
                  Yes. We combine vetted human tutors with AI. Tutors review AI suggestions and your plan for quality.
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <dt className="font-semibold">How much does it cost?</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
                  Pricing varies by tutor and subject. Browse transparent rates before booking your first session.
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <dt className="font-semibold">Can I learn exam prep with AI?</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
                  Absolutely. Practice with timed drills and targeted feedback while your tutor fine-tunes strategy.
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <Link
                to="/robot-teach"
                className="inline-flex items-center justify-center rounded-xl h-11 px-5 font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition"
                aria-label="Learn with AI Robot Teacher"
              >
                Try the AI Robot Teacher
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

/* ----------------------------- Subcomponents ----------------------------- */

const Hero: React.FC<{ prefersReducedMotion: boolean; ctaPath: string }> = ({
  prefersReducedMotion,
  ctaPath,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Hero background (uses VITE_HERO_BG) */}
      <motion.div
        initial={{ scale: 1.04, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex min-h-[520px] md:min-h-[560px] items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: HERO_BG
            ? `linear-gradient(rgba(2,6,23,0.15), rgba(2,6,23,0.35)), url("${HERO_BG}")`
            : undefined,
        }}
      >
        {/* Soft parallax sparkle */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={false}
          animate={prefersReducedMotion ? { opacity: 0 } : { opacity: [0.2, 0.35, 0.2] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(800px 200px at 10% 10%, rgba(255,255,255,0.12), transparent), radial-gradient(800px 200px at 90% 90%, rgba(255,255,255,0.08), transparent)',
          }}
        />

        {/* Text */}
        <div className="relative z-10 mx-auto max-w-[900px] px-4 py-10 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur"
          >
            <span>Learn anything, anytime</span>
          </motion.div>

          <motion.h1
            className="mt-4 text-4xl @[480px]:text-5xl font-black leading-tight tracking-[-0.03em]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.18 }}
          >
            Learn anything with AI + expert tutors
          </motion.h1>

          <motion.p
            className="mx-auto mt-3 max-w-[760px] text-sm @[480px]:text-base text-slate-100/90"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
          >
            Connect with expert tutors and our AI Robot Teacher. Master new skills or ace your coursework—your pace,
            your schedule.
          </motion.p>

          <motion.div
            className="mt-6 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.32 }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={ctaPath}
                className="flex min-w-[120px] items-center justify-center rounded-xl h-12 px-5 bg-white text-slate-900 text-sm font-bold tracking-[0.01em] @[480px]:text-base"
              >
                Get started
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
              <a
                href="#how-it-works"
                className="flex h-12 items-center justify-center rounded-xl px-5 text-white/90 ring-1 ring-white/40 hover:bg-white/10 transition"
              >
                See how it works
              </a>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
          <Link
            to="/org"
            aria-label="Open the Institution E-Learning portal"
            className="flex h-12 items-center justify-center rounded-xl px-5 bg-emerald-600 hover:bg-emerald-500 text-white transition"
          >
            For Institutions
          </Link>
        </motion.div>


          </motion.div>

          {/* Learn with A.I. (Robot Teacher) */}
          <motion.div
            className="mt-3 flex items-center justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.38 }}
          >
            <Link
              to="/robot-teach"
              aria-label="Learn a course using A.I. Robot Teacher"
              className="flex h-12 items-center justify-center rounded-xl px-5
               bg-black/70 hover:bg-black/80 text-white text-sm @[480px]:text-base
               font-bold tracking-[0.01em] shadow-sm
               focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
               min-w-[120px]"
            >
              <span className="mr-2">🤖</span>
              Learn with A.I.
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

type TiltCardProps = {
  title: string;
  text: string;
  image: string;
};

const TiltCard: React.FC<TiltCardProps> = ({ title, text, image }) => {
  const prefersReducedMotion = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 180, damping: 16, mass: 0.6 });
  const rotateY = useSpring(ry, { stiffness: 180, damping: 16, mass: 0.6 });

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = (x / rect.width) * 2 - 1;
      const py = (y / rect.height) * 2 - 1;
      ry.set(px * 8);
      rx.set(-py * 8);
    },
    [rx, ry, prefersReducedMotion]
  );

  const handleLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
  }, [rx, ry]);

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY }}
      whileInView={{ opacity: [0, 1], y: [12, 0] }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group perspective-[1200px] will-change-transform"
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-200/60 ring-1 ring-slate-200/60 shadow-sm transform-gpu">
        <img
          src={image}
          alt={`${title} — ${BRAND}`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          width={1280}
          height={800}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.35)), radial-gradient(40% 60% at 30% 30%, rgba(255,255,255,0.18), transparent), radial-gradient(60% 40% at 80% 80%, rgba(255,255,255,0.12), transparent)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 text-white" style={{ transform: 'translateZ(45px)' }}>
          <p className="text-base font-semibold leading-tight">{title}</p>
          <p className="text-sm text-white/85">{text}</p>
        </div>
      </div>
    </motion.div>
  );
};

const Step: React.FC<{ index: number; title: string; text: string }> = ({ index, title, text }) => {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
          {index}
        </span>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="mt-2 text-slate-600 text-sm">{text}</p>
    </motion.div>
  );
};

/* --------------------------- Reviews: Data & UI --------------------------- */

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  rating: number;   // 0..5
  avatar: string;
  result?: string;  // e.g., "Scored A in GCSE"
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Leila A.',
    role: 'IB Student — Math AA',
    quote:
      'The structured weekly plan and feedback raised my confidence fast. I moved from a 4 to a solid 6 in six weeks.',
    rating: 5,
    avatar: 'https://ui-avatars.com/api/?name=Leila+A.&background=4f46e5&color=fff',
    result: 'IB score +2',
  },
  {
    name: 'Omar H.',
    role: 'Working Pro — Data Analytics',
    quote:
      'Loved the goal-based approach. My tutor gave me practical SQL + Python tasks that mapped directly to my job.',
    rating: 5,
    avatar: 'https://ui-avatars.com/api/?name=Omar+H.&background=06b6d4&color=fff',
    result: 'Promotion-ready skills',
  },
  {
    name: 'Sophia K.',
    role: 'IGCSE — English',
    quote:
      'Clear milestones and mock reviews. I finally understood how to structure my essays under time pressure.',
    rating: 4.5,
    avatar: 'https://ui-avatars.com/api/?name=Sophia+K.&background=22c55e&color=fff',
    result: 'Grade A achieved',
  },
  {
    name: 'Rahul S.',
    role: 'Career Switch — Web Dev',
    quote:
      'The 1:1 code reviews and weekly projects kept me accountable. Shipped my first full-stack app!',
    rating: 5,
    avatar: 'https://ui-avatars.com/api/?name=Rahul+S.&background=f59e0b&color=fff',
    result: 'First portfolio shipped',
  },
  {
    name: 'Maya N.',
    role: 'SAT Prep',
    quote:
      'Practice sessions were laser-focused. The pacing tips for Reading/Math made a huge difference on test day.',
    rating: 4.5,
    avatar: 'https://ui-avatars.com/api/?name=Maya+N.&background=ec4899&color=fff',
    result: '+130 SAT points',
  },
  {
    name: 'Daniel C.',
    role: 'German A1 — Fast Track',
    quote:
      'Short, immersive sessions with speaking drills. I can introduce myself and hold basic conversations now.',
    rating: 4.5,
    avatar: 'https://ui-avatars.com/api/?name=Daniel+C.&background=0ea5e9&color=fff',
    result: 'Conversational in 6 weeks',
  },
];

const TestimonialCard: React.FC<Testimonial & { delay?: number }> = ({
  name,
  role,
  quote,
  rating,
  avatar,
  result,
  delay = 0,
}) => {
  return (
    <motion.article
      variants={fadeUp}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition"
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl bg-indigo-400/10" />
      <div className="flex items-start gap-4">
        <img
          src={avatar}
          alt={`${name} avatar`}
          className="h-12 w-12 rounded-full ring-2 ring-white dark:ring-slate-800 object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">{name}</h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
            <p className="text-xs text-slate-600 dark:text-slate-300">{role}</p>
          </div>
          <div className="mt-1">
            <StarRating value={rating} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        “{quote}”
      </p>

      {result && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-xs font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
          {result}
        </div>
      )}

      <motion.span
        aria-hidden
        initial={{ x: '-120%' }}
        whileHover={{ x: '120%' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="pointer-events-none absolute -inset-y-8 -left-20 w-24 rotate-[20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
    </motion.article>
  );
};

const StarRating: React.FC<{ value: number }> = ({ value }) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const diff = value - i;
    const full = diff >= 1;
    const half = !full && diff >= 0.5;
    return (
      <span key={i} className="inline-block">
        {full && (
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 fill-yellow-500">
            <path d="M10 15.27L15.18 18l-1.64-5.03L18 9.24l-5.19-.04L10 4 7.19 9.2 2 9.24l4.46 3.73L4.82 18 10 15.27z"/>
          </svg>
        )}
        {half && (
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
            <defs>
              <linearGradient id="half">
                <stop offset="50%" />
                <stop offset="50%" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M10 15.27L15.18 18l-1.64-5.03L18 9.24l-5.19-.04L10 4 7.19 9.2 2 9.24l4.46 3.73L4.82 18 10 15.27z" fill="url(#half)" className="fill-yellow-500"/>
            <path d="M10 15.27L15.18 18l-1.64-5.03L18 9.24l-5.19-.04L10 4 7.19 9.2 2 9.24l4.46 3.73L4.82 18 10 15.27z" className="fill-yellow-500/20" />
          </svg>
        )}
        {!full && !half && (
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
            <path d="M10 15.27L15.18 18l-1.64-5.03L18 9.24l-5.19-.04L10 4 7.19 9.2 2 9.24l4.46 3.73L4.82 18 10 15.27z" className="fill-yellow-500/20"/>
          </svg>
        )}
      </span>
    );
  });

  return <div className="flex items-center gap-0.5">{stars}</div>;
};

export default Landing;

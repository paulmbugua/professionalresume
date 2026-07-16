import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Globe2,
  GraduationCap,
  Handshake,
  Landmark,
  Layers3,
  Lightbulb,
  MapPin,
  Megaphone,
  PenLine,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react';

import { brand, kenyaMarketSegments, seoKeywords, targetAudiences } from '../../lib/brand';
import { buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `Career Resources Kenya | Job Search, CV, Interviews & Salary Guides | ${brand.name}`,
  description:
    'A Kenya-focused career resource hub for modern job seekers: CV strategy, ATS checks, cover letters, interviews, salary negotiation, LinkedIn, NGO, government, graduate, remote, and international job search guidance.',
  path: '/career-resources',
  keywords: [
    'Kenya career resources',
    'job search Kenya',
    'Kenya interview tips',
    'salary negotiation Kenya',
    'NGO jobs Kenya CV',
    'government jobs Kenya CV',
    ...seoKeywords,
  ],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Career Resources', path: '/career-resources' },
]);

const faqSchema = buildFaqSchema([
  {
    question: 'How should a Kenyan job seeker use this career resource hub?',
    answer:
      'Start with the application sprint, update your CV and cover letter for one target role, run the ATS checker, then prepare interview stories and salary expectations before applying.',
  },
  {
    question: 'What should I prepare before applying for jobs in Kenya?',
    answer:
      'Prepare an ATS-friendly CV, a role-specific cover letter, a clean LinkedIn profile, proof of qualifications, referee details, interview examples, and a clear salary range.',
  },
]);

const heroStats = [
  {
    label: 'Application assets',
    value: '5',
    detail: 'CV, cover letter, LinkedIn, portfolio, references',
  },
  { label: 'Weekly rhythm', value: '3x', detail: 'Search, tailor, follow up' },
  { label: 'Target markets', value: '11', detail: 'Kenya sectors plus global roles' },
];

const sprintSteps = [
  {
    icon: Target,
    title: 'Choose one target lane',
    body: 'Pick a role family such as accounting, sales, nursing, teaching, IT, operations, NGO programs, or administration. Build one strong profile before applying widely.',
    action: 'Define target role',
  },
  {
    icon: FileText,
    title: 'Build the master CV',
    body: 'Create a clean, ATS-friendly CV with measurable achievements, plain headings, correct dates, tools, certifications, and Kenya-ready contact details.',
    action: 'Build CV',
    href: '/builder/new?templateId=ats-minimal',
  },
  {
    icon: SearchCheck,
    title: 'Match the job advert',
    body: 'Paste the job advert into the ATS checker and add missing keywords naturally in your summary, skills, and experience bullets.',
    action: 'Run ATS check',
    href: '/ats-checker',
  },
  {
    icon: Megaphone,
    title: 'Apply and follow up',
    body: 'Submit a tailored CV and cover letter, then track where you applied, whom you contacted, and when to follow up professionally.',
    action: 'Write cover letter',
    href: '/cover-letter',
  },
];

const resourceLanes = [
  {
    icon: GraduationCap,
    title: 'Graduate and TVET launchpad',
    body: 'Turn attachments, industrial training, volunteer work, projects, leadership roles, and certifications into credible entry-level evidence.',
    points: ['First CV structure', 'Internship applications', 'No-experience achievements'],
  },
  {
    icon: Landmark,
    title: 'Government and county roles',
    body: 'Prepare formal applications for county public service boards, ministries, parastatals, commissions, and public institutions.',
    points: ['Selection criteria', 'Document checklist', 'Public-sector tone'],
  },
  {
    icon: Handshake,
    title: 'NGO, donor, and UN applications',
    body: 'Position program, finance, procurement, M&E, safeguarding, community, and grants experience using donor-ready language.',
    points: ['Donor keywords', 'Impact metrics', 'Compliance language'],
  },
  {
    icon: Building2,
    title: 'Private sector and SMEs',
    body: 'Compete for roles in banking, SACCOs, retail, logistics, hospitality, healthcare, education, tech, and operations.',
    points: ['Commercial outcomes', 'Customer impact', 'Team leadership'],
  },
  {
    icon: Globe2,
    title: 'Remote and international jobs',
    body: 'Adapt your CV for global screening systems with clear skills, timezone readiness, portfolio proof, and international resume conventions.',
    points: ['Global resume format', 'Remote tools', 'Portfolio proof'],
  },
  {
    icon: UsersRound,
    title: 'Career switchers',
    body: 'Translate transferable skills when moving between sectors such as teaching, banking, NGO work, operations, projects, support, and tech.',
    points: ['Transferable skills', 'Bridge summary', 'Project evidence'],
  },
];
const marketPlaybooks = [
  {
    segment: 'Banks and SACCOs',
    guidance:
      'Show accuracy, compliance, customer trust, sales performance, reconciliations, reporting, risk awareness, and product knowledge.',
    keywords: ['KYC', 'portfolio growth', 'reconciliations', 'customer retention'],
  },
  {
    segment: 'NGOs and UN agencies',
    guidance:
      'Connect your work to beneficiaries, grants, donor reporting, safeguarding, stakeholder management, M&E, and field coordination.',
    keywords: ['donor compliance', 'M&E', 'safeguarding', 'stakeholders'],
  },
  {
    segment: 'Government and counties',
    guidance:
      'Use formal language, match selection criteria, include required qualifications, and keep achievements factual and document-backed.',
    keywords: ['public service', 'policy', 'compliance', 'community impact'],
  },
  {
    segment: 'Technology and digital roles',
    guidance:
      'Lead with tools, shipped projects, GitHub or portfolio links, business outcomes, uptime, automation, analytics, and collaboration.',
    keywords: ['React', 'SQL', 'analytics', 'automation'],
  },
];

const interviewCards = [
  {
    icon: ClipboardCheck,
    title: 'Story bank',
    body: 'Prepare 8 strong examples covering leadership, conflict, customer service, pressure, failure, teamwork, achievement, and learning.',
  },
  {
    icon: Banknote,
    title: 'Salary range',
    body: 'Define your minimum, target, and stretch range before interviews. Anchor your answer around value, scope, market, and total benefits.',
  },
  {
    icon: ShieldCheck,
    title: 'Due diligence',
    body: 'Check the employer, role clarity, contract terms, location, working hours, reporting line, probation period, and payment reliability.',
  },
];

const toolkit = [
  {
    icon: FileText,
    title: 'Resume Builder',
    href: '/builder/new?templateId=ats-minimal',
    body: 'Create a clean CV for Kenyan and international applications.',
  },
  {
    icon: PenLine,
    title: 'Cover Letter Builder',
    href: '/cover-letter',
    body: 'Write a focused letter for each opportunity.',
  },
  {
    icon: SearchCheck,
    title: 'ATS Checker',
    href: '/ats-checker',
    body: 'Compare your CV against a job advert before applying.',
  },
  {
    icon: Layers3,
    title: 'CV Templates',
    href: '/templates',
    body: 'Pick an ATS-friendly layout that fits your level.',
  },
];

const weeklyPlan = [
  'Monday: shortlist 8 to 12 quality roles and save the exact job adverts.',
  'Tuesday: tailor your CV and cover letter for the top 3 roles.',
  'Wednesday: apply, record submissions, and connect with relevant recruiters or employees.',
  'Thursday: practice interview answers and improve weak CV sections.',
  'Friday: follow up, review response patterns, and adjust your target keywords.',
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
          <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 lg:grid-cols-[1.02fr_0.78fr] lg:px-8 lg:py-16">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200">
                <Sparkles className="size-4" />
                Career command center Kenya
              </p>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
                Practical career resources for the modern Kenyan job seeker
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">
                Build a stronger job search with clear CV strategy, ATS optimization, cover letters,
                interview preparation, salary confidence, and sector-specific guidance for Kenya and
                global opportunities.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/builder/new?templateId=ats-minimal"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Build a stronger CV
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/ats-checker"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  Check ATS score
                  <SearchCheck className="size-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <BriefcaseBusiness className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Job search operating system</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    A repeatable weekly rhythm for serious applicants.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {stat.detail}
                        </p>
                      </div>
                      <p className="text-3xl font-black text-blue-600 dark:text-blue-300">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-10 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                Application sprint
              </p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Turn one job advert into a focused application
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Use this sequence each time you apply. It keeps your CV, cover letter, keywords, and
              interview story aligned.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {sprintSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {step.body}
                  </p>
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      {step.action}
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : (
                    <p className="mt-4 text-sm font-extrabold text-slate-500 dark:text-slate-400">
                      {step.action}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/60">
          <div className="mx-auto max-w-screen-xl px-4 py-10 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  Resource lanes
                </p>
                <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                  Guidance for different career stages and markets
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  The same CV does not work for every opportunity. Choose the lane that fits your
                  current move and tailor your evidence around it.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {targetAudiences.map((audience) => (
                    <span
                      key={audience}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200"
                    >
                      {audience}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {resourceLanes.map((lane) => {
                  const Icon = lane.icon;
                  return (
                    <article
                      key={lane.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/50"
                    >
                      <div className="flex gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-white/10 dark:text-blue-200">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <h3 className="font-extrabold">{lane.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {lane.body}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-4 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                        {lane.points.map((point) => (
                          <li key={point} className="flex items-center gap-2">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-10 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                Kenya market playbooks
              </p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Write for the employer you want
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Recruiters scan for proof that matches their environment. Use sector language
                carefully, then back it with real outcomes.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {kenyaMarketSegments.slice(0, 9).map((segment) => (
                  <span
                    key={segment}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    {segment}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {marketPlaybooks.map((playbook) => (
                <article
                  key={playbook.segment}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold">{playbook.segment}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {playbook.guidance}
                      </p>
                    </div>
                    <MapPin className="size-5 shrink-0 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {playbook.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-400/10 dark:text-blue-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 text-white">
          <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-300">
                Interview and salary lab
              </p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Prepare before the interview invitation arrives
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Strong candidates do not wait until the night before. Build your proof, practice
                your answers, and know your value early.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {interviewCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-white text-slate-950">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-extrabold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-10 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <CalendarCheck2 className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Weekly plan
                  </p>
                  <h2 className="text-xl font-extrabold">A realistic job-search rhythm</h2>
                </div>
              </div>
              <ul className="mt-5 grid gap-3 text-sm text-slate-700 dark:text-slate-200">
                {weeklyPlan.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50"
                  >
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200">
                  <Lightbulb className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Quick toolkit
                  </p>
                  <h2 className="text-xl font-extrabold">Use the right tool for the next action</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {toolkit.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.title}
                      href={tool.href}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-slate-950/50 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2 font-extrabold">
                        <Icon className="size-4 text-blue-600 dark:text-blue-300" />
                        {tool.title}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {tool.body}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </article>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/60">
          <div className="mx-auto max-w-screen-xl px-4 py-10 lg:px-8">
            <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-sm lg:p-8">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-100">
                    Next best step
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold">
                    Start with the document recruiters see first
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50">
                    Build the CV, tailor it to one job advert, run the ATS checker, then send a
                    cover letter that speaks directly to the role.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/builder/new?templateId=ats-minimal"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-extrabold text-blue-700 transition hover:bg-blue-50"
                  >
                    Build CV
                    <FileSearch className="size-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"
                  >
                    View pricing
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  SearchCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { useShopContext } from '@cvpro/shared/context';

import { analyzeAtsResume, type AtsPriority, type AtsReport } from '../../utils/atsCheckerApi';

const acceptedFileTypes =
  'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx';

const priorityStyles: Record<AtsPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100',
  medium:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100',
  low: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100',
};

function scoreTone(score: number) {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-300';
  if (score >= 70) return 'text-blue-600 dark:text-blue-300';
  if (score >= 55) return 'text-amber-600 dark:text-amber-300';
  return 'text-red-600 dark:text-red-300';
}

function sectionLabel(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AtsCheckerClient() {
  const { backendUrl, token } = useShopContext() as { backendUrl?: string; token?: string | null };
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [report, setReport] = useState<AtsReport | null>(null);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(backendUrl && !isChecking && (file || resumeText.trim().length >= 80)),
    [backendUrl, file, isChecking, resumeText]
  );

  async function handleCheck() {
    if (!backendUrl) {
      setError('Backend URL is not configured. Check NEXT_PUBLIC_BACKEND_URL.');
      return;
    }

    if (!file && resumeText.trim().length < 80) {
      setError('Upload a PDF/DOCX resume or paste at least 80 characters of resume text.');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const nextReport = await analyzeAtsResume({
        backendUrl,
        token,
        file,
        resumeText,
        targetRole,
        jobDescription,
      });
      setReport(nextReport);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to check ATS fit.'
      );
    } finally {
      setIsChecking(false);
    }
  }

  function resetInputs() {
    setFile(null);
    setResumeText('');
    setTargetRole('');
    setJobDescription('');
    setReport(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)] lg:px-8 lg:py-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200">
              <SearchCheck className="size-4" />
              ATS resume checker
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">
              Check your CV before recruiters and applicant systems screen it
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Upload a PDF or DOCX resume, add the target role and job advert, then get a practical
              ATS score with missing keywords, section gaps, formatting risks, and fixes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {['PDF and DOCX', 'Job advert matching', 'Kenya-ready scoring'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-lg bg-blue-600 text-white">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold">What gets checked</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Structure, keywords, readability, contact parsing, and achievement evidence.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {['Contact', 'Sections', 'Keywords', 'Impact'].map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold dark:border-white/10 dark:bg-slate-950/40"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-screen-xl gap-6 px-4 py-8 lg:grid-cols-[minmax(360px,0.72fr)_minmax(0,1fr)] lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">Run ATS check</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Use a file upload, pasted text, or both.
              </p>
            </div>
            <button
              type="button"
              onClick={resetInputs}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label="Reset ATS checker"
              title="Reset"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Resume file
              </span>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-2 flex w-full items-center gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/70 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50 dark:border-blue-400/40 dark:bg-blue-400/10 dark:hover:bg-blue-400/15"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
                  <UploadCloud className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">
                    {file ? file.name : 'Upload PDF or DOCX'}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                    Maximum file size is 8 MB.
                  </span>
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={acceptedFileTypes}
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Target role
              </span>
              <input
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                placeholder="Example: Finance Officer, NGO Program Manager"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:focus:ring-blue-400/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Job advert or description
              </span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the exact job advert here for keyword matching."
                rows={7}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:focus:ring-blue-400/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Resume text fallback
              </span>
              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste resume text here if you do not have a file."
                rows={6}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:focus:ring-blue-400/20"
              />
            </label>

            {error ? (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCheck}
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            >
              {isChecking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SearchCheck className="size-4" />
              )}
              {isChecking ? 'Checking resume' : 'Check ATS score'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {report ? (
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      ATS score
                    </p>
                    <div className="mt-2 flex items-end gap-2">
                      <span
                        className={`text-6xl font-black leading-none ${scoreTone(report.score)}`}
                      >
                        {report.score}
                      </span>
                      <span className="pb-2 text-lg font-bold text-slate-500 dark:text-slate-400">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="max-w-md">
                    <h2 className="text-2xl font-extrabold">{report.verdict}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {report.summary}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                {report.categories.map((category) => {
                  const width = `${Math.round((category.score / category.max) * 100)}%`;
                  return (
                    <article
                      key={category.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-extrabold">{category.label}</h3>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                          {category.score}/{category.max}
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width }} />
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {category.notes.map((note) => (
                          <li key={note} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <BriefcaseBusiness className="size-5 text-blue-600 dark:text-blue-300" />
                    <h3 className="text-lg font-extrabold">Keyword match</h3>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        Matched
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(report.keywordMatch.matched.length
                          ? report.keywordMatch.matched
                          : ['Add a job advert']
                        )
                          .slice(0, 12)
                          .map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
                            >
                              {keyword}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-300">Missing</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(report.keywordMatch.missing.length
                          ? report.keywordMatch.missing
                          : ['No missing keywords found']
                        )
                          .slice(0, 12)
                          .map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-400/10 dark:text-red-100"
                            >
                              {keyword}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-blue-600 dark:text-blue-300" />
                    <h3 className="text-lg font-extrabold">Document signals</h3>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-slate-50 p-3 dark:bg-white/5">
                      <dt className="text-slate-500 dark:text-slate-400">Words</dt>
                      <dd className="mt-1 font-black">{report.document.wordCount}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3 dark:bg-white/5">
                      <dt className="text-slate-500 dark:text-slate-400">Parser</dt>
                      <dd className="mt-1 font-black">{report.document.parser || 'text'}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(report.sections).map(([key, present]) => (
                      <span
                        key={key}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          present
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
                        }`}
                      >
                        {sectionLabel(key)}
                      </span>
                    ))}
                  </div>
                </article>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                <h3 className="text-lg font-extrabold">Recommended fixes</h3>
                <div className="mt-4 space-y-3">
                  {report.recommendations.map((item) => (
                    <article
                      key={`${item.priority}-${item.title}`}
                      className={`rounded-lg border p-4 ${priorityStyles[item.priority]}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-current dark:bg-white/10">
                          {item.priority}
                        </span>
                        <h4 className="font-extrabold">{item.title}</h4>
                      </div>
                      <p className="mt-2 text-sm leading-6">{item.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="grid min-h-[520px] place-items-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="max-w-md">
                <div className="mx-auto grid size-16 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-200">
                  <SearchCheck className="size-8" />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold">Your ATS report will appear here</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Upload a resume and paste the job advert to see keyword gaps, structure checks,
                  formatting risks, and practical recommendations.
                </p>
                <Link
                  href="/builder/new?templateId=ats-minimal"
                  className="mt-5 inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Build ATS-friendly resume
                </Link>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

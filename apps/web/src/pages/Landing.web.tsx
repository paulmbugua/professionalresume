import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useMyCvDrafts } from '@mytutorapp/shared/hooks';

const Landing: React.FC = () => {
  const { token, backendUrl } = useShopContext() as any;
  const { data: drafts = [] } = useMyCvDrafts({
    backendUrl,
    token,
  });

  const hasDrafts = drafts.length > 0;

  return (
    <div className="bg-softGray dark:bg-darkBg">
      <Helmet>
        <title>CVPro | Premium CV Builder</title>
        <meta
          name="description"
          content="Build premium, ATS-ready CVs in minutes with live previews, templates, and AI-assisted writing."
        />
      </Helmet>

      <section className="mx-auto flex w-full max-w-screen-2xl flex-col gap-10 px-4 pb-16 pt-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">CVPro Builder</p>
          <h1 className="text-4xl font-semibold leading-tight text-gray-900 dark:text-white sm:text-5xl">
            Build a premium CV with live previews, smart layouts, and AI assistance.
          </h1>
          <p className="text-base text-gray-600 dark:text-white/70">
            Choose from modern templates, edit in a clean workspace, and export print-ready
            CVs with perfect A4 formatting. Everything autosaves so you never lose progress.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/templates"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white"
            >
              Choose a template
            </Link>
            {token && hasDrafts && (
              <Link
                to="/builder"
                className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                Continue editing
              </Link>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              'Live preview + autosave',
              'ATS-ready formatting',
              'AI-written summaries',
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-gray-200 bg-white/70 p-3 text-xs text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-white/5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-softGray p-6 text-sm text-gray-500 dark:border-white/10 dark:from-white/10 dark:to-darkCard">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-400">Modern Sidebar</p>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Design-forward layout</h3>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Preview</span>
              </div>
              <div className="mt-6 grid gap-2">
                <div className="h-2 w-3/4 rounded-full bg-gray-200" />
                <div className="h-2 w-1/2 rounded-full bg-gray-200" />
                <div className="h-20 rounded-xl bg-gray-100" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white/80 p-4 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                <p className="font-semibold text-gray-900 dark:text-white">Smart section manager</p>
                <p>Reorder, toggle, and keep it to one page.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white/80 p-4 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                <p className="font-semibold text-gray-900 dark:text-white">Instant AI polish</p>
                <p>Rewrite bullets and summaries in seconds.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;

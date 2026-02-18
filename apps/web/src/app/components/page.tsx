import Link from 'next/link';

const componentRoutes = [
  '/components/cv/top-nav',
  '/components/cv/preview',
  '/components/cv/template-gallery',
  '/components/cv/template-card',
  '/components/cv/print-export-button',
  '/components/cv/section-manager',
  '/components/cv/template-debug-panel',
  '/components/cv/templates/ats-minimal',
  '/components/cv/templates/modern-sidebar',
  '/components/cv/templates/bold-header',
  '/components/cv/templates/elegant-serif',
  '/components/cv/templates/creative-timeline',
  '/components/cv/templates/compact-one-pager',
];

export default function ComponentsIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Components routes</h1>
      <ul className="mt-6 list-disc space-y-2 pl-6">
        {componentRoutes.map((route) => (
          <li key={route}>
            <Link className="text-primary underline" href={route}>{route}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

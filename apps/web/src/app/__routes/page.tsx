const routes = [
  {
    url: '/',
    wrapper: 'src/app/page.tsx',
    component: 'src/features/cv-landing/CvLandingPage.tsx (via src/pages/Landing.web.tsx)',
  },
  { url: '/login', wrapper: 'src/app/login/page.tsx', component: 'src/pages/LoginPage.web.tsx' },
  {
    url: '/templates',
    wrapper: 'src/app/templates/page.tsx',
    component: 'src/pages/CvTemplates.web.tsx',
  },
  { url: '/builder', wrapper: 'src/app/builder/page.tsx', component: 'src/pages/CvDrafts.web.tsx' },
  {
    url: '/builder/new',
    wrapper: 'src/app/builder/new/page.tsx',
    component: 'src/pages/CvBuilderNew.web.tsx',
  },
  {
    url: '/builder/[id]',
    wrapper: 'src/app/builder/[id]/page.tsx',
    component: 'src/pages/CvBuilderPage.web.tsx',
  },
  {
    url: '/profile',
    wrapper: 'src/app/profile/page.tsx',
    component: 'src/pages/ProfilePage.web.tsx',
  },

  {
    url: '/cover-letters',
    wrapper: 'src/app/cover-letters/page.tsx',
    component: 'src/pages/CoverLetters.web.tsx',
  },
  {
    url: '/cover-letters/new',
    wrapper: 'src/app/cover-letters/new/page.tsx',
    component: 'src/pages/CoverLetterNew.web.tsx',
  },
  {
    url: '/cover-letters/templates',
    wrapper: 'src/app/cover-letters/templates/page.tsx',
    component: 'src/pages/CoverLetterTemplates.web.tsx',
  },
  {
    url: '/cover-letters/editor/[id]',
    wrapper: 'src/app/cover-letters/editor/[id]/page.tsx',
    component: 'src/pages/CoverLetterBuilderPage.web.tsx',
  },
  {
    url: '/cover-letters/[id]',
    wrapper: 'src/app/cover-letters/[id]/page.tsx',
    component: 'legacy redirect to /cover-letters/editor/[id]',
  },
  { url: '/help', wrapper: 'src/app/help/page.tsx', component: 'src/pages/HelpPage.web.tsx' },
  {
    url: '/find-tutor',
    wrapper: 'src/app/find-tutor/page.tsx',
    component: 'src/pages/FindTutor.web.tsx',
  },
  {
    url: '/messages',
    wrapper: 'src/app/messages/page.tsx',
    component: 'src/pages/Messages.web.tsx',
  },
  {
    url: '/anti-spam-policy',
    wrapper: 'src/app/anti-spam-policy/page.tsx',
    component: 'src/pages/AntiSpamPolicy.tsx',
  },
  {
    url: '/complaints-feedback',
    wrapper: 'src/app/complaints-feedback/page.tsx',
    component: 'src/pages/ComplaintsFeedback.tsx',
  },
  {
    url: '/fulfillment',
    wrapper: 'src/app/fulfillment/page.tsx',
    component: 'src/pages/FulfillmentPolicy.tsx',
  },
  {
    url: '/cookie-policy',
    wrapper: 'src/app/cookie-policy/page.tsx',
    component: 'src/pages/CookiePolicy.web.tsx',
  },
  { url: '/components', wrapper: 'src/app/components/page.tsx', component: 'components index' },
  {
    url: '/components/cv/top-nav',
    wrapper: 'src/app/components/cv/top-nav/page.tsx',
    component: 'src/components/cv/CvTopNav.tsx',
  },
  {
    url: '/components/cv/preview',
    wrapper: 'src/app/components/cv/preview/page.tsx',
    component: 'src/components/cv/CvPreview.tsx',
  },
  {
    url: '/components/cv/template-gallery',
    wrapper: 'src/app/components/cv/template-gallery/page.tsx',
    component: 'src/components/cv/TemplateGallery.tsx',
  },
  {
    url: '/components/cv/template-card',
    wrapper: 'src/app/components/cv/template-card/page.tsx',
    component: 'src/components/cv/TemplateCard.tsx',
  },
  {
    url: '/components/cv/print-export-button',
    wrapper: 'src/app/components/cv/print-export-button/page.tsx',
    component: 'src/components/cv/PrintExportButton.tsx',
  },
  {
    url: '/components/cv/section-manager',
    wrapper: 'src/app/components/cv/section-manager/page.tsx',
    component: 'src/components/cv/SectionManager.tsx',
  },
  {
    url: '/components/cv/template-debug-panel',
    wrapper: 'src/app/components/cv/template-debug-panel/page.tsx',
    component: 'src/components/cv/TemplateDebugPanel.tsx',
  },
  {
    url: '/components/cv/templates/ats-minimal',
    wrapper: 'src/app/components/cv/templates/ats-minimal/page.tsx',
    component: 'src/components/cv/templates/AtsMinimal.tsx',
  },
  {
    url: '/components/cv/templates/modern-sidebar',
    wrapper: 'src/app/components/cv/templates/modern-sidebar/page.tsx',
    component: 'src/components/cv/templates/ModernSidebar.tsx',
  },
  {
    url: '/components/cv/templates/bold-header',
    wrapper: 'src/app/components/cv/templates/bold-header/page.tsx',
    component: 'src/components/cv/templates/BoldHeader.tsx',
  },
  {
    url: '/components/cv/templates/elegant-serif',
    wrapper: 'src/app/components/cv/templates/elegant-serif/page.tsx',
    component: 'src/components/cv/templates/ElegantSerif.tsx',
  },
  {
    url: '/components/cv/templates/creative-timeline',
    wrapper: 'src/app/components/cv/templates/creative-timeline/page.tsx',
    component: 'src/components/cv/templates/CreativeTimeline.tsx',
  },
  {
    url: '/components/cv/templates/compact-one-pager',
    wrapper: 'src/app/components/cv/templates/compact-one-pager/page.tsx',
    component: 'src/components/cv/templates/CompactOnePager.tsx',
  },
];

export default function RoutesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">App Routes Map</h1>
      <ul className="mt-6 space-y-3 text-sm">
        {routes.map((route) => (
          <li key={route.url} className="rounded-lg border border-gray-200 p-3">
            <p>
              <strong>{route.url}</strong>
            </p>
            <p>
              Wrapper: <code>{route.wrapper}</code>
            </p>
            <p>
              Component: <code>{route.component}</code>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}

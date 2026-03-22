# App route map (legacy page + wrapper)

| URL | App Router wrapper | Screen component |
|---|---|---|
| `/` | `src/app/page.tsx` | `src/pages/Landing.web.tsx` |
| `/login` | `src/app/login/page.tsx` | `src/pages/LoginPage.web.tsx` |
| `/templates` | `src/app/templates/page.tsx` | `src/pages/CvTemplates.web.tsx` |
| `/builder` | `src/app/builder/page.tsx` | `src/pages/CvDrafts.web.tsx` |
| `/builder/new` | `src/app/builder/new/page.tsx` | `src/pages/CvBuilderNew.web.tsx` |
| `/builder/[id]` | `src/app/builder/[id]/page.tsx` | `src/pages/CvBuilderPage.web.tsx` |
| `/cover-letters` | `src/app/cover-letters/page.tsx` | `src/pages/CoverLetters.web.tsx` |
| `/cover-letters/new` | `src/app/cover-letters/new/page.tsx` | `src/pages/CoverLetterNew.web.tsx` |
| `/cover-letters/[id]` | `src/app/cover-letters/[id]/page.tsx` | `src/pages/CoverLetterPage.web.tsx` |
| `/help` | `src/app/help/page.tsx` | `src/pages/HelpPage.web.tsx` |
| `/find-tutor` | `src/app/find-tutor/page.tsx` | `src/pages/FindTutor.web.tsx` |
| `/messages` | `src/app/messages/page.tsx` | `src/pages/Messages.web.tsx` |
| `/anti-spam-policy` | `src/app/anti-spam-policy/page.tsx` | `src/pages/AntiSpamPolicy.tsx` |
| `/complaints-feedback` | `src/app/complaints-feedback/page.tsx` | `src/pages/ComplaintsFeedback.tsx` |
| `/fulfillment` | `src/app/fulfillment/page.tsx` | `src/pages/FulfillmentPolicy.tsx` |
| `/cookie-policy` | `src/app/cookie-policy/page.tsx` | `src/pages/CookiePolicy.web.tsx` |
| `/__routes` | `src/app/__routes/page.tsx` | inline map page |
| `/components` | `src/app/components/page.tsx` | components index |
| `/components/cv/top-nav` | `src/app/components/cv/top-nav/page.tsx` | `src/components/cv/CvTopNav.tsx` |
| `/components/cv/preview` | `src/app/components/cv/preview/page.tsx` | `src/components/cv/CvPreview.tsx` |
| `/components/cv/template-gallery` | `src/app/components/cv/template-gallery/page.tsx` | `src/components/cv/TemplateGallery.tsx` |
| `/components/cv/template-card` | `src/app/components/cv/template-card/page.tsx` | `src/components/cv/TemplateCard.tsx` |
| `/components/cv/print-export-button` | `src/app/components/cv/print-export-button/page.tsx` | `src/components/cv/PrintExportButton.tsx` |
| `/components/cv/section-manager` | `src/app/components/cv/section-manager/page.tsx` | `src/components/cv/SectionManager.tsx` |
| `/components/cv/template-debug-panel` | `src/app/components/cv/template-debug-panel/page.tsx` | `src/components/cv/TemplateDebugPanel.tsx` |
| `/components/cv/templates/ats-minimal` | `src/app/components/cv/templates/ats-minimal/page.tsx` | `src/components/cv/templates/AtsMinimal.tsx` |
| `/components/cv/templates/modern-sidebar` | `src/app/components/cv/templates/modern-sidebar/page.tsx` | `src/components/cv/templates/ModernSidebar.tsx` |
| `/components/cv/templates/bold-header` | `src/app/components/cv/templates/bold-header/page.tsx` | `src/components/cv/templates/BoldHeader.tsx` |
| `/components/cv/templates/elegant-serif` | `src/app/components/cv/templates/elegant-serif/page.tsx` | `src/components/cv/templates/ElegantSerif.tsx` |
| `/components/cv/templates/creative-timeline` | `src/app/components/cv/templates/creative-timeline/page.tsx` | `src/components/cv/templates/CreativeTimeline.tsx` |
| `/components/cv/templates/compact-one-pager` | `src/app/components/cv/templates/compact-one-pager/page.tsx` | `src/components/cv/templates/CompactOnePager.tsx` |

## Verification checklist

- [ ] `/login?returnTo=%2Ftemplates` renders login UI (no 404)
- [ ] `/templates` renders templates screen
- [ ] unauthenticated `/templates` redirects to `/login?returnTo=%2Ftemplates`
- [ ] login redirects to sanitized `returnTo`
- [ ] `/builder` and `/builder/new` resolve without 404
- [ ] `/cover-letters`, `/cover-letters/new`, and `/cover-letters/[id]` resolve without 404
- [ ] unauthenticated `/cover-letters` redirects to `/login?returnTo=%2Fcover-letters`
- [ ] `/__routes` lists all wrapper mappings

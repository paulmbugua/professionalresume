import React from 'react';

import SupportPageLayout from '../components/site/SupportPageLayout';

const lastUpdated = 'March 28, 2026';

export default function CookiePolicyPage() {
  return (
    <SupportPageLayout
      eyebrow="Legal"
      title="Cookie Policy"
      description="This Cookie Policy explains how CVPro (onedollarcvpro.com) uses cookies and similar technologies when you browse our website and use our $1 AI-powered resume/CV and cover letter tools."
      lastUpdated={lastUpdated}
      sections={[
        {
          id: 'what-are-cookies',
          title: 'What cookies are',
          body: (
            <p>
              Cookies are small text files placed on your browser or device when you visit a website.
              They help websites recognize your session, remember preferences, and improve overall
              performance.
            </p>
          ),
        },
        {
          id: 'why-we-use-cookies',
          title: 'Why CVPro uses cookies',
          body: (
            <p>
              CVPro uses cookies to run core platform features, keep your session secure, improve
              reliability, and understand how users interact with resume and cover letter creation
              workflows so we can improve quality and speed.
            </p>
          ),
        },
        {
          id: 'cookie-categories',
          title: 'Types of cookies we use',
          body: (
            <>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Essential cookies:</strong> Required for login state, account access,
                  payments, and saving your resume/CV edits.
                </li>
                <li>
                  <strong>Analytics and performance cookies:</strong> Help us measure speed, errors,
                  and usage trends so we can optimize the builder and template experience.
                </li>
                <li>
                  <strong>Functionality and preferences cookies:</strong> Remember settings such as
                  theme mode and interface preferences to provide a consistent experience.
                </li>
                <li>
                  <strong>Security and fraud-prevention cookies:</strong> Support abuse detection,
                  suspicious activity monitoring, and account/session protection.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: 'third-party',
          title: 'Third-party services and cookies',
          body: (
            <>
              <p>
                Some features may rely on third-party services (for example, analytics, payment, or
                infrastructure providers). These services may set cookies or similar identifiers to
                operate securely and reliably.
              </p>
              <p>
                We work with providers that are relevant to delivering CVPro services and do not use
                cookies for unrelated purposes.
              </p>
            </>
          ),
        },
        {
          id: 'controls',
          title: 'How to control cookies',
          body: (
            <>
              <p>
                You can usually control cookies through your browser settings (such as deleting,
                blocking, or receiving alerts before cookies are stored). Browser help pages from
                Chrome, Safari, Firefox, and Edge explain these options in detail.
              </p>
              <p>
                Please note that disabling certain cookies may impact platform functionality, including
                login persistence, save behavior, checkout reliability, and customization features.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}

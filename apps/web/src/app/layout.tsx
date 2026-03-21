import type { Metadata } from 'next';
import '../index.css';
import Providers from './providers';
import CvTopNav from '../components/cv/CvTopNav';

export const metadata: Metadata = {
  title: 'CVPro | Premium CV Builder',
  description: 'Build premium, ATS-ready CVs with templates, live previews, and AI assistance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeInitScript = `
    (function () {
      try {
        var stored = localStorage.getItem('cvpro-theme');
        var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored === 'light' || stored === 'dark' ? stored : (systemDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="app-body">
        <Providers>
          <div className="app-shell">
            <CvTopNav />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import '../index.css';
import Providers from './providers';
import CvTopNav from '../components/cv/CvTopNav';

export const metadata: Metadata = {
  title: 'CVPro | Premium CV Builder',
  description:
    'Build premium, ATS-ready CVs with templates, live previews, and AI assistance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-body">
        <Providers>
          <div className="min-h-screen bg-softGray dark:bg-darkBg text-darkText dark:text-darkTextPrimary">
            <CvTopNav />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

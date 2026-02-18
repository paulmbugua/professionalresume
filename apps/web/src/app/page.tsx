import type { Metadata } from 'next';
import LandingPage from '../pages/Landing.web';

export const metadata: Metadata = {
  title: 'CVPro | Premium CV Builder',
  description: 'Build premium, ATS-ready CVs in minutes with live previews, templates, and AI-assisted writing.',
};

export default function Page() {
  return <LandingPage />;
}

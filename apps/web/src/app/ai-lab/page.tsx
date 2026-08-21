import type { Metadata } from 'next';
import AiLabClient from './AiLabClient';
export const metadata: Metadata = { robots: { index: false, follow: false }, title: 'AI Lab | ProfessionalResume', description: 'Grounded career workflows with retrieval, citations, and quality checks.' };
export default function Page() { return <AiLabClient />; }

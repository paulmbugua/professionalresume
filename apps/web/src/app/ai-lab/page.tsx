import type { Metadata } from 'next';
import AiLabClient from './AiLabClient';
export const metadata: Metadata = { title: 'AI Lab | ProfessionalResume', description: 'Grounded career workflows with retrieval, citations, and quality checks.' };
export default function Page() { return <AiLabClient />; }

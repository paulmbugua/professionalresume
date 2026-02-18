'use client';

import TemplateCard from '../../../../../components/cv/TemplateCard';
import { demoTemplate } from '../demoData';

export default function Page() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <TemplateCard template={demoTemplate} onSelect={() => {}} />
    </main>
  );
}

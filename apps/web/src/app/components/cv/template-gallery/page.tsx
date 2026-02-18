'use client';

import TemplateGallery from '../../../../../components/cv/TemplateGallery';
import { demoTemplates } from '../demoData';

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <TemplateGallery templates={demoTemplates} onSelect={() => {}} />
    </main>
  );
}

'use client';

import { useState } from 'react';
import type { CvSectionKey } from '@mytutorapp/shared/types';
import SectionManager from '../../../../../components/cv/SectionManager';
import { demoSectionOrder, demoSectionVisibility } from '../demoData';

export default function Page() {
  const [state, setState] = useState<{
    sectionOrder: CvSectionKey[];
    sectionVisibility: Record<CvSectionKey, boolean>;
  }>({
    sectionOrder: demoSectionOrder,
    sectionVisibility: demoSectionVisibility,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <SectionManager
        sectionOrder={state.sectionOrder}
        sectionVisibility={state.sectionVisibility}
        onChange={setState}
      />
    </main>
  );
}

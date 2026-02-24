'use client';

import { useState } from 'react';
import PrintExportButton from '../../../../components/cv/PrintExportButton';

export default function Page() {
  const [isExporting, setIsExporting] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PrintExportButton
        isExporting={isExporting}
        downloadUrl="https://example.com/sample.pdf"
        onCopyLink={() => {}}
        onExport={() => {
          setIsExporting(true);
          setTimeout(() => setIsExporting(false), 500);
        }}
      />
    </main>
  );
}

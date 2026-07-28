import React from 'react';
import { Download, FileDown, Link2, Printer } from 'lucide-react';

type Props = {
  onExport: () => void;
  isExporting?: boolean;
  downloadUrl?: string;
  onCopyLink?: () => void;
  onPrint: () => void;
};

const PrintExportButton: React.FC<Props> = ({
  onExport,
  isExporting,
  downloadUrl,
  onCopyLink,
  onPrint,
}) => {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        <Printer className="h-4 w-4" aria-hidden />
        Print
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={Boolean(isExporting)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
      >
        <FileDown className="h-4 w-4" aria-hidden />
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </button>
      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </a>
      )}
      {downloadUrl && (
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          Copy link
        </button>
      )}
    </div>
  );
};

export default PrintExportButton;

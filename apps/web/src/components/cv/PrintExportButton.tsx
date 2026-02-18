import React from 'react';

type Props = {
  onExport: () => void;
  isExporting?: boolean;
  downloadUrl?: string;
  onCopyLink?: () => void;
};

const PrintExportButton: React.FC<Props> = ({ onExport, isExporting, downloadUrl, onCopyLink }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        Print
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={Boolean(isExporting)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
      >
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </button>
      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          Download
        </a>
      )}
      {downloadUrl && (
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          Copy link
        </button>
      )}
    </div>
  );
};

export default PrintExportButton;

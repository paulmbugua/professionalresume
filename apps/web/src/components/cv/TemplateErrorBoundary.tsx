'use client';

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const TemplateErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => {
  const importMetaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const isDev =
    importMetaEnv?.DEV ??
    (typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false);
  if (isDev) {
    console.error('[TemplateErrorBoundary] preview error:', error);
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
      <p className="font-semibold">Template rendering failed.</p>
      <p className="mt-1 text-xs text-rose-600">
        Please try again or switch templates. This error is visible so previews never fail silently.
      </p>
      {isDev && (
        <pre className="mt-3 whitespace-pre-wrap text-xs text-rose-600">{error.message}</pre>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
        >
          Reset preview
        </button>
        <a
          href="/templates"
          className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
        >
          Back to templates
        </a>
      </div>
    </div>
  );
};

const TemplateErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <ErrorBoundary FallbackComponent={TemplateErrorFallback}>{children}</ErrorBoundary>;
};

export default TemplateErrorBoundary;

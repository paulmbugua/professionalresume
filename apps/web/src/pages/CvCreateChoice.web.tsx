'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { parseUploadedCv } from '../utils/cvParseApi';

const DEFAULT_TEMPLATE = 'ats-minimal';
const IMPORT_STORAGE_KEY = 'cvpro:imported-draft';
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];

const isAllowedFile = (file: File | null) => {
  if (!file) return false;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return Boolean(ext && ACCEPTED_EXTENSIONS.includes(ext));
};

const CvCreateChoicePage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = useMemo(
    () => searchParams?.get('templateId')?.trim() || DEFAULT_TEMPLATE,
    [searchParams]
  );

  const { backendUrl, token } = useShopContext() as any;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('replace');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const closeModal = useCallback(() => {
    if (isImporting) return;
    setIsModalOpen(false);
    setError(null);
    setFile(null);
  }, [isImporting]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isModalOpen, closeModal]);

  const startFromScratch = () => {
    router.push(`/builder/new?templateId=${encodeURIComponent(templateId)}`);
  };

  const onFilePicked = (nextFile: File | null) => {
    setFile(nextFile);
    setError(nextFile && !isAllowedFile(nextFile) ? 'Please upload a .pdf, .doc, or .docx file.' : null);
  };

  const uploadAndImport = async () => {
    if (!token || !backendUrl) {
      setError('Please sign in and try again.');
      return;
    }
    if (!file) {
      setError('Please choose a file first.');
      return;
    }
    if (!isAllowedFile(file)) {
      setError('Invalid format. Use .pdf, .doc, or .docx.');
      return;
    }

    try {
      setIsImporting(true);
      setError(null);
      const parsed = await parseUploadedCv({ backendUrl, token, file, mode });
      const payload = parsed?.extracted ?? null;
      if (!payload) {
        throw new Error('Could not read resume content from that file.');
      }
      sessionStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(payload));
      router.push(`/builder/new?templateId=${encodeURIComponent(templateId)}&importFrom=upload`);
    } catch (e: any) {
      setError(e?.message || 'Import failed. Please try another file.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8] px-4 py-10 dark:bg-[#0a0f1b] sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center text-4xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          How would you like to create your resume?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-gray-500 dark:text-white/60">
          Pick one option to continue with your selected template.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={startFromScratch}
            className="group rounded-3xl border border-gray-200 bg-white p-8 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Option 1</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Start from scratch</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-white/70">
              Build your resume section by section with live preview.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="group rounded-3xl border border-gray-200 bg-white p-8 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Option 2</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              Upload your document (.pdf, .word)
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-white/70">
              Import an existing resume and continue editing instantly.
            </p>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Upload resume">
          <button
            type="button"
            aria-label="Close upload modal"
            onClick={closeModal}
            className="absolute inset-0 bg-black/45"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#0f172a]">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload your resume</h3>
                <button type="button" onClick={closeModal} className="text-sm text-gray-500">Close</button>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/60">Supports .pdf, .doc, .docx</p>

              <label
                className={`mt-4 block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50 dark:border-white/20 dark:bg-white/5'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  onFilePicked(e.dataTransfer.files?.[0] || null);
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => onFilePicked(e.target.files?.[0] || null)}
                />
                <p className="text-sm font-medium text-gray-700 dark:text-white/80">Drag and drop file here</p>
                <p className="mt-1 text-xs text-gray-500">or click to browse</p>
                {file ? <p className="mt-3 text-xs text-gray-600 dark:text-white/70">Selected: {file.name}</p> : null}
              </label>

              <label className="mt-4 flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
                <input
                  type="checkbox"
                  checked={mode === 'merge'}
                  onChange={(e) => setMode(e.target.checked ? 'merge' : 'replace')}
                />
                Merge with existing draft data
              </label>

              {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isImporting || !file}
                  onClick={uploadAndImport}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isImporting ? 'Importing...' : 'Import and continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvCreateChoicePage;

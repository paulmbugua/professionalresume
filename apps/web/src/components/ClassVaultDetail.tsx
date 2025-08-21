// apps/web/src/components/ClassVaultDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faFilePdf, faDownload, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { useClassVaultDetail } from '@mytutorapp/shared/hooks/useClassVault';

export default function ClassVaultDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { backendUrl } = useShopContext();
  const videoId = Number(id);

  const { video, resources, unlockContent, error } = useClassVaultDetail(videoId);
  const [unlockError, setUnlockError] = useState('');

  // Fetch protected URLs on mount
  useEffect(() => {
    unlockContent().catch((err) => setUnlockError(err.message || ''));
  }, [unlockContent, videoId]);

  // Helpers to resolve URLs
  const resolveUrl = (maybeUrl?: string) => {
    if (!maybeUrl) return '';
    return maybeUrl.startsWith('http') ? maybeUrl : `${backendUrl}${maybeUrl}`;
  };

  // Error state
  if (error) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-darkBg
                   text-[#0d141c] dark:text-darkTextPrimary px-4"
        style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
      >
        <div className="rounded-2xl w-full max-w-xl p-6 text-center ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821]">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!video) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-darkBg
                   text-[#0d141c] dark:text-darkTextPrimary px-4"
        style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
      >
        <div className="rounded-full p-4 ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821]">
          <svg className="animate-spin h-7 w-7 text-[#3d99f5]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      </div>
    );
  }

  // Now safe: video is defined
  const v = video!;
  const tags = v.tags ?? [];

  const fullVideoUrl = resolveUrl(resources?.video_url);
  const previewUrl = resolveUrl(v.preview_url);
  const displayVideo = fullVideoUrl || previewUrl;
  const pdfUrl = resolveUrl(resources?.pdf_url);

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div
      className="relative min-h-screen flex justify-center bg-slate-50 dark:bg-darkBg
                 text-[#0d141c] dark:text-darkTextPrimary px-4 py-6"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      <article className="w-full max-w-3xl space-y-5">
        {/* Title card */}
        <header className="rounded-2xl ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-5">
          <h1 className="text-[22px] sm:text-2xl font-bold leading-tight tracking-[-0.015em] text-[#0d141c] dark:text-darkTextPrimary text-center">
            {v.title}
          </h1>
        </header>

        {/* Video card */}
        {displayVideo && (
          <section className="rounded-2xl overflow-hidden ring-1 ring-[#cedbe8] dark:ring-darkCard bg-black">
            <div className="w-full aspect-video bg-black">
              <video
                src={displayVideo}
                className="w-full h-full object-contain bg-black"
                controls
                autoPlay={!!fullVideoUrl}
              />
            </div>
          </section>
        )}

        {/* Meta + Description */}
        <section className="rounded-2xl ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">Subject</p>
              <p className="text-[#0d141c] dark:text-darkTextPrimary font-semibold">{v.subject ?? '—'}</p>
            </div>

            <div className="flex flex-col">
              <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">Grade Level</p>
              <p className="text-[#0d141c] dark:text-darkTextPrimary font-semibold">{v.grade_level ?? '—'}</p>
            </div>
          </div>

          {v.description && (
            <div className="flex flex-col">
              <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">Description</p>
              <p className="text-[#0d141c] dark:text-darkTextPrimary leading-relaxed">{v.description}</p>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-col">
              <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">Tags</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs sm:text-sm rounded-full px-2 py-1
                               bg-[#e7edf4] text-[#0d141c]
                               dark:bg-[#172534] dark:text-darkTextPrimary
                               ring-1 ring-[#cedbe8] dark:ring-darkCard"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="rounded-2xl ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-5 space-y-3">
          {v.pdf_url && (
            <button
              onClick={() => {
                if (pdfUrl) openLink(pdfUrl);
                else navigate('/buy-tokens');
              }}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 font-semibold transition
                ${
                  pdfUrl
                    ? 'bg-[#0d141c] text-white hover:brightness-110 dark:bg-[#0d141c]'
                    : 'bg-[#e7edf4] text-[#49739c] cursor-pointer'
                }`}
              title={pdfUrl ? 'Download Class Notes (PDF)' : 'Purchase to Access PDF'}
            >
              <FontAwesomeIcon
                icon={(pdfUrl ? faDownload : faShoppingCart) as IconProp}
                className="text-current"
              />
              <span>
                {pdfUrl ? 'Download Class Notes (PDF)' : 'Purchase to Access PDF'}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              if (fullVideoUrl) openLink(fullVideoUrl);
              else navigate('/buy-tokens');
            }}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 font-semibold transition
              ${
                fullVideoUrl
                  ? 'bg-[#3d99f5] text-white hover:brightness-110'
                  : 'bg-[#e7edf4] text-[#49739c] cursor-pointer'
              }`}
            title={fullVideoUrl ? 'Download Full Video' : 'Purchase to Access Video'}
          >
            <FontAwesomeIcon
              icon={(fullVideoUrl ? faDownload : faShoppingCart) as IconProp}
              className="text-current"
            />
            <span>{fullVideoUrl ? 'Download Full Video' : 'Purchase to Access Video'}</span>
          </button>

          {unlockError && (
            <p className="text-amber-600 dark:text-amber-400 text-center text-sm">{unlockError}</p>
          )}

          {/* Small helper row */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <FontAwesomeIcon icon={faFilePdf as IconProp} className="text-[#49739c] dark:text-darkTextSecondary" />
            <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
              Downloads open in a new tab.
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}

// apps/web/src/components/ClassVaultDetail.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faFilePdf,
  faDownload,
  faShoppingCart,
} from '@fortawesome/free-solid-svg-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { useClassVaultDetail } from '@mytutorapp/shared/hooks/useClassVault';

export default function ClassVaultDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { backendUrl } = useShopContext();
  const videoId = Number(id);

  const { video, resources, unlockContent, error } = useClassVaultDetail(videoId);
  const [unlockError, setUnlockError] = useState('');

  // fetch protected URLs on mount
  useEffect(() => {
    unlockContent().catch(err => setUnlockError(err.message || ''));
  }, [unlockContent, videoId]);

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Loading state
  if (!video) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-pink-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  // Now safe: video is defined
  const v = video!;
  const tags = v.tags ?? [];

  // Helpers to resolve URLs
  const resolveUrl = (maybeUrl?: string) => {
    if (!maybeUrl) return '';
    return maybeUrl.startsWith('http') ? maybeUrl : `${backendUrl}${maybeUrl}`;
  };
  const fullVideoUrl = resolveUrl(resources?.video_url);
  const previewUrl   = resolveUrl(v.preview_url);
  const displayVideo = fullVideoUrl || previewUrl;
  const pdfUrl       = resolveUrl(resources?.pdf_url);

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-center">{v.title}</h1>

      {/* Video */}
      {displayVideo && (
        <div className="w-full h-64 bg-black rounded-lg overflow-hidden">
          <video
            src={displayVideo}
            className="w-full h-full object-contain"
            controls
            autoPlay={!!fullVideoUrl}
          />
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-4">
        <div>
          <p className="text-gray-500">Subject</p>
          <p className="text-gray-900 font-medium">{v.subject}</p>
        </div>
        <div>
          <p className="text-gray-500">Grade Level</p>
          <p className="text-gray-900 font-medium">{v.grade_level}</p>
        </div>
        {v.description && (
          <div>
            <p className="text-gray-500">Description</p>
            <p className="text-gray-900">{v.description}</p>
          </div>
        )}
        {tags.length > 0 && (
          <div>
            <p className="text-gray-500">Tags</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="text-sm bg-gray-200 px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {v.pdf_url && (
          <button
            onClick={() => {
              if (pdfUrl) openLink(pdfUrl);
              else navigate('/buy-tokens');
            }}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg transition ${
              pdfUrl
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            <FontAwesomeIcon
              icon={(pdfUrl ? faDownload : faShoppingCart) as IconProp}
              className="mr-2"
            />
            {pdfUrl
              ? 'Download Class Notes (PDF)'
              : 'Purchase to Access PDF'}
          </button>
        )}

        <button
          onClick={() => {
            if (fullVideoUrl) openLink(fullVideoUrl);
            else navigate('/buy-tokens');
          }}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-lg transition ${
            fullVideoUrl
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          <FontAwesomeIcon
            icon={(fullVideoUrl ? faDownload : faShoppingCart) as IconProp}
            className="mr-2"
          />
          {fullVideoUrl
            ? 'Download Full Video'
            : 'Purchase to Access Video'}
        </button>

        {unlockError && (
          <p className="text-yellow-600 text-center">{unlockError}</p>
        )}
      </div>
    </div>
  );
}

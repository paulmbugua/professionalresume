import React, { useMemo, useState, useCallback } from 'react';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCertificate } from '@mytutorapp/shared/hooks'; // ← singular
import { getCertificateDownloadUrl, downloadCertificateFile } from '@mytutorapp/shared/api';

const CertificateButton: React.FC<{ courseId: string; justPassed?: boolean }> = ({ courseId, justPassed }) => {
  const { backendUrl, token } = useShopContext();

  // Use the updated hook (it persists eligibility while logged in)
  const {
    eligible,            // server-validated + local mirror
    eligibilityReason,
    certificate,
    loading,
    error,
    generate,
    refetch,             // available if you want to manually re-check
  } = useCertificate({ backendUrl, token, courseId, justPassed });

  const [downloading, setDownloading] = useState(false);

  const filename = useMemo(() => {
    const anyCert = certificate as any;
    const raw =
      anyCert?.filename ||
      anyCert?.course_title ||
      anyCert?.course?.title ||
      `certificate-${anyCert?.id ?? courseId}`;
    const clean = String(raw).replace(/[^\w\s.-]+/g, '').replace(/\s+/g, '-').toLowerCase();
    return `${clean}.pdf`;
  }, [certificate, courseId]);

  const downloadHref = useMemo(() => {
    if (!certificate) return null;
    const id = (certificate as any).id;
    return id ? getCertificateDownloadUrl(backendUrl, id) : null;
  }, [certificate, backendUrl]);

  const onSecureDownload = useCallback(async () => {
    if (!certificate || downloading) return;
    const id = (certificate as any).id as string;
    try {
      setDownloading(true);
      await downloadCertificateFile(backendUrl, token ?? '', id, filename);
    } catch (e: any) {
      console.error('[cert-btn] download error', e);
      alert(e?.message || 'Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  }, [backendUrl, token, certificate, downloading, filename]);

  if (certificate) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={downloadHref ?? '#'}
          target={token ? undefined : '_blank'}
          rel={token ? undefined : 'noopener noreferrer'}
          className={`inline-flex items-center justify-center rounded-xl h-10 px-4 font-semibold ${
            downloading ? 'bg-green-600/70 cursor-wait' : 'bg-green-600 hover:bg-green-700'
          } text-white`}
          onClick={(e) => {
            if (token) { e.preventDefault(); if (!downloading) onSecureDownload(); }
          }}
          aria-busy={downloading}
          aria-disabled={downloading}
        >
          {downloading ? 'Downloading…' : 'Download Certificate'}
        </a>

        <a
          href={`/verify/${(certificate as any).id}`}
          className="inline-flex items-center justify-center rounded-xl h-10 px-4 bg-[#e7edf4] text-[#0d141c] font-semibold hover:brightness-95"
        >
          Verify
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className={`inline-flex items-center justify-center rounded-xl h-10 px-4 font-semibold ${
          eligible
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
        onClick={() => generate().catch(() => {})}
        disabled={!eligible || loading}
      >
        {loading ? 'Generating…' : 'Generate Certificate'}
      </button>

      {!eligible && eligibilityReason && (
        <p className="text-sm text-[#49739c]">{eligibilityReason}</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default CertificateButton;

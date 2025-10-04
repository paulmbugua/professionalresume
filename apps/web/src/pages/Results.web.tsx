// apps/web/src/pages/Results.web.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import PaymentWidget from '../components/PaymentWidget.web';
import { useAICertificates } from '@mytutorapp/shared/hooks';

type GradeLike = {
  scorePct: number;
  passMark: number;
  passed: boolean;
};

type DocRow = {
  id: string;
  url?: string;           // preview/public (watermarked)
  download_url?: string;  // clean, requires auth
  downloadUrl?: string;   // tolerate snake/camel
  public_url?: string;    // tolerate alt
};

function WatermarkPreview({
  title,
  pdfUrl,
  certId,
  backendUrl,
  folderHint = 'certificates',
}: {
  title: string;
  pdfUrl?: string | null;
  certId?: string | null;
  backendUrl?: string;
  folderHint?: 'certificates' | 'transcripts';
}) {
  const previewUrl = useMemo(() => {
  if (certId && backendUrl) {
    const base = backendUrl.replace(/\/+$/, '');
    if (folderHint === 'certificates') {
      return `${base}/api/certificates/${certId}/og`;
    }
    if (folderHint === 'transcripts') {
      return `${base}/api/transcripts/${certId}/og`;
    }
  }
  if (!pdfUrl) return null;
  try {
    const u = new URL(pdfUrl);
    const [left, right] = u.pathname.split('/upload/');
    if (!right) return null;
    // Fallback: first page JPG if OG not available
    return `${u.origin}${left}/upload/pg_1/${right.replace(/\.pdf$/i, '.jpg')}`;
  } catch {
    return null;
  }
}, [certId, backendUrl, pdfUrl, folderHint]);


  return (
    <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5">
      <div className="px-3 pt-3">
        <div className="text-white font-semibold">{title}</div>
        <div className="text-white/60 text-xs mb-2">Preview (watermarked)</div>
      </div>
      <div className="relative">
        <div className="aspect-[4/3] bg-black/30 flex items-center justify-center">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`${title} preview`} className="w-full h-full object-contain" />
          ) : (
            <div className="text-white/60 text-sm">No preview available</div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ mixBlendMode: 'multiply' }}>
          <div className="rotate-12 text-4xl sm:text-6xl md:text-7xl font-black tracking-widest text-white/20">
            PREVIEW
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 text-white/60 text-xs">
        Downloads are clean (no watermark) after payment or token claim.
      </div>
    </div>
  );
}

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { backendUrl, token, refreshUserDetails, tokens: walletTokens = 0 } = useShopContext();

  // Expected state from Lesson/Quiz:
  const { courseId, courseTitle, grade }: { courseId?: string; courseTitle?: string; grade?: GradeLike } =
    (location.state as any) || {};

    const sp = new URLSearchParams(location.search);
const qpCourseId = sp.get('courseId') || undefined;
const qpCourseTitle = sp.get('title') || undefined;
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [cert, setCert] = useState<DocRow | null>(null);
  const [trans, setTrans] = useState<DocRow | null>(null);

  const [paymentOk, setPaymentOk] = useState(false);
  const passed = Boolean(grade?.passed);
  const effectiveCourseId = courseId ?? qpCourseId;
const effectiveCourseTitle = courseTitle ?? qpCourseTitle;

  const normalizeDoc = (row: any | null | undefined): DocRow | null => {
    if (!row || !row.id) return null;
    return {
      id: row.id,
      url: row.url || row.public_url || undefined,
      download_url: row.download_url || row.downloadUrl || undefined,
      public_url: row.public_url || undefined,
    };
  };

  // Auth-aware download to avoid 401s
  const downloadFile = useCallback(
    async (downloadUrl: string | undefined, fallbackName: string) => {
      if (!downloadUrl || !backendUrl) return;
      try {
        const absoluteUrl = downloadUrl.match(/^https?:\/\//)
          ? downloadUrl
          : `${backendUrl.replace(/\/+$/, '')}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;

        const r = await fetch(absoluteUrl, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!r.ok) throw new Error(`Download failed (${r.status})`);
        const blob = await r.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fallbackName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      } catch (e) {
        console.error('Download error:', e);
      }
    },
    [backendUrl, token]
  );

  const api = useCallback(
    async function <T = any>(path: string, init?: RequestInit): Promise<T> {
      const r = await fetch(`${backendUrl}${path}`, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (r.status === 204) return null as any;
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const e: any = new Error((data as any)?.error || `Request failed: ${r.status}`);
        e.status = r.status;
        e.data = data;
        throw e;
      }
      return data;
    },
    [backendUrl, token]
  );

  // Helper: refresh both docs if they exist / become unlocked
  const refreshDocs = useCallback(
    async (id?: string) => {
      const cid = id || courseId;
      if (!cid) return;

      // Certificate
      try {
        const c = await api(`/api/certificates/generate`, {
          method: 'POST',
          body: JSON.stringify({ courseId: cid }),
        }).catch((e) => {
          if ((e as any)?.status === 402) return null;
          throw e;
        });
        if (c?.id) setCert(normalizeDoc(c));
      } catch (e) {
        console.warn('cert generate/read failed', e);
      }

      // Transcript
      try {
        const t = await api(`/api/transcripts/generate`, {
          method: 'POST',
          body: JSON.stringify({ courseId: cid }),
        }).catch((e) => {
          if ((e as any)?.status === 402) return null;
          throw e;
        });
        if (t?.id) setTrans(normalizeDoc(t));
      } catch (e) {
        console.warn('transcript generate/read failed', e);
      }
    },
    [api, courseId]
  );

  const checkPaymentStatus = useCallback(async () => {
  try {
    if (effectiveCourseId) {
      const s = await api<{ paid?: boolean }>(
        `/api/certificates/status?courseId=${encodeURIComponent(effectiveCourseId)}`
      ).catch(() => null);
      if (s && typeof s.paid === 'boolean') {
        setPaymentOk(s.paid);
        return;
      }
    }
  } catch {}
  setPaymentOk(Boolean(cert?.download_url || trans?.download_url));
}, [api, effectiveCourseId, cert?.download_url, trans?.download_url]);
;

 useEffect(() => {
  refreshDocs(effectiveCourseId);
}, [refreshDocs, effectiveCourseId]);

  useEffect(() => {
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  // Token (AI certificates) path — NOTE: generate() creates CERTIFICATE only
  const { skus, loading: aiCertLoading, error: aiCertError, message: aiCertMsg, claim, generate } =
  useAICertificates({ backendUrl, token: token || '', courseId: effectiveCourseId });


  // Only price_tokens is used from AICertificateSKU
  const firstSkuPrice = useMemo(() => {
    const p = skus && skus.length ? Number(skus[0].price_tokens) : 0;
    return Number.isFinite(p) ? p : 0;
  }, [skus]);

  const canTokenClaimAny = passed && Boolean(token) && (Number(walletTokens) || 0) >= firstSkuPrice;

  // Decide which SKU is "Extended" (no schema flag yet; derive from title/code)
  const isExtendedSku = (titleOrCode: string | undefined | null) =>
    Boolean(String(titleOrCode || '').toLowerCase().includes('extended'));

  // Extended flow: cert + transcript. Standard flow: cert only.
  const handleTokenClaimAndGenerate = useCallback(
  async (skuCode: string, extended: boolean) => {
    if (!token || !passed || !effectiveCourseId) return;
    try {
      // 1) Spend tokens / record issuance
      await claim(skuCode);

      // 2) Wallet refresh after deduction (if any)
      try { await refreshUserDetails(); } catch {}

      // 3) Generate CERTIFICATE (fetch immediately so the button enables)
      try {
        const certRow = await api(`/api/certificates/generate`, {
          method: 'POST',
          body: JSON.stringify({ courseId: effectiveCourseId }),
        });
        if (certRow?.id) setCert(normalizeDoc(certRow));
      } catch (e) {
        console.error('[Results] certificate generate failed', e);
      }

      // 4) If EXTENDED, also generate TRANSCRIPT (fetch immediately)
      if (extended) {
        try {
          const transRow = await api(`/api/transcripts/generate`, {
            method: 'POST',
            body: JSON.stringify({ courseId: effectiveCourseId }),
          });
          if (transRow?.id) setTrans(normalizeDoc(transRow));
        } catch (e) {
          console.error('[Results] transcript generate failed (extended)', e);
        }
      }

      // 5) Final refresh (catch server-side URL/branding changes)
      await refreshDocs(effectiveCourseId);
      await checkPaymentStatus();
    } catch (e) {
      console.error('[Results] token claim/generate failed', e);
    }
  },
  [token, passed, effectiveCourseId, claim, api, refreshUserDetails, refreshDocs, checkPaymentStatus]
);

 const courseLabel = (effectiveCourseTitle ? effectiveCourseTitle.replace(/\s+/g, '-').toLowerCase() : 'course');


  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-4 sm:py-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Results & Documents</h1>
            <div className="text-white/70 text-sm sm:text-base">
              {courseTitle ? <span className="font-medium">{courseTitle}</span> : 'Course'} • Your quiz results & downloads
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm"
          >
            Back
          </button>
        </div>

        {/* Score card */}
        <div
          className={`rounded-2xl p-4 ring-1 ${
            passed ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-red-500/10 ring-red-500/40'
          }`}
        >
          <div className="text-white/80 text-sm">Score</div>
          <div className="text-2xl font-semibold">
            {grade ? `${grade.scorePct}%` : '—'}
            <span className="text-white/60 text-sm ml-2">(Pass mark {grade?.passMark ?? 70}%)</span>
          </div>
          <div className="mt-1 text-white/70">
            {passed
              ? 'Nice! You passed. You can unlock clean downloads.'
              : 'Review the lesson and try again to pass.'}
          </div>
        </div>

        {/* Two-column previews (watermarked) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WatermarkPreview
            title="Certificate"
            pdfUrl={cert?.url || null}
            certId={cert?.id || null}
            backendUrl={backendUrl}
            folderHint="certificates"
          />
          <WatermarkPreview
          title="Transcript"
          pdfUrl={trans?.url || null}
          certId={trans?.id || null}     // ← provide the id
          backendUrl={backendUrl}
          folderHint="transcripts"        // ← only once
        />
        </div>

        {/* Actions */}
        <div className="rounded-2xl p-4 ring-1 ring-white/10 bg-white/5">
          <div className="text-white font-semibold mb-2">Downloads</div>
          <div className="text-white/70 text-sm mb-3">
            Claim with tokens or pay once with fiat to unlock clean downloads.
          </div>

          {/* Tokens-first: Standard vs Extended */}
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <div className="text-white font-medium text-sm">Claim with Tokens</div>
            <div className="text-white/70 text-xs mb-2">No processor fees for AI certificates.</div>

            {aiCertLoading && <div className="text-xs text-white/60">Loading certificate options…</div>}
            {aiCertError && <div className="text-xs text-red-300">{aiCertError}</div>}
            {aiCertMsg && <div className="text-xs text-emerald-300">{aiCertMsg}</div>}

            <div className="space-y-2">
              {(skus || []).map((sku: any) => {
            const price = Number(sku.price_tokens);
            const hasEnough = (Number(walletTokens) || 0) >= (Number.isFinite(price) ? price : 0);
            const enabled = passed && hasEnough;
            const extended =
              sku?.includesTranscript === true ||
              sku?.kind === 'extended' ||
              String(sku?.title || sku?.code).toLowerCase().includes('extended');

                return (
                  <div
                    key={sku.code}
                    className="flex items-center justify-between rounded-lg ring-1 ring-white/15 p-2 bg-white/5"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {sku.title}
                        {extended ? ' • Includes Transcript' : ' • Certificate only'}
                      </div>
                      <div className="text-[11px] text-white/60">{sku.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {Number.isFinite(price) ? price : 0} Tokens
                      </span>
                      <button
                        disabled={!enabled}
                        title={
                          !passed
                            ? 'Pass the quiz first'
                            : !hasEnough
                            ? 'Not enough tokens'
                            : extended
                            ? 'Claim & generate certificate + transcript'
                            : 'Claim & generate certificate'
                        }
                        onClick={() => handleTokenClaimAndGenerate(sku.code, extended)}
                        className={`px-3 py-1.5 rounded text-sm ${
                          enabled ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600/50 cursor-not-allowed'
                        } text-white`}
                      >
                        {extended ? 'Claim & Generate (Extended)' : 'Claim & Generate (Standard)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Token balance hint */}
            <div className="mt-2 text-[11px] text-white/70">
              Your balance: <b>{Number(walletTokens) || 0}</b> tokens
            </div>

            {!canTokenClaimAny && passed && (
              <div className="text-[11px] text-white/70 mt-1">Top up tokens or use card/PayPal/M-Pesa below.</div>
            )}
          </div>

          {/* Fiat flow */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPaymentOpen(true)}
              disabled={!passed}
              className={`h-10 px-4 rounded-lg text-sm font-semibold ${
                passed ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600/40 cursor-not-allowed'
              }`}
              title={passed ? 'Open payment panel' : 'Pass the quiz to unlock payment'}
            >
              Pay certificate fee
            </button>

            {/* Certificate download — authenticated */}
            <a
              href={cert?.download_url || '#'}
              onClick={(e) => {
                if (!cert?.download_url) {
                  e.preventDefault();
                  setPaymentOpen(true);
                  return;
                }
                e.preventDefault();
                downloadFile(
                  cert.download_url,
                  `${courseLabel}-${cert.id}-certificate.pdf`
                );
              }}
              className={`h-10 px-4 rounded-lg text-sm font-semibold grid place-items-center ${
                cert?.download_url ? 'bg-white/10 hover:bg-white/20 ring-1 ring-white/20' : 'bg-white/5 ring-1 ring-white/10'
              }`}
            >
              Download Certificate (PDF)
            </a>

            {/* Transcript download — authenticated */}
            <a
              href={trans?.download_url || '#'}
              onClick={(e) => {
                if (!trans?.download_url) {
                  e.preventDefault();
                  setPaymentOpen(true);
                  return;
                }
                e.preventDefault();
                downloadFile(
                  trans.download_url,
                  `${courseLabel}-${trans.id}-transcript.pdf`
                );
              }}
              className={`h-10 px-4 rounded-lg text-sm font-semibold grid place-items-center ${
                trans?.download_url ? 'bg-white/10 hover:bg-white/20 ring-1 ring-white/20' : 'bg-white/5 ring-1 ring-white/10'
              }`}
            >
              Download Transcript (PDF)
            </a>
          </div>

          {!passed && (
            <div className="mt-3 text-[12px] text-white/60">
              Tip: Revisit the lesson and retry the quiz to reach the pass mark.
            </div>
          )}
        </div>
      </div>

      {/* Payment slide-over */}
      <PaymentWidget
        isOpen={paymentOpen}
        onClose={async () => {
          setPaymentOpen(false);
          try { await refreshUserDetails(); } catch {}
          await refreshDocs(effectiveCourseId);
          await checkPaymentStatus();
        }}
        title="Unlock Certificate"
        showTutorPreview={false}
      />
    </div>
  );
};

export default ResultsPage;

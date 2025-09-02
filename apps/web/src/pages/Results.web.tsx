import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import PaymentWidget from '../components/PaymentWidget.web';

type GradeLike = {
  scorePct: number;
  passMark: number;
  passed: boolean;
};

function WatermarkPreview({
  title,
  pdfUrl,
  folderHint = 'certificates',
}: { title: string; pdfUrl?: string | null; folderHint?: 'certificates' | 'transcripts' }) {
  // Convert Cloudinary PDF URL to first-page JPG preview (pg_1)
  const previewUrl = useMemo(() => {
    if (!pdfUrl) return null;
    try {
      const u = new URL(pdfUrl);
      // /.../upload/v1699/certificates/<id>.pdf  ->  /.../upload/pg_1/<same>.jpg
      const parts = u.pathname.split('/upload/');
      if (parts.length !== 2) return null;
      const left = parts[0] + '/upload/pg_1';
      const right = parts[1].replace(/\.pdf$/i, '.jpg');
      return u.origin + left + '/' + right;
    } catch {
      return null;
    }
  }, [pdfUrl]);

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
        {/* Watermark overlay */}
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center"
          style={{ mixBlendMode: 'multiply' }}
        >
          <div className="rotate-12 text-4xl sm:text-6xl md:text-7xl font-black tracking-widest text-white/20">
            PREVIEW
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 text-white/60 text-xs">
        Downloads are clean (no watermark) after certificate payment.
      </div>
    </div>
  );
}

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { backendUrl, token } = useShopContext();

  // We expect prior page (RobotTeacher) to push state with these:
  const { courseId, courseTitle, grade }: { courseId?: string; courseTitle?: string; grade?: GradeLike } =
    (location.state as any) || {};

  const [paymentOpen, setPaymentOpen] = useState(false);

  const [cert, setCert] = useState<{ id: string; url: string; download_url?: string } | null>(null);
  const [trans, setTrans] = useState<{ id: string; url: string; download_url?: string } | null>(null);

  // Helper to call API
  async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
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
      const e: any = new Error(data?.error || `Request failed: ${r.status}`);
      e.status = r.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  // Attempt to fetch existing cert+transcript (they might already exist)
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!courseId) return;
      try {
        // Try to get existing certificate row via your existing endpoint (generate returns existing if found)
        const c = await api(`/api/certificates/generate`, {
          method: 'POST',
          body: JSON.stringify({ courseId }),
        }).catch((e) => {
          // 402 means payment needed — that’s fine; we’ll just show preview as locked.
          if (e?.status === 402) return null;
          throw e;
        });
        if (!abort && c?.id) setCert(c);
      } catch {}
      try {
        const t = await api(`/api/transcripts/generate`, {
          method: 'POST',
          body: JSON.stringify({ courseId }),
        }).catch((e) => {
          if (e?.status === 402) return null;
          throw e;
        });
        if (!abort && t?.id) setTrans(t);
      } catch {}
    })();
    return () => { abort = true; };
  }, [backendUrl, token, courseId]);

  const passed = Boolean(grade?.passed);

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
        <div className={`rounded-2xl p-4 ring-1 ${passed ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-red-500/10 ring-red-500/40'}`}>
          <div className="text-white/80 text-sm">Score</div>
          <div className="text-2xl font-semibold">
            {grade ? `${grade.scorePct}%` : '—'}
            <span className="text-white/60 text-sm ml-2">(Pass mark {grade?.passMark ?? 70}%)</span>
          </div>
          <div className="mt-1 text-white/70">
            {passed ? 'Nice! You passed. You can unlock clean downloads.' : 'Review the lesson and try again to pass.'}
          </div>
        </div>

        {/* Two-column previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WatermarkPreview title="Certificate" pdfUrl={cert?.url || null} folderHint="certificates" />
          <WatermarkPreview title="Transcript" pdfUrl={trans?.url || null} folderHint="transcripts" />
        </div>

        {/* Actions */}
        <div className="rounded-2xl p-4 ring-1 ring-white/10 bg-white/5">
          <div className="text-white font-semibold mb-2">Downloads</div>
          <div className="text-white/70 text-sm mb-3">
            Pay the certificate fee once to download both the <span className="font-medium">Certificate</span> and <span className="font-medium">Transcript</span> without watermark.
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPaymentOpen(true)}
              disabled={!passed}
              className={`h-10 px-4 rounded-lg text-sm font-semibold ${passed ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600/40 cursor-not-allowed'}`}
              title={passed ? 'Open payment panel' : 'Pass the quiz to unlock payment'}
            >
              Pay certificate fee
            </button>

            {/* Once cert exists AND payment was done, your backend returns download_url */}
            <a
              href={cert?.download_url || '#'}
              onClick={(e) => { if (!cert?.download_url) { e.preventDefault(); setPaymentOpen(true); } }}
              className={`h-10 px-4 rounded-lg text-sm font-semibold grid place-items-center ${cert?.download_url ? 'bg-white/10 hover:bg-white/20 ring-1 ring-white/20' : 'bg-white/5 ring-1 ring-white/10'}`}
            >
              Download Certificate (PDF)
            </a>

            <a
              href={trans?.download_url || '#'}
              onClick={(e) => { if (!trans?.download_url) { e.preventDefault(); setPaymentOpen(true); } }}
              className={`h-10 px-4 rounded-lg text-sm font-semibold grid place-items-center ${trans?.download_url ? 'bg-white/10 hover:bg-white/20 ring-1 ring-white/20' : 'bg-white/5 ring-1 ring-white/10'}`}
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

      {/* Payment slide-over — same component you already use */}
      <PaymentWidget
        isOpen={paymentOpen}
        onClose={async () => {
          setPaymentOpen(false);
          // Re-try generation to get fresh download URLs after payment
          if (!courseId) return;
          try {
            const c = await fetch(`${backendUrl}/api/certificates/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ courseId }),
            }).then(r => r.ok ? r.json() : null);
            if (c?.id) setCert(c);
          } catch {}
          try {
            const t = await fetch(`${backendUrl}/api/transcripts/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ courseId }),
            }).then(r => r.ok ? r.json() : null);
            if (t?.id) setTrans(t);
          } catch {}
        }}
        title="Unlock Certificate"
        showTutorPreview={false}
      />
    </div>
  );
};

export default ResultsPage;

// apps/web/src/components/CourseReadingPanel.web.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Status = 'Not Started' | 'In Progress' | 'Completed';

type SyllabusItem = {
  week: number;
  topic?: string;
  assignment?: string;
  videoUrl?: string;
  notesUrl?: string;
};

type Props = {
  courseId: string;
  week?: number | null;
  item?: SyllabusItem | null;
  status?: Status | null;
  onSetStatus?: (next: Status) => Promise<void> | void;
};

/** --- Helpers ----------------------------------------------------------- */
const isMp4 = (url?: string) => !!url && /\.mp4(\?|$)/i.test(url);
const isYouTube = (url?: string) => !!url && /(youtube\.com|youtu\.be)/i.test(url || '');
const isVimeo = (url?: string) => !!url && /vimeo\.com/i.test(url || '');

/** Normalize video URLs to embeddable src */
function toEmbedSrc(url: string): string {
  if (isYouTube(url)) {
    try {
      // handle youtu.be/<id> and youtube.com/watch?v=<id>
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace(/^\//, '');
        return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        // already /embed/ or shorts etc. fall back to original
      }
    } catch {}
  }
  if (isVimeo(url)) {
    // vimeo.com/<id> → player.vimeo.com/video/<id>
    const match = url.match(/vimeo\.com\/(\d+)/i);
    if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
  }
  return url;
}

/** Small, theme-aware card wrapper */
const Card: React.FC<{ title?: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-gray-200 dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 sm:p-5">
    {title && <h3 className="text-base sm:text-lg font-semibold mb-3">{title}</h3>}
    {children}
  </div>
);

/** --- Video Gate -------------------------------------------------------- */
/** Minimal inline player (small), expandable to large. Tracks watch progress (mp4 best-effort). */
const VideoGate: React.FC<{
  url: string;
  onSatisfied: () => void;
}> = ({ url, onSatisfied }) => {
  const [open, setOpen] = useState(false);
  const [watchedPct, setWatchedPct] = useState(0);

  // MP4: precise progress with <video>; YT/Vimeo: coarse timer when open
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const requiredPct = 80; // require 80%

  // Coarse progress for non-mp4 (we just require ~80% of a notional 4m session)
  const NON_MP4_TOTAL = 240; // seconds (4 minutes)
  const nonMp4ElapsedRef = useRef(0);

  useEffect(() => {
    if (!open || isMp4(url)) return;
    timerRef.current = window.setInterval(() => {
      nonMp4ElapsedRef.current += 1;
      const pct = Math.min(100, Math.round((nonMp4ElapsedRef.current / NON_MP4_TOTAL) * 100));
      setWatchedPct(pct);
      if (pct >= requiredPct) onSatisfied();
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, url]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration || Number.isNaN(v.duration)) return;
    const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
    setWatchedPct(pct);
    if (pct >= requiredPct) onSatisfied();
  };

  const embedSrc = isMp4(url) ? null : toEmbedSrc(url);

  return (
    <Card title="Video">
      {/* Compact preview area */}
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-darkCard">
          {/* Small, responsive 16:9 container */}
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {isMp4(url) ? (
              <video
                ref={videoRef}
                onTimeUpdate={onTimeUpdate}
                className="absolute inset-0 w-full h-full"
                controls
                preload="metadata"
              >
                <source src={url} type="video/mp4" />
              </video>
            ) : (
              <iframe
                title="Course video"
                src={embedSrc || url}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>

        {/* Progress + expand */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="w-full sm:w-1/2">
            <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-2 bg-[#3d99f5] transition-all"
                style={{ width: `${watchedPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Watched: {watchedPct}% • need {requiredPct}% to unlock completion
            </p>
          </div>

          
        </div>

        {/* Large player (togglable) */}
        {open && (
          <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-darkCard bg-gray-50 dark:bg-gray-900">
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              {isMp4(url) ? (
                <video
                  ref={videoRef}
                  onTimeUpdate={onTimeUpdate}
                  className="absolute inset-0 w-full h-full"
                  controls
                  preload="metadata"
                >
                  <source src={url} type="video/mp4" />
                </video>
              ) : (
                <iframe
                  title="Course video large"
                  src={embedSrc || url}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

/** --- Notes Gate -------------------------------------------------------- */
const NotesGate: React.FC<{
  url: string;
  onSatisfied: () => void;
}> = ({ url, onSatisfied }) => {
  const [downloaded, setDownloaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const requiredSeconds = 30;

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (downloaded && elapsed >= requiredSeconds) onSatisfied();
  }, [downloaded, elapsed, onSatisfied]);

  const onDownload = () => {
    setDownloaded(true);
    // open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card title="Notes / PDF">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please download and review the notes.
        </p>
        <button
          onClick={onDownload}
          className="inline-flex justify-center rounded-xl h-9 px-3 bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold"
        >
          Download notes
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        Time on step: {elapsed}s / {requiredSeconds}s {downloaded ? '• downloaded ✔' : '• not downloaded'}
      </div>
    </Card>
  );
};

/** --- Assignment Gate --------------------------------------------------- */
const AssignmentGate: React.FC<{
  text?: string;
  onSatisfied: () => void;
}> = ({ text, onSatisfied }) => {
  const [elapsed, setElapsed] = useState(0);
  const requiredSeconds = 60;

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed >= requiredSeconds) onSatisfied();
  }, [elapsed, onSatisfied]);

  return (
    <Card title="Assignment">
      <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
        {text?.trim() || 'Work through this week’s task before marking complete.'}
      </p>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        Spend at least {requiredSeconds}s on this step. Time on step: {elapsed}s
      </p>
    </Card>
  );
};

/** --- Main Panel -------------------------------------------------------- */
const CourseReadingPanel: React.FC<Props> = ({
  courseId,
  week,
  item,
  status,
  onSetStatus,
}) => {
  // Resolve safe values to avoid crashes while data loads / API 404s
  const safeStatus: Status = status ?? 'Not Started';
  const safeItem: SyllabusItem | null = item ?? null;
  const weekLabel = safeItem?.week ?? week ?? 0;

  // Gates: each becomes true when its requirement is met at least once this session
  const [videoOk, setVideoOk] = useState(false);
  const [notesOk, setNotesOk] = useState(false);
  const [assignmentOk, setAssignmentOk] = useState(false);

  // If user has started/continues, ensure status is "In Progress" (only if handler exists)
  useEffect(() => {
    if (safeStatus === 'Not Started' && onSetStatus) {
      void onSetStatus('In Progress');
    }
    // run once on mount; we intentionally don't depend on onSetStatus to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { needVideo, needNotes, needAssign } = useMemo(() => {
    return {
      needVideo: !!safeItem?.videoUrl,
      needNotes: !!safeItem?.notesUrl,
      needAssign: !!(safeItem?.assignment && safeItem.assignment.trim().length > 0),
    };
  }, [safeItem]);

  const canComplete = useMemo(() => {
    return (needVideo ? videoOk : true) &&
           (needNotes ? notesOk : true) &&
           (needAssign ? assignmentOk : true);
  }, [needVideo, needNotes, needAssign, videoOk, notesOk, assignmentOk]);

  const onMarkComplete = async () => {
    if (!canComplete || !onSetStatus) return;
    await onSetStatus('Completed');
  };

  // If we literally have no item yet (loading/404), show a safe placeholder
  if (!safeItem) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Week {weekLabel}: Loading…</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We’re fetching this week’s resources.
            </p>
          </div>
          <span className="inline-flex items-center rounded-lg h-8 px-3 bg-gray-200 dark:bg-gray-700 text-xs font-semibold">
            {safeStatus}
          </span>
        </div>

        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No week data yet. If this persists, check your progress API route or the enrollment/Week ID.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            Week {weekLabel}: {safeItem.topic || 'Untitled'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Work through the resources below.</p>
        </div>

        <div className="flex gap-2">
          <span className="inline-flex items-center rounded-lg h-8 px-3 bg-gray-200 dark:bg-gray-700 text-xs font-semibold">
            {safeStatus}
          </span>
          <button
            disabled={!canComplete || safeStatus === 'Completed' || !onSetStatus}
            onClick={onMarkComplete}
            className={`rounded-xl h-9 px-4 text-sm font-semibold ${
              !canComplete || safeStatus === 'Completed' || !onSetStatus
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                : 'bg-[#3d99f5] text-white hover:brightness-110'
            }`}
            title={
              !onSetStatus
                ? 'Action unavailable'
                : !canComplete
                ? 'Finish all required steps first'
                : 'Mark this week as completed'
            }
          >
            {safeStatus === 'Completed' ? 'Completed' : 'Mark week as complete'}
          </button>
        </div>
      </div>

      {/* Resources (order: video → notes → assignment) */}
      {!!safeItem.videoUrl && (
        <VideoGate url={safeItem.videoUrl} onSatisfied={() => setVideoOk(true)} />
      )}

      {!!safeItem.notesUrl && (
        <NotesGate url={safeItem.notesUrl} onSatisfied={() => setNotesOk(true)} />
      )}

      {!!(safeItem.assignment && safeItem.assignment.trim().length > 0) && (
        <AssignmentGate text={safeItem.assignment} onSatisfied={() => setAssignmentOk(true)} />
      )}

      {/* Empty state if no resources */}
      {!safeItem.videoUrl && !safeItem.notesUrl && !(safeItem.assignment && safeItem.assignment.trim().length > 0) && (
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No resources were added for this week. You can still mark it complete when ready.
          </p>
        </Card>
      )}
    </div>
  );
};

export default CourseReadingPanel;

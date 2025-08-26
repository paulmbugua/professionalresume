// apps/web/src/components/CourseProgress.web.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { useParams, Link } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses } from '@mytutorapp/shared/hooks';
import { useCourseProgress } from '@mytutorapp/shared/hooks/useCourseProgress';
import { useCourseReviews } from '@mytutorapp/shared/hooks/useCourseReviews';
import CertificateButton from './CertificateButton.web';

import type {
  Course as CourseType,
  CourseProgress as CourseProgressItem,
  UpdateProgressPayload,
  SyllabusItem,
} from '@mytutorapp/shared/types';
import CourseReadingPanel from './CourseReadingPanel.web';

type Status = 'Not Started' | 'In Progress' | 'Completed';

const CourseProgress: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { backendUrl, token, profile } = useShopContext();
  const myId = String(profile?.id ?? '');

  // Load course
  const {
    selectedCourse,
    loading: coursesLoading,
    error: coursesError,
    fetchCourseById,
  } = useCourses({ backendUrl, token });

  useEffect(() => {
    if (courseId) void fetchCourseById(courseId);
  }, [courseId, fetchCourseById]);

  // Progress
  const { progress = [], loading: progressLoading, update } = useCourseProgress(
    backendUrl,
    courseId!,
    token
  );

  const syllabus: SyllabusItem[] =
    (selectedCourse as CourseType | null | undefined)?.syllabus ?? [];

  const isLoading = coursesLoading || progressLoading;

  // Reviews (to know if we should prompt)
  const { hasMyReview, submit, posting } = useCourseReviews(
    backendUrl,
    courseId,
    { myStudentId: myId, token: token ?? '' }
  );

  const [openReview, setOpenReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  /** ✅ MOVE THIS HOOK ABOVE ANY EARLY RETURNS */
  const onSubmitReview = useCallback(async () => {
    if (rating < 1) return;
    await submit(rating, comment);
    setOpenReview(false);
    setRating(0);
    setComment('');
  }, [submit, rating, comment]);

  const promptReview = useCallback(() => {
    if (!hasMyReview) setOpenReview(true);
  }, [hasMyReview]);

  const debouncedPrompt = useMemo(() => debounce(promptReview, 200), [promptReview]);
  useEffect(() => () => debouncedPrompt.cancel(), [debouncedPrompt]);

  const progressByWeek = useMemo(() => {
    const map = new Map<number, Status>();
    (progress as CourseProgressItem[]).forEach((p) => map.set(p.week, p.status as Status));
    return map;
  }, [progress]);

  const counts = useMemo(() => {
    let notStarted = 0, inProgress = 0, completed = 0;
    syllabus.forEach((s) => {
      const st = (progressByWeek.get(s.week) ?? 'Not Started') as Status;
      if (st === 'Completed') completed++;
      else if (st === 'In Progress') inProgress++;
      else notStarted++;
    });
    const total = syllabus.length || 0;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { notStarted, inProgress, completed, total, pct };
  }, [syllabus, progressByWeek]);

  const suggestedWeek = useMemo(() => {
    const inProg = syllabus.find((w) => (progressByWeek.get(w.week) ?? 'Not Started') === 'In Progress');
    if (inProg) return inProg.week;
    const notSt = syllabus.find((w) => (progressByWeek.get(w.week) ?? 'Not Started') === 'Not Started');
    if (notSt) return notSt.week;
    return syllabus.length ? syllabus[syllabus.length - 1].week : undefined;
  }, [syllabus, progressByWeek]);

  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const weekRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (activeWeek == null && suggestedWeek && weekRefs.current[suggestedWeek]) {
      weekRefs.current[suggestedWeek]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeWeek, suggestedWeek]);

  if (!courseId) {
    return <div className="max-w-3xl mx-auto p-6 text-red-600 dark:text-red-400">Missing course id.</div>;
  }
  if (isLoading) {
    return <div className="max-w-3xl mx-auto p-6 text-gray-700 dark:text-gray-300">Loading progress…</div>;
  }
  if (coursesError) {
    return <div className="max-w-3xl mx-auto p-6 text-red-600 dark:text-red-400">Failed to load course.</div>;
  }
  if (!selectedCourse) {
    return <div className="max-w-3xl mx-auto p-6 text-gray-700 dark:text-gray-300">Course not found.</div>;
  }
  if (!Array.isArray(syllabus) || syllabus.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{selectedCourse.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">This course doesn’t have a syllabus yet.</p>
        <div className="mt-4">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold"
          >
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  const setStatus = async (week: number, status: Status) => {
    const payload: UpdateProgressPayload = { courseId, week, status };
    try {
      await update(payload);
      if (status === 'Completed') debouncedPrompt();
    } catch {}
  };

  const startCourse = async () => {
    if (!syllabus.length) return;
    const first = syllabus[0].week;
    const st = (progressByWeek.get(first) ?? 'Not Started') as Status;
    if (st === 'Not Started') await setStatus(first, 'In Progress');
    setActiveWeek(first);
  };

  const continueCourse = async () => {
    if (!suggestedWeek) return;
    const st = (progressByWeek.get(suggestedWeek) ?? 'Not Started') as Status;
    if (st === 'Not Started') await setStatus(suggestedWeek, 'In Progress');
    setActiveWeek(suggestedWeek);
  };

  const completeCurrent = async () => {
    if (suggestedWeek == null) return;
    await setStatus(suggestedWeek, 'Completed');
  };

  const allCompleted = counts.total > 0 && counts.completed === counts.total;

  const goPrev = () => {
    if (activeWeek == null) return;
    const idx = syllabus.findIndex((w) => w.week === activeWeek);
    if (idx > 0) setActiveWeek(syllabus[idx - 1].week);
  };
  const goNext = () => {
    if (activeWeek == null) return;
    const idx = syllabus.findIndex((w) => w.week === activeWeek);
    if (idx < syllabus.length - 1) setActiveWeek(syllabus[idx + 1].week);
  };

  const activeItem = activeWeek == null ? null : syllabus.find((w) => w.week === activeWeek);
  const activeStatus: Status = activeWeek == null ? 'Not Started' : (progressByWeek.get(activeWeek) ?? 'Not Started');

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{selectedCourse.title}</h1>
        {selectedCourse.description && (
          <p className="text-gray-700 dark:text-gray-300">{selectedCourse.description}</p>
        )}

        {/* Overall progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Overall progress</span>
            <span>
              {counts.pct}% ({counts.completed}/{counts.total})
            </span>
          </div>
          <div className="h-2 w-full rounded bg-[#e5eef7] dark:bg-[#192635] overflow-hidden">
            <div className="h-2 bg-[#3d99f5] transition-all" style={{ width: `${counts.pct}%` }} />
          </div>
          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Not started: {counts.notStarted}</span>
            <span>• In progress: {counts.inProgress}</span>
            <span>• Completed: {counts.completed}</span>
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {counts.completed === 0 && counts.inProgress === 0 ? (
            <button
              onClick={startCourse}
              className="rounded-xl h-10 px-4 bg-[#3d99f5] text-white text-sm font-semibold hover:brightness-110"
            >
              Start course
            </button>
          ) : (
            <button
              onClick={continueCourse}
              className="rounded-xl h-10 px-4 bg-[#3d99f5] text-white text-sm font-semibold hover:brightness-110"
            >
              Continue where I left off
            </button>
          )}

          {counts.inProgress + counts.notStarted > 0 && (
            <button
              onClick={completeCurrent}
              className="rounded-xl h-10 px-4 bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-semibold"
              title="Mark the suggested week as completed"
            >
              Mark current week completed
            </button>
          )}

          <Link
            to={`/courses/${courseId}`}
            className="rounded-xl h-10 px-4 bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-semibold"
          >
            Back to course
          </Link>

          {allCompleted && !hasMyReview && (
            <button
              onClick={() => setOpenReview(true)}
              className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold"
            >
              Rate this course
            </button>
          )}
        </div>
      </header>

      {/* Reading Mode */}
      {activeWeek != null && (
        <div className="space-y-4">
          {activeItem ? (
            <>
              <CourseReadingPanel
                courseId={courseId!}
                week={activeWeek}
                item={activeItem}
                status={activeStatus}
                onSetStatus={(next) => setStatus(activeWeek, next)}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={goPrev}
                  disabled={syllabus.findIndex((w) => w.week === activeWeek) === 0}
                  className={`rounded-xl h-10 px-4 text-sm font-semibold ${
                    syllabus.findIndex((w) => w.week === activeWeek) === 0
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      : 'bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard'
                  }`}
                >
                  ← Previous week
                </button>

                <button
                  onClick={() => setActiveWeek(null)}
                  className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold"
                >
                  Exit reading
                </button>

                <button
                  onClick={goNext}
                  disabled={syllabus.findIndex((w) => w.week === activeWeek) === syllabus.length - 1}
                  className={`rounded-xl h-10 px-4 text-sm font-semibold ${
                    syllabus.findIndex((w) => w.week === activeWeek) === syllabus.length - 1
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      : 'bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard'
                  }`}
                >
                  Next week →
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 sm:p-5">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Week {activeWeek} isn’t available. Choose another week below.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Weeks list */}
      <section className="space-y-3">
        {syllabus.map((item) => {
          const current: Status = (progressByWeek.get(item.week) ?? 'Not Started') as Status;
          const isSuggested = item.week === suggestedWeek;
          const quickStart = async () => {
            await setStatus(item.week, 'In Progress');
            setActiveWeek(item.week);
          };
          return (
            <div
              key={item.week}
              ref={(el) => (weekRefs.current[item.week] = el)}
              className={`p-4 border rounded-xl bg-white dark:bg-[#0f1821] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                isSuggested ? 'border-[#3d99f5]' : 'border-[#cedbe8] dark:border-darkCard'
              }`}
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Week {item.week}: {item.topic || 'TBA'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Status: {current}
                  {isSuggested ? ' • current' : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {current === 'Not Started' && (
                  <button
                    onClick={quickStart}
                    className="rounded-lg h-9 px-3 bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold"
                  >
                    Start week
                  </button>
                )}
                {current !== 'Completed' && (
                  <button
                    onClick={() => setStatus(item.week, 'Completed')}
                    className="rounded-lg h-9 px-3 bg-[#3d99f5] text-white text-sm font-semibold hover:brightness-110"
                  >
                    Complete week
                  </button>
                )}

                <select
                  value={current}
                  onChange={(e) => setStatus(item.week, e.target.value as Status)}
                  className="border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] text-gray-900 dark:text-gray-100 px-2 py-1 rounded text-sm"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          );
        })}
      </section>

      {/* Congrats note + optional review nudge */}
      {allCompleted && (
        <div className="p-4 rounded-xl bg-[#eef7ff] dark:bg-[#122032] text-[#0d141c] dark:text-gray-100">
          🎉 Nice work! You’ve completed every week. Check the{' '}
          <Link to="/achievements" className="underline font-semibold">
            Achievements
          </Link>{' '}
          page for badges.

          <div className="mt-3">
          <CertificateButton courseId={courseId!} />
        </div>
          {!hasMyReview && (
            <button
              className="ml-3 rounded-xl h-8 px-3 bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
              onClick={() => setOpenReview(true)}
            >
              Rate this course
            </button>
          )}
        </div>
      )}

      {/* Review modal */}
      {openReview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] p-4 ring-1 ring-[#cedbe8] dark:ring-darkCard">
            <h3 className="text-lg font-bold mb-2">Rate this course</h3>
            <div className="flex items-center gap-2 mb-3">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={n <= rating ? 'text-yellow-500 text-2xl' : 'text-[#49739c] text-2xl'}
                  aria-label={`${n} star`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e)=>setComment(e.target.value)}
              placeholder="Optional comment (max 500 chars)"
              maxLength={500}
              className="w-full text-sm rounded-lg p-2 bg-[#e7edf4] dark:bg-[#172534]"
            />
            <div className="mt-4 flex items-center gap-2">
              <button
                disabled={posting || rating < 1}
                onClick={onSubmitReview}
                className="px-4 h-10 rounded-xl bg-[#3d99f5] text-white text-sm font-semibold disabled:opacity-60"
              >
                {posting ? 'Saving…' : 'Submit'}
              </button>
              <button
                onClick={() => setOpenReview(false)}
                className="px-4 h-10 rounded-xl bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseProgress;

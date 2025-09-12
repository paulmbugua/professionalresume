import React, { useEffect } from "react";

type QuizConfirmModalProps = {
  open: boolean;
  lessons: number;
  questions: number;
  timeLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const QuizConfirmModal: React.FC<QuizConfirmModalProps> = ({
  open,
  lessons,
  questions,
  timeLabel,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white ring-1 ring-gray-200 shadow-2xl dark:bg-[#0f1821] dark:ring-white/10">
        {/* Header */}
        <div className="px-5 pt-5">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h3 id="quiz-confirm-title" className="mt-3 text-xl font-bold text-darkText dark:text-white">
            Ready to start your quiz?
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/70">
            Make sure you’ve reviewed the lesson. The timer (if any) starts immediately.
          </p>
        </div>

        {/* Summary */}
        <div className="px-5 mt-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl ring-1 ring-gray-200 bg-white p-3 text-center dark:bg-white/5 dark:ring-white/10">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/60">Lessons</div>
              <div className="mt-0.5 text-lg font-semibold text-darkText dark:text-white">{lessons}</div>
            </div>
            <div className="rounded-xl ring-1 ring-gray-200 bg-white p-3 text-center dark:bg-white/5 dark:ring-white/10">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/60">Questions</div>
              <div className="mt-0.5 text-lg font-semibold text-darkText dark:text-white">{questions}</div>
            </div>
            <div className="rounded-xl ring-1 ring-gray-200 bg-white p-3 text-center dark:bg-white/5 dark:ring-white/10">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/60">Time</div>
              <div className="mt-0.5 text-lg font-semibold text-darkText dark:text-white">{timeLabel}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50 dark:text-white/90 dark:ring-white/15 dark:hover:bg-white/10"
          >
            Not now
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none"
            autoFocus
          >
            Start quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizConfirmModal;

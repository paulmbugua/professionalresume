// apps/web/src/pages/org/OrgExamSetupTab.web.tsx
import React from 'react';
import type { OrgExamConfig, OrgExamGradingBand } from '@mytutorapp/shared/types';

type OrgExamSetupTabProps = {
  editingConfig: OrgExamConfig;
  setEditingConfig: React.Dispatch<React.SetStateAction<OrgExamConfig>>;
  configLoading: boolean;
  onAddTerm: () => void;
  onAddSession: () => void;
  onApplyBandsPreset: () => void;
  onSaveConfig: () => void;
};

const OrgExamSetupTab: React.FC<OrgExamSetupTabProps> = ({
  editingConfig,
  setEditingConfig,
  configLoading,
  onAddTerm,
  onAddSession,
  onApplyBandsPreset,
  onSaveConfig,
}) => {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Terms & sessions */}
      <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold">Terms &amp; exams</h2>
          <button
            className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
            onClick={onAddTerm}
          >
            + Add term
          </button>
        </div>

        <div className="space-y-2 max-h-[260px] overflow-y-auto">
          {editingConfig.terms.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-[#e7edf4] dark:border-darkCard bg-slate-50/70 dark:bg-[#0b1420] p-2.5 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {t.year} – {t.label}
                </span>
                <label className="flex items-center gap-1 text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                  <input
                    type="checkbox"
                    checked={t.is_active}
                    onChange={(e) =>
                      setEditingConfig((prev) => ({
                        ...prev,
                        terms: prev.terms.map((x) =>
                          x.id === t.id ? { ...x, is_active: e.target.checked } : x,
                        ),
                      }))
                    }
                  />
                  Active
                </label>
              </div>
              <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                Exams:{' '}
                {editingConfig.sessions
                  .filter((s) => s.term_id === t.id)
                  .map((s) => s.label)
                  .join(', ') || 'none yet'}
              </div>
            </div>
          ))}

          {!editingConfig.terms.length && (
            <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
              No terms yet. Add at least one term to begin using exams.
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#49739c] dark:text-darkTextSecondary">
              Exam sessions
            </span>
            <span className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
              Attach exams to terms and assign weight for yearly averages.
            </span>
          </div>
          <button
            className="h-9 px-3 rounded-xl bg-[#3d99f5] text-white text-xs font-semibold"
            onClick={onAddSession}
          >
            + Add exam
          </button>
        </div>

        <div className="max-h-[220px] overflow-y-auto space-y-1">
          {editingConfig.sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1 bg-[#e7edf4] dark:bg-[#172534]"
            >
              <div className="flex flex-col">
                <span className="font-semibold">{s.label}</span>
                <span className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                  {editingConfig.terms.find((t) => t.id === s.term_id)?.label ||
                    'Unassigned'}{' '}
                  • weight {s.weight}
                </span>
              </div>
            </div>
          ))}

          {!editingConfig.sessions.length && (
            <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
              No exams configured yet.
            </div>
          )}
        </div>
      </div>

      {/* Grading bands */}
      <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold">Grading bands</h2>
            <p className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
              Used to auto-grade each subject and overall score.
            </p>
          </div>
          <button
            className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
            onClick={onApplyBandsPreset}
          >
            Use default preset
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="text-left text-[#49739c] dark:text-darkTextSecondary">
              <tr>
                <th className="py-1 pr-2">Grade</th>
                <th className="py-1 pr-2">% range</th>
                <th className="py-1 pr-2">Remark</th>
              </tr>
            </thead>
            <tbody>
              {editingConfig.gradingBands.map((b, idx) => (
                <tr key={idx} className="border-t border-[#e7edf4] dark:border-darkCard">
                  <td className="py-1 pr-2">
                    <input
                      className="w-16 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-2 text-xs"
                      value={b.grade}
                      onChange={(e) =>
                        setEditingConfig((prev) => {
                          const bands = [...prev.gradingBands];
                          bands[idx] = { ...bands[idx], grade: e.target.value };
                          return { ...prev, gradingBands: bands as OrgExamGradingBand[] };
                        })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="w-16 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-1 text-xs"
                        value={b.min_percent}
                        onChange={(e) =>
                          setEditingConfig((prev) => {
                            const bands = [...prev.gradingBands];
                            bands[idx] = {
                              ...bands[idx],
                              min_percent: Number(e.target.value) || 0,
                            };
                            return { ...prev, gradingBands: bands as OrgExamGradingBand[] };
                          })
                        }
                      />
                      <span className="text-[11px]">to</span>
                      <input
                        type="number"
                        className="w-16 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-1 text-xs"
                        value={b.max_percent}
                        onChange={(e) =>
                          setEditingConfig((prev) => {
                            const bands = [...prev.gradingBands];
                            bands[idx] = {
                              ...bands[idx],
                              max_percent: Number(e.target.value) || 0,
                            };
                            return { ...prev, gradingBands: bands as OrgExamGradingBand[] };
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      className="w-full h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-2 text-xs"
                      value={b.remark ?? ''}
                      onChange={(e) =>
                        setEditingConfig((prev) => {
                          const bands = [...prev.gradingBands];
                          bands[idx] = { ...bands[idx], remark: e.target.value };
                          return { ...prev, gradingBands: bands as OrgExamGradingBand[] };
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              {!editingConfig.gradingBands.length && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-3 text-xs text-[#49739c] dark:text-darkTextSecondary"
                  >
                    No grading bands yet. Click “Use default preset”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            className="h-9 px-4 rounded-xl bg-[#3d99f5] text-white text-sm font-semibold"
            onClick={onSaveConfig}
            disabled={configLoading}
          >
            {configLoading ? 'Saving…' : 'Save configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrgExamSetupTab;

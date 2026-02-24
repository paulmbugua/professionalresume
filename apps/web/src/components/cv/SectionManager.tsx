import React from 'react';
import type { CvSectionKey } from '@cvpro/shared/types';

const sectionLabels: Record<CvSectionKey, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
  extras: 'Extras',
};

type Props = {
  sectionOrder: CvSectionKey[];
  sectionVisibility: Record<CvSectionKey, boolean>;
  onChange: (next: {
    sectionOrder: CvSectionKey[];
    sectionVisibility: Record<CvSectionKey, boolean>;
  }) => void;
};

const SectionManager: React.FC<Props> = ({
  sectionOrder,
  sectionVisibility,
  onChange,
}) => {
  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sectionOrder.length) return;
    const next = [...sectionOrder];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange({ sectionOrder: next, sectionVisibility });
  };

  const toggleVisibility = (key: CvSectionKey) => {
    onChange({
      sectionOrder,
      sectionVisibility: {
        ...sectionVisibility,
        [key]: !sectionVisibility[key],
      },
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Section Manager</h3>
        <span className="text-xs text-gray-400 dark:text-white/60">Reorder & toggle</span>
      </div>
      <ul className="space-y-2">
        {sectionOrder.map((key, index) => (
          <li
            key={key}
            className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleVisibility(key)}
                className={`h-4 w-4 rounded border ${
                  sectionVisibility[key]
                    ? 'border-primary bg-primary'
                    : 'border-gray-300 bg-white'
                }`}
                aria-label={`Toggle ${sectionLabels[key]}`}
              />
              <span className="font-medium text-gray-800 dark:text-white">
                {sectionLabels[key]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveSection(index, -1)}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:text-primary dark:border-white/10 dark:text-white/70"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSection(index, 1)}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:text-primary dark:border-white/10 dark:text-white/70"
                aria-label="Move down"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SectionManager;

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CvDraft, CvTypography } from '@cvpro/shared/types';

const MIN_BASE_SIZE = 10;
const MAX_BASE_SIZE = 16;

const DEFAULT_TYPOGRAPHY: CvTypography = {
  baseFontSize: 14,
  h1Size: 28,
  h2Size: 13,
  h3Size: 11,
  bodySize: 14,
  lineHeight: 1.48,
  fontFamily: 'Inter, system-ui, Segoe UI, Arial',
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const TemplateFillSlider: React.FC = () => {
  const { control, getValues, setValue } = useFormContext<CvDraft>();
  const watchedBase = useWatch({ control, name: 'typography.baseFontSize' });

  const baseValue = clamp(
    Number(watchedBase ?? DEFAULT_TYPOGRAPHY.baseFontSize),
    MIN_BASE_SIZE,
    MAX_BASE_SIZE
  );
  const fillPercent = ((baseValue - MIN_BASE_SIZE) / (MAX_BASE_SIZE - MIN_BASE_SIZE)) * 100;

  const handleChange = (nextValue: number) => {
    const current = (getValues('typography') as CvTypography | undefined) ?? DEFAULT_TYPOGRAPHY;

    const clamped = clamp(nextValue, MIN_BASE_SIZE, MAX_BASE_SIZE);
    const nextTypography: CvTypography = {
      ...DEFAULT_TYPOGRAPHY,
      ...current,
      baseFontSize: clamped,
      bodySize: clamped,
    };

    setValue('typography', nextTypography, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  return (
    <section
      className="mt-3 w-full max-w-xl rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-3 shadow-sm ring-1 ring-indigo-100/70 dark:border-indigo-300/20 dark:from-indigo-500/15 dark:via-white/5 dark:to-violet-500/15 dark:ring-indigo-200/10"
      aria-label="Template fill control"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-200/90">
            Live preview control
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Template fill</p>
        </div>
        <span className="rounded-full border border-indigo-300/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-200/30 dark:bg-indigo-950/40 dark:text-indigo-100">
          {baseValue}px
        </span>
      </div>

      <label htmlFor="template-fill-range" className="sr-only">
        Adjust template fill density from airy to fuller
      </label>
      <input
        id="template-fill-range"
        type="range"
        min={MIN_BASE_SIZE}
        max={MAX_BASE_SIZE}
        step={1}
        value={baseValue}
        onChange={(e) => handleChange(Number(e.target.value))}
        aria-label="Template fill density"
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full border border-indigo-200/80 bg-transparent accent-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-indigo-200/20 dark:accent-indigo-300 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:shadow-sm dark:[&::-moz-range-thumb]:border-indigo-100/30 dark:[&::-moz-range-thumb]:bg-indigo-300 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-sm dark:[&::-webkit-slider-thumb]:border-indigo-100/30 dark:[&::-webkit-slider-thumb]:bg-indigo-300"
        style={{
          background: `linear-gradient(to right, rgb(79 70 229) 0%, rgb(79 70 229) ${fillPercent}%, rgba(165, 180, 252, 0.35) ${fillPercent}%, rgba(165, 180, 252, 0.35) 100%)`,
        }}
      />

      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-gray-600 dark:text-white/70">
        <span>Airier layout</span>
        <span>Fuller page</span>
      </div>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-white/60">
        Slide to see how tightly your content fills the template in real time.
      </p>
    </section>
  );
};

export default TemplateFillSlider;

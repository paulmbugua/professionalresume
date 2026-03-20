// apps/web/src/components/cv/DesignFormattingPanel.tsx
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type {
  CvDraft,
  CvTypography,
  CvFormattingDefaults,
  CvTemplateTheme,
} from '@cvpro/shared/types';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const normalizeHex = (value?: string, fallback = '#000000') => {
  const normalized = String(value || '').trim();
  return HEX_COLOR_RE.test(normalized) ? normalized.toLowerCase() : fallback;
};

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <label className="flex items-center justify-between gap-3 text-xs">
    <span className="font-medium text-gray-600 dark:text-white/80">{label}</span>
    <input
      type="color"
      value={normalizeHex(value, '#000000')}
      onChange={(e) => onChange(normalizeHex(e.target.value, '#000000'))}
      className="h-8 w-10 rounded border border-gray-200 dark:border-white/10"
    />
  </label>
);

// ✅ Typed defaults that satisfy your exact schema in packages/shared/types/cv.ts
const DEFAULT_TYPOGRAPHY: CvTypography = {
  baseFontSize: 12,
  h1Size: 28,
  h2Size: 13,
  h3Size: 11,
  bodySize: 12,
  lineHeight: 1.48,
  fontFamily: 'Inter, system-ui, Segoe UI, Arial',
};

const DEFAULT_FORMATTING: CvFormattingDefaults = {
  textColor: '#0f172a',
  mutedTextColor: '#475569',
  linkColor: '#2563eb',
};

const DEFAULT_THEME: CvTemplateTheme = {
  primary: '#0f172a', // required
  secondary: '#334155',
  accent: '#0f766e',
  headerBg: '#0f172a',
  headerText: '#ffffff',
  sidebarBg: '#0f172a',
  sidebarText: '#f8fafc',
  sectionBg: '#ffffff',
  borderColor: '#e5e7eb',
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const DesignFormattingPanel: React.FC = () => {
  const { setValue, control, getValues } = useFormContext<CvDraft>();
  const draft = useWatch({ control }) as CvDraft;
  const templateId = draft?.templateId || '';

  // Hydrated values for UI display (always complete)
  const typography: CvTypography = { ...DEFAULT_TYPOGRAPHY, ...(draft?.typography ?? {}) };
  const formatting: CvFormattingDefaults = { ...DEFAULT_FORMATTING, ...(draft?.formatting ?? {}) };
  const theme: CvTemplateTheme = { ...DEFAULT_THEME, ...(draft?.templateTheme ?? {}) };

  const setTypography = (key: keyof CvTypography, value: string | number) => {
    const current =
      (getValues('typography') as CvTypography | undefined) ??
      draft?.typography ??
      DEFAULT_TYPOGRAPHY;

    const next: CvTypography = {
      ...DEFAULT_TYPOGRAPHY,
      ...current,
      [key]: value,
    } as CvTypography;

    // Safety clamps (optional)
    if (key === 'baseFontSize') next.baseFontSize = clamp(Number(next.baseFontSize), 10, 16);
    if (key === 'baseFontSize') next.bodySize = clamp(Number(next.baseFontSize), 10, 16);
    if (key === 'bodySize') next.bodySize = clamp(Number(next.bodySize), 10, 16);
    if (key === 'h1Size') next.h1Size = clamp(Number(next.h1Size), 18, 34);
    if (key === 'h2Size') next.h2Size = clamp(Number(next.h2Size), 11, 22);
    if (key === 'h3Size') next.h3Size = clamp(Number(next.h3Size), 10, 18);
    if (key === 'lineHeight') next.lineHeight = clamp(Number(next.lineHeight), 1.3, 1.65);

    setValue('typography', next, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  const setFormatting = (key: keyof CvFormattingDefaults, value: string) => {
    const current =
      (getValues('formatting') as CvFormattingDefaults | undefined) ??
      draft?.formatting ??
      DEFAULT_FORMATTING;

    const next: CvFormattingDefaults = {
      ...DEFAULT_FORMATTING,
      ...current,
      [key]: value,
    };

    setValue('formatting', next, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  const setTemplateTheme = (key: keyof CvTemplateTheme, value: string) => {
    const current =
      (getValues('templateTheme') as CvTemplateTheme | undefined) ??
      draft?.templateTheme ??
      DEFAULT_THEME;

    const next: CvTemplateTheme = {
      ...DEFAULT_THEME,
      ...current,
      [key]: value,
    };

    // Ensure required field stays present
    if (!next.primary) next.primary = DEFAULT_THEME.primary;

    setValue('templateTheme', next, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Design & Formatting</p>

      <div className="mt-3 space-y-3">
        {/* Typography */}
        <label className="block text-xs text-gray-600 dark:text-white/80">
          Base text size ({typography.baseFontSize}px)
          <input
            type="range"
            min={10}
            max={16}
            value={typography.baseFontSize}
            onChange={(e) => setTypography('baseFontSize', Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <label className="block text-xs text-gray-600 dark:text-white/80">
          Heading size ({typography.h1Size}px)
          <input
            type="range"
            min={18}
            max={34}
            value={typography.h1Size}
            onChange={(e) => setTypography('h1Size', Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <label className="block text-xs text-gray-600 dark:text-white/80">
          Line height ({Number(typography.lineHeight ?? 1.48).toFixed(2)})
          <input
            type="range"
            min={1.3}
            max={1.65}
            step={0.01}
            value={typography.lineHeight ?? 1.48}
            onChange={(e) => setTypography('lineHeight', Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        {/* Colors */}
        <ColorInput
          label="Body text"
          value={formatting.textColor}
          onChange={(v) => setFormatting('textColor', v)}
        />
        <ColorInput
          label="Muted text"
          value={formatting.mutedTextColor}
          onChange={(v) => setFormatting('mutedTextColor', v)}
        />
        <ColorInput
          label="Links"
          value={formatting.linkColor}
          onChange={(v) => setFormatting('linkColor', v)}
        />

        <ColorInput
          label="Accent"
          value={theme.accent ?? DEFAULT_THEME.accent ?? '#0f766e'}
          onChange={(v) => setTemplateTheme('accent', v)}
        />
        <ColorInput
          label="Primary"
          value={theme.primary}
          onChange={(v) => setTemplateTheme('primary', v)}
        />

        {(templateId === 'modern-sidebar' || templateId === 'modern-sidebar-blue') && (
          <>
            <ColorInput
              label="Sidebar bg"
              value={theme.sidebarBg ?? DEFAULT_THEME.sidebarBg ?? '#0f172a'}
              onChange={(v) => setTemplateTheme('sidebarBg', v)}
            />
            <ColorInput
              label="Sidebar text"
              value={theme.sidebarText ?? DEFAULT_THEME.sidebarText ?? '#f8fafc'}
              onChange={(v) => setTemplateTheme('sidebarText', v)}
            />
          </>
        )}

        {templateId === 'bold-header' && (
          <>
            <ColorInput
              label="Header bg"
              value={theme.headerBg ?? DEFAULT_THEME.headerBg ?? '#0f172a'}
              onChange={(v) => setTemplateTheme('headerBg', v)}
            />
            <ColorInput
              label="Header text"
              value={theme.headerText ?? DEFAULT_THEME.headerText ?? '#ffffff'}
              onChange={(v) => setTemplateTheme('headerText', v)}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DesignFormattingPanel;

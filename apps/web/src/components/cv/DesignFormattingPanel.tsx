import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CvDraft } from '@cvpro/shared/types';

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
      className="h-8 w-10 rounded border border-gray-200"
    />
  </label>
);

const DesignFormattingPanel: React.FC = () => {
  const { setValue, control, getValues } = useFormContext<CvDraft>();
  const draft = useWatch({ control }) as CvDraft;
  const templateId = draft?.templateId || '';

  const setTypography = (key: keyof NonNullable<CvDraft['typography']>, value: string | number) => {
    const current = getValues('typography') || {};
    const next = { ...current, [key]: value };
    setValue('typography', next, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  const setFormatting = (key: keyof NonNullable<CvDraft['formatting']>, value: string) => {
    const current = getValues('formatting') || {};
    const next = { ...current, [key]: value };
    setValue('formatting', next, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  const setTemplateTheme = (key: keyof NonNullable<CvDraft['templateTheme']>, value: string) => {
    const current = getValues('templateTheme') || {};
    const next = { ...current, [key]: value };
    setValue('templateTheme', next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Design & Formatting</p>
      <div className="mt-3 space-y-3">
        <label className="block text-xs text-gray-600 dark:text-white/80">
          Base text size ({draft?.typography?.baseFontSize ?? 12}px)
          <input
            type="range"
            min={10}
            max={16}
            value={draft?.typography?.baseFontSize ?? 12}
            onChange={(e) => setTypography('baseFontSize', Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-gray-600 dark:text-white/80">
          Heading size ({draft?.typography?.h1Size ?? 28}px)
          <input
            type="range"
            min={18}
            max={34}
            value={draft?.typography?.h1Size ?? 28}
            onChange={(e) => setTypography('h1Size', Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <ColorInput
          label="Body text"
          value={draft?.formatting?.textColor || '#0f172a'}
          onChange={(v) => setFormatting('textColor', v)}
        />
        <ColorInput
          label="Muted text"
          value={draft?.formatting?.mutedTextColor || '#475569'}
          onChange={(v) => setFormatting('mutedTextColor', v)}
        />
        <ColorInput
          label="Accent"
          value={draft?.templateTheme?.accent || '#0f766e'}
          onChange={(v) => setTemplateTheme('accent', v)}
        />
        <ColorInput
          label="Primary"
          value={draft?.templateTheme?.primary || '#0f172a'}
          onChange={(v) => setTemplateTheme('primary', v)}
        />

        {(templateId === 'modern-sidebar' || templateId === 'modern-sidebar-blue') && (
          <>
            <ColorInput
              label="Sidebar bg"
              value={draft?.templateTheme?.sidebarBg || '#0f172a'}
              onChange={(v) => setTemplateTheme('sidebarBg', v)}
            />
            <ColorInput
              label="Sidebar text"
              value={draft?.templateTheme?.sidebarText || '#f8fafc'}
              onChange={(v) => setTemplateTheme('sidebarText', v)}
            />
          </>
        )}

        {templateId === 'bold-header' && (
          <>
            <ColorInput
              label="Header bg"
              value={draft?.templateTheme?.headerBg || '#0f172a'}
              onChange={(v) => setTemplateTheme('headerBg', v)}
            />
            <ColorInput
              label="Header text"
              value={draft?.templateTheme?.headerText || '#ffffff'}
              onChange={(v) => setTemplateTheme('headerText', v)}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DesignFormattingPanel;

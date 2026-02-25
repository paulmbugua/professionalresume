import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CvDraft } from '@cvpro/shared/types';

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex items-center justify-between gap-3 text-xs">
    <span className="font-medium text-gray-600">{label}</span>
    <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 rounded border border-gray-200" />
  </label>
);

const DesignFormattingPanel: React.FC = () => {
  const { setValue, control } = useFormContext<CvDraft>();
  const draft = useWatch({ control }) as CvDraft;
  const templateId = draft?.templateId || '';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Design & Formatting</p>
      <div className="mt-3 space-y-3">
        <label className="block text-xs text-gray-600">
          Base text size ({draft?.typography?.baseFontSize ?? 12}px)
          <input type="range" min={10} max={16} value={draft?.typography?.baseFontSize ?? 12} onChange={(e) => setValue('typography.baseFontSize', Number(e.target.value), { shouldDirty: true })} className="mt-1 w-full" />
        </label>
        <label className="block text-xs text-gray-600">
          Heading size ({draft?.typography?.h1Size ?? 28}px)
          <input type="range" min={18} max={34} value={draft?.typography?.h1Size ?? 28} onChange={(e) => setValue('typography.h1Size', Number(e.target.value), { shouldDirty: true })} className="mt-1 w-full" />
        </label>

        <ColorInput label="Body text" value={draft?.formatting?.textColor || '#0f172a'} onChange={(v) => setValue('formatting.textColor', v, { shouldDirty: true })} />
        <ColorInput label="Muted text" value={draft?.formatting?.mutedTextColor || '#475569'} onChange={(v) => setValue('formatting.mutedTextColor', v, { shouldDirty: true })} />
        <ColorInput label="Accent" value={draft?.templateTheme?.accent || '#0f766e'} onChange={(v) => setValue('templateTheme.accent', v, { shouldDirty: true })} />
        <ColorInput label="Primary" value={draft?.templateTheme?.primary || '#0f172a'} onChange={(v) => setValue('templateTheme.primary', v, { shouldDirty: true })} />

        {(templateId === 'modern-sidebar' || templateId === 'modern-sidebar-blue') && (
          <>
            <ColorInput label="Sidebar bg" value={draft?.templateTheme?.sidebarBg || '#0f172a'} onChange={(v) => setValue('templateTheme.sidebarBg', v, { shouldDirty: true })} />
            <ColorInput label="Sidebar text" value={draft?.templateTheme?.sidebarText || '#f8fafc'} onChange={(v) => setValue('templateTheme.sidebarText', v, { shouldDirty: true })} />
          </>
        )}

        {templateId === 'bold-header' && (
          <>
            <ColorInput label="Header bg" value={draft?.templateTheme?.headerBg || '#0f172a'} onChange={(v) => setValue('templateTheme.headerBg', v, { shouldDirty: true })} />
            <ColorInput label="Header text" value={draft?.templateTheme?.headerText || '#ffffff'} onChange={(v) => setValue('templateTheme.headerText', v, { shouldDirty: true })} />
          </>
        )}
      </div>
    </div>
  );
};

export default DesignFormattingPanel;

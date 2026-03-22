import React from 'react';
import type { CoverLetterDraft, CoverLetterTemplateId } from '@cvpro/shared/types';

type CoverLetterTemplateMeta = {
  id: CoverLetterTemplateId;
  name: string;
  renderHtml: (draft: CoverLetterDraft) => string;
  component: React.FC<{ draft: CoverLetterDraft }>;
};

const esc = (value?: string) =>
  (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const nl2br = (value?: string) => esc(value).replace(/\n/g, '<br/>');

const renderLetterHtml = (draft: CoverLetterDraft, modern = false) => {
  const p = draft.body.middleParagraphs.filter((x) => x.trim());
  const bodyHtml = [draft.body.opening, ...p, draft.body.closing]
    .filter((x) => x.trim())
    .map((x) => `<p>${nl2br(x)}</p>`)
    .join('');

  return `<!doctype html><html><head><meta charset="UTF-8" /><style>
      body{margin:0;background:${draft.style.pageTheme === 'warm' ? '#f8f4ec' : '#f3f4f6'};font-family:${draft.style.fontFamily};}
      .page{width:794px;min-height:1123px;margin:0 auto;background:#fff;color:#111827;padding:52px 64px;box-sizing:border-box;font-size:${draft.style.fontSize}px;line-height:${draft.style.lineHeight};}
      .muted{color:#6b7280}.accent{color:${draft.style.accentColor}}
      .rule{height:2px;background:${draft.style.accentColor};margin:18px 0 24px;opacity:${modern ? 1 : 0.2}}
      p{margin:0 0 14px 0} .top{display:flex;justify-content:space-between;gap:20px} .block{white-space:pre-line}
    </style></head><body><article class="page">
      <header class="top"><div><h1 style="margin:0;font-size:${modern ? 32 : 28}px">${esc(draft.sender.fullName || 'Your Name')}</h1><div class="muted">${esc(draft.letter.role)}</div></div>
      <div class="muted">${esc(draft.letter.date)}</div></header>
      <div class="rule"></div>
      <section class="muted block">${esc(draft.sender.email)}\n${esc(draft.sender.phone)}\n${esc(draft.sender.location)}</section>
      <section class="block" style="margin-top:18px">${esc(draft.recipient.name)}\n${esc(draft.recipient.title)}\n${esc(draft.recipient.company)}\n${esc(draft.recipient.address)}</section>
      <p style="margin-top:20px"><strong>${esc(draft.letter.subject)}</strong></p>
      <p>${esc(draft.letter.greeting)}</p>
      <section style="margin-top:12px">${bodyHtml}</section>
      <p style="margin-top:22px">${esc(draft.letter.signoff)}<br/>${esc(draft.sender.fullName)}</p>
    </article></body></html>`;
};

const CoverLetterTemplateFrame: React.FC<{ draft: CoverLetterDraft }> = ({ draft }) => {
  const meta = coverLetterTemplateRegistryById[draft.templateId] || coverLetterTemplateRegistry[0];
  return (
    <iframe
      title="Cover letter preview"
      className="h-full w-full rounded-xl border border-gray-200 bg-white"
      srcDoc={meta.renderHtml(draft)}
    />
  );
};

export const coverLetterTemplateRegistry: CoverLetterTemplateMeta[] = [
  {
    id: 'classic-letter',
    name: 'Classic Letter',
    renderHtml: (draft) => renderLetterHtml(draft, false),
    component: CoverLetterTemplateFrame,
  },
  {
    id: 'modern-accent',
    name: 'Modern Accent',
    renderHtml: (draft) => renderLetterHtml(draft, true),
    component: CoverLetterTemplateFrame,
  },
];

export const coverLetterTemplateRegistryById = coverLetterTemplateRegistry.reduce(
  (acc, template) => {
    acc[template.id] = template;
    return acc;
  },
  {} as Record<CoverLetterTemplateId, CoverLetterTemplateMeta>
);

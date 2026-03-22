import type { CvDraft } from '@cvpro/shared/types';

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'span', 'br']);
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function stripHtml(value?: string): string {
  return String(value || '').replace(/<[^>]*>/g, '');
}

export type InlineRichTextTag = 'strong' | 'em' | 'u';

export function appendInlineRichTextTag(value: string | undefined, tag: InlineRichTextTag): string {
  const current = String(value || '');
  const spacer = current && !/\s$/.test(current) ? ' ' : '';
  return `${current}${spacer}<${tag}></${tag}>`;
}

export function sanitizeRichTextHtml(input?: string): string {
  if (!input) return '';
  const cleaned = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return cleaned.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag || '').toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (full.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br>';

    if (tag === 'span') {
      const styleMatch = String(rawAttrs || '').match(/style\s*=\s*['\"]([^'\"]*)['\"]/i);
      if (!styleMatch) return '<span>';
      const colorMatch = styleMatch[1].match(/color\s*:\s*([^;]+)/i);
      const color = colorMatch?.[1]?.trim() || '';
      if (!HEX_COLOR_RE.test(color)) return '<span>';
      return `<span style="color:${color}">`;
    }

    return `<${tag}>`;
  });
}

export function renderRichText(draft: CvDraft, key: string, fallback = ''): string {
  const html = draft.richText?.[key];
  if (html?.trim()) return sanitizeRichTextHtml(html);
  return esc(fallback);
}

export function renderRichTextReact(draft: CvDraft, key: string, fallback = '') {
  const html = renderRichText(draft, key, fallback);
  return { __html: html || esc(fallback) };
}

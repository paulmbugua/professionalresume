const SCRIPT_TAG_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const ON_ATTR_DOUBLE_QUOTE_RE = /\son\w+="[^"]*"/gi;
const ON_ATTR_SINGLE_QUOTE_RE = /\son\w+='[^']*'/gi;
const ON_ATTR_UNQUOTED_RE = /\son\w+=([^\s>]+)/gi;

export function stripScripts(html: string): string {
  return html
    .replace(SCRIPT_TAG_RE, '')
    .replace(ON_ATTR_DOUBLE_QUOTE_RE, '')
    .replace(ON_ATTR_SINGLE_QUOTE_RE, '')
    .replace(ON_ATTR_UNQUOTED_RE, '');
}

export function logScriptProbe(templateId: string, html: string): void {
  if (process.env.NODE_ENV === 'production') return;

  const lower = html.toLowerCase();
  const idx = lower.indexOf('<script');
  if (idx === -1) return;

  const start = Math.max(0, idx - 250);
  const end = Math.min(html.length, idx + 250);
  const snippet = html.slice(start, end);

  console.warn('[cv template] script tag found', { templateId, snippet });
}

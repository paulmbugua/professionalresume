export const defaultSectionOrder = ['summary','skills','experience','education','projects','certifications','extras'];
export const defaultSectionVisibility = defaultSectionOrder.reduce((a,k)=>(a[k]=true,a),{});
export const templateThemeDefaults={ 'modern-sidebar':{primary:'#0f172a',sidebarBg:'#0f172a',sidebarText:'#f8fafc',accent:'#38bdf8'}, 'bold-header':{primary:'#0f172a',headerBg:'#0f172a',headerText:'#ffffff',accent:'#38bdf8'}, 'modern-teal':{primary:'#0f766e',accent:'#0d9488',sectionBg:'#f0fdfa'}, 'modern-sidebar-blue':{primary:'#1d4ed8',sidebarBg:'#1d4ed8',sidebarText:'#eff6ff',accent:'#93c5fd'} };

const DEFAULT_TYPOGRAPHY = {
  baseFontSize: 12,
  h1Size: 28,
  h2Size: 13,
  h3Size: 11,
  bodySize: 12,
  lineHeight: 1.48,
  fontFamily: 'Inter, system-ui, Arial',
};

const templateTypographyDefaults = {
  'ats-minimal': { body: 11.8, meta: 11.1, h3: 12.8, sectionTitle: 12, headline: 13.2, name: 30, lineHeight: 1.47 },
  'ats-compact': { body: 11.4, meta: 10.8, h3: 12.4, sectionTitle: 11.8, headline: 12.4, name: 29, lineHeight: 1.44 },
  'modern-sidebar': { body: 11.4, meta: 10.9, h3: 12.6, sectionTitle: 11.7, headline: 12.8, name: 31, lineHeight: 1.46, sidebarBody: 11.3, sidebarMeta: 10.8 },
  'modern-sidebar-blue': { body: 11.4, meta: 10.9, h3: 12.6, sectionTitle: 11.7, headline: 12.8, name: 31, lineHeight: 1.46, sidebarBody: 11.3, sidebarMeta: 10.8 },
  'bold-header': { body: 11.7, meta: 11, h3: 12.5, sectionTitle: 11.8, headline: 13, name: 31, lineHeight: 1.47 },
  'modern-teal': { body: 11.5, meta: 10.9, h3: 12.5, sectionTitle: 11.8, headline: 13, name: 31, lineHeight: 1.46 },
  'elegant-serif': { body: 11.6, meta: 11, h3: 12.7, sectionTitle: 11.9, headline: 13.1, name: 34, lineHeight: 1.5 },
  'creative-timeline': { body: 11.7, meta: 11, h3: 12.8, sectionTitle: 12.1, headline: 13.2, name: 32, lineHeight: 1.47 },
  'compact-one-pager': { body: 11.2, meta: 10.7, h3: 12.1, sectionTitle: 11.5, headline: 12.4, name: 28.5, lineHeight: 1.41 },
};

const HEX_COLOR_RE=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const esc=(v='')=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const safeKey = (s='') => String(s).trim().toLowerCase();
export function sanitizeRichTextHtml(input=''){const cleaned=String(input).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,'');return cleaned.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi,(full,rawTag,rawAttrs)=>{const tag=String(rawTag||'').toLowerCase();if(!['b','strong','i','em','u','span','br'].includes(tag)) return '';if(full.startsWith('</')) return `</${tag}>`;if(tag==='br') return '<br>';if(tag==='span'){const styleMatch=String(rawAttrs||'').match(/style\s*=\s*['\"]([^'\"]*)['\"]/i);const colorMatch=styleMatch?.[1]?.match(/color\s*:\s*([^;]+)/i);const color=colorMatch?.[1]?.trim();if(!color||!HEX_COLOR_RE.test(color)) return '<span>';return `<span style="color:${color}">`;}return `<${tag}>`;});}
export function normalizeCvDraft(draft={}){const templateDefaults=templateThemeDefaults[draft.templateId]||{};return {...draft,sectionOrder:draft.sectionOrder?.length?draft.sectionOrder:defaultSectionOrder,sectionVisibility:{...defaultSectionVisibility,...(draft.sectionVisibility||{})},basics:{...(draft.basics||{}),name:draft.basics?.name||'',headline:draft.basics?.headline||'',email:draft.basics?.email||'',phone:draft.basics?.phone||'',location:draft.basics?.location||'',links:draft.basics?.links||[],photoUrl:draft.basics?.photoUrl||''},summary:draft.summary||'',skills:draft.skills||[],experience:draft.experience||[],education:draft.education||[],projects:draft.projects||[],certifications:draft.certifications||[],extras:{languages:[],interests:[],...(draft.extras||{})},typography:{...DEFAULT_TYPOGRAPHY,...(draft.typography||{})},formatting:{textColor:'#0f172a',mutedTextColor:'#475569',linkColor:'#0f766e',...(draft.formatting||{})},templateTheme:{primary:'#0f172a',...templateDefaults,...(draft.templateTheme||{})},richText:{...(draft.richText||{})}};}

export function resolveTemplateTypography(draft={}) {
  const templateId = String(draft.templateId || '').trim();
  const defaults = templateTypographyDefaults[templateId] || templateTypographyDefaults['ats-minimal'];
  const user = { ...DEFAULT_TYPOGRAPHY, ...(draft.typography || {}) };

  const bodyDelta = (Number(user.bodySize) || DEFAULT_TYPOGRAPHY.bodySize) - DEFAULT_TYPOGRAPHY.bodySize;
  const baseDelta = (Number(user.baseFontSize) || DEFAULT_TYPOGRAPHY.baseFontSize) - DEFAULT_TYPOGRAPHY.baseFontSize;
  const headingDelta = (Number(user.h1Size) || DEFAULT_TYPOGRAPHY.h1Size) - DEFAULT_TYPOGRAPHY.h1Size;

  const effectiveBodyDelta = (bodyDelta * 0.7) + (baseDelta * 0.8);

  const body = clamp(defaults.body + effectiveBodyDelta, 10.2, 14.8);
  const meta = clamp(defaults.meta + effectiveBodyDelta * 0.85, 9.8, 13.4);
  const h3 = clamp(defaults.h3 + effectiveBodyDelta * 0.55 + headingDelta * 0.08, 10.8, 16.2);
  const sectionTitle = clamp(defaults.sectionTitle + effectiveBodyDelta * 0.35 + headingDelta * 0.16, 10.6, 16.5);
  const name = clamp(defaults.name + effectiveBodyDelta * 0.6 + headingDelta * 0.58, 23, 41);
  const headline = clamp(defaults.headline + effectiveBodyDelta * 0.42 + headingDelta * 0.2, 11.2, 19);
  const lineHeight = clamp(Number(user.lineHeight) || defaults.lineHeight || DEFAULT_TYPOGRAPHY.lineHeight, 1.28, 1.65);
  const denseLineHeight = clamp(lineHeight - 0.04, 1.24, 1.58);

  return {
    body,
    meta,
    h3,
    sectionTitle,
    name,
    headline,
    lineHeight,
    denseLineHeight,
    sidebarBody: clamp((defaults.sidebarBody || body) + effectiveBodyDelta * 0.3, 10.1, 14.3),
    sidebarMeta: clamp((defaults.sidebarMeta || meta) + effectiveBodyDelta * 0.3, 9.7, 13.1),
    sectionGap: clamp(8 + effectiveBodyDelta * 1.3, 6, 14),
    itemGap: clamp(4.5 + effectiveBodyDelta, 3, 9),
  };
}

export const sectionVisible=(d,k)=>d.sectionVisibility?.[k]!==false;
export const buildCssVars=(d)=>{
  const t = resolveTemplateTypography(d);
  return `:root{--baseFontSize:${d.typography.baseFontSize}px;--h1Size:${d.typography.h1Size}px;--h2Size:${d.typography.h2Size}px;--h3Size:${d.typography.h3Size||12}px;--bodySize:${d.typography.bodySize||d.typography.baseFontSize}px;--fontFamily:${d.typography.fontFamily};--lineHeight:${t.lineHeight};--denseLineHeight:${t.denseLineHeight};--resolvedBodySize:${t.body}px;--resolvedMetaSize:${t.meta}px;--resolvedH3Size:${t.h3}px;--resolvedSectionTitleSize:${t.sectionTitle}px;--resolvedNameSize:${t.name}px;--resolvedHeadlineSize:${t.headline}px;--resolvedSidebarBodySize:${t.sidebarBody}px;--resolvedSidebarMetaSize:${t.sidebarMeta}px;--resolvedSectionGap:${t.sectionGap}px;--resolvedItemGap:${t.itemGap}px;--textColor:${d.formatting.textColor};--mutedTextColor:${d.formatting.mutedTextColor};--linkColor:${d.formatting.linkColor};--primary:${d.templateTheme.primary||'#0f172a'};--secondary:${d.templateTheme.secondary||'#1e293b'};--accent:${d.templateTheme.accent||d.templateTheme.primary||'#0f766e'};--sidebarBg:${d.templateTheme.sidebarBg||d.templateTheme.primary||'#0f172a'};--sidebarText:${d.templateTheme.sidebarText||'#f8fafc'};--headerBg:${d.templateTheme.headerBg||d.templateTheme.primary||'#0f172a'};--headerText:${d.templateTheme.headerText||'#ffffff'};--sectionBg:${d.templateTheme.sectionBg||'#f8fafc'};--borderColor:${d.templateTheme.borderColor||'#e2e8f0'};--page-width:210mm;--page-height:297mm}`;
};
export const paginationCss = `@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-size:var(--resolvedBodySize);line-height:var(--lineHeight);color:var(--textColor)}section,.item,.row,header,article{break-inside:avoid;page-break-inside:avoid}h2,h3{break-after:avoid;page-break-after:avoid}li{break-inside:avoid;page-break-inside:avoid}@media print{html,body{background-color:#fff !important;overflow:visible !important}.page{margin:0 !important;box-shadow:none !important;width:var(--page-width) !important;min-height:var(--page-height) !important;overflow:visible !important}}`;
export const renderRichText = (draft, key, fallback='') => draft.richText?.[key]?.trim() ? sanitizeRichTextHtml(draft.richText[key]) : esc(fallback);

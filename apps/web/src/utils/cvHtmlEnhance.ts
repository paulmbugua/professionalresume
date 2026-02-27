import type { CvDraft } from '@cvpro/shared/types';

export const PREVIEW_MAX_HEIGHT = 10000;

const SIDEBAR_TEMPLATE_IDS = new Set(['modern-sidebar', 'modern-sidebar-blue']);

export type CvHtmlEnhanceOptions = {
  /**
   * Default true.
   * When false, we do NOT inject the autosize postMessage script.
   * (Use this for TemplateSpotlightModal to avoid “infinite” growth.)
   */
  injectAutosize?: boolean;

  /**
   * Default false.
   * When true, clamps SCREEN preview to a single page height (one page only).
   * (Use this for TemplateSpotlightModal.)
   */
  screenOnePageOnly?: boolean;
};

function applySidebarPagedBackgroundCss(templateId: string) {
  if (!SIDEBAR_TEMPLATE_IDS.has(templateId)) return '';

  // Print engines paginate one long flow; sidebar elements cannot stretch into empty
  // leftover page space. Repeating a page-height background paints each A4 page slice.
  //
  // ✅ Screen: paint on .page (simple, looks correct in iframe preview)
  // ✅ Print: paint on html/body (bulletproof; avoids bottom cut when .page height differs)
  return `
/* marker */
.cv-sidebar-paged-background{}

body[data-template-id="${templateId}"]{
  --cv-page-height:269mm;
  --cv-sidebar-width:70mm;
}

/* SCREEN */
body[data-template-id="${templateId}"] .page{
  background-image:linear-gradient(to right,var(--sidebarBg) 0 var(--cv-sidebar-width),#fff var(--cv-sidebar-width) 100%);
  background-repeat:no-repeat;
  background-size:100% 100%;
  background-position:top left;
}

/* PRINT: paint on document flow so it never “cuts” at the bottom */
@media print{
  html,body{
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
    background-image:linear-gradient(to right,var(--sidebarBg) 0 var(--cv-sidebar-width),#fff var(--cv-sidebar-width) 100%);
    background-repeat:repeat-y;
    background-size:100% var(--cv-page-height);
    background-position:top left;
  }

  /* avoid double-painting if templates also set .page bg */
  body[data-template-id="${templateId}"] .page{
    background:transparent !important;
  }
}

/* avoid sidebar element painting over our gradient */
body[data-template-id="${templateId}"] aside{background:transparent !important}
`;
}

export function withPreviewEnhancements(
  html: string,
  draft: CvDraft,
  templateMeta?: { templateId?: string } | null,
  opts: CvHtmlEnhanceOptions = {}
) {
  const { injectAutosize = true, screenOnePageOnly = false } = opts;

  const templateId = String(templateMeta?.templateId ?? draft.templateId ?? '').trim();
  const sidebarPagedBackgroundCss = applySidebarPagedBackgroundCss(templateId);

  // ✅ Modal “one page only” clamp (SCREEN only).
  // This prevents the modal from looking like it’s creating new pages / infinite scroll.
  // NOTE: We only clamp on screen; print remains normal.
  const onePageClampCss = screenOnePageOnly
    ? `
/* SCREEN-ONLY single-page clamp (modal) */
@media screen{
  html,body{overflow:hidden !important;}
  /* clamp the visible page box */
  body[data-template-id="${templateId}"] .page{
    height:${1130}px !important;
    max-height:${1130}px !important;
    overflow:hidden !important;
  }
}
`
    : '';

  const paginationCss = `
<style id="cv-shared-pagination">
@page { size: A4; margin: 14mm; }
*{box-sizing:border-box}
section,.item,.row,header,article{break-inside:avoid;page-break-inside:avoid}
h2,h3{break-after:avoid;page-break-after:avoid}
ul{break-inside:auto;page-break-inside:auto}
li{break-inside:avoid;page-break-inside:avoid}
@media print{
  html,body{background:#fff !important;overflow:visible !important}
  .page{width:auto !important;min-height:auto !important;margin:0 !important;box-shadow:none !important;overflow:visible !important}
}
${sidebarPagedBackgroundCss}
${onePageClampCss}
body[data-template-id="creative-timeline"] .timeline:before{
  top:0 !important;
  bottom:0 !important;
}
</style>`;

  const autosizeScript = `
<script>
(function(){
  function send(){
    try{
      var h=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,document.documentElement.offsetHeight,document.body.offsetHeight);
      parent.postMessage({__cv_iframe_resize:true,height:h},'*');
    }catch(e){}
  }
  window.addEventListener('load',send);
  window.addEventListener('resize',send);
  try{
    var mo=new MutationObserver(function(){send();});
    mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
  }catch(e){}
  setTimeout(send,0);
  setInterval(send,700);
})();
</script>`;

  let next = html || '';

  if (!next.includes('data-template-id=')) {
    next = next.replace('<body', `<body data-template-id="${templateId}"`);
  }

  if (!next.includes('id="cv-shared-pagination"')) {
    next = next.replace('</head>', `${paginationCss}</head>`);
  }

  // ✅ Only inject autosize when enabled
  if (injectAutosize && !next.includes('__cv_iframe_resize')) {
    next = next.replace('</body>', `${autosizeScript}</body>`);
  }

  return next;
}
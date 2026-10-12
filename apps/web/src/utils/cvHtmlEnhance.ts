import type { CvDraft } from '@cvpro/shared/types';
import {
  buildSmartPaginationScript,
  smartPaginationCss,
} from '@cvpro/shared/cv/renderers/index.js';

export const PREVIEW_MAX_HEIGHT = 10000;

const SIDEBAR_TEMPLATE_IDS = new Set(['modern-sidebar', 'modern-sidebar-blue', 'executive-navy-orange']);

export type CvHtmlEnhanceOptions = {
  /**
   * Default true.
   * When false, we do NOT inject the autosize postMessage script.
   * (Use this for TemplateSpotlightModal to avoid -infinite- growth.)
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
  return `@media print{body[data-template-id="${templateId}"] .cv-paginated-page>aside.sidebar{background:var(--sidebarBg)!important}}`;
}

export function withPreviewEnhancements(
  html: string,
  draft: CvDraft,
  templateMeta?: { templateId?: string } | null,
  opts: CvHtmlEnhanceOptions = {}
) {
  const { injectAutosize = true, screenOnePageOnly = false } = opts;

  const templateId = String(templateMeta?.templateId ?? draft.templateId ?? '').trim();
  const layoutDebug =
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('cvLayoutDebug') === '1';
  const sidebarPagedBackgroundCss = applySidebarPagedBackgroundCss(templateId);

  // ? Modal -one page only- clamp (SCREEN only).
  // This prevents the modal from looking like it-s creating new pages / infinite scroll.
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
@page { size: A4; margin: 0; }
*{box-sizing:border-box}
html,body{margin:0;padding:0}
section,article,.item{break-inside:auto;page-break-inside:auto}
.row,header{break-inside:avoid;page-break-inside:avoid}
h2,h3{break-after:avoid;page-break-after:avoid}
ul{break-inside:auto;page-break-inside:auto}
li{break-inside:avoid;page-break-inside:avoid}
@media print{
  html,body{background-color:#fff !important;overflow:visible !important}
  .page{
    margin:0 !important;
    box-shadow:none !important;
    overflow:visible !important;
    box-decoration-break:clone;
    -webkit-box-decoration-break:clone;
  }
  .page>.inner,.page>.content,.page>aside,.page>main,.page>section{
    box-decoration-break:clone;
    -webkit-box-decoration-break:clone;
  }
}
${sidebarPagedBackgroundCss}
${onePageClampCss}
body[data-template-id="creative-timeline"] .timeline:before{
  top:0 !important;
  bottom:0 !important;
}
</style>`;

  const smartPaginationRuntime = screenOnePageOnly
    ? ''
    : buildSmartPaginationScript({ debug: layoutDebug, notifyParent: true });

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
    next = next.replace('</head>', `${paginationCss}${screenOnePageOnly ? '' : smartPaginationCss}</head>`);
  }

  // ? Only inject autosize when enabled
  if (injectAutosize && !next.includes('__cv_iframe_resize')) {
    next = next.replace('</body>', `${autosizeScript}</body>`);
  }

  if (smartPaginationRuntime && !next.includes('id="cv-smart-pagination-runtime"')) {
    next = next.replace('</body>', `${smartPaginationRuntime}</body>`);
  }

  return next;
}

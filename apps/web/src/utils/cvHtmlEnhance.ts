import type { CvDraft } from '@cvpro/shared/types';

const PREVIEW_MAX_HEIGHT = 10000;
const SIDEBAR_TEMPLATE_IDS = new Set(['modern-sidebar', 'modern-sidebar-blue']);

function applySidebarPagedBackgroundCss(templateMeta: { templateId: string }) {
  const templateId = templateMeta.templateId;
  if (!SIDEBAR_TEMPLATE_IDS.has(templateId)) return '';

  // Print engines paginate one long flow; sidebar elements cannot stretch into empty
  // leftover page space. Repeating a page-height background paints each A4 page slice.
  return `
body[data-template-id="${templateId}"]{
  --cv-page-height:269mm;
  --cv-sidebar-width:70mm;
}
@media print{
  body[data-template-id="${templateId}"] .page{
    background-image:linear-gradient(to right,var(--sidebarBg) 0 var(--cv-sidebar-width),#fff var(--cv-sidebar-width) 100%);
    background-repeat:repeat-y;
    background-size:100% var(--cv-page-height);
    background-position:top left;
    box-decoration-break:clone;
    -webkit-box-decoration-break:clone;
  }
}
body[data-template-id="${templateId}"] aside{background:transparent !important}
`;
}

export function withPreviewEnhancements(html: string, draft: CvDraft) {
  const templateId = String(draft.templateId || '').trim();
  const sidebarPagedBackgroundCss = applySidebarPagedBackgroundCss({ templateId });
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
  if (!next.includes('__cv_iframe_resize')) {
    next = next.replace('</body>', `${autosizeScript}</body>`);
  }

  return next;
}

export { PREVIEW_MAX_HEIGHT };

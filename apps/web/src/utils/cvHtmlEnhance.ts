import type { CvDraft } from '@cvpro/shared/types';

const PREVIEW_MAX_HEIGHT = 10000;

export function withPreviewEnhancements(html: string, draft: CvDraft) {
  const templateId = String(draft.templateId || '').trim();
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
body[data-template-id="modern-sidebar"] .page,
body[data-template-id="modern-sidebar-blue"] .page{
  background:linear-gradient(to right,var(--sidebarBg) 0 70mm,#fff 70mm 100%);
}
body[data-template-id="modern-sidebar"] aside,
body[data-template-id="modern-sidebar-blue"] aside{background:transparent !important}
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

(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[833],{3089:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>p});var r=a(95155),i=a(12115),n=a(73321),o=a(46092),d=a(23797);function p(){let e=(0,n.useParams)(),t=e?.draftId,{backendUrl:a,token:p}=(0,o.pJ)(),[m,c]=(0,i.useState)(null);return((0,i.useEffect)(()=>{let e=!1;return(async()=>{if(a&&p&&t)try{var r;let i,n=await (0,d.sl)(a,p,t);if(e)return;let o=(r=n.html||"",i=`
<style id="cv-print-route-enhancements">
  @page { size: A4; margin: 0; }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Loaded /print page should already look like the final print doc */
  body {
    overflow: hidden;
  }

  .page {
    margin: 0 auto !important;
    box-shadow: none !important;
  }

  /* Sidebar templates: preserve color fill in screen + print */
  body[data-template-id="modern-sidebar"],
  body[data-template-id="modern-sidebar-blue"] {
    --cv-sidebar-width: 70mm;
    --cv-page-height: 297mm;
  }

  body[data-template-id="modern-sidebar"] .page,
  body[data-template-id="modern-sidebar-blue"] .page {
    background-image: linear-gradient(
      to right,
      var(--sidebarBg) 0 var(--cv-sidebar-width),
      #fff var(--cv-sidebar-width) 100%
    ) !important;
    background-repeat: no-repeat !important;
    background-size: 100% 100% !important;
    background-position: top left !important;
  }

  body[data-template-id="modern-sidebar"] aside,
  body[data-template-id="modern-sidebar-blue"] aside {
    background: transparent !important;
  }

  @media print {
    html, body {
      overflow: visible !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      margin: 0 !important;
      box-shadow: none !important;
      width: 210mm !important;
      min-height: 297mm !important;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    .page > .inner,
    .page > .content,
    .page > aside,
    .page > main,
    .page > section {
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    body[data-template-id="modern-sidebar"] .page,
    body[data-template-id="modern-sidebar-blue"] .page {
      background-repeat: repeat-y !important;
      background-size: 100% var(--cv-page-height) !important;
    }
  }
</style>
<script>
  (function () {
    var title = document.querySelector('h1')?.textContent?.trim();
    if (title) document.title = title + ' - CV';

    window.addEventListener('keydown', function (event) {
      var isPrintShortcut = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'p';
      if (!isPrintShortcut) return;
      event.preventDefault();
      window.print();
    });

    setTimeout(function () {
      window.print();
    }, 120);
  })();
</script>`,r.includes('id="cv-print-route-enhancements"')?r:r.includes("</head>")?r.replace("</head>",`${i}</head>`):`${i}${r}`);document.open(),document.write(o),document.close()}catch(t){e||c(t?.message||"Failed to load printable document")}})(),()=>{e=!0}},[a,p,t]),m)?(0,r.jsx)("div",{className:"p-6 text-sm text-rose-600",children:m}):(0,r.jsx)("div",{className:"p-4 text-sm text-gray-500",children:"Preparing print document…"})}},65002:(e,t,a)=>{Promise.resolve().then(a.bind(a,3089))}},e=>{e.O(0,[5498,6174,3168,8441,3794,7358],()=>e(e.s=65002)),_N_E=e.O()}]);
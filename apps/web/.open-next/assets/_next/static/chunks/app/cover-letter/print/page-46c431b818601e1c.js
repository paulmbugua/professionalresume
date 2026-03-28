(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[6265],{44149:(t,e,n)=>{"use strict";n.r(e),n.d(e,{default:()=>c});var r=n(95155),i=n(12115),o=n(73321),a=n(46092),d=n(23797);function c(){let t=(0,o.useSearchParams)(),{backendUrl:e,token:n}=(0,a.pJ)(),[c,m]=(0,i.useState)("");return((0,i.useEffect)(()=>{(async()=>{let r=function(t){if(!t)return null;try{let e=atob(decodeURIComponent(t)),n=Uint8Array.from(e,t=>t.charCodeAt(0)),r=new TextDecoder().decode(n);return JSON.parse(r)}catch{return null}}(t?.get("payload")||null);if(r&&e&&n)try{var i;let t,o=(i=(await (0,d.gV)(e,n,{coverLetterJson:(0,d.$C)(r)})).html||"",t=`
<style id="cover-letter-print-route-enhancements">
  @page { size: A4; margin: 0; }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    overflow: hidden;
  }

  .cl-page {
    margin: 0 auto !important;
    box-shadow: none !important;
    width: 210mm !important;
    min-height: 297mm !important;
    overflow: visible !important;
  }

  @media print {
    html, body {
      overflow: visible !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .cl-page {
      margin: 0 !important;
      box-shadow: none !important;
      width: 210mm !important;
      min-height: 297mm !important;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
  }
</style>
<script>
  (function () {
    var heading = document.querySelector('.cl-header-name, h1');
    var title = heading && heading.textContent ? heading.textContent.trim() : '';
    if (title) document.title = title + ' - Cover Letter';

    window.addEventListener('keydown', function (event) {
      var isPrintShortcut = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'p';
      if (!isPrintShortcut) return;
      event.preventDefault();
      window.print();
    });

    var printNow = function () {
      window.requestAnimationFrame(function () {
        window.print();
      });
    };

    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(function () { setTimeout(printNow, 120); });
    } else {
      setTimeout(printNow, 120);
    }
  })();
</script>`,i.includes('id="cover-letter-print-route-enhancements"')?i:i.includes("</head>")?i.replace("</head>",`${t}</head>`):`${t}${i}`);document.open(),document.write(o),document.close()}catch(t){m(t?.message||"Failed to render print view")}})()},[e,n,t]),c)?(0,r.jsx)("div",{className:"p-6 text-sm text-rose-600",children:c}):(0,r.jsx)("div",{className:"p-4 text-sm text-gray-500",children:"Preparing cover-letter print preview…"})}},96550:(t,e,n)=>{Promise.resolve().then(n.bind(n,44149))}},t=>{t.O(0,[5498,6174,3168,8441,3794,7358],()=>t(t.s=96550)),_N_E=t.O()}]);
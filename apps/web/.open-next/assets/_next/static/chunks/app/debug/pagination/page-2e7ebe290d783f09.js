(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[5703],{29826:(e,t,a)=>{"use strict";a.d(t,{C:()=>i,s:()=>s});let i=1e4,r=new Set(["modern-sidebar","modern-sidebar-blue"]);function s(e,t,a,i={}){let{injectAutosize:n=!0,screenOnePageOnly:o=!1}=i,d=String(a?.templateId??t.templateId??"").trim(),l=r.has(d)?`
/* marker */
.cv-sidebar-paged-background{}

body[data-template-id="${d}"]{
  --cv-page-height:269mm;
  --cv-sidebar-width:70mm;
}

/* SCREEN */
body[data-template-id="${d}"] .page{
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
    /* Shared renderer base CSS applies background:#fff !important for print.
       Keep sidebar background paint alive by overriding with matching priority. */
    background-image:linear-gradient(to right,var(--sidebarBg) 0 var(--cv-sidebar-width),#fff var(--cv-sidebar-width) 100%) !important;
    background-repeat:repeat-y !important;
    background-size:100% var(--cv-page-height) !important;
    background-position:top left !important;
  }

  /* avoid double-painting if templates also set .page bg */
  body[data-template-id="${d}"] .page{
    background:transparent !important;
  }
}

/* avoid sidebar element painting over our gradient */
body[data-template-id="${d}"] aside{background:transparent !important}
`:"",c=o?`
/* SCREEN-ONLY single-page clamp (modal) */
@media screen{
  html,body{overflow:hidden !important;}
  /* clamp the visible page box */
  body[data-template-id="${d}"] .page{
    height:1130px !important;
    max-height:1130px !important;
    overflow:hidden !important;
  }
}
`:"",m=`
<style id="cv-shared-pagination">
@page { size: A4; margin: 0; }
*{box-sizing:border-box}
html,body{margin:0;padding:0}
section,.item,.row,header,article{break-inside:avoid;page-break-inside:avoid}
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
${l}
${c}
body[data-template-id="creative-timeline"] .timeline:before{
  top:0 !important;
  bottom:0 !important;
}
</style>`,p=`
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
</script>`,u=e||"";return u.includes("data-template-id=")||(u=u.replace("<body",`<body data-template-id="${d}"`)),u.includes('id="cv-shared-pagination"')||(u=u.replace("</head>",`${m}</head>`)),n&&!u.includes("__cv_iframe_resize")&&(u=u.replace("</body>",`${p}</body>`)),u}},55623:(e,t,a)=>{"use strict";a.d(t,{Ge:()=>o,Ok:()=>c,zp:()=>i});let i={id:"demo-cv",userId:"demo-user",title:"Sample CV",templateId:"ats-minimal",updatedAt:new Date("2024-01-15T10:00:00.000Z").toISOString(),basics:{name:"Jordan Taylor",headline:"Product Designer \xb7 UX Researcher",email:"jordan.taylor@email.com",phone:"+1 (555) 123-4567",location:"Austin, TX",links:[{label:"Portfolio",url:"jordan.design"},{label:"LinkedIn",url:"linkedin.com/in/jordan-taylor"}]},summary:"Designer focused on accessible, data-informed experiences. 7+ years delivering B2B and consumer products across fintech and education.",skills:["Product Strategy","Design Systems","Figma","User Research","Prototyping"],experience:[{company:"Northwind Labs",role:"Lead Product Designer",start:"2021",end:"Present",location:"Remote",bullets:["Shipped a new onboarding flow that improved activation by 28%.","Led a cross-functional design system migration across 12 squads."]},{company:"Luma Education",role:"UX Designer",start:"2018",end:"2021",location:"Seattle, WA",bullets:["Partnered with researchers to refresh lesson planner UI for 40k teachers.","Built a component library to speed up QA and reduce defects by 22%."]}],education:[{school:"University of Washington",program:"B.S. Human-Centered Design",start:"2014",end:"2018",details:"Graduated with honors \xb7 UX capstone award"}],projects:[{name:"Atlas Growth Dashboard",link:"atlas.app",description:"Analytics suite for go-to-market teams.",bullets:["Defined reporting taxonomy across product, sales, and marketing."]}],certifications:[{name:"NN/g UX Certificate",issuer:"Nielsen Norman Group",year:"2022"}],extras:{languages:["English","Spanish"],interests:["Travel photography","Community hackathons"]},sectionOrder:["summary","skills","experience","education","projects","certifications","extras"],sectionVisibility:{summary:!0,skills:!0,experience:!0,education:!0,projects:!0,certifications:!0,extras:!0}},r={isDemoSeeded:!0,hasImportedCv:!1},s=e=>!!(e&&e.trim().length>0),n=(e,t="")=>s(e)?String(e).trim():t,o=e=>{if(!e)return!1;let t=e.basics??{};return!!(s(t.name)||s(t.headline)||s(t.email)||s(t.phone)||s(t.location)||t.links?.some(e=>s(e?.label)||s(e?.url))||s(e.summary)||e.skills?.some(e=>s(e))||e.experience?.some(e=>s(e.company)||s(e.role)||s(e.location)||s(e.start)||s(e.end)||s(e.description)||e.bullets?.some(e=>s(e)))||e.education?.some(e=>s(e.school)||s(e.program)||s(e.start)||s(e.end)||s(e.details))||e.projects?.some(e=>s(e.name)||s(e.link)||s(e.description)||e.bullets?.some(e=>s(e)))||e.certifications?.some(e=>s(e.name)||s(e.issuer)||s(e.year))||e.extras?.languages?.some(e=>s(e))||e.extras?.interests?.some(e=>s(e)))},d=e=>!!e?.meta?.isDemoSeeded,l=(e,t,a=!1)=>a?t??[]:Array.isArray(t)&&t.length>0?t:e,c=e=>{let t=e?.templateId??i.templateId,a={...i,templateId:t};if(!e)return{draft:{...a,meta:r},resumeSource:"demo"};let s=(e=>{if(!e)return"demo";let t=!!e&&(!!e.meta?.hasImportedCv||o(e)),a=d(e),i=!!(e.id&&"demo-cv"!==e.id);return i&&t?"saved":t&&!a?i?"saved":"live":a?"demo":i?"saved":"live"})(e),c="demo"!==s;return{draft:{...a,id:e.id??a.id,userId:e.userId??a.userId,updatedAt:e.updatedAt??a.updatedAt,title:c?n(e.title):n(e.title,a.title),templateId:t,basics:{...a.basics,...e.basics??{},name:c?n(e.basics?.name):n(e.basics?.name,a.basics.name),headline:c?n(e.basics?.headline):n(e.basics?.headline,a.basics.headline),email:c?n(e.basics?.email):n(e.basics?.email,a.basics.email),phone:c?n(e.basics?.phone):n(e.basics?.phone,a.basics.phone),location:c?n(e.basics?.location):n(e.basics?.location,a.basics.location),links:c?e.basics?.links??[]:l(a.basics.links,e.basics?.links)},summary:c?n(e.summary):n(e.summary,a.summary),skills:l(a.skills,e.skills,c),experience:l(a.experience,e.experience,c),education:l(a.education,e.education,c),projects:l(a.projects,e.projects,c),certifications:l(a.certifications,e.certifications,c),extras:c?{languages:e.extras?.languages??[],interests:e.extras?.interests??[]}:{...a.extras,...e.extras??{},languages:e.extras?.languages&&e.extras.languages.length>0?e.extras.languages:a.extras.languages,interests:e.extras?.interests&&e.extras.interests.length>0?e.extras.interests:a.extras.interests},sectionOrder:e.sectionOrder??a.sectionOrder,sectionVisibility:e.sectionVisibility??a.sectionVisibility,typography:e.typography??a.typography,formatting:e.formatting??a.formatting,templateTheme:e.templateTheme??a.templateTheme,richText:e.richText??a.richText,meta:{...r,...e.meta||{},isDemoSeeded:d(e)}},resumeSource:s}}},60732:(e,t,a)=>{Promise.resolve().then(a.bind(a,81319))},81319:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>m});var i=a(95155),r=a(98500),s=a.n(r),n=a(82403),o=a(55623);let d=Array.from({length:6},(e,t)=>`Delivered initiative ${t+1} with measurable KPI lift across product, analytics, and operations.`);function l(e){return{...o.zp,id:`stress-${e}`,templateId:e,title:`Pagination Stress (${e})`,experience:Array.from({length:8},(e,t)=>({company:`Longform Company ${t+1}`,role:"Senior Product Manager",start:`${2014+t}`,end:`${2015+t}`,location:"Remote",bullets:d})),projects:Array.from({length:6},(e,t)=>({name:`Large Project ${t+1}`,link:`https://example.com/projects/${t+1}`,description:"Detailed project narrative intended to force multi-page flow and list wrapping in export and print.",bullets:d}))}}var c=a(29826);function m(){return(0,i.jsxs)("main",{className:"min-h-screen bg-site p-6",children:[(0,i.jsxs)("div",{className:"mx-auto mb-6 max-w-6xl rounded-xl bg-white p-4 shadow",children:[(0,i.jsx)("h1",{className:"text-lg font-semibold",children:"Pagination Debug"}),(0,i.jsx)("p",{className:"text-sm text-slate-600",children:"Use browser print from this page for template stress testing."}),(0,i.jsxs)("div",{className:"mt-3 flex gap-3",children:[(0,i.jsx)("button",{onClick:()=>window.print(),className:"rounded bg-slate-900 px-3 py-1 text-sm text-white",children:"Print this page"}),(0,i.jsx)(s(),{href:"/builder",className:"rounded border border-slate-300 px-3 py-1 text-sm",children:"Open Builder"})]})]}),(0,i.jsx)("div",{className:"mx-auto grid max-w-6xl gap-6",children:n.a_.map(e=>{var t;let a=[l(e.id)];return("modern-sidebar"===e.id||"modern-sidebar-blue"===e.id)&&a.push({...l(t=e.id),id:`stress-sidebar-${t}`,title:`Sidebar Pagination Stress (${t})`,summary:"Product leader focused on pragmatic execution and measurable outcomes.",skills:["Roadmapping","Stakeholder Management","Experimentation"],certifications:[],extras:{languages:[],interests:[]},experience:Array.from({length:7},(e,t)=>({company:`Main Column Heavy Org ${t+1}`,role:"Head of Product",start:`${2013+t}`,end:`${2014+t}`,location:"Hybrid",bullets:d}))}),a.map((t,a)=>{let r=e.renderHtml?(0,c.s)(e.renderHtml(t),t):"";return(0,i.jsxs)("section",{className:"rounded-xl bg-white p-4 shadow",children:[(0,i.jsx)("h2",{className:"mb-1 text-sm font-semibold uppercase tracking-wide text-slate-700",children:e.name}),(0,i.jsx)("p",{className:"mb-3 text-xs text-slate-500",children:t.title}),r?(0,i.jsx)("iframe",{title:`${e.name}-${a}`,srcDoc:r,className:"h-[1200px] w-full rounded border",style:{border:"1px solid #e2e8f0"},sandbox:"allow-same-origin"}):(0,i.jsx)("p",{className:"text-sm text-rose-600",children:"No HTML renderer registered."})]},`${e.id}-${a}`)})})})]})}}},e=>{e.O(0,[8500,2403,8441,3794,7358],()=>e(e.s=60732)),_N_E=e.O()}]);
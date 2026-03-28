"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[9401],{19401:(e,t,a)=>{a.d(t,{default:()=>m});var i=a(95155),r=a(12115),s=a(55623),n=a(82403),o=a(94258),d=a(29826),l=a(10358);let m=({draft:e,showLiveBadge:t=!1,resumeSourceHint:a})=>{let m,[c,p]=(0,r.useState)(1400),b=(0,s.Ok)(e),u=(0,r.useMemo)(()=>({...b.draft,typography:{...b.draft.typography||{},...e.typography||{}},formatting:{...b.draft.formatting||{},...e.formatting||{}},templateTheme:{...b.draft.templateTheme||{},...e.templateTheme||{}},richText:{...b.draft.richText||{},...e.richText||{}},sectionOrder:(0,l.nN)(e.sectionOrder||b.draft.sectionOrder,b.draft.sectionOrder),sectionVisibility:(0,l.JV)({...b.draft.sectionVisibility||{},...e.sectionVisibility||{}})}),[b.draft,e]),g=b.resumeSource,h=(m=[u?.summary,u?.basics?.name,u?.basics?.headline,...(u?.skills||[]).slice(0,20),...(u?.experience||[]).flatMap(e=>[e.role,e.company,...e.bullets||[]])].filter(Boolean).join("\n").slice(0,6e3),["%PDF-"," obj","endobj","stream","endstream","xref","trailer","MediaBox","ViewerPreferences","StructParents"].reduce((e,t)=>{let a=m.match(RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"));return e+(a?.length||0)},0)>=6),f=n.oj[u.templateId]||n.a_[0],x=!!f?.component,y=x?f?.component:n.a_[0]?.component,v=(0,r.useMemo)(()=>JSON.stringify({templateId:u.templateId,typography:u.typography,formatting:u.formatting,templateTheme:u.templateTheme,richText:u.richText,sectionOrder:u.sectionOrder,sectionVisibility:u.sectionVisibility}),[u.templateId,u.typography,u.formatting,u.templateTheme,u.richText,u.sectionOrder,u.sectionVisibility]),k=!!f?.renderHtml,w=(0,r.useMemo)(()=>{if(!k)return null;let e=f?.renderHtml;return e?(0,d.s)((0,o.L)(e(u)),u,{templateId:u.templateId},{injectAutosize:!0}):null},[f,u,k,v]);return(0,r.useEffect)(()=>{},[u]),(0,r.useEffect)(()=>{let e=e=>{let t=e.data;if(!t||!0!==t.__cv_iframe_resize)return;let a=Number(t.height);Number.isFinite(a)&&!(a<500)&&p(Math.min(a+24,d.C))};return window.addEventListener("message",e),()=>window.removeEventListener("message",e)},[]),(0,i.jsxs)("div",{className:"cv-preview-wrapper h-full min-h-0 w-full",children:[(0,i.jsxs)("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[t?(0,i.jsxs)("span",{className:`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${"demo"===g?"border border-amber-200 bg-amber-50 text-amber-700":"border border-emerald-200 bg-emerald-50 text-emerald-700"}`,children:[(0,i.jsx)("span",{className:`h-2 w-2 rounded-full ${"demo"===g?"bg-amber-500":"bg-emerald-500"}`}),"demo"===g?"Demo content":"saved"===g?"Saved draft":"Imported / live"]}):(0,i.jsx)("span",{}),"demo"===g&&(0,i.jsx)("div",{className:"rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800",children:"Showing sample content. Upload a CV or edit fields to switch to your own data."})]}),!x&&(0,i.jsxs)("div",{className:"mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800",children:["Unknown template id ",(0,i.jsx)("span",{className:"font-semibold",children:u.templateId}),". Falling back to"," ",(0,i.jsx)("span",{className:"font-semibold",children:n.a_[0]?.id??"first template"}),"."]}),(0,i.jsx)("div",{className:"cv-page h-full min-h-0 w-full overflow-auto rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]",children:h?(0,i.jsxs)("div",{className:"p-6 text-sm text-rose-600",children:[(0,i.jsx)("p",{className:"font-semibold",children:"Imported resume data looks corrupted."}),(0,i.jsx)("p",{className:"mt-1 text-xs text-rose-700",children:"We detected PDF internal tokens in extracted content and blocked preview rendering to avoid showing invalid data. Please retry extraction with a text-based PDF or DOCX."})]}):w?(0,i.jsx)("iframe",{title:`CV preview ${a||g}`,srcDoc:w,sandbox:"allow-same-origin",scrolling:"auto",className:"w-full",style:{border:0,height:c}},`${u.templateId}:${v}`):y?(0,i.jsx)(y,{draft:u}):(0,i.jsxs)("div",{className:"p-6 text-sm text-rose-500",children:[(0,i.jsx)("p",{className:"font-semibold",children:"Template not found."}),(0,i.jsx)("p",{className:"mt-1 text-xs text-rose-600",children:"Please return to the templates list and select a different layout."}),(0,i.jsx)("a",{href:"/templates",className:"mt-3 inline-flex rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white",children:"Back to templates"})]})})]})}},29826:(e,t,a)=>{a.d(t,{C:()=>i,s:()=>s});let i=1e4,r=new Set(["modern-sidebar","modern-sidebar-blue"]);function s(e,t,a,i={}){let{injectAutosize:n=!0,screenOnePageOnly:o=!1}=i,d=String(a?.templateId??t.templateId??"").trim(),l=r.has(d)?`
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
`:"",m=o?`
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
`:"",c=`
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
${m}
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
</script>`,b=e||"";return b.includes("data-template-id=")||(b=b.replace("<body",`<body data-template-id="${d}"`)),b.includes('id="cv-shared-pagination"')||(b=b.replace("</head>",`${c}</head>`)),n&&!b.includes("__cv_iframe_resize")&&(b=b.replace("</body>",`${p}</body>`)),b}},55623:(e,t,a)=>{a.d(t,{Ge:()=>o,Ok:()=>m,zp:()=>i});let i={id:"demo-cv",userId:"demo-user",title:"Sample CV",templateId:"ats-minimal",updatedAt:new Date("2024-01-15T10:00:00.000Z").toISOString(),basics:{name:"Jordan Taylor",headline:"Product Designer \xb7 UX Researcher",email:"jordan.taylor@email.com",phone:"+1 (555) 123-4567",location:"Austin, TX",links:[{label:"Portfolio",url:"jordan.design"},{label:"LinkedIn",url:"linkedin.com/in/jordan-taylor"}]},summary:"Designer focused on accessible, data-informed experiences. 7+ years delivering B2B and consumer products across fintech and education.",skills:["Product Strategy","Design Systems","Figma","User Research","Prototyping"],experience:[{company:"Northwind Labs",role:"Lead Product Designer",start:"2021",end:"Present",location:"Remote",bullets:["Shipped a new onboarding flow that improved activation by 28%.","Led a cross-functional design system migration across 12 squads."]},{company:"Luma Education",role:"UX Designer",start:"2018",end:"2021",location:"Seattle, WA",bullets:["Partnered with researchers to refresh lesson planner UI for 40k teachers.","Built a component library to speed up QA and reduce defects by 22%."]}],education:[{school:"University of Washington",program:"B.S. Human-Centered Design",start:"2014",end:"2018",details:"Graduated with honors \xb7 UX capstone award"}],projects:[{name:"Atlas Growth Dashboard",link:"atlas.app",description:"Analytics suite for go-to-market teams.",bullets:["Defined reporting taxonomy across product, sales, and marketing."]}],certifications:[{name:"NN/g UX Certificate",issuer:"Nielsen Norman Group",year:"2022"}],extras:{languages:["English","Spanish"],interests:["Travel photography","Community hackathons"]},sectionOrder:["summary","skills","experience","education","projects","certifications","extras"],sectionVisibility:{summary:!0,skills:!0,experience:!0,education:!0,projects:!0,certifications:!0,extras:!0}},r={isDemoSeeded:!0,hasImportedCv:!1},s=e=>!!(e&&e.trim().length>0),n=(e,t="")=>s(e)?String(e).trim():t,o=e=>{if(!e)return!1;let t=e.basics??{};return!!(s(t.name)||s(t.headline)||s(t.email)||s(t.phone)||s(t.location)||t.links?.some(e=>s(e?.label)||s(e?.url))||s(e.summary)||e.skills?.some(e=>s(e))||e.experience?.some(e=>s(e.company)||s(e.role)||s(e.location)||s(e.start)||s(e.end)||s(e.description)||e.bullets?.some(e=>s(e)))||e.education?.some(e=>s(e.school)||s(e.program)||s(e.start)||s(e.end)||s(e.details))||e.projects?.some(e=>s(e.name)||s(e.link)||s(e.description)||e.bullets?.some(e=>s(e)))||e.certifications?.some(e=>s(e.name)||s(e.issuer)||s(e.year))||e.extras?.languages?.some(e=>s(e))||e.extras?.interests?.some(e=>s(e)))},d=e=>!!e?.meta?.isDemoSeeded,l=(e,t,a=!1)=>a?t??[]:Array.isArray(t)&&t.length>0?t:e,m=e=>{let t=e?.templateId??i.templateId,a={...i,templateId:t};if(!e)return{draft:{...a,meta:r},resumeSource:"demo"};let s=(e=>{if(!e)return"demo";let t=!!e&&(!!e.meta?.hasImportedCv||o(e)),a=d(e),i=!!(e.id&&"demo-cv"!==e.id);return i&&t?"saved":t&&!a?i?"saved":"live":a?"demo":i?"saved":"live"})(e),m="demo"!==s;return{draft:{...a,id:e.id??a.id,userId:e.userId??a.userId,updatedAt:e.updatedAt??a.updatedAt,title:m?n(e.title):n(e.title,a.title),templateId:t,basics:{...a.basics,...e.basics??{},name:m?n(e.basics?.name):n(e.basics?.name,a.basics.name),headline:m?n(e.basics?.headline):n(e.basics?.headline,a.basics.headline),email:m?n(e.basics?.email):n(e.basics?.email,a.basics.email),phone:m?n(e.basics?.phone):n(e.basics?.phone,a.basics.phone),location:m?n(e.basics?.location):n(e.basics?.location,a.basics.location),links:m?e.basics?.links??[]:l(a.basics.links,e.basics?.links)},summary:m?n(e.summary):n(e.summary,a.summary),skills:l(a.skills,e.skills,m),experience:l(a.experience,e.experience,m),education:l(a.education,e.education,m),projects:l(a.projects,e.projects,m),certifications:l(a.certifications,e.certifications,m),extras:m?{languages:e.extras?.languages??[],interests:e.extras?.interests??[]}:{...a.extras,...e.extras??{},languages:e.extras?.languages&&e.extras.languages.length>0?e.extras.languages:a.extras.languages,interests:e.extras?.interests&&e.extras.interests.length>0?e.extras.interests:a.extras.interests},sectionOrder:e.sectionOrder??a.sectionOrder,sectionVisibility:e.sectionVisibility??a.sectionVisibility,typography:e.typography??a.typography,formatting:e.formatting??a.formatting,templateTheme:e.templateTheme??a.templateTheme,richText:e.richText??a.richText,meta:{...r,...e.meta||{},isDemoSeeded:d(e)}},resumeSource:s}}}}]);
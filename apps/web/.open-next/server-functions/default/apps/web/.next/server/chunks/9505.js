"use strict";exports.id=9505,exports.ids=[9505],exports.modules={38439:(a,b,c)=>{c.d(b,{C:()=>d,s:()=>f});let d=1e4,e=new Set(["modern-sidebar","modern-sidebar-blue"]);function f(a,b,c,d={}){let{injectAutosize:g=!0,screenOnePageOnly:h=!1}=d,i=String(c?.templateId??b.templateId??"").trim(),j=e.has(i)?`
/* marker */
.cv-sidebar-paged-background{}

body[data-template-id="${i}"]{
  --cv-page-height:269mm;
  --cv-sidebar-width:70mm;
}

/* SCREEN */
body[data-template-id="${i}"] .page{
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
  body[data-template-id="${i}"] .page{
    background:transparent !important;
  }
}

/* avoid sidebar element painting over our gradient */
body[data-template-id="${i}"] aside{background:transparent !important}
`:"",k=h?`
/* SCREEN-ONLY single-page clamp (modal) */
@media screen{
  html,body{overflow:hidden !important;}
  /* clamp the visible page box */
  body[data-template-id="${i}"] .page{
    height:1130px !important;
    max-height:1130px !important;
    overflow:hidden !important;
  }
}
`:"",l=`
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
${j}
${k}
body[data-template-id="creative-timeline"] .timeline:before{
  top:0 !important;
  bottom:0 !important;
}
</style>`,m=`
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
</script>`,n=a||"";return n.includes("data-template-id=")||(n=n.replace("<body",`<body data-template-id="${i}"`)),n.includes('id="cv-shared-pagination"')||(n=n.replace("</head>",`${l}</head>`)),g&&!n.includes("__cv_iframe_resize")&&(n=n.replace("</body>",`${m}</body>`)),n}},49505:(a,b,c)=>{c.d(b,{default:()=>k});var d=c(48249),e=c(67484),f=c(53091),g=c(67746),h=c(26548),i=c(38439),j=c(1778);let k=({draft:a,showLiveBadge:b=!1,resumeSourceHint:c})=>{let k,[l,m]=(0,e.useState)(1400),n=(0,f.Ok)(a),o=(0,e.useMemo)(()=>({...n.draft,typography:{...n.draft.typography||{},...a.typography||{}},formatting:{...n.draft.formatting||{},...a.formatting||{}},templateTheme:{...n.draft.templateTheme||{},...a.templateTheme||{}},richText:{...n.draft.richText||{},...a.richText||{}},sectionOrder:(0,j.nN)(a.sectionOrder||n.draft.sectionOrder,n.draft.sectionOrder),sectionVisibility:(0,j.JV)({...n.draft.sectionVisibility||{},...a.sectionVisibility||{}})}),[n.draft,a]),p=n.resumeSource,q=(k=[o?.summary,o?.basics?.name,o?.basics?.headline,...(o?.skills||[]).slice(0,20),...(o?.experience||[]).flatMap(a=>[a.role,a.company,...a.bullets||[]])].filter(Boolean).join("\n").slice(0,6e3),["%PDF-"," obj","endobj","stream","endstream","xref","trailer","MediaBox","ViewerPreferences","StructParents"].reduce((a,b)=>{let c=k.match(RegExp(b.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"));return a+(c?.length||0)},0)>=6),r=g.oj[o.templateId]||g.a_[0],s=!!r?.component,t=s?r?.component:g.a_[0]?.component,u=(0,e.useMemo)(()=>JSON.stringify({templateId:o.templateId,typography:o.typography,formatting:o.formatting,templateTheme:o.templateTheme,richText:o.richText,sectionOrder:o.sectionOrder,sectionVisibility:o.sectionVisibility}),[o.templateId,o.typography,o.formatting,o.templateTheme,o.richText,o.sectionOrder,o.sectionVisibility]),v=!!r?.renderHtml,w=(0,e.useMemo)(()=>{if(!v)return null;let a=r?.renderHtml;return a?(0,i.s)((0,h.L)(a(o)),o,{templateId:o.templateId},{injectAutosize:!0}):null},[r,o,v,u]);return(0,e.useEffect)(()=>{},[o]),(0,e.useEffect)(()=>{let a=a=>{let b=a.data;if(!b||!0!==b.__cv_iframe_resize)return;let c=Number(b.height);Number.isFinite(c)&&!(c<500)&&m(Math.min(c+24,i.C))};return window.addEventListener("message",a),()=>window.removeEventListener("message",a)},[]),(0,d.jsxs)("div",{className:"cv-preview-wrapper h-full min-h-0 w-full",children:[(0,d.jsxs)("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[b?(0,d.jsxs)("span",{className:`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${"demo"===p?"border border-amber-200 bg-amber-50 text-amber-700":"border border-emerald-200 bg-emerald-50 text-emerald-700"}`,children:[(0,d.jsx)("span",{className:`h-2 w-2 rounded-full ${"demo"===p?"bg-amber-500":"bg-emerald-500"}`}),"demo"===p?"Demo content":"saved"===p?"Saved draft":"Imported / live"]}):(0,d.jsx)("span",{}),"demo"===p&&(0,d.jsx)("div",{className:"rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800",children:"Showing sample content. Upload a CV or edit fields to switch to your own data."})]}),!s&&(0,d.jsxs)("div",{className:"mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800",children:["Unknown template id ",(0,d.jsx)("span",{className:"font-semibold",children:o.templateId}),". Falling back to"," ",(0,d.jsx)("span",{className:"font-semibold",children:g.a_[0]?.id??"first template"}),"."]}),(0,d.jsx)("div",{className:"cv-page h-full min-h-0 w-full overflow-auto rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]",children:q?(0,d.jsxs)("div",{className:"p-6 text-sm text-rose-600",children:[(0,d.jsx)("p",{className:"font-semibold",children:"Imported resume data looks corrupted."}),(0,d.jsx)("p",{className:"mt-1 text-xs text-rose-700",children:"We detected PDF internal tokens in extracted content and blocked preview rendering to avoid showing invalid data. Please retry extraction with a text-based PDF or DOCX."})]}):w?(0,d.jsx)("iframe",{title:`CV preview ${c||p}`,srcDoc:w,sandbox:"allow-same-origin",scrolling:"auto",className:"w-full",style:{border:0,height:l}},`${o.templateId}:${u}`):t?(0,d.jsx)(t,{draft:o}):(0,d.jsxs)("div",{className:"p-6 text-sm text-rose-500",children:[(0,d.jsx)("p",{className:"font-semibold",children:"Template not found."}),(0,d.jsx)("p",{className:"mt-1 text-xs text-rose-600",children:"Please return to the templates list and select a different layout."}),(0,d.jsx)("a",{href:"/templates",className:"mt-3 inline-flex rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white",children:"Back to templates"})]})})]})}},53091:(a,b,c)=>{c.d(b,{Ge:()=>h,Ok:()=>k,zp:()=>d});let d={id:"demo-cv",userId:"demo-user",title:"Sample CV",templateId:"ats-minimal",updatedAt:new Date("2024-01-15T10:00:00.000Z").toISOString(),basics:{name:"Jordan Taylor",headline:"Product Designer \xb7 UX Researcher",email:"jordan.taylor@email.com",phone:"+1 (555) 123-4567",location:"Austin, TX",links:[{label:"Portfolio",url:"jordan.design"},{label:"LinkedIn",url:"linkedin.com/in/jordan-taylor"}]},summary:"Designer focused on accessible, data-informed experiences. 7+ years delivering B2B and consumer products across fintech and education.",skills:["Product Strategy","Design Systems","Figma","User Research","Prototyping"],experience:[{company:"Northwind Labs",role:"Lead Product Designer",start:"2021",end:"Present",location:"Remote",bullets:["Shipped a new onboarding flow that improved activation by 28%.","Led a cross-functional design system migration across 12 squads."]},{company:"Luma Education",role:"UX Designer",start:"2018",end:"2021",location:"Seattle, WA",bullets:["Partnered with researchers to refresh lesson planner UI for 40k teachers.","Built a component library to speed up QA and reduce defects by 22%."]}],education:[{school:"University of Washington",program:"B.S. Human-Centered Design",start:"2014",end:"2018",details:"Graduated with honors \xb7 UX capstone award"}],projects:[{name:"Atlas Growth Dashboard",link:"atlas.app",description:"Analytics suite for go-to-market teams.",bullets:["Defined reporting taxonomy across product, sales, and marketing."]}],certifications:[{name:"NN/g UX Certificate",issuer:"Nielsen Norman Group",year:"2022"}],extras:{languages:["English","Spanish"],interests:["Travel photography","Community hackathons"]},sectionOrder:["summary","skills","experience","education","projects","certifications","extras"],sectionVisibility:{summary:!0,skills:!0,experience:!0,education:!0,projects:!0,certifications:!0,extras:!0}},e={isDemoSeeded:!0,hasImportedCv:!1},f=a=>!!(a&&a.trim().length>0),g=(a,b="")=>f(a)?String(a).trim():b,h=a=>{if(!a)return!1;let b=a.basics??{};return!!(f(b.name)||f(b.headline)||f(b.email)||f(b.phone)||f(b.location)||b.links?.some(a=>f(a?.label)||f(a?.url))||f(a.summary)||a.skills?.some(a=>f(a))||a.experience?.some(a=>f(a.company)||f(a.role)||f(a.location)||f(a.start)||f(a.end)||f(a.description)||a.bullets?.some(a=>f(a)))||a.education?.some(a=>f(a.school)||f(a.program)||f(a.start)||f(a.end)||f(a.details))||a.projects?.some(a=>f(a.name)||f(a.link)||f(a.description)||a.bullets?.some(a=>f(a)))||a.certifications?.some(a=>f(a.name)||f(a.issuer)||f(a.year))||a.extras?.languages?.some(a=>f(a))||a.extras?.interests?.some(a=>f(a)))},i=a=>!!a?.meta?.isDemoSeeded,j=(a,b,c=!1)=>c?b??[]:Array.isArray(b)&&b.length>0?b:a,k=a=>{let b=a?.templateId??d.templateId,c={...d,templateId:b};if(!a)return{draft:{...c,meta:e},resumeSource:"demo"};let f=(a=>{if(!a)return"demo";let b=!!a&&(!!a.meta?.hasImportedCv||h(a)),c=i(a),d=!!(a.id&&"demo-cv"!==a.id);return d&&b?"saved":b&&!c?d?"saved":"live":c?"demo":d?"saved":"live"})(a),k="demo"!==f;return{draft:{...c,id:a.id??c.id,userId:a.userId??c.userId,updatedAt:a.updatedAt??c.updatedAt,title:k?g(a.title):g(a.title,c.title),templateId:b,basics:{...c.basics,...a.basics??{},name:k?g(a.basics?.name):g(a.basics?.name,c.basics.name),headline:k?g(a.basics?.headline):g(a.basics?.headline,c.basics.headline),email:k?g(a.basics?.email):g(a.basics?.email,c.basics.email),phone:k?g(a.basics?.phone):g(a.basics?.phone,c.basics.phone),location:k?g(a.basics?.location):g(a.basics?.location,c.basics.location),links:k?a.basics?.links??[]:j(c.basics.links,a.basics?.links)},summary:k?g(a.summary):g(a.summary,c.summary),skills:j(c.skills,a.skills,k),experience:j(c.experience,a.experience,k),education:j(c.education,a.education,k),projects:j(c.projects,a.projects,k),certifications:j(c.certifications,a.certifications,k),extras:k?{languages:a.extras?.languages??[],interests:a.extras?.interests??[]}:{...c.extras,...a.extras??{},languages:a.extras?.languages&&a.extras.languages.length>0?a.extras.languages:c.extras.languages,interests:a.extras?.interests&&a.extras.interests.length>0?a.extras.interests:c.extras.interests},sectionOrder:a.sectionOrder??c.sectionOrder,sectionVisibility:a.sectionVisibility??c.sectionVisibility,typography:a.typography??c.typography,formatting:a.formatting??c.formatting,templateTheme:a.templateTheme??c.templateTheme,richText:a.richText??c.richText,meta:{...e,...a.meta||{},isDemoSeeded:i(a)}},resumeSource:f}}}};
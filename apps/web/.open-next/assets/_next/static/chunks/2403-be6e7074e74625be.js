"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[2403],{10358:(e,i,a)=>{a.d(i,{JV:()=>l,Nl:()=>t,dN:()=>c,nN:()=>n});let t=["summary","skills","experience","education","projects","certifications","extras"],s=t.reduce((e,i)=>(e[i]=!0,e),{}),r=new Set(t),n=(e,i=t)=>{let a=Array.isArray(e)?e:[],s=[],n=new Set;return a.forEach(e=>{!r.has(e)||n.has(e)||(n.add(e),s.push(e))}),i.forEach(e=>{n.has(e)||(n.add(e),s.push(e))}),s},l=e=>{let i={...s};return e&&t.forEach(a=>{"boolean"==typeof e[a]&&(i[a]=e[a])}),i},o={"modern-sidebar":{primary:"#0f172a",sidebarBg:"#0f172a",sidebarText:"#f8fafc",accent:"#38bdf8"},"bold-header":{primary:"#0f172a",headerBg:"#0f172a",headerText:"#ffffff",accent:"#38bdf8"},"modern-teal":{primary:"#0f766e",accent:"#0d9488",sectionBg:"#f0fdfa"},"modern-sidebar-blue":{primary:"#1d4ed8",sidebarBg:"#1d4ed8",sidebarText:"#eff6ff",accent:"#93c5fd"}};function c(e){let i=o[e.templateId]||{};return{...e,sectionOrder:n(e.sectionOrder),sectionVisibility:l(e.sectionVisibility),basics:{...e.basics||{},name:e.basics?.name||"",headline:e.basics?.headline||"",email:e.basics?.email||"",phone:e.basics?.phone||"",location:e.basics?.location||"",links:e.basics?.links||[],photoUrl:e.basics?.photoUrl||""},skills:e.skills||[],experience:e.experience||[],education:e.education||[],projects:e.projects||[],certifications:e.certifications||[],extras:{languages:[],interests:[],...e.extras},typography:{baseFontSize:14,h1Size:28,h2Size:13,h3Size:11,bodySize:14,lineHeight:1.48,fontFamily:"Inter, system-ui, Arial",...e.typography||{}},formatting:{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e",...e.formatting||{}},templateTheme:{primary:"#0f172a",...i,...e.templateTheme||{}},richText:{...e.richText||{}},coverLetter:{subject:e.coverLetter?.subject||"",greeting:e.coverLetter?.greeting||"",body:e.coverLetter?.body||"",closing:e.coverLetter?.closing||""},aiMeta:{...e.aiMeta||{}},generationMeta:{...e.generationMeta||{}},meta:{isDemoSeeded:!!e.meta?.isDemoSeeded,hasImportedCv:!!e.meta?.hasImportedCv,importedAt:e.meta?.importedAt,importMode:e.meta?.importMode}}}},66535:(e,i,a)=>{a.r(i),a.d(i,{default:()=>d,renderAtsMinimalHtml:()=>c});var t=a(95155),s=a(12115),r=a(10358),n=a(94258);let l=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),o=e=>(e??"").toString().trim().toLowerCase();function c(e){let i=e.sectionOrder?.length?e.sectionOrder:r.Nl,a=e.sectionVisibility||{},t=e.basics||{},s=[];t.email&&s.push(`<span>${l(t.email)}</span>`),t.phone&&s.push(`<span>${l(t.phone)}</span>`),t.location&&s.push(`<span>${l(t.location)}</span>`);let c=(t.links||[]).filter(e=>(e?.label||e?.url)?.trim()).map((e,i)=>{let a=(e.label||e.url||"").trim(),t=(e.url||"").trim(),s=`${o(t)}|${o(a)}|${i}`;return`<span data-k="${l(s)}">${l(a)}${t?` <span class="muted">(${l(t)})</span>`:""}</span>`}),d={summary:e.summary?.trim()?`<section><h2 class="sec">Summary</h2><p>${l(e.summary)}</p></section>`:"",skills:e.skills?.length?`<section><h2 class="sec">Skills</h2><p>${l(e.skills.join(" • "))}</p></section>`:"",experience:e.experience?.length?`<section>
          <h2 class="sec">Experience</h2>
          <div class="stack">
            ${e.experience.map((e,i)=>{let a=[o(e.company),o(e.role),o(e.start),o(e.end),i].join("|"),t=`${l(e.start||"")}${e.start||e.end?" - ":""}${l(e.end||"")}`.trim(),s=e.bullets?.length?`<ul>
                        ${e.bullets.filter(Boolean).map((e,i)=>`<li data-k="${l(`${a}:b:${i}:${o(e).slice(0,24)}`)}">${l(e)}</li>`).join("")}
                      </ul>`:"";return`<div class="item" data-k="${l(a)}">
                  <div class="row">
                    <div class="strong">${l(e.role||"Role")} \xb7 ${l(e.company||"Company")}</div>
                    <div class="dates">${l(t)}</div>
                  </div>
                  ${e.location?`<div class="muted small">${l(e.location)}</div>`:""}
                  ${s}
                </div>`}).join("")}
          </div>
        </section>`:"",education:e.education?.length?`<section>
          <h2 class="sec">Education</h2>
          <div class="stack">
            ${e.education.map((e,i)=>{let a=[o(e.school),o(e.program),o(e.start),o(e.end),i].join("|"),t=`${l(e.start||"")}${e.start||e.end?" - ":""}${l(e.end||"")}`.trim();return`<div class="item" data-k="${l(a)}">
                  <div class="row">
                    <div class="strong">${l(e.program||"Program")} \xb7 ${l(e.school||"School")}</div>
                    <div class="dates">${l(t)}</div>
                  </div>
                  ${e.details?`<div class="muted">${l(e.details)}</div>`:""}
                </div>`}).join("")}
          </div>
        </section>`:"",projects:e.projects?.length?`<section>
          <h2 class="sec">Projects</h2>
          <div class="stack">
            ${e.projects.map((e,i)=>{let a=[o(e.name),o(e.link),i].join("|"),t=e.bullets?.length?`<ul>
                        ${e.bullets.filter(Boolean).map((e,i)=>`<li data-k="${l(`${a}:b:${i}:${o(e).slice(0,24)}`)}">${l(e)}</li>`).join("")}
                      </ul>`:"";return`<div class="item" data-k="${l(a)}">
                  <div class="row">
                    <div class="strong">${l(e.name||"Project")}</div>
                    <div class="dates">${e.link?`<span class="muted">${l(e.link)}</span>`:""}</div>
                  </div>
                  ${e.description?`<div class="muted">${l(e.description)}</div>`:""}
                  ${t}
                </div>`}).join("")}
          </div>
        </section>`:"",certifications:e.certifications?.length?`<section>
          <h2 class="sec">Certifications</h2>
          <div class="stack">
            ${e.certifications.map((e,i)=>{let a=[o(e.name),o(e.issuer),e.year??"",i].join("|"),t=`${l(e.issuer||"")}${e.year?` • ${l(e.year)}`:""}`.trim();return`<div class="row item" data-k="${l(a)}">
                  <div>${l(e.name||"")}</div>
                  <div class="dates muted">${l(t)}</div>
                </div>`}).join("")}
          </div>
        </section>`:"",extras:e.extras?`<section>
          <h2 class="sec">Extras</h2>
          <div class="muted">
            ${e.extras.languages?.length?`<div><span class="strong">Languages:</span> ${l(e.extras.languages.join(", "))}</div>`:""}
            ${e.extras.interests?.length?`<div><span class="strong">Interests:</span> ${l(e.extras.interests.join(", "))}</div>`:""}
          </div>
        </section>`:""},m=i.map(e=>!1!==a[e]?d[e]:"").filter(Boolean).join("\n"),p=`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root{
  --text:#0f172a;
  --muted:#475569;
  --hair:#e2e8f0;
  --paper:#ffffff;
  --body:12.5px;
  --meta:11.6px;
  --section:12.1px;
}

*{ box-sizing:border-box; }
body{
  margin:0;
  background:#f1f5f9;
  font-family:Inter,system-ui,Segoe UI,Arial;
  color:var(--text);
}

.page{
  width:210mm;
  min-height:297mm;
  margin:18px auto;
  background:var(--paper);
  padding:15.5mm 14.5mm;
  box-shadow:0 12px 35px rgba(2,6,23,.10);
}

header{
  border-bottom:1px solid var(--hair);
  padding-bottom:12px;
}

h1{
  margin:0;
  font-size:32px;
  letter-spacing:-.03em;
  line-height:1.06;
}

.headline{
  margin:7px 0 0;
  color:var(--muted);
  font-size:14.8px;
  font-weight:500;
}

.contact{
  margin-top:11px;
  display:flex;
  flex-wrap:wrap;
  gap:8px 13px;
  color:var(--muted);
  font-size:var(--meta);
}

.contact span{
  position:relative;
  padding-left:10px;
}
.contact span:before{
  content:"•";
  position:absolute;
  left:0;
  color:#94a3b8;
}

.sec{
  margin:14px 0 8px;
  font-size:var(--section);
  text-transform:uppercase;
  letter-spacing:.11em;
  font-weight:700;
  color:#0f172a;
}

.stack{ display:flex; flex-direction:column; gap:11px; }

.row{
  display:grid;
  grid-template-columns:1fr auto;
  gap:12px;
  align-items:baseline;
}

.strong{ font-weight:700; }
.dates{
  font-size:11.2px;
  color:var(--muted);
  white-space:nowrap;
  text-align:right;
}

.muted{ color:var(--muted); }
.small{ font-size:11.2px; }

p{ margin:0; font-size:var(--body); line-height:1.56; }

ul{
  margin:8px 0 0;
  padding-left:19px;
  font-size:12px;
  line-height:1.5;
}
li{ margin:4px 0; }

@page{ size:A4; margin:14mm; }
@media print{
  body{ background:#fff; }
  .page{ margin:0; padding:0; box-shadow:none; width:auto; min-height:auto; }
}
</style>
</head>
<body>
  <main class="page">
    <header>
      <h1>${l(t.name||"Your Name")}</h1>
      <div class="headline">${l(t.headline||"Professional Headline")}</div>
      <div class="contact">
        ${s.join("")}
        ${c.join("")}
      </div>
    </header>

    ${m}
  </main>
</body>
</html>`;return(0,n.Y)("ats-minimal",p),p}let d=({draft:e})=>{let[i,a]=(0,s.useState)(1100),r=(0,s.useMemo)(()=>{let i=c(e),a=`
<script>
(function(){
  function send(){
    try{
      var h = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      parent.postMessage({ __cv_iframe_resize: true, height: h }, '*');
    }catch(e){}
  }
  window.addEventListener('load', send);
  window.addEventListener('resize', send);
  try{
    var obs = new MutationObserver(function(){ send(); });
    obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true, attributes:true });
  }catch(e){}
  setTimeout(send, 0);
  setInterval(send, 500);
})();
</script>`;return i.replace("</body>",`${a}</body>`)},[e]);return(0,s.useEffect)(()=>{let e=e=>{let i=e.data;if(!i||!0!==i.__cv_iframe_resize)return;let t=Number(i.height);Number.isFinite(t)&&!(t<=0)&&a(Math.min(Math.max(t+24,900),5e3))};return window.addEventListener("message",e),()=>window.removeEventListener("message",e)},[]),(0,t.jsx)("div",{className:"w-full",children:(0,t.jsx)("iframe",{title:"ATS Minimal",className:"w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"no",srcDoc:r,style:{height:i,width:"100%",border:0}})})}},82403:(e,i,a)=>{a.d(i,{a_:()=>P,oj:()=>A,aY:()=>L});let t=["summary","skills","experience","education","projects","certifications","extras"],s=t.reduce((e,i)=>(e[i]=!0,e),{}),r={"modern-sidebar":{primary:"#0f172a",sidebarBg:"#0f172a",sidebarText:"#f8fafc",accent:"#38bdf8"},"bold-header":{primary:"#0f172a",headerBg:"#0f172a",headerText:"#ffffff",accent:"#38bdf8"},"modern-teal":{primary:"#0f766e",accent:"#0d9488",sectionBg:"#f0fdfa"},"modern-sidebar-blue":{primary:"#1d4ed8",sidebarBg:"#1d4ed8",sidebarText:"#eff6ff",accent:"#93c5fd"}},n={baseFontSize:14,h1Size:28,h2Size:13,h3Size:11,bodySize:14,lineHeight:1.48,fontFamily:"Inter, system-ui, Arial"},l={"ats-minimal":{body:11.8,meta:11.1,h3:12.8,sectionTitle:12,headline:13.2,name:30,lineHeight:1.47},"ats-compact":{body:11.4,meta:10.8,h3:12.4,sectionTitle:11.8,headline:12.4,name:29,lineHeight:1.44},"modern-sidebar":{body:11.4,meta:10.9,h3:12.6,sectionTitle:11.7,headline:12.8,name:31,lineHeight:1.46,sidebarBody:11.3,sidebarMeta:10.8},"modern-sidebar-blue":{body:11.4,meta:10.9,h3:12.6,sectionTitle:11.7,headline:12.8,name:31,lineHeight:1.46,sidebarBody:11.3,sidebarMeta:10.8},"bold-header":{body:11.7,meta:11,h3:12.5,sectionTitle:11.8,headline:13,name:31,lineHeight:1.47},"modern-teal":{body:11.5,meta:10.9,h3:12.5,sectionTitle:11.8,headline:13,name:31,lineHeight:1.46},"elegant-serif":{body:11.6,meta:11,h3:12.7,sectionTitle:11.9,headline:13.1,name:34,lineHeight:1.5},"creative-timeline":{body:11.7,meta:11,h3:12.8,sectionTitle:12.1,headline:13.2,name:32,lineHeight:1.47},"compact-one-pager":{body:11.2,meta:10.7,h3:12.1,sectionTitle:11.5,headline:12.4,name:28.5,lineHeight:1.41}},o=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i,c=(e,i,a)=>Math.min(a,Math.max(i,e)),d=(e="")=>String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),m=(e="")=>String(e).trim().toLowerCase();function p(e={}){let i=r[e.templateId]||{};return{...e,sectionOrder:e.sectionOrder?.length?e.sectionOrder:t,sectionVisibility:{...s,...e.sectionVisibility||{}},basics:{...e.basics||{},name:e.basics?.name||"",headline:e.basics?.headline||"",email:e.basics?.email||"",phone:e.basics?.phone||"",location:e.basics?.location||"",links:e.basics?.links||[],photoUrl:e.basics?.photoUrl||""},summary:e.summary||"",skills:e.skills||[],experience:e.experience||[],education:e.education||[],projects:e.projects||[],certifications:e.certifications||[],extras:{languages:[],interests:[],...e.extras||{}},typography:{...n,...e.typography||{}},formatting:{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e",...e.formatting||{}},templateTheme:{primary:"#0f172a",...i,...e.templateTheme||{}},richText:{...e.richText||{}}}}let h=(e,i)=>e.sectionVisibility?.[i]!==!1,x=e=>d([e.email,e.phone,e.location].filter(Boolean).join(" • ")),g=`
.page{width:var(--page-width);min-height:var(--page-height);margin:16px auto;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.12)}
@media print{.page{margin:0 !important;box-shadow:none !important}}
`,u=`
h1{margin:0;font-size:var(--resolvedNameSize);line-height:1.1}
h2{font-size:var(--resolvedSectionTitleSize);letter-spacing:.1em;text-transform:uppercase}
h3{margin:0;font-size:var(--resolvedH3Size)}
p,li{font-size:var(--resolvedBodySize);line-height:var(--lineHeight)}
.muted{font-size:var(--resolvedMetaSize);color:var(--mutedTextColor)}
section{margin-bottom:var(--resolvedSectionGap)}
.item{margin-bottom:var(--resolvedItemGap)}
`;function b(e){return{summary:e.summary?.trim()||e.richText?.summary?.trim()?`<section><h2>Summary</h2><p>${((e,i,a="")=>e.richText?.[i]?.trim()?function(e=""){return String(e).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,"").replace(/<\/?([a-z0-9-]+)([^>]*)>/gi,(e,i,a)=>{let t=String(i||"").toLowerCase();if(!["b","strong","i","em","u","span","br"].includes(t))return"";if(e.startsWith("</"))return`</${t}>`;if("br"===t)return"<br>";if("span"===t){let e=String(a||"").match(/style\s*=\s*['\"]([^'\"]*)['\"]/i),i=e?.[1]?.match(/color\s*:\s*([^;]+)/i),t=i?.[1]?.trim();return t&&o.test(t)?`<span style="color:${t}">`:"<span>"}return`<${t}>`})}(e.richText[i]):d(a))(e,"summary",e.summary||"")}</p></section>`:"",skills:e.skills?.length?`<section><h2>Skills</h2><p>${d(e.skills.join(" • "))}</p></section>`:"",experience:e.experience?.length?`<section><h2>Experience</h2>${e.experience.map((e,i)=>`<article class="item" data-k="${d(`${m(e.company)}|${i}`)}"><h3>${d(e.role||"")} ${e.company?`\xb7 ${d(e.company)}`:""}</h3><p class="muted">${d([e.start,e.end].filter(Boolean).join(" - "))}${e.location?` • ${d(e.location)}`:""}</p>${(e.bullets||[]).length?`<ul>${e.bullets.filter(Boolean).map(e=>`<li>${d(e)}</li>`).join("")}</ul>`:""}</article>`).join("")}</section>`:"",education:e.education?.length?`<section><h2>Education</h2>${e.education.map((e,i)=>`<article class="item" data-k="${d(`${m(e.school)}|${i}`)}"><h3>${d(e.program||"")} ${e.school?`\xb7 ${d(e.school)}`:""}</h3><p class="muted">${d([e.start,e.end].filter(Boolean).join(" - "))}</p>${e.details?`<p>${d(e.details)}</p>`:""}</article>`).join("")}</section>`:"",projects:e.projects?.length?`<section><h2>Projects</h2>${e.projects.map((e,i)=>`<article class="item" data-k="${d(`${m(e.name)}|${i}`)}"><h3>${d(e.name||"")}</h3>${e.description?`<p>${d(e.description)}</p>`:""}${(e.bullets||[]).length?`<ul>${e.bullets.filter(Boolean).map(e=>`<li>${d(e)}</li>`).join("")}</ul>`:""}</article>`).join("")}</section>`:"",certifications:e.certifications?.length?`<section><h2>Certifications</h2>${e.certifications.map((e,i)=>`<p data-k="${d(`${m(e.name)}|${i}`)}"><strong>${d(e.name||"")}</strong>${e.issuer?` • ${d(e.issuer)}`:""}${e.year?` (${d(e.year)})`:""}</p>`).join("")}</section>`:"",extras:e.extras?.languages?.length||e.extras?.interests?.length?`<section><h2>Extras</h2>${e.extras?.languages?.length?`<p><strong>Languages:</strong> ${d(e.extras.languages.join(", "))}</p>`:""}${e.extras?.interests?.length?`<p><strong>Interests:</strong> ${d(e.extras.interests.join(", "))}</p>`:""}</section>`:""}}function f(e,i){return(e.sectionOrder||t).map(a=>h(e,a)&&i[a]||"").filter(Boolean).join("")}function y(e,i,a){let t;return`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${t=function(e={}){let i=l[String(e.templateId||"").trim()]||l["ats-minimal"],a={...n,...e.typography||{}},t=e?.typography&&(null!=e.typography.bodySize||null!=e.typography.baseFontSize),s=(Number(a.bodySize)||n.bodySize)-n.bodySize,r=(Number(a.baseFontSize)||n.baseFontSize)-n.baseFontSize,o=(Number(a.h1Size)||n.h1Size)-n.h1Size,d=.7*s+.8*r,m=c(i.body+d,t?10.2:14,16.5),p=c(i.meta+.85*d,9.8,15.2),h=t?p:m,x=c(Math.max(i.h3+.55*d+.08*o,m+1.1),11.2,18),g=c(Math.max(i.sectionTitle+.35*d+.16*o,m+.6),11,18.2),u=c(i.name+.6*d+.58*o,23,41),b=c(i.headline+.42*d+.2*o,11.2,19),f=c(Number(a.lineHeight)||i.lineHeight||n.lineHeight,1.28,1.65),y=c(f-.04,1.24,1.58);return{body:m,meta:h,h3:x,sectionTitle:g,name:u,headline:b,lineHeight:f,denseLineHeight:y,sidebarBody:t?c((i.sidebarBody||m)+.3*d,10.1,15.2):m,sidebarMeta:t?c((i.sidebarMeta||h)+.3*d,9.7,15):m,sectionGap:c(8+1.3*d,6,14),itemGap:c(4.5+d,3,9)}}(e),`:root{--baseFontSize:${e.typography.baseFontSize}px;--h1Size:${e.typography.h1Size}px;--h2Size:${e.typography.h2Size}px;--h3Size:${e.typography.h3Size||12}px;--bodySize:${e.typography.bodySize||e.typography.baseFontSize}px;--fontFamily:${e.typography.fontFamily};--lineHeight:${t.lineHeight};--denseLineHeight:${t.denseLineHeight};--resolvedBodySize:${t.body}px;--resolvedMetaSize:${t.meta}px;--resolvedH3Size:${t.h3}px;--resolvedSectionTitleSize:${t.sectionTitle}px;--resolvedNameSize:${t.name}px;--resolvedHeadlineSize:${t.headline}px;--resolvedSidebarBodySize:${t.sidebarBody}px;--resolvedSidebarMetaSize:${t.sidebarMeta}px;--resolvedSectionGap:${t.sectionGap}px;--resolvedItemGap:${t.itemGap}px;--textColor:${e.formatting.textColor};--mutedTextColor:${e.formatting.mutedTextColor};--linkColor:${e.formatting.linkColor};--primary:${e.templateTheme.primary||"#0f172a"};--secondary:${e.templateTheme.secondary||"#1e293b"};--accent:${e.templateTheme.accent||e.templateTheme.primary||"#0f766e"};--sidebarBg:${e.templateTheme.sidebarBg||e.templateTheme.primary||"#0f172a"};--sidebarText:${e.templateTheme.sidebarText||"#f8fafc"};--headerBg:${e.templateTheme.headerBg||e.templateTheme.primary||"#0f172a"};--headerText:${e.templateTheme.headerText||"#ffffff"};--sectionBg:${e.templateTheme.sectionBg||"#f8fafc"};--borderColor:${e.templateTheme.borderColor||"#e2e8f0"};--page-width:210mm;--page-height:297mm}`}@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-size:var(--resolvedBodySize);line-height:var(--lineHeight);color:var(--textColor)}section,.item,.row,header,article{break-inside:avoid;page-break-inside:avoid}h2,h3{break-after:avoid;page-break-after:avoid}li{break-inside:avoid;page-break-inside:avoid}@media print{html,body{background-color:#fff !important;overflow:visible !important}.page{margin:0 !important;box-shadow:none !important;width:var(--page-width) !important;min-height:var(--page-height) !important;overflow:visible !important;box-decoration-break:clone;-webkit-box-decoration-break:clone}.page>.inner,.page>.content,.page>aside,.page>main,.page>section{box-decoration-break:clone;-webkit-box-decoration-break:clone}}${g}${a}</style></head><body data-template-id="${d(e.templateId||"")}">${i}</body></html>`}function v(e={}){let i=p(e),a=b(i),s=["summary","skills","certifications","extras"],r=s.map(e=>h(i,e)&&a[e]||"").join(""),n=(i.sectionOrder||t).filter(e=>!s.includes(e)).map(e=>h(i,e)&&a[e]||"").join("");return y(i,`<main class="page modernSidebarLayout"><aside class="sidebar"><h1>${d(i.basics.name||"Your Name")}</h1><p class="headline">${d(i.basics.headline||"")}</p><p class="contact">${x(i.basics)}</p>${r}</aside><section class="content">${n}</section></main>`,`${u}body{background:#e2e8f0;font-family:var(--fontFamily);color:var(--textColor)}.page{display:grid;grid-template-columns:33% 1fr}.sidebar{background:var(--sidebarBg);color:var(--sidebarText);padding:14.5mm 9mm}.content{padding:14.5mm 11mm}.headline{margin:5px 0 0;color:#cbd5e1;font-size:var(--resolvedHeadlineSize)}.contact{margin:4px 0 0;color:#cbd5e1;font-size:var(--resolvedSidebarMetaSize)}.sidebar p,.sidebar li{font-size:var(--resolvedSidebarBodySize)}.sidebar .muted{font-size:var(--resolvedSidebarMetaSize);color:#cbd5e1}.sidebar h2{color:#e2e8f0}.content h2{color:var(--accent)}h2{margin:10px 0 6px;letter-spacing:.11em}ul{margin:5px 0 0;padding-left:16px}`)}var $=a(66535),j=a(95155),N=a(12115),S=a(10358);function w(e){let i=e.typography||{baseFontSize:14,h1Size:26,h2Size:13,h3Size:12,bodySize:14,fontFamily:"Inter,system-ui,Arial"},a=e.formatting||{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e"},t=e.templateTheme||{primary:"#0f172a",accent:"#0f766e"},s={"--baseFontSize":`${i.baseFontSize||14}px`,"--h1Size":`${i.h1Size||28}px`,"--h2Size":`${i.h2Size||12}px`,"--h3Size":`${i.h3Size||11}px`,"--bodySize":`${i.bodySize||i.baseFontSize||14}px`,"--fontFamily":i.fontFamily||"Inter,system-ui,Arial","--textColor":a.textColor||"#0f172a","--mutedTextColor":a.mutedTextColor||"#475569","--linkColor":a.linkColor||"#0f766e","--primary":t.primary||"#0f172a","--secondary":t.secondary||"#1e293b","--accent":t.accent||t.primary||"#0f766e","--headerBg":t.headerBg||t.primary||"#0f172a","--headerText":t.headerText||"#ffffff","--sidebarBg":t.sidebarBg||t.primary||"#0f172a","--sidebarText":t.sidebarText||"#f8fafc","--sectionBg":t.sectionBg||"#f8fafc","--borderColor":t.borderColor||"#e2e8f0"},r=`:root{${Object.entries(s).map(([e,i])=>`${e}:${i}`).join(";")}}`;return{typography:i,formatting:a,theme:t,cssVars:s,cssVarBlock:r}}var k=a(92065),z=a(94258);let T=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),C=e=>(e??"").toString().trim().toLowerCase(),B=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),H=e=>(e??"").toString().trim().toLowerCase(),M=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),E=e=>(e??"").toString().trim().toLowerCase(),P=[{id:"ats-minimal",name:"ATS Minimal",category:"ATS",isAtsFriendly:!0,componentKey:"AtsMinimal",description:"Simple, ATS-friendly layout with clean typography.",tags:["ats","minimal"],component:$.default,renderHtml:function(e={}){let i=p(e),a=f(i,b(i));return y(i,`<main class="page atsMinimalLayout"><div class="inner"><header><h1>${d(i.basics.name||"Your Name")}</h1><p>${d(i.basics.headline||"")}</p><p class="muted">${x(i.basics)}</p></header>${a}</div></main>`,`${u}body{background:#fff;font-family:Arial,sans-serif;color:#111}.inner{padding:11.5mm 12mm}header{border-bottom:1.5px solid #111;padding-bottom:7px;margin-bottom:9px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.08em;border-top:1px solid #222;padding-top:5px;margin-top:9px}`)}},{id:"modern-sidebar",name:"Modern Sidebar",category:"Modern",isAtsFriendly:!1,componentKey:"ModernSidebar",description:"Two-column layout that highlights skills and summary.",tags:["modern","sidebar"],component:({draft:e})=>{let i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},t=["summary","skills","certifications","extras"],s=i.filter(e=>!t.includes(e)),r={summary:e.summary?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Summary"}),(0,j.jsx)("p",{className:"cv-body",dangerouslySetInnerHTML:(0,k.T0)(e,"summary",e.summary||"")})]}):null,skills:e.skills?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Skills"}),(0,j.jsx)("div",{className:"flex flex-wrap gap-1",children:e.skills.map(e=>(0,j.jsx)("span",{className:"rounded-full bg-white/70 px-2 py-1 text-[14px]",children:e},e))})]}):null,experience:e.experience?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Experience"}),(0,j.jsx)("div",{className:"space-y-3",children:e.experience.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsxs)("div",{className:"text-sm font-semibold",children:[e.role||"Role"," \xb7 ",e.company||"Company"]}),(0,j.jsxs)("div",{className:"text-[14px] text-gray-500",children:[e.start," - ",e.end," ",e.location?`• ${e.location}`:""]}),(0,j.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700",children:e.bullets?.map((i,a)=>(0,j.jsx)("li",{children:i},`${e.company}-${a}`))})]},`${e.company}-${i}`))})]}):null,education:e.education?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,j.jsx)("div",{className:"space-y-3",children:e.education.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("div",{className:"text-sm font-semibold",children:e.program||"Program"}),(0,j.jsxs)("div",{className:"text-[14px] text-gray-500",children:[e.school||"School"," \xb7 ",e.start," - ",e.end]}),e.details&&(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.details})]},`${e.school}-${i}`))})]}):null,projects:e.projects?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,j.jsx)("div",{className:"space-y-3",children:e.projects.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("div",{className:"text-sm font-semibold",children:e.name||"Project"}),e.description&&(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.description}),(0,j.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700",children:e.bullets?.map((i,a)=>(0,j.jsx)("li",{children:i},`${e.name}-${a}`))})]},`${e.name}-${i}`))})]}):null,certifications:e.certifications?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Certifications"}),(0,j.jsx)("div",{className:"space-y-1 text-[14px] text-gray-700",children:e.certifications.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("span",{className:"font-semibold",children:e.name}),e.issuer?` • ${e.issuer}`:""," ",e.year?`(${e.year})`:""]},`${e.name}-${i}`))})]}):null,extras:e.extras?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Extras"}),(0,j.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-700",children:[e.extras.languages?.length?(0,j.jsxs)("p",{children:["Languages: ",e.extras.languages.join(", ")]}):null,e.extras.interests?.length?(0,j.jsxs)("p",{children:["Interests: ",e.extras.interests.join(", ")]}):null]})]}):null},{cssVars:n}=w(e);return(0,j.jsxs)("div",{className:"grid min-h-[297mm] grid-cols-[32%_1fr]",style:n,children:[(0,j.jsxs)("aside",{className:"p-6",style:{backgroundColor:"var(--sidebarBg)",color:"var(--sidebarText)",fontSize:"var(--baseFontSize)"},children:[(0,j.jsx)("h1",{className:"text-xl font-semibold",children:e.basics.name||"Your Name"}),(0,j.jsx)("p",{className:"text-[14px] text-slate-300",children:e.basics.headline||"Professional Headline"}),(0,j.jsxs)("div",{className:"mt-3 space-y-1 text-[14px] text-slate-200",children:[(0,j.jsx)("p",{children:e.basics.email}),(0,j.jsx)("p",{children:e.basics.phone}),(0,j.jsx)("p",{children:e.basics.location}),e.basics.links?.map((e,i)=>(0,j.jsx)("p",{children:e.label||e.url},`${e.url}-${i}`))]}),(0,j.jsx)("div",{className:"mt-5 space-y-4",children:t.map(e=>!1!==a[e]?r[e]:null)})]}),(0,j.jsx)("main",{className:"space-y-6 bg-white p-8",style:{color:"var(--textColor)",fontSize:"var(--bodySize)"},children:s.map(e=>!1!==a[e]?r[e]:null)})]})},renderHtml:v},{id:"bold-header",name:"Bold Header",category:"Modern",isAtsFriendly:!0,componentKey:"BoldHeader",description:"Statement header with strong section hierarchy.",tags:["modern","bold"],component:({draft:e})=>{let i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},t={summary:e.summary||e.richText?.summary?(0,j.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Summary"}),(0,j.jsx)("p",{className:"cv-body",dangerouslySetInnerHTML:(0,k.T0)(e,"summary",e.summary||"")})]}):null,skills:e.skills?.length?(0,j.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Skills"}),(0,j.jsx)("div",{className:"flex flex-wrap gap-2",children:e.skills.map(e=>(0,j.jsx)("span",{className:"rounded-full bg-white px-3 py-1 text-[14px] font-semibold text-gray-700",children:e},e))})]}):null,experience:e.experience?.length?(0,j.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-white p-4 shadow-sm",children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Experience"}),(0,j.jsx)("div",{className:"space-y-4",children:e.experience.map((e,i)=>(0,j.jsxs)("div",{className:"space-y-1",children:[(0,j.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,j.jsxs)("span",{children:[e.role||"Role"," \xb7 ",e.company||"Company"]}),(0,j.jsxs)("span",{className:"text-[14px] text-gray-500",children:[e.start," - ",e.end]})]}),e.location?(0,j.jsx)("div",{className:"text-[14px] text-gray-500",children:e.location}):null,(0,j.jsx)("ul",{className:"list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:e.bullets?.filter(Boolean).map((i,a)=>(0,j.jsx)("li",{children:i},`${e.company}-${a}`))})]},`${e.company}-${i}`))})]}):null,education:e.education?.length?(0,j.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-white p-4 shadow-sm",children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,j.jsx)("div",{className:"space-y-3",children:e.education.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,j.jsxs)("span",{children:[e.program||"Program"," \xb7 ",e.school||"School"]}),(0,j.jsxs)("span",{className:"text-[14px] text-gray-500",children:[e.start," - ",e.end]})]}),e.details&&(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.details})]},`${e.school}-${i}`))})]}):null,projects:e.projects?.length?(0,j.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-white p-4 shadow-sm",children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,j.jsx)("div",{className:"space-y-3",children:e.projects.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("div",{className:"text-sm font-semibold",children:e.name||"Project"}),e.description?(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.description}):null,(0,j.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:e.bullets?.filter(Boolean).map((i,a)=>(0,j.jsx)("li",{children:i},`${e.name}-${a}`))})]},`${e.name}-${i}`))})]}):null,certifications:e.certifications?.length?(0,j.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Certifications"}),(0,j.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:e.certifications.map((e,i)=>(0,j.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[(0,j.jsx)("span",{className:"font-semibold",children:e.name}),(0,j.jsxs)("span",{className:"text-gray-500",children:[e.issuer," ",e.year?`• ${e.year}`:""]})]},`${e.name}-${i}`))})]}):null,extras:e.extras?(0,j.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Extras"}),(0,j.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[e.extras.languages?.length?(0,j.jsxs)("p",{children:["Languages: ",e.extras.languages.join(", ")]}):null,e.extras.interests?.length?(0,j.jsxs)("p",{children:["Interests: ",e.extras.interests.join(", ")]}):null]})]}):null},{cssVars:s}=w(e);return(0,j.jsxs)("div",{className:"p-8",style:s,children:[(0,j.jsxs)("header",{className:"rounded-2xl p-6",style:{backgroundColor:"var(--headerBg)",color:"var(--headerText)"},children:[(0,j.jsx)("h1",{className:"text-3xl font-semibold",children:e.basics?.name||"Your Name"}),(0,j.jsx)("p",{className:"text-sm text-slate-200",children:e.basics?.headline||"Professional Headline"}),(0,j.jsxs)("div",{className:"mt-3 flex flex-wrap gap-4 text-[14px] text-slate-300",children:[e.basics?.email?(0,j.jsx)("span",{children:e.basics.email}):null,e.basics?.phone?(0,j.jsx)("span",{children:e.basics.phone}):null,e.basics?.location?(0,j.jsx)("span",{children:e.basics.location}):null]})]}),(0,j.jsx)("div",{className:"mt-6 grid gap-4",children:i.map(e=>!1!==a[e]?t[e]:null)})]})},renderHtml:function(e={}){let i=p(e),a=f(i,b(i));return y(i,`<main class="page boldHeaderLayout"><header class="heroHeader"><h1>${d(i.basics.name||"Your Name")}</h1><p>${d(i.basics.headline||"")}</p><div>${x(i.basics)}</div></header><section class="content">${a}</section></main>`,`${u}body{background:#e2e8f0;font-family:var(--fontFamily);color:var(--textColor)}.heroHeader{background:var(--headerBg);color:var(--headerText);padding:12mm}.heroHeader p{font-size:var(--resolvedHeadlineSize);margin:4px 0 0}.heroHeader div{font-size:var(--resolvedMetaSize);margin-top:4px}.content{padding:10.5mm 12mm}h2{margin:0 0 6px;letter-spacing:.12em;color:var(--accent)}`)}},{id:"elegant-serif",name:"Elegant Serif",category:"Classic",isAtsFriendly:!0,componentKey:"ElegantSerif",description:"Classic serif styling for a timeless look.",tags:["classic","serif"],component:({draft:e})=>{let i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},t={summary:e.summary?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title font-serif",children:"Summary"}),(0,j.jsx)("p",{className:"cv-body text-gray-700",children:e.summary})]}):null,skills:e.skills?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title font-serif",children:"Skills"}),(0,j.jsx)("p",{className:"cv-body text-gray-700",children:e.skills.join(" \xb7 ")})]}):null,experience:e.experience?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title font-serif",children:"Experience"}),(0,j.jsx)("div",{className:"space-y-3",children:e.experience.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,j.jsxs)("span",{children:[e.role||"Role"," \xb7 ",e.company||"Company"]}),(0,j.jsxs)("span",{className:"text-[14px] text-gray-500",children:[e.start," - ",e.end]})]}),(0,j.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700",children:e.bullets?.map((i,a)=>(0,j.jsx)("li",{children:i},`${e.company}-${a}`))})]},`${e.company}-${i}`))})]}):null,education:e.education?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title font-serif",children:"Education"}),(0,j.jsx)("div",{className:"space-y-3",children:e.education.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,j.jsxs)("span",{children:[e.program||"Program"," \xb7 ",e.school||"School"]}),(0,j.jsxs)("span",{className:"text-[14px] text-gray-500",children:[e.start," - ",e.end]})]}),e.details&&(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.details})]},`${e.school}-${i}`))})]}):null,projects:e.projects?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title font-serif",children:"Projects"}),(0,j.jsx)("div",{className:"space-y-3",children:e.projects.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("div",{className:"text-sm font-semibold",children:e.name||"Project"}),(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.description})]},`${e.name}-${i}`))})]}):null,certifications:e.certifications?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title font-serif",children:"Certifications"}),(0,j.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:e.certifications.map((e,i)=>(0,j.jsxs)("div",{children:[e.name," ",e.issuer?`\xb7 ${e.issuer}`:""," ",e.year?`(${e.year})`:""]},`${e.name}-${i}`))})]}):null,extras:e.extras?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title font-serif",children:"Extras"}),(0,j.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[e.extras.languages?.length?(0,j.jsxs)("p",{children:["Languages: ",e.extras.languages.join(", ")]}):null,e.extras.interests?.length?(0,j.jsxs)("p",{children:["Interests: ",e.extras.interests.join(", ")]}):null]})]}):null};return(0,j.jsxs)("div",{className:"p-10 font-serif text-[14px]",children:[(0,j.jsxs)("header",{className:"border-b border-gray-300 pb-4 text-center",children:[(0,j.jsx)("h1",{className:"text-3xl font-semibold",children:e.basics.name||"Your Name"}),(0,j.jsx)("p",{className:"text-sm text-gray-600",children:e.basics.headline||"Professional Headline"}),(0,j.jsxs)("div",{className:"mt-2 flex flex-wrap justify-center gap-3 text-[14px] text-gray-500",children:[(0,j.jsx)("span",{children:e.basics.email}),(0,j.jsx)("span",{children:e.basics.phone}),(0,j.jsx)("span",{children:e.basics.location})]})]}),(0,j.jsx)("div",{className:"mt-6 space-y-5",children:i.map(e=>!1!==a[e]?t[e]:null)})]})},renderHtml:function(e={}){let i=p(e),a=f(i,b(i));return y(i,`<main class="page elegantSerifLayout"><div class="inner"><header><h1>${d(i.basics.name||"Your Name")}</h1><p>${d(i.basics.headline||"")}</p></header>${a}</div></main>`,`${u}body{background:#f8fafc;font-family:Georgia,'Times New Roman',serif;color:#1f2937}.inner{padding:12.5mm}header{text-align:center;border-bottom:1px solid #d1d5db;padding-bottom:8px;margin-bottom:9px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.11em;color:#374151}`)}},{id:"creative-timeline",name:"Creative Timeline",category:"Creative",isAtsFriendly:!1,componentKey:"CreativeTimeline",description:"Timeline layout that emphasizes career progression.",tags:["creative","timeline"],component:({draft:e})=>{let i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},t={summary:e.summary?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Summary"}),(0,j.jsx)("p",{className:"cv-body",children:e.summary})]}):null,skills:e.skills?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Skills"}),(0,j.jsx)("div",{className:"flex flex-wrap gap-2",children:e.skills.map(e=>(0,j.jsx)("span",{className:"rounded-full border border-gray-200 px-3 py-1 text-[14px]",children:e},e))})]}):null,experience:e.experience?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Experience Timeline"}),(0,j.jsx)("div",{className:"space-y-4 border-l border-gray-200 pl-4",children:e.experience.map((e,i)=>(0,j.jsxs)("div",{className:"relative",children:[(0,j.jsx)("span",{className:"absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary"}),(0,j.jsxs)("div",{className:"text-sm font-semibold",children:[e.role||"Role"," \xb7 ",e.company||"Company"]}),(0,j.jsxs)("div",{className:"text-[14px] text-gray-500",children:[e.start," - ",e.end," ",e.location?`• ${e.location}`:""]}),(0,j.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:e.bullets?.map((i,a)=>(0,j.jsx)("li",{children:i},`${e.company}-${a}`))})]},`${e.company}-${i}`))})]}):null,education:e.education?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,j.jsx)("div",{className:"space-y-3",children:e.education.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("div",{className:"text-sm font-semibold",children:e.program||"Program"}),(0,j.jsxs)("div",{className:"text-[14px] text-gray-500",children:[e.school||"School"," \xb7 ",e.start," - ",e.end]})]},`${e.school}-${i}`))})]}):null,projects:e.projects?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,j.jsx)("div",{className:"space-y-3",children:e.projects.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("div",{className:"text-sm font-semibold",children:e.name||"Project"}),(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.description})]},`${e.name}-${i}`))})]}):null,certifications:e.certifications?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Certifications"}),(0,j.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:e.certifications.map((e,i)=>(0,j.jsxs)("div",{children:[e.name," ",e.issuer?`\xb7 ${e.issuer}`:""," ",e.year?`(${e.year})`:""]},`${e.name}-${i}`))})]}):null,extras:e.extras?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Extras"}),(0,j.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[e.extras.languages?.length?(0,j.jsxs)("p",{children:["Languages: ",e.extras.languages.join(", ")]}):null,e.extras.interests?.length?(0,j.jsxs)("p",{children:["Interests: ",e.extras.interests.join(", ")]}):null]})]}):null};return(0,j.jsxs)("div",{className:"p-8 text-[14px]",children:[(0,j.jsxs)("header",{className:"rounded-2xl bg-gradient-to-r from-primary to-secondary p-6 text-white",children:[(0,j.jsx)("h1",{className:"text-2xl font-semibold",children:e.basics.name||"Your Name"}),(0,j.jsx)("p",{className:"text-sm text-white/80",children:e.basics.headline||"Professional Headline"}),(0,j.jsxs)("div",{className:"mt-2 flex flex-wrap gap-3 text-[14px] text-white/70",children:[(0,j.jsx)("span",{children:e.basics.email}),(0,j.jsx)("span",{children:e.basics.phone}),(0,j.jsx)("span",{children:e.basics.location})]})]}),(0,j.jsx)("div",{className:"mt-6 space-y-5",children:i.map(e=>!1!==a[e]?t[e]:null)})]})},renderHtml:function(e={}){let i=p(e),a=b(i);return y(i,`<main class="page creativeTimelineLayout"><div class="inner"><header><h1>${d(i.basics.name||"Your Name")}</h1><p>${d(i.basics.headline||"")}</p></header>${h(i,"experience")?a.experience:""}${(i.sectionOrder||t).filter(e=>"experience"!==e).map(e=>h(i,e)&&a[e]||"").join("")}</div></main>`,`${u}body{background:#eef2ff;font-family:var(--fontFamily)}.inner{padding:12.5mm}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.13em;color:#4338ca}.item{position:relative;padding-left:14px}.item:before{content:'';position:absolute;left:0;top:5px;width:8px;height:8px;border-radius:999px;background:#6366f1}`)}},{id:"modern-teal",name:"Modern Teal Two-Column",category:"Modern",isAtsFriendly:!0,componentKey:"ModernTeal",description:"Teal-accent two-column layout with a focused contact rail.",tags:["modern","teal","two-column"],component:({draft:e})=>{let i=(0,N.useMemo)(()=>(function(e){let i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},t=e.basics||{},{cssVarBlock:s}=w(e),r=[];t.phone&&r.push(`<div class="c-line"><span class="c-label">Phone</span> ${T(t.phone)}</div>`),t.email&&r.push(`<div class="c-line"><span class="c-label">Email</span> ${T(t.email)}</div>`),t.location&&r.push(`<div class="c-line"><span class="c-label">Location</span> ${T(t.location)}</div>`);let n=(t.links||[]).filter(e=>(e?.label||e?.url)?.trim()).map((e,i)=>{let a=(e.label||e.url||"").trim(),t=(e.url||"").trim(),s=`${C(t)}|${C(a)}|${i}`;return`<div class="c-line" data-k="${T(s)}"><span class="c-label">${T(a)}</span> ${t?T(t):""}</div>`}),l=(e,i)=>i.trim()?`<section class="sec"><h2 class="sec-title">${T(e)}</h2>${i}</section>`:"",o=e.summary?.trim()?`<p class="p">${T(e.summary)}</p>`:"",c=e.skills?.length?`<ul class="pill-list">${e.skills.map(e=>`<li class="pill">${T(e)}</li>`).join("")}</ul>`:"",d=e.education?.length?`<div class="stack">
        ${e.education.map((e,i)=>{let a=[C(e.school),C(e.program),C(e.start),C(e.end),i].join("|"),t=`${T(e.start||"")}${e.start||e.end?" – ":""}${T(e.end||"")}`.trim();return`<div class="item" data-k="${T(a)}">
              <div class="row">
                <div class="strong">${T(e.program||"Program")}</div>
                <div class="muted">${T(t)}</div>
              </div>
              <div class="small">${T(e.school||"School")}</div>
              ${e.details?`<div class="small">${T(e.details)}</div>`:""}
            </div>`}).join("")}
      </div>`:"",m=e.experience?.length?`<div class="stack">
        ${e.experience.map((e,i)=>{let a=[C(e.company),C(e.role),C(e.start),C(e.end),i].join("|"),t=`${T(e.start||"")}${e.start||e.end?" – ":""}${T(e.end||"")}`.trim(),s=e.bullets?.length?`<ul class="bullets">${e.bullets.filter(Boolean).map(e=>`<li>${T(e)}</li>`).join("")}</ul>`:"";return`<div class="item" data-k="${T(a)}">
              <div class="row">
                <div class="strong">${T(e.role||"Role")}</div>
                <div class="muted">${T(t)}</div>
              </div>
              <div class="small">${T(e.company||"Company")}${e.location?` • ${T(e.location)}`:""}</div>
              ${s}
            </div>`}).join("")}
      </div>`:"",p=e.projects?.length?`<div class="stack">
        ${e.projects.map((e,i)=>{let a=[C(e.name),C(e.link),i].join("|"),t=e.bullets?.length?`<ul class="bullets">${e.bullets.filter(Boolean).map(e=>`<li>${T(e)}</li>`).join("")}</ul>`:"";return`<div class="item" data-k="${T(a)}">
              <div class="row">
                <div class="strong">${T(e.name||"Project")}</div>
                <div class="muted">${e.link?T(e.link):""}</div>
              </div>
              ${e.description?`<div class="small">${T(e.description)}</div>`:""}
              ${t}
            </div>`}).join("")}
      </div>`:"",h=e.certifications?.length?`<ul class="list">
        ${e.certifications.map(e=>{let i=`${T(e.issuer||"")}${e.year?` • ${T(e.year)}`:""}`.trim();return`<li><span class="strong">${T(e.name||"")}</span>${i?` <span class="small">(${i})</span>`:""}</li>`}).join("")}
      </ul>`:"",x=e.extras?`<div class="stack">
        ${e.extras.languages?.length?`<div><span class="strong">Languages:</span> ${T(e.extras.languages.join(", "))}</div>`:""}
        ${e.extras.interests?.length?`<div><span class="strong">Interests:</span> ${T(e.extras.interests.join(", "))}</div>`:""}
      </div>`:"",g=[],u=[];i.forEach(e=>{!1!==a[e]&&("summary"===e?g.push(l("Summary",o)):"skills"===e?g.push(l("Skills",c)):"education"===e?g.push(l("Education",d)):"experience"===e?u.push(l("Professional Experience",m)):"projects"===e?u.push(l("Projects",p)):"certifications"===e?u.push(l("Certifications",h)):"extras"===e&&g.push(l("Extras",x)))});let b=`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${s}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root{--text:var(--textColor);--muted:var(--mutedTextColor);--hair:var(--borderColor);--paper:#fff;--accent:var(--accent);--accent2:var(--primary)}
*{box-sizing:border-box}
body{margin:0;background:#f1f5f9;font-family:var(--fontFamily);font-size:var(--baseFontSize);color:var(--text)}
.page{width:210mm;min-height:297mm;margin:18px auto;background:var(--paper);padding:12.5mm;box-shadow:0 12px 35px rgba(2,6,23,.10)}
.name{font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1.03;margin:0}
.headline{margin:7px 0 0;color:var(--muted);font-size:14.3px;font-weight:500}
.accent-bar{height:6px;background:var(--accent);margin:12px 0 0}
.grid{display:grid;grid-template-columns:70mm 1fr;gap:10.5mm;margin-top:10mm}
.card{border:1px solid var(--hair);border-radius:10px;padding:11px 12px;background:#f8fafc}
.c-title,.sec-title{font-size:14px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--accent2);margin:0 0 8px}
.c-line{font-size:var(--bodySize);margin:5px 0;line-height:1.45}.c-label{display:inline-block;min-width:62px;color:var(--muted);font-weight:600}
.sec{margin:0 0 12px}.sec-title{padding-bottom:6px;border-bottom:2px solid rgba(14,165,165,.35)}
.p{margin:0;font-size:var(--bodySize);line-height:1.56}.stack{display:flex;flex-direction:column;gap:9px}
.row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:baseline}
.strong{font-weight:800;font-size:14px}.muted{color:var(--muted);font-size:var(--bodySize);white-space:nowrap;text-align:right}
.small{color:var(--muted);font-size:var(--bodySize);line-height:1.5;margin-top:4px}
.bullets{margin:7px 0 0;padding-left:19px;font-size:var(--bodySize);line-height:1.48}.bullets li{margin:3px 0}
.pill-list{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}
.pill{border:1px solid rgba(14,165,165,.35);background:#fff;border-radius:999px;padding:5px 10px;font-size:var(--bodySize);font-weight:600}
.list{margin:0;padding-left:19px;font-size:var(--bodySize);line-height:1.48}
@page{size:A4;margin:12mm}
@media print{body{background:#fff}.page{margin:0;padding:0;width:auto;min-height:auto;box-shadow:none}}
</style>
</head>
<body>
  <main class="page">
    <h1 class="name">${T(t.name||"Your Name")}</h1>
    <div class="headline">${T(t.headline||"Professional Headline")}</div>
    <div class="accent-bar"></div>
    <div class="grid">
      <aside>
        <div class="card">
          <p class="c-title">Contact</p>
          ${r.join("")}
          ${n.join("")}
        </div>
        <div style="height:10px"></div>
        ${g.join("")}
      </aside>
      <section>${u.join("")}</section>
    </div>
  </main>
</body>
</html>`;return(0,z.Y)("modern-teal",b),b})(e),[JSON.stringify(e)]),a=(0,N.useMemo)(()=>(0,z.L)(i),[i]);return(0,j.jsx)("iframe",{title:"Modern Teal",className:"min-h-full h-full w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"yes",srcDoc:a,style:{height:"100%",width:"100%",border:0}})},renderHtml:function(e={}){let i=p(e),a=b(i);return y(i,`<main class="page modernTealLayout"><div class="inner"><h1 class="name">${d(i.basics.name||"Your Name")}</h1><p class="headline">${d(i.basics.headline||"")}</p><div class="accent"></div><div class="grid"><aside>${["summary","skills","education","extras"].map(e=>h(i,e)&&a[e]||"").join("")}</aside><section>${["experience","projects","certifications"].map(e=>h(i,e)&&a[e]||"").join("")}</section></div></div></main>`,`${u}body{background:#f1f5f9;font-family:var(--fontFamily)}.inner{padding:11.5mm}.name{font-weight:800}.headline{margin:4px 0 0;color:var(--mutedTextColor);font-size:var(--resolvedHeadlineSize)}.accent{height:5px;background:var(--accent);margin:8px 0 0}.grid{display:grid;grid-template-columns:67mm 1fr;gap:9mm;margin-top:9mm}h2{letter-spacing:.12em;color:var(--primary);border-bottom:2px solid rgba(14,165,165,.35);padding-bottom:5px}`)}},{id:"modern-sidebar-blue",name:"Modern Blue Sidebar",category:"Modern",isAtsFriendly:!0,componentKey:"ModernSidebarBlue",description:"Blue sidebar with initials avatar and strong section blocks.",tags:["modern","sidebar","blue"],component:({draft:e})=>{let i=(0,N.useMemo)(()=>(function(e){let i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},t=e.basics||{},s=t.photoUrl?.trim()||"/assets/profile_photo.png",{cssVarBlock:r}=w(e),n=[t.email?`<div>${B(t.email)}</div>`:"",t.phone?`<div>${B(t.phone)}</div>`:"",t.location?`<div>${B(t.location)}</div>`:"",...(t.links||[]).filter(e=>(e?.label||e?.url)?.trim()).map(e=>`<div>${B(e.label||e.url||"")}${e.url?` \xb7 ${B(e.url)}`:""}</div>`)].filter(Boolean).join(""),l=(e.skills||[]).filter(Boolean).map(e=>`<li>${B(e)}</li>`).join(""),o=(e.extras?.languages||[]).filter(Boolean).map(e=>`<li>${B(e)}</li>`).join(""),c=e.summary?.trim()?`<p class="p">${B(e.summary)}</p>`:"",d=e.experience?.length?e.experience.map((e,i)=>{let a=[H(e.company),H(e.role),H(e.start),H(e.end),i].join("|"),t=`${B(e.start||"")}${e.start||e.end?" – ":""}${B(e.end||"")}`.trim(),s=e.bullets?.length?`<ul class="bullets">${e.bullets.filter(Boolean).map(e=>`<li>${B(e)}</li>`).join("")}</ul>`:"";return`<article class="item" data-k="${B(a)}"><h4>${B(e.role||"Role")} \xb7 ${B(e.company||"Company")}</h4><div class="meta">${B(t)}${e.location?` \xb7 ${B(e.location)}`:""}</div>${s}</article>`}).join(""):"",m=e.education?.length?e.education.map((e,i)=>{let a=[H(e.school),H(e.program),i].join("|");return`<article class="item" data-k="${B(a)}"><h4>${B(e.program||"Program")}</h4><div class="meta">${B(e.school||"School")} \xb7 ${B(e.start||"")}${e.start||e.end?" – ":""}${B(e.end||"")}</div>${e.details?`<p class="small">${B(e.details)}</p>`:""}</article>`}).join(""):"",p=e.certifications?.length?`<ul class="text-list">${e.certifications.map(e=>`<li><strong>${B(e.name||"")}</strong>${e.issuer?` \xb7 ${B(e.issuer)}`:""}${e.year?` (${B(e.year)})`:""}</li>`).join("")}</ul>`:"",h=e.projects?.length?e.projects.map((e,i)=>`<article class="item" data-k="${B(`${H(e.name)}|${i}`)}"><h4>${B(e.name||"Project")}</h4>${e.description?`<p class="small">${B(e.description)}</p>`:""}${e.bullets?.length?`<ul class="bullets">${e.bullets.filter(Boolean).map(e=>`<li>${B(e)}</li>`).join("")}</ul>`:""}</article>`).join(""):"",x=(e,i)=>i.trim()?`<section class="sec"><h3>${B(e)}</h3>${i}</section>`:"",g=[];i.forEach(e=>{!1!==a[e]&&("summary"===e&&g.push(x("Profile",c)),"experience"===e&&g.push(x("Experience",d)),"education"===e&&g.push(x("Education",m)),"projects"===e&&g.push(x("Projects",h)),"certifications"===e&&g.push(x("Certifications",p)))});let u=`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${r}
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
:root{--paper:#fff;--ink:var(--textColor);--muted:var(--mutedTextColor);--accent:var(--accent);--sideText:var(--sidebarText)}
*{box-sizing:border-box}
body{margin:0;background:#e2e8f0;font-family:Poppins,system-ui,Segoe UI,Arial;color:var(--ink)}
.page{width:210mm;min-height:297mm;margin:18px auto;background:var(--paper);display:grid;grid-template-columns:72mm 1fr;box-shadow:0 12px 35px rgba(2,6,23,.12)}
aside{background:linear-gradient(180deg,var(--sidebarBg),var(--primary));color:var(--sidebarText);padding:11.5mm}
.avatar{width:86px;height:108px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:29px;font-weight:700;margin-bottom:14px;border:2px solid rgba(255,255,255,.55);box-shadow:0 4px 16px rgba(15,23,42,.15)}
.avatar-img{width:100%;height:100%;object-fit:cover;display:block}
.side-name{font-size:24px;line-height:1.12;font-weight:700;margin:0 0 4px}.side-headline{margin:0 0 13px;color:var(--sideText);font-size:14px}
.s-title{margin:0 0 8px;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb, var(--sidebarText) 78%, white 22%);font-weight:700}
.s-block{margin:0 0 13px}.s-block div,.s-block li{font-size:14px;line-height:1.5;color:var(--sidebarText)}
main{padding:11mm 12mm}.name{margin:0;font-size:33px;line-height:1.04;letter-spacing:-.02em}.headline{margin:7px 0 0;color:var(--muted);font-size:14.2px}
.sec{margin:0 0 12px}h3{margin:0 0 7px;font-size:14px;letter-spacing:.11em;text-transform:uppercase;border-bottom:1px solid color-mix(in srgb, var(--accent) 22%, white 78%);padding-bottom:5px;color:var(--accent)}
.p{margin:0;font-size:14px;line-height:1.58}
.item{margin-bottom:9px}.item h4{margin:0;font-size:13px}.meta{font-size:14px;color:var(--muted)}.small{margin:4px 0 0;color:#334155;font-size:14px;line-height:1.48}
.bullets{margin:6px 0 0;padding-left:19px}.bullets li{font-size:14px;line-height:1.48;margin:3px 0}
.text-list{margin:0;padding-left:19px}.text-list li{font-size:14px;line-height:1.48;margin:3px 0}
@page{size:A4;margin:12mm}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto}}
</style>
</head>
<body>
<main class="page">
  <aside>
    <div class="avatar"><img class="avatar-img" src="${B(s)}" alt="Profile photo" /></div>
    <p class="side-name">${B(t.name||"Your Name")}</p>
    <p class="side-headline">${B(t.headline||"Professional Headline")}</p>
    <section class="s-block"><p class="s-title">Contact</p>${n||"<div>Add contact details</div>"}</section>
    ${l?`<section class="s-block"><p class="s-title">Skills</p><ul>${l}</ul></section>`:""}
    ${o?`<section class="s-block"><p class="s-title">Languages</p><ul>${o}</ul></section>`:""}
  </aside>
  <main>
    <h1 class="name">${B(t.name||"Your Name")}</h1>
    <p class="headline">${B(t.headline||"Professional Headline")}</p>
    <div style="height:10px"></div>
    ${g.join("")}
  </main>
</main>
</body>
</html>`;return(0,z.Y)("modern-sidebar-blue",u),u})(e),[JSON.stringify(e)]),a=(0,N.useMemo)(()=>(0,z.L)(i),[i]);return(0,j.jsx)("iframe",{title:"Modern Blue Sidebar",className:"min-h-full h-full w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"yes",srcDoc:a,style:{height:"100%",width:"100%",border:0}})},renderHtml:function(e={}){let i=p(e),a=v({...i,templateId:"modern-sidebar-blue"}).replace("modernSidebarLayout","modernSidebarBlueLayout"),t=(i.basics?.photoUrl||"").trim()||"/assets/profile_photo.png",s=`<img class="avatar-img" src="${d(t)}" alt="Profile photo" />`;return a.replace('<aside class="sidebar"><h1>',`<aside class="sidebar"><div class="avatar">${s}</div><h1>`).replace("</style>",".avatar{width:86px;height:108px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.2);margin-bottom:14px;border:2px solid rgba(255,255,255,.55);box-shadow:0 4px 16px rgba(15,23,42,.15)}.avatar-img{width:100%;height:100%;object-fit:cover;display:block}</style>")}},{id:"ats-compact",name:"Clean Compact ATS",category:"ATS",isAtsFriendly:!0,componentKey:"AtsCompact",description:"Compact single-column layout optimized for ATS parsing.",tags:["ats","compact","single-column"],component:({draft:e})=>{let i=(0,N.useMemo)(()=>{let i,a,t,s,r,n,l,o,c,d,m,p,h,x,g;return i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},s=[(t=e.basics||{}).email,t.phone,t.location].filter(Boolean).map(e=>`<span>${M(e)}</span>`).join('<span class="sep">•</span>'),r=(t.links||[]).filter(e=>(e?.label||e?.url)?.trim()).map(e=>`${M(e.label||e.url||"")}${e.url?` (${M(e.url)})`:""}`).join(" \xb7 "),n=(e,i)=>i.trim()?`<section class="sec"><h2>${M(e)}</h2>${i}</section>`:"",l=e.summary?.trim()?`<p>${M(e.summary)}</p>`:"",o=e.skills?.length?`<div class="skills-grid">${e.skills.map(e=>`<div>• ${M(e)}</div>`).join("")}</div>`:"",c=e.experience?.length?e.experience.map((e,i)=>{let a=[E(e.company),E(e.role),i].join("|"),t=`${M(e.start||"")}${e.start||e.end?" – ":""}${M(e.end||"")}`,s=e.bullets?.length?`<ul>${e.bullets.filter(Boolean).map(e=>`<li>${M(e)}</li>`).join("")}</ul>`:"";return`<article class="item" data-k="${M(a)}"><div class="row"><strong>${M(e.role||"Role")} \xb7 ${M(e.company||"Company")}</strong><span class="muted">${t}</span></div><div class="muted">${e.location?M(e.location):""}</div>${s}</article>`}).join(""):"",d=e.education?.length?e.education.map((e,i)=>{let a=[E(e.school),E(e.program),i].join("|");return`<article class="item" data-k="${M(a)}"><div class="row"><strong>${M(e.program||"Program")}</strong><span class="muted">${M(e.start||"")}${e.start||e.end?" – ":""}${M(e.end||"")}</span></div><div>${M(e.school||"School")}</div>${e.details?`<div class="muted">${M(e.details)}</div>`:""}</article>`}).join(""):"",m=e.projects?.length?e.projects.map((e,i)=>`<article class="item" data-k="${M(`${E(e.name)}|${i}`)}"><div class="row"><strong>${M(e.name||"Project")}</strong><span class="muted">${e.link?M(e.link):""}</span></div>${e.description?`<div>${M(e.description)}</div>`:""}${e.bullets?.length?`<ul>${e.bullets.filter(Boolean).map(e=>`<li>${M(e)}</li>`).join("")}</ul>`:""}</article>`).join(""):"",p=e.certifications?.length?`<ul>${e.certifications.map(e=>`<li><strong>${M(e.name||"")}</strong>${e.issuer?` \xb7 ${M(e.issuer)}`:""}${e.year?` (${M(e.year)})`:""}</li>`).join("")}</ul>`:"",h=e.extras?`<div>${e.extras.languages?.length?`<div><strong>Languages:</strong> ${M(e.extras.languages.join(", "))}</div>`:""}${e.extras.interests?.length?`<div><strong>Interests:</strong> ${M(e.extras.interests.join(", "))}</div>`:""}</div>`:"",x=[],i.forEach(e=>{!1!==a[e]&&("summary"===e&&x.push(n("Summary",l)),"skills"===e&&x.push(n("Skills",o)),"experience"===e&&x.push(n("Experience",c)),"education"===e&&x.push(n("Education",d)),"projects"===e&&x.push(n("Projects",m)),"certifications"===e&&x.push(n("Certifications",p)),"extras"===e&&x.push(n("Extras",h)))}),g=`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');
:root{--ink:#0f172a;--muted:#475569;--line:#cbd5e1;--paper:#fff;--body:14px;--meta:14px;--section:14px}
*{box-sizing:border-box}
body{margin:0;background:#f1f5f9;font-family:'Source Sans 3',system-ui,Segoe UI,Arial;color:var(--ink)}
.page{width:210mm;min-height:297mm;margin:16px auto;background:var(--paper);padding:12.5mm 13mm;box-shadow:0 12px 30px rgba(2,6,23,.10)}
header{border-bottom:2px solid #0f172a;padding-bottom:9px}
.name{margin:0;font-size:33px;line-height:1.04}.headline{margin:5px 0 0;font-size:15px;color:var(--muted)}
.contact{margin-top:8px;font-size:var(--meta);color:var(--muted);display:flex;flex-wrap:wrap;gap:8px 11px}.sep{opacity:.65}
.links{margin-top:5px;font-size:14px;color:var(--muted);line-height:1.35}
.sec{margin-top:11px}h2{margin:0 0 6px;font-size:var(--section);letter-spacing:.12em;text-transform:uppercase;padding-bottom:5px;border-bottom:1px solid var(--line)}
p,li,div{font-size:var(--body);line-height:1.5}
.skills-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 13px}
.item{margin-bottom:7px}.row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:baseline}.muted{color:var(--muted);font-size:14px}
ul{margin:5px 0 0;padding-left:18px}li{margin:3px 0}
@page{size:A4;margin:12mm}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto;padding:0}}
</style>
</head>
<body>
<main class="page">
<header>
  <h1 class="name">${M(t.name||"Your Name")}</h1>
  <p class="headline">${M(t.headline||"Professional Headline")}</p>
  <div class="contact">${s}</div>
  ${r?`<div class="links">${r}</div>`:""}
</header>
${x.join("")}
</main>
</body>
</html>`,(0,z.Y)("ats-compact",g),g},[JSON.stringify(e)]),a=(0,N.useMemo)(()=>(0,z.L)(i),[i]);return(0,j.jsx)("iframe",{title:"ATS Compact",className:"min-h-full h-full w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"yes",srcDoc:a,style:{height:"100%",width:"100%",border:0}})},renderHtml:function(e={}){let i=p(e),a=f(i,b(i));return y(i,`<main class="page atsCompactLayout"><div class="inner"><header><h1>${d(i.basics.name||"Your Name")}</h1><div>${x(i.basics)}</div></header>${a}</div></main>`,`${u}body{font-family:Inter,Arial,sans-serif;background:#fff}.inner{padding:10.5mm 12mm}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:6px}header div{font-size:var(--resolvedMetaSize)}h2{letter-spacing:.09em;margin:8px 0 5px;color:#111}`)}},{id:"compact-one-pager",name:"Compact One-Pager",category:"Compact",isAtsFriendly:!0,componentKey:"CompactOnePager",description:"Dense one-page layout for concise resumes.",tags:["compact","ats"],component:({draft:e})=>{let i=e.sectionOrder?.length?e.sectionOrder:S.Nl,a=e.sectionVisibility||{},t={summary:e.summary?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Summary"}),(0,j.jsx)("p",{className:"cv-body text-[14px]",children:e.summary})]}):null,skills:e.skills?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Skills"}),(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.skills.join(" • ")})]}):null,experience:e.experience?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Experience"}),(0,j.jsx)("div",{className:"space-y-2",children:e.experience.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsxs)("div",{className:"text-[14px] font-semibold",children:[e.role||"Role"," \xb7 ",e.company||"Company"]}),(0,j.jsxs)("div",{className:"text-[14px] text-gray-500",children:[e.start," - ",e.end]}),(0,j.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:e.bullets?.map((i,a)=>(0,j.jsx)("li",{children:i},`${e.company}-${a}`))})]},`${e.company}-${i}`))})]}):null,education:e.education?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,j.jsx)("div",{className:"space-y-2 text-[14px] text-gray-600",children:e.education.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("span",{className:"font-semibold",children:e.program||"Program"}),(0,j.jsxs)("span",{children:[" \xb7 ",e.school||"School"]}),(0,j.jsxs)("span",{className:"text-gray-400",children:[" ","(",e.start," - ",e.end,")"]})]},`${e.school}-${i}`))})]}):null,projects:e.projects?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,j.jsx)("div",{className:"space-y-2 text-[14px] text-gray-600",children:e.projects.map((e,i)=>(0,j.jsxs)("div",{children:[(0,j.jsx)("span",{className:"font-semibold",children:e.name||"Project"}),e.description?` — ${e.description}`:""]},`${e.name}-${i}`))})]}):null,certifications:e.certifications?.length?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Certifications"}),(0,j.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:e.certifications.map((e,i)=>(0,j.jsxs)("div",{children:[e.name," ",e.year?`(${e.year})`:""]},`${e.name}-${i}`))})]}):null,extras:e.extras?(0,j.jsxs)("section",{children:[(0,j.jsx)("h3",{className:"cv-section-title",children:"Extras"}),(0,j.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[e.extras.languages?.length?(0,j.jsxs)("p",{children:["Languages: ",e.extras.languages.join(", ")]}):null,e.extras.interests?.length?(0,j.jsxs)("p",{children:["Interests: ",e.extras.interests.join(", ")]}):null]})]}):null};return(0,j.jsxs)("div",{className:"grid gap-4 p-6 text-[14px]",children:[(0,j.jsxs)("header",{className:"text-center",children:[(0,j.jsx)("h1",{className:"text-2xl font-semibold",children:e.basics.name||"Your Name"}),(0,j.jsx)("p",{className:"text-[14px] text-gray-600",children:e.basics.headline||"Professional Headline"}),(0,j.jsxs)("div",{className:"mt-1 flex flex-wrap justify-center gap-3 text-[14px] text-gray-500",children:[(0,j.jsx)("span",{children:e.basics.email}),(0,j.jsx)("span",{children:e.basics.phone}),(0,j.jsx)("span",{children:e.basics.location})]})]}),(0,j.jsx)("div",{className:"grid gap-4",children:i.map(e=>!1!==a[e]?t[e]:null)})]})},renderHtml:function(e={}){let i=p(e),a=f(i,b(i));return y(i,`<main class="page compactOnePagerLayout"><div class="inner"><header><h1>${d(i.basics.name||"Your Name")}</h1><p>${d(i.basics.headline||"")}</p><p class="muted">${x(i.basics)}</p></header>${a}</div></main>`,`${u}body{background:#f8fafc;font-family:var(--fontFamily)}.inner{padding:10mm 11mm}header{margin-bottom:7px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{margin:7px 0 4px;letter-spacing:.1em;color:#0f172a}.muted{color:#64748b}`)}}],L=P.map(({component:e,renderHtml:i,...a})=>a),A=P.reduce((e,i)=>(e[i.id]=i,e),{})},92065:(e,i,a)=>{a.d(i,{QZ:()=>n,T0:()=>o,ji:()=>l});let t=new Set(["b","strong","i","em","u","span","br"]),s=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i,r=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function n(e){return String(e||"").replace(/<[^>]*>/g,"")}function l(e,i){let a=String(e||""),t=a&&!/\s$/.test(a)?" ":"";return`${a}${t}<${i}></${i}>`}function o(e,i,a=""){return{__html:function(e,i,a=""){let n=e.richText?.[i];if(n?.trim())return n?n.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,"").replace(/<\/?([a-z0-9-]+)([^>]*)>/gi,(e,i,a)=>{let r=String(i||"").toLowerCase();if(!t.has(r))return"";if(e.startsWith("</"))return`</${r}>`;if("br"===r)return"<br>";if("span"===r){let e=String(a||"").match(/style\s*=\s*['\"]([^'\"]*)['\"]/i);if(!e)return"<span>";let i=e[1].match(/color\s*:\s*([^;]+)/i),t=i?.[1]?.trim()||"";return s.test(t)?`<span style="color:${t}">`:"<span>"}return`<${r}>`}):"";return r(a)}(e,i,a)||r(a)}}},94258:(e,i,a)=>{a.d(i,{L:()=>l,Y:()=>o});let t=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,s=/\son\w+="[^"]*"/gi,r=/\son\w+='[^']*'/gi,n=/\son\w+=([^\s>]+)/gi;function l(e){return e.replace(t,"").replace(s,"").replace(r,"").replace(n,"")}function o(e,i){}}}]);
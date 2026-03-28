"use strict";exports.id=7746,exports.ids=[7746],exports.modules={1778:(a,b,c)=>{c.d(b,{JV:()=>h,Nl:()=>d,dN:()=>j,nN:()=>g});let d=["summary","skills","experience","education","projects","certifications","extras"],e=d.reduce((a,b)=>(a[b]=!0,a),{}),f=new Set(d),g=(a,b=d)=>{let c=Array.isArray(a)?a:[],e=[],g=new Set;return c.forEach(a=>{!f.has(a)||g.has(a)||(g.add(a),e.push(a))}),b.forEach(a=>{g.has(a)||(g.add(a),e.push(a))}),e},h=a=>{let b={...e};return a&&d.forEach(c=>{"boolean"==typeof a[c]&&(b[c]=a[c])}),b},i={"modern-sidebar":{primary:"#0f172a",sidebarBg:"#0f172a",sidebarText:"#f8fafc",accent:"#38bdf8"},"bold-header":{primary:"#0f172a",headerBg:"#0f172a",headerText:"#ffffff",accent:"#38bdf8"},"modern-teal":{primary:"#0f766e",accent:"#0d9488",sectionBg:"#f0fdfa"},"modern-sidebar-blue":{primary:"#1d4ed8",sidebarBg:"#1d4ed8",sidebarText:"#eff6ff",accent:"#93c5fd"}};function j(a){let b=i[a.templateId]||{};return{...a,sectionOrder:g(a.sectionOrder),sectionVisibility:h(a.sectionVisibility),basics:{...a.basics||{},name:a.basics?.name||"",headline:a.basics?.headline||"",email:a.basics?.email||"",phone:a.basics?.phone||"",location:a.basics?.location||"",links:a.basics?.links||[],photoUrl:a.basics?.photoUrl||""},skills:a.skills||[],experience:a.experience||[],education:a.education||[],projects:a.projects||[],certifications:a.certifications||[],extras:{languages:[],interests:[],...a.extras},typography:{baseFontSize:14,h1Size:28,h2Size:13,h3Size:11,bodySize:14,lineHeight:1.48,fontFamily:"Inter, system-ui, Arial",...a.typography||{}},formatting:{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e",...a.formatting||{}},templateTheme:{primary:"#0f172a",...b,...a.templateTheme||{}},richText:{...a.richText||{}},coverLetter:{subject:a.coverLetter?.subject||"",greeting:a.coverLetter?.greeting||"",body:a.coverLetter?.body||"",closing:a.coverLetter?.closing||""},aiMeta:{...a.aiMeta||{}},generationMeta:{...a.generationMeta||{}},meta:{isDemoSeeded:!!a.meta?.isDemoSeeded,hasImportedCv:!!a.meta?.hasImportedCv,importedAt:a.meta?.importedAt,importMode:a.meta?.importMode}}}},26548:(a,b,c)=>{c.d(b,{L:()=>h,Y:()=>i});let d=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,e=/\son\w+="[^"]*"/gi,f=/\son\w+='[^']*'/gi,g=/\son\w+=([^\s>]+)/gi;function h(a){return a.replace(d,"").replace(e,"").replace(f,"").replace(g,"")}function i(a,b){}},31829:(a,b,c)=>{c.r(b),c.d(b,{default:()=>k,renderAtsMinimalHtml:()=>j});var d=c(48249),e=c(67484),f=c(1778),g=c(26548);let h=a=>String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),i=a=>(a??"").toString().trim().toLowerCase();function j(a){let b=a.sectionOrder?.length?a.sectionOrder:f.Nl,c=a.sectionVisibility||{},d=a.basics||{},e=[];d.email&&e.push(`<span>${h(d.email)}</span>`),d.phone&&e.push(`<span>${h(d.phone)}</span>`),d.location&&e.push(`<span>${h(d.location)}</span>`);let j=(d.links||[]).filter(a=>(a?.label||a?.url)?.trim()).map((a,b)=>{let c=(a.label||a.url||"").trim(),d=(a.url||"").trim(),e=`${i(d)}|${i(c)}|${b}`;return`<span data-k="${h(e)}">${h(c)}${d?` <span class="muted">(${h(d)})</span>`:""}</span>`}),k={summary:a.summary?.trim()?`<section><h2 class="sec">Summary</h2><p>${h(a.summary)}</p></section>`:"",skills:a.skills?.length?`<section><h2 class="sec">Skills</h2><p>${h(a.skills.join(" • "))}</p></section>`:"",experience:a.experience?.length?`<section>
          <h2 class="sec">Experience</h2>
          <div class="stack">
            ${a.experience.map((a,b)=>{let c=[i(a.company),i(a.role),i(a.start),i(a.end),b].join("|"),d=`${h(a.start||"")}${a.start||a.end?" - ":""}${h(a.end||"")}`.trim(),e=a.bullets?.length?`<ul>
                        ${a.bullets.filter(Boolean).map((a,b)=>`<li data-k="${h(`${c}:b:${b}:${i(a).slice(0,24)}`)}">${h(a)}</li>`).join("")}
                      </ul>`:"";return`<div class="item" data-k="${h(c)}">
                  <div class="row">
                    <div class="strong">${h(a.role||"Role")} \xb7 ${h(a.company||"Company")}</div>
                    <div class="dates">${h(d)}</div>
                  </div>
                  ${a.location?`<div class="muted small">${h(a.location)}</div>`:""}
                  ${e}
                </div>`}).join("")}
          </div>
        </section>`:"",education:a.education?.length?`<section>
          <h2 class="sec">Education</h2>
          <div class="stack">
            ${a.education.map((a,b)=>{let c=[i(a.school),i(a.program),i(a.start),i(a.end),b].join("|"),d=`${h(a.start||"")}${a.start||a.end?" - ":""}${h(a.end||"")}`.trim();return`<div class="item" data-k="${h(c)}">
                  <div class="row">
                    <div class="strong">${h(a.program||"Program")} \xb7 ${h(a.school||"School")}</div>
                    <div class="dates">${h(d)}</div>
                  </div>
                  ${a.details?`<div class="muted">${h(a.details)}</div>`:""}
                </div>`}).join("")}
          </div>
        </section>`:"",projects:a.projects?.length?`<section>
          <h2 class="sec">Projects</h2>
          <div class="stack">
            ${a.projects.map((a,b)=>{let c=[i(a.name),i(a.link),b].join("|"),d=a.bullets?.length?`<ul>
                        ${a.bullets.filter(Boolean).map((a,b)=>`<li data-k="${h(`${c}:b:${b}:${i(a).slice(0,24)}`)}">${h(a)}</li>`).join("")}
                      </ul>`:"";return`<div class="item" data-k="${h(c)}">
                  <div class="row">
                    <div class="strong">${h(a.name||"Project")}</div>
                    <div class="dates">${a.link?`<span class="muted">${h(a.link)}</span>`:""}</div>
                  </div>
                  ${a.description?`<div class="muted">${h(a.description)}</div>`:""}
                  ${d}
                </div>`}).join("")}
          </div>
        </section>`:"",certifications:a.certifications?.length?`<section>
          <h2 class="sec">Certifications</h2>
          <div class="stack">
            ${a.certifications.map((a,b)=>{let c=[i(a.name),i(a.issuer),a.year??"",b].join("|"),d=`${h(a.issuer||"")}${a.year?` • ${h(a.year)}`:""}`.trim();return`<div class="row item" data-k="${h(c)}">
                  <div>${h(a.name||"")}</div>
                  <div class="dates muted">${h(d)}</div>
                </div>`}).join("")}
          </div>
        </section>`:"",extras:a.extras?`<section>
          <h2 class="sec">Extras</h2>
          <div class="muted">
            ${a.extras.languages?.length?`<div><span class="strong">Languages:</span> ${h(a.extras.languages.join(", "))}</div>`:""}
            ${a.extras.interests?.length?`<div><span class="strong">Interests:</span> ${h(a.extras.interests.join(", "))}</div>`:""}
          </div>
        </section>`:""},l=b.map(a=>!1!==c[a]?k[a]:"").filter(Boolean).join("\n"),m=`<!doctype html>
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
      <h1>${h(d.name||"Your Name")}</h1>
      <div class="headline">${h(d.headline||"Professional Headline")}</div>
      <div class="contact">
        ${e.join("")}
        ${j.join("")}
      </div>
    </header>

    ${l}
  </main>
</body>
</html>`;return(0,g.Y)("ats-minimal",m),m}let k=({draft:a})=>{let[b,c]=(0,e.useState)(1100),f=(0,e.useMemo)(()=>{let b=j(a),c=`
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
</script>`;return b.replace("</body>",`${c}</body>`)},[a]);return(0,e.useEffect)(()=>{let a=a=>{let b=a.data;if(!b||!0!==b.__cv_iframe_resize)return;let d=Number(b.height);Number.isFinite(d)&&!(d<=0)&&c(Math.min(Math.max(d+24,900),5e3))};return window.addEventListener("message",a),()=>window.removeEventListener("message",a)},[]),(0,d.jsx)("div",{className:"w-full",children:(0,d.jsx)("iframe",{title:"ATS Minimal",className:"w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"no",srcDoc:f,style:{height:b,width:"100%",border:0}})})}},57353:(a,b,c)=>{c.d(b,{QZ:()=>g,T0:()=>i,ji:()=>h});let d=new Set(["b","strong","i","em","u","span","br"]),e=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i,f=a=>String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function g(a){return String(a||"").replace(/<[^>]*>/g,"")}function h(a,b){let c=String(a||""),d=c&&!/\s$/.test(c)?" ":"";return`${c}${d}<${b}></${b}>`}function i(a,b,c=""){return{__html:function(a,b,c=""){let g=a.richText?.[b];if(g?.trim())return g?g.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,"").replace(/<\/?([a-z0-9-]+)([^>]*)>/gi,(a,b,c)=>{let f=String(b||"").toLowerCase();if(!d.has(f))return"";if(a.startsWith("</"))return`</${f}>`;if("br"===f)return"<br>";if("span"===f){let a=String(c||"").match(/style\s*=\s*['\"]([^'\"]*)['\"]/i);if(!a)return"<span>";let b=a[1].match(/color\s*:\s*([^;]+)/i),d=b?.[1]?.trim()||"";return e.test(d)?`<span style="color:${d}">`:"<span>"}return`<${f}>`}):"";return f(c)}(a,b,c)||f(c)}}},67746:(a,b,c)=>{c.d(b,{a_:()=>I,oj:()=>K,aY:()=>J});let d=["summary","skills","experience","education","projects","certifications","extras"],e=d.reduce((a,b)=>(a[b]=!0,a),{}),f={"modern-sidebar":{primary:"#0f172a",sidebarBg:"#0f172a",sidebarText:"#f8fafc",accent:"#38bdf8"},"bold-header":{primary:"#0f172a",headerBg:"#0f172a",headerText:"#ffffff",accent:"#38bdf8"},"modern-teal":{primary:"#0f766e",accent:"#0d9488",sectionBg:"#f0fdfa"},"modern-sidebar-blue":{primary:"#1d4ed8",sidebarBg:"#1d4ed8",sidebarText:"#eff6ff",accent:"#93c5fd"}},g={baseFontSize:14,h1Size:28,h2Size:13,h3Size:11,bodySize:14,lineHeight:1.48,fontFamily:"Inter, system-ui, Arial"},h={"ats-minimal":{body:11.8,meta:11.1,h3:12.8,sectionTitle:12,headline:13.2,name:30,lineHeight:1.47},"ats-compact":{body:11.4,meta:10.8,h3:12.4,sectionTitle:11.8,headline:12.4,name:29,lineHeight:1.44},"modern-sidebar":{body:11.4,meta:10.9,h3:12.6,sectionTitle:11.7,headline:12.8,name:31,lineHeight:1.46,sidebarBody:11.3,sidebarMeta:10.8},"modern-sidebar-blue":{body:11.4,meta:10.9,h3:12.6,sectionTitle:11.7,headline:12.8,name:31,lineHeight:1.46,sidebarBody:11.3,sidebarMeta:10.8},"bold-header":{body:11.7,meta:11,h3:12.5,sectionTitle:11.8,headline:13,name:31,lineHeight:1.47},"modern-teal":{body:11.5,meta:10.9,h3:12.5,sectionTitle:11.8,headline:13,name:31,lineHeight:1.46},"elegant-serif":{body:11.6,meta:11,h3:12.7,sectionTitle:11.9,headline:13.1,name:34,lineHeight:1.5},"creative-timeline":{body:11.7,meta:11,h3:12.8,sectionTitle:12.1,headline:13.2,name:32,lineHeight:1.47},"compact-one-pager":{body:11.2,meta:10.7,h3:12.1,sectionTitle:11.5,headline:12.4,name:28.5,lineHeight:1.41}},i=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i,j=(a,b,c)=>Math.min(c,Math.max(b,a)),k=(a="")=>String(a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),l=(a="")=>String(a).trim().toLowerCase();function m(a={}){let b=f[a.templateId]||{};return{...a,sectionOrder:a.sectionOrder?.length?a.sectionOrder:d,sectionVisibility:{...e,...a.sectionVisibility||{}},basics:{...a.basics||{},name:a.basics?.name||"",headline:a.basics?.headline||"",email:a.basics?.email||"",phone:a.basics?.phone||"",location:a.basics?.location||"",links:a.basics?.links||[],photoUrl:a.basics?.photoUrl||""},summary:a.summary||"",skills:a.skills||[],experience:a.experience||[],education:a.education||[],projects:a.projects||[],certifications:a.certifications||[],extras:{languages:[],interests:[],...a.extras||{}},typography:{...g,...a.typography||{}},formatting:{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e",...a.formatting||{}},templateTheme:{primary:"#0f172a",...b,...a.templateTheme||{}},richText:{...a.richText||{}}}}let n=(a,b)=>a.sectionVisibility?.[b]!==!1,o=a=>k([a.email,a.phone,a.location].filter(Boolean).join(" • ")),p=`
.page{width:var(--page-width);min-height:var(--page-height);margin:16px auto;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.12)}
@media print{.page{margin:0 !important;box-shadow:none !important}}
`,q=`
h1{margin:0;font-size:var(--resolvedNameSize);line-height:1.1}
h2{font-size:var(--resolvedSectionTitleSize);letter-spacing:.1em;text-transform:uppercase}
h3{margin:0;font-size:var(--resolvedH3Size)}
p,li{font-size:var(--resolvedBodySize);line-height:var(--lineHeight)}
.muted{font-size:var(--resolvedMetaSize);color:var(--mutedTextColor)}
section{margin-bottom:var(--resolvedSectionGap)}
.item{margin-bottom:var(--resolvedItemGap)}
`;function r(a){return{summary:a.summary?.trim()||a.richText?.summary?.trim()?`<section><h2>Summary</h2><p>${((a,b,c="")=>a.richText?.[b]?.trim()?function(a=""){return String(a).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,"").replace(/<\/?([a-z0-9-]+)([^>]*)>/gi,(a,b,c)=>{let d=String(b||"").toLowerCase();if(!["b","strong","i","em","u","span","br"].includes(d))return"";if(a.startsWith("</"))return`</${d}>`;if("br"===d)return"<br>";if("span"===d){let a=String(c||"").match(/style\s*=\s*['\"]([^'\"]*)['\"]/i),b=a?.[1]?.match(/color\s*:\s*([^;]+)/i),d=b?.[1]?.trim();return d&&i.test(d)?`<span style="color:${d}">`:"<span>"}return`<${d}>`})}(a.richText[b]):k(c))(a,"summary",a.summary||"")}</p></section>`:"",skills:a.skills?.length?`<section><h2>Skills</h2><p>${k(a.skills.join(" • "))}</p></section>`:"",experience:a.experience?.length?`<section><h2>Experience</h2>${a.experience.map((a,b)=>`<article class="item" data-k="${k(`${l(a.company)}|${b}`)}"><h3>${k(a.role||"")} ${a.company?`\xb7 ${k(a.company)}`:""}</h3><p class="muted">${k([a.start,a.end].filter(Boolean).join(" - "))}${a.location?` • ${k(a.location)}`:""}</p>${(a.bullets||[]).length?`<ul>${a.bullets.filter(Boolean).map(a=>`<li>${k(a)}</li>`).join("")}</ul>`:""}</article>`).join("")}</section>`:"",education:a.education?.length?`<section><h2>Education</h2>${a.education.map((a,b)=>`<article class="item" data-k="${k(`${l(a.school)}|${b}`)}"><h3>${k(a.program||"")} ${a.school?`\xb7 ${k(a.school)}`:""}</h3><p class="muted">${k([a.start,a.end].filter(Boolean).join(" - "))}</p>${a.details?`<p>${k(a.details)}</p>`:""}</article>`).join("")}</section>`:"",projects:a.projects?.length?`<section><h2>Projects</h2>${a.projects.map((a,b)=>`<article class="item" data-k="${k(`${l(a.name)}|${b}`)}"><h3>${k(a.name||"")}</h3>${a.description?`<p>${k(a.description)}</p>`:""}${(a.bullets||[]).length?`<ul>${a.bullets.filter(Boolean).map(a=>`<li>${k(a)}</li>`).join("")}</ul>`:""}</article>`).join("")}</section>`:"",certifications:a.certifications?.length?`<section><h2>Certifications</h2>${a.certifications.map((a,b)=>`<p data-k="${k(`${l(a.name)}|${b}`)}"><strong>${k(a.name||"")}</strong>${a.issuer?` • ${k(a.issuer)}`:""}${a.year?` (${k(a.year)})`:""}</p>`).join("")}</section>`:"",extras:a.extras?.languages?.length||a.extras?.interests?.length?`<section><h2>Extras</h2>${a.extras?.languages?.length?`<p><strong>Languages:</strong> ${k(a.extras.languages.join(", "))}</p>`:""}${a.extras?.interests?.length?`<p><strong>Interests:</strong> ${k(a.extras.interests.join(", "))}</p>`:""}</section>`:""}}function s(a,b){return(a.sectionOrder||d).map(c=>n(a,c)&&b[c]||"").filter(Boolean).join("")}function t(a,b,c){let d;return`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${d=function(a={}){let b=h[String(a.templateId||"").trim()]||h["ats-minimal"],c={...g,...a.typography||{}},d=a?.typography&&(null!=a.typography.bodySize||null!=a.typography.baseFontSize),e=(Number(c.bodySize)||g.bodySize)-g.bodySize,f=(Number(c.baseFontSize)||g.baseFontSize)-g.baseFontSize,i=(Number(c.h1Size)||g.h1Size)-g.h1Size,k=.7*e+.8*f,l=j(b.body+k,d?10.2:14,16.5),m=j(b.meta+.85*k,9.8,15.2),n=d?m:l,o=j(Math.max(b.h3+.55*k+.08*i,l+1.1),11.2,18),p=j(Math.max(b.sectionTitle+.35*k+.16*i,l+.6),11,18.2),q=j(b.name+.6*k+.58*i,23,41),r=j(b.headline+.42*k+.2*i,11.2,19),s=j(Number(c.lineHeight)||b.lineHeight||g.lineHeight,1.28,1.65),t=j(s-.04,1.24,1.58);return{body:l,meta:n,h3:o,sectionTitle:p,name:q,headline:r,lineHeight:s,denseLineHeight:t,sidebarBody:d?j((b.sidebarBody||l)+.3*k,10.1,15.2):l,sidebarMeta:d?j((b.sidebarMeta||n)+.3*k,9.7,15):l,sectionGap:j(8+1.3*k,6,14),itemGap:j(4.5+k,3,9)}}(a),`:root{--baseFontSize:${a.typography.baseFontSize}px;--h1Size:${a.typography.h1Size}px;--h2Size:${a.typography.h2Size}px;--h3Size:${a.typography.h3Size||12}px;--bodySize:${a.typography.bodySize||a.typography.baseFontSize}px;--fontFamily:${a.typography.fontFamily};--lineHeight:${d.lineHeight};--denseLineHeight:${d.denseLineHeight};--resolvedBodySize:${d.body}px;--resolvedMetaSize:${d.meta}px;--resolvedH3Size:${d.h3}px;--resolvedSectionTitleSize:${d.sectionTitle}px;--resolvedNameSize:${d.name}px;--resolvedHeadlineSize:${d.headline}px;--resolvedSidebarBodySize:${d.sidebarBody}px;--resolvedSidebarMetaSize:${d.sidebarMeta}px;--resolvedSectionGap:${d.sectionGap}px;--resolvedItemGap:${d.itemGap}px;--textColor:${a.formatting.textColor};--mutedTextColor:${a.formatting.mutedTextColor};--linkColor:${a.formatting.linkColor};--primary:${a.templateTheme.primary||"#0f172a"};--secondary:${a.templateTheme.secondary||"#1e293b"};--accent:${a.templateTheme.accent||a.templateTheme.primary||"#0f766e"};--sidebarBg:${a.templateTheme.sidebarBg||a.templateTheme.primary||"#0f172a"};--sidebarText:${a.templateTheme.sidebarText||"#f8fafc"};--headerBg:${a.templateTheme.headerBg||a.templateTheme.primary||"#0f172a"};--headerText:${a.templateTheme.headerText||"#ffffff"};--sectionBg:${a.templateTheme.sectionBg||"#f8fafc"};--borderColor:${a.templateTheme.borderColor||"#e2e8f0"};--page-width:210mm;--page-height:297mm}`}@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-size:var(--resolvedBodySize);line-height:var(--lineHeight);color:var(--textColor)}section,.item,.row,header,article{break-inside:avoid;page-break-inside:avoid}h2,h3{break-after:avoid;page-break-after:avoid}li{break-inside:avoid;page-break-inside:avoid}@media print{html,body{background-color:#fff !important;overflow:visible !important}.page{margin:0 !important;box-shadow:none !important;width:var(--page-width) !important;min-height:var(--page-height) !important;overflow:visible !important;box-decoration-break:clone;-webkit-box-decoration-break:clone}.page>.inner,.page>.content,.page>aside,.page>main,.page>section{box-decoration-break:clone;-webkit-box-decoration-break:clone}}${p}${c}</style></head><body data-template-id="${k(a.templateId||"")}">${b}</body></html>`}function u(a={}){let b=m(a),c=r(b),e=["summary","skills","certifications","extras"],f=e.map(a=>n(b,a)&&c[a]||"").join(""),g=(b.sectionOrder||d).filter(a=>!e.includes(a)).map(a=>n(b,a)&&c[a]||"").join("");return t(b,`<main class="page modernSidebarLayout"><aside class="sidebar"><h1>${k(b.basics.name||"Your Name")}</h1><p class="headline">${k(b.basics.headline||"")}</p><p class="contact">${o(b.basics)}</p>${f}</aside><section class="content">${g}</section></main>`,`${q}body{background:#e2e8f0;font-family:var(--fontFamily);color:var(--textColor)}.page{display:grid;grid-template-columns:33% 1fr}.sidebar{background:var(--sidebarBg);color:var(--sidebarText);padding:14.5mm 9mm}.content{padding:14.5mm 11mm}.headline{margin:5px 0 0;color:#cbd5e1;font-size:var(--resolvedHeadlineSize)}.contact{margin:4px 0 0;color:#cbd5e1;font-size:var(--resolvedSidebarMetaSize)}.sidebar p,.sidebar li{font-size:var(--resolvedSidebarBodySize)}.sidebar .muted{font-size:var(--resolvedSidebarMetaSize);color:#cbd5e1}.sidebar h2{color:#e2e8f0}.content h2{color:var(--accent)}h2{margin:10px 0 6px;letter-spacing:.11em}ul{margin:5px 0 0;padding-left:16px}`)}var v=c(31829),w=c(48249),x=c(67484),y=c(1778);function z(a){let b=a.typography||{baseFontSize:14,h1Size:26,h2Size:13,h3Size:12,bodySize:14,fontFamily:"Inter,system-ui,Arial"},c=a.formatting||{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e"},d=a.templateTheme||{primary:"#0f172a",accent:"#0f766e"},e={"--baseFontSize":`${b.baseFontSize||14}px`,"--h1Size":`${b.h1Size||28}px`,"--h2Size":`${b.h2Size||12}px`,"--h3Size":`${b.h3Size||11}px`,"--bodySize":`${b.bodySize||b.baseFontSize||14}px`,"--fontFamily":b.fontFamily||"Inter,system-ui,Arial","--textColor":c.textColor||"#0f172a","--mutedTextColor":c.mutedTextColor||"#475569","--linkColor":c.linkColor||"#0f766e","--primary":d.primary||"#0f172a","--secondary":d.secondary||"#1e293b","--accent":d.accent||d.primary||"#0f766e","--headerBg":d.headerBg||d.primary||"#0f172a","--headerText":d.headerText||"#ffffff","--sidebarBg":d.sidebarBg||d.primary||"#0f172a","--sidebarText":d.sidebarText||"#f8fafc","--sectionBg":d.sectionBg||"#f8fafc","--borderColor":d.borderColor||"#e2e8f0"},f=`:root{${Object.entries(e).map(([a,b])=>`${a}:${b}`).join(";")}}`;return{typography:b,formatting:c,theme:d,cssVars:e,cssVarBlock:f}}var A=c(57353),B=c(26548);let C=a=>String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),D=a=>(a??"").toString().trim().toLowerCase(),E=a=>String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),F=a=>(a??"").toString().trim().toLowerCase(),G=a=>String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),H=a=>(a??"").toString().trim().toLowerCase(),I=[{id:"ats-minimal",name:"ATS Minimal",category:"ATS",isAtsFriendly:!0,componentKey:"AtsMinimal",description:"Simple, ATS-friendly layout with clean typography.",tags:["ats","minimal"],component:v.default,renderHtml:function(a={}){let b=m(a),c=s(b,r(b));return t(b,`<main class="page atsMinimalLayout"><div class="inner"><header><h1>${k(b.basics.name||"Your Name")}</h1><p>${k(b.basics.headline||"")}</p><p class="muted">${o(b.basics)}</p></header>${c}</div></main>`,`${q}body{background:#fff;font-family:Arial,sans-serif;color:#111}.inner{padding:11.5mm 12mm}header{border-bottom:1.5px solid #111;padding-bottom:7px;margin-bottom:9px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.08em;border-top:1px solid #222;padding-top:5px;margin-top:9px}`)}},{id:"modern-sidebar",name:"Modern Sidebar",category:"Modern",isAtsFriendly:!1,componentKey:"ModernSidebar",description:"Two-column layout that highlights skills and summary.",tags:["modern","sidebar"],component:({draft:a})=>{let b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},d=["summary","skills","certifications","extras"],e=b.filter(a=>!d.includes(a)),f={summary:a.summary?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Summary"}),(0,w.jsx)("p",{className:"cv-body",dangerouslySetInnerHTML:(0,A.T0)(a,"summary",a.summary||"")})]}):null,skills:a.skills?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Skills"}),(0,w.jsx)("div",{className:"flex flex-wrap gap-1",children:a.skills.map(a=>(0,w.jsx)("span",{className:"rounded-full bg-white/70 px-2 py-1 text-[14px]",children:a},a))})]}):null,experience:a.experience?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Experience"}),(0,w.jsx)("div",{className:"space-y-3",children:a.experience.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsxs)("div",{className:"text-sm font-semibold",children:[a.role||"Role"," \xb7 ",a.company||"Company"]}),(0,w.jsxs)("div",{className:"text-[14px] text-gray-500",children:[a.start," - ",a.end," ",a.location?`• ${a.location}`:""]}),(0,w.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700",children:a.bullets?.map((b,c)=>(0,w.jsx)("li",{children:b},`${a.company}-${c}`))})]},`${a.company}-${b}`))})]}):null,education:a.education?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,w.jsx)("div",{className:"space-y-3",children:a.education.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("div",{className:"text-sm font-semibold",children:a.program||"Program"}),(0,w.jsxs)("div",{className:"text-[14px] text-gray-500",children:[a.school||"School"," \xb7 ",a.start," - ",a.end]}),a.details&&(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.details})]},`${a.school}-${b}`))})]}):null,projects:a.projects?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,w.jsx)("div",{className:"space-y-3",children:a.projects.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("div",{className:"text-sm font-semibold",children:a.name||"Project"}),a.description&&(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.description}),(0,w.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700",children:a.bullets?.map((b,c)=>(0,w.jsx)("li",{children:b},`${a.name}-${c}`))})]},`${a.name}-${b}`))})]}):null,certifications:a.certifications?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Certifications"}),(0,w.jsx)("div",{className:"space-y-1 text-[14px] text-gray-700",children:a.certifications.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("span",{className:"font-semibold",children:a.name}),a.issuer?` • ${a.issuer}`:""," ",a.year?`(${a.year})`:""]},`${a.name}-${b}`))})]}):null,extras:a.extras?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title text-gray-800",children:"Extras"}),(0,w.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-700",children:[a.extras.languages?.length?(0,w.jsxs)("p",{children:["Languages: ",a.extras.languages.join(", ")]}):null,a.extras.interests?.length?(0,w.jsxs)("p",{children:["Interests: ",a.extras.interests.join(", ")]}):null]})]}):null},{cssVars:g}=z(a);return(0,w.jsxs)("div",{className:"grid min-h-[297mm] grid-cols-[32%_1fr]",style:g,children:[(0,w.jsxs)("aside",{className:"p-6",style:{backgroundColor:"var(--sidebarBg)",color:"var(--sidebarText)",fontSize:"var(--baseFontSize)"},children:[(0,w.jsx)("h1",{className:"text-xl font-semibold",children:a.basics.name||"Your Name"}),(0,w.jsx)("p",{className:"text-[14px] text-slate-300",children:a.basics.headline||"Professional Headline"}),(0,w.jsxs)("div",{className:"mt-3 space-y-1 text-[14px] text-slate-200",children:[(0,w.jsx)("p",{children:a.basics.email}),(0,w.jsx)("p",{children:a.basics.phone}),(0,w.jsx)("p",{children:a.basics.location}),a.basics.links?.map((a,b)=>(0,w.jsx)("p",{children:a.label||a.url},`${a.url}-${b}`))]}),(0,w.jsx)("div",{className:"mt-5 space-y-4",children:d.map(a=>!1!==c[a]?f[a]:null)})]}),(0,w.jsx)("main",{className:"space-y-6 bg-white p-8",style:{color:"var(--textColor)",fontSize:"var(--bodySize)"},children:e.map(a=>!1!==c[a]?f[a]:null)})]})},renderHtml:u},{id:"bold-header",name:"Bold Header",category:"Modern",isAtsFriendly:!0,componentKey:"BoldHeader",description:"Statement header with strong section hierarchy.",tags:["modern","bold"],component:({draft:a})=>{let b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},d={summary:a.summary||a.richText?.summary?(0,w.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Summary"}),(0,w.jsx)("p",{className:"cv-body",dangerouslySetInnerHTML:(0,A.T0)(a,"summary",a.summary||"")})]}):null,skills:a.skills?.length?(0,w.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Skills"}),(0,w.jsx)("div",{className:"flex flex-wrap gap-2",children:a.skills.map(a=>(0,w.jsx)("span",{className:"rounded-full bg-white px-3 py-1 text-[14px] font-semibold text-gray-700",children:a},a))})]}):null,experience:a.experience?.length?(0,w.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-white p-4 shadow-sm",children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Experience"}),(0,w.jsx)("div",{className:"space-y-4",children:a.experience.map((a,b)=>(0,w.jsxs)("div",{className:"space-y-1",children:[(0,w.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,w.jsxs)("span",{children:[a.role||"Role"," \xb7 ",a.company||"Company"]}),(0,w.jsxs)("span",{className:"text-[14px] text-gray-500",children:[a.start," - ",a.end]})]}),a.location?(0,w.jsx)("div",{className:"text-[14px] text-gray-500",children:a.location}):null,(0,w.jsx)("ul",{className:"list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:a.bullets?.filter(Boolean).map((b,c)=>(0,w.jsx)("li",{children:b},`${a.company}-${c}`))})]},`${a.company}-${b}`))})]}):null,education:a.education?.length?(0,w.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-white p-4 shadow-sm",children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,w.jsx)("div",{className:"space-y-3",children:a.education.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,w.jsxs)("span",{children:[a.program||"Program"," \xb7 ",a.school||"School"]}),(0,w.jsxs)("span",{className:"text-[14px] text-gray-500",children:[a.start," - ",a.end]})]}),a.details&&(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.details})]},`${a.school}-${b}`))})]}):null,projects:a.projects?.length?(0,w.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-white p-4 shadow-sm",children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,w.jsx)("div",{className:"space-y-3",children:a.projects.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("div",{className:"text-sm font-semibold",children:a.name||"Project"}),a.description?(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.description}):null,(0,w.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:a.bullets?.filter(Boolean).map((b,c)=>(0,w.jsx)("li",{children:b},`${a.name}-${c}`))})]},`${a.name}-${b}`))})]}):null,certifications:a.certifications?.length?(0,w.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Certifications"}),(0,w.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:a.certifications.map((a,b)=>(0,w.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[(0,w.jsx)("span",{className:"font-semibold",children:a.name}),(0,w.jsxs)("span",{className:"text-gray-500",children:[a.issuer," ",a.year?`• ${a.year}`:""]})]},`${a.name}-${b}`))})]}):null,extras:a.extras?(0,w.jsxs)("section",{className:"rounded-xl border border-gray-100 bg-gray-50 p-4",children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Extras"}),(0,w.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[a.extras.languages?.length?(0,w.jsxs)("p",{children:["Languages: ",a.extras.languages.join(", ")]}):null,a.extras.interests?.length?(0,w.jsxs)("p",{children:["Interests: ",a.extras.interests.join(", ")]}):null]})]}):null},{cssVars:e}=z(a);return(0,w.jsxs)("div",{className:"p-8",style:e,children:[(0,w.jsxs)("header",{className:"rounded-2xl p-6",style:{backgroundColor:"var(--headerBg)",color:"var(--headerText)"},children:[(0,w.jsx)("h1",{className:"text-3xl font-semibold",children:a.basics?.name||"Your Name"}),(0,w.jsx)("p",{className:"text-sm text-slate-200",children:a.basics?.headline||"Professional Headline"}),(0,w.jsxs)("div",{className:"mt-3 flex flex-wrap gap-4 text-[14px] text-slate-300",children:[a.basics?.email?(0,w.jsx)("span",{children:a.basics.email}):null,a.basics?.phone?(0,w.jsx)("span",{children:a.basics.phone}):null,a.basics?.location?(0,w.jsx)("span",{children:a.basics.location}):null]})]}),(0,w.jsx)("div",{className:"mt-6 grid gap-4",children:b.map(a=>!1!==c[a]?d[a]:null)})]})},renderHtml:function(a={}){let b=m(a),c=s(b,r(b));return t(b,`<main class="page boldHeaderLayout"><header class="heroHeader"><h1>${k(b.basics.name||"Your Name")}</h1><p>${k(b.basics.headline||"")}</p><div>${o(b.basics)}</div></header><section class="content">${c}</section></main>`,`${q}body{background:#e2e8f0;font-family:var(--fontFamily);color:var(--textColor)}.heroHeader{background:var(--headerBg);color:var(--headerText);padding:12mm}.heroHeader p{font-size:var(--resolvedHeadlineSize);margin:4px 0 0}.heroHeader div{font-size:var(--resolvedMetaSize);margin-top:4px}.content{padding:10.5mm 12mm}h2{margin:0 0 6px;letter-spacing:.12em;color:var(--accent)}`)}},{id:"elegant-serif",name:"Elegant Serif",category:"Classic",isAtsFriendly:!0,componentKey:"ElegantSerif",description:"Classic serif styling for a timeless look.",tags:["classic","serif"],component:({draft:a})=>{let b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},d={summary:a.summary?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title font-serif",children:"Summary"}),(0,w.jsx)("p",{className:"cv-body text-gray-700",children:a.summary})]}):null,skills:a.skills?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title font-serif",children:"Skills"}),(0,w.jsx)("p",{className:"cv-body text-gray-700",children:a.skills.join(" \xb7 ")})]}):null,experience:a.experience?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title font-serif",children:"Experience"}),(0,w.jsx)("div",{className:"space-y-3",children:a.experience.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,w.jsxs)("span",{children:[a.role||"Role"," \xb7 ",a.company||"Company"]}),(0,w.jsxs)("span",{className:"text-[14px] text-gray-500",children:[a.start," - ",a.end]})]}),(0,w.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700",children:a.bullets?.map((b,c)=>(0,w.jsx)("li",{children:b},`${a.company}-${c}`))})]},`${a.company}-${b}`))})]}):null,education:a.education?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title font-serif",children:"Education"}),(0,w.jsx)("div",{className:"space-y-3",children:a.education.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsxs)("div",{className:"flex flex-wrap items-center justify-between text-sm font-semibold",children:[(0,w.jsxs)("span",{children:[a.program||"Program"," \xb7 ",a.school||"School"]}),(0,w.jsxs)("span",{className:"text-[14px] text-gray-500",children:[a.start," - ",a.end]})]}),a.details&&(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.details})]},`${a.school}-${b}`))})]}):null,projects:a.projects?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title font-serif",children:"Projects"}),(0,w.jsx)("div",{className:"space-y-3",children:a.projects.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("div",{className:"text-sm font-semibold",children:a.name||"Project"}),(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.description})]},`${a.name}-${b}`))})]}):null,certifications:a.certifications?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title font-serif",children:"Certifications"}),(0,w.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:a.certifications.map((a,b)=>(0,w.jsxs)("div",{children:[a.name," ",a.issuer?`\xb7 ${a.issuer}`:""," ",a.year?`(${a.year})`:""]},`${a.name}-${b}`))})]}):null,extras:a.extras?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title font-serif",children:"Extras"}),(0,w.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[a.extras.languages?.length?(0,w.jsxs)("p",{children:["Languages: ",a.extras.languages.join(", ")]}):null,a.extras.interests?.length?(0,w.jsxs)("p",{children:["Interests: ",a.extras.interests.join(", ")]}):null]})]}):null};return(0,w.jsxs)("div",{className:"p-10 font-serif text-[14px]",children:[(0,w.jsxs)("header",{className:"border-b border-gray-300 pb-4 text-center",children:[(0,w.jsx)("h1",{className:"text-3xl font-semibold",children:a.basics.name||"Your Name"}),(0,w.jsx)("p",{className:"text-sm text-gray-600",children:a.basics.headline||"Professional Headline"}),(0,w.jsxs)("div",{className:"mt-2 flex flex-wrap justify-center gap-3 text-[14px] text-gray-500",children:[(0,w.jsx)("span",{children:a.basics.email}),(0,w.jsx)("span",{children:a.basics.phone}),(0,w.jsx)("span",{children:a.basics.location})]})]}),(0,w.jsx)("div",{className:"mt-6 space-y-5",children:b.map(a=>!1!==c[a]?d[a]:null)})]})},renderHtml:function(a={}){let b=m(a),c=s(b,r(b));return t(b,`<main class="page elegantSerifLayout"><div class="inner"><header><h1>${k(b.basics.name||"Your Name")}</h1><p>${k(b.basics.headline||"")}</p></header>${c}</div></main>`,`${q}body{background:#f8fafc;font-family:Georgia,'Times New Roman',serif;color:#1f2937}.inner{padding:12.5mm}header{text-align:center;border-bottom:1px solid #d1d5db;padding-bottom:8px;margin-bottom:9px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.11em;color:#374151}`)}},{id:"creative-timeline",name:"Creative Timeline",category:"Creative",isAtsFriendly:!1,componentKey:"CreativeTimeline",description:"Timeline layout that emphasizes career progression.",tags:["creative","timeline"],component:({draft:a})=>{let b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},d={summary:a.summary?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Summary"}),(0,w.jsx)("p",{className:"cv-body",children:a.summary})]}):null,skills:a.skills?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Skills"}),(0,w.jsx)("div",{className:"flex flex-wrap gap-2",children:a.skills.map(a=>(0,w.jsx)("span",{className:"rounded-full border border-gray-200 px-3 py-1 text-[14px]",children:a},a))})]}):null,experience:a.experience?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Experience Timeline"}),(0,w.jsx)("div",{className:"space-y-4 border-l border-gray-200 pl-4",children:a.experience.map((a,b)=>(0,w.jsxs)("div",{className:"relative",children:[(0,w.jsx)("span",{className:"absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary"}),(0,w.jsxs)("div",{className:"text-sm font-semibold",children:[a.role||"Role"," \xb7 ",a.company||"Company"]}),(0,w.jsxs)("div",{className:"text-[14px] text-gray-500",children:[a.start," - ",a.end," ",a.location?`• ${a.location}`:""]}),(0,w.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:a.bullets?.map((b,c)=>(0,w.jsx)("li",{children:b},`${a.company}-${c}`))})]},`${a.company}-${b}`))})]}):null,education:a.education?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,w.jsx)("div",{className:"space-y-3",children:a.education.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("div",{className:"text-sm font-semibold",children:a.program||"Program"}),(0,w.jsxs)("div",{className:"text-[14px] text-gray-500",children:[a.school||"School"," \xb7 ",a.start," - ",a.end]})]},`${a.school}-${b}`))})]}):null,projects:a.projects?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,w.jsx)("div",{className:"space-y-3",children:a.projects.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("div",{className:"text-sm font-semibold",children:a.name||"Project"}),(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.description})]},`${a.name}-${b}`))})]}):null,certifications:a.certifications?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Certifications"}),(0,w.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:a.certifications.map((a,b)=>(0,w.jsxs)("div",{children:[a.name," ",a.issuer?`\xb7 ${a.issuer}`:""," ",a.year?`(${a.year})`:""]},`${a.name}-${b}`))})]}):null,extras:a.extras?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Extras"}),(0,w.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[a.extras.languages?.length?(0,w.jsxs)("p",{children:["Languages: ",a.extras.languages.join(", ")]}):null,a.extras.interests?.length?(0,w.jsxs)("p",{children:["Interests: ",a.extras.interests.join(", ")]}):null]})]}):null};return(0,w.jsxs)("div",{className:"p-8 text-[14px]",children:[(0,w.jsxs)("header",{className:"rounded-2xl bg-gradient-to-r from-primary to-secondary p-6 text-white",children:[(0,w.jsx)("h1",{className:"text-2xl font-semibold",children:a.basics.name||"Your Name"}),(0,w.jsx)("p",{className:"text-sm text-white/80",children:a.basics.headline||"Professional Headline"}),(0,w.jsxs)("div",{className:"mt-2 flex flex-wrap gap-3 text-[14px] text-white/70",children:[(0,w.jsx)("span",{children:a.basics.email}),(0,w.jsx)("span",{children:a.basics.phone}),(0,w.jsx)("span",{children:a.basics.location})]})]}),(0,w.jsx)("div",{className:"mt-6 space-y-5",children:b.map(a=>!1!==c[a]?d[a]:null)})]})},renderHtml:function(a={}){let b=m(a),c=r(b);return t(b,`<main class="page creativeTimelineLayout"><div class="inner"><header><h1>${k(b.basics.name||"Your Name")}</h1><p>${k(b.basics.headline||"")}</p></header>${n(b,"experience")?c.experience:""}${(b.sectionOrder||d).filter(a=>"experience"!==a).map(a=>n(b,a)&&c[a]||"").join("")}</div></main>`,`${q}body{background:#eef2ff;font-family:var(--fontFamily)}.inner{padding:12.5mm}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.13em;color:#4338ca}.item{position:relative;padding-left:14px}.item:before{content:'';position:absolute;left:0;top:5px;width:8px;height:8px;border-radius:999px;background:#6366f1}`)}},{id:"modern-teal",name:"Modern Teal Two-Column",category:"Modern",isAtsFriendly:!0,componentKey:"ModernTeal",description:"Teal-accent two-column layout with a focused contact rail.",tags:["modern","teal","two-column"],component:({draft:a})=>{let b=(0,x.useMemo)(()=>(function(a){let b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},d=a.basics||{},{cssVarBlock:e}=z(a),f=[];d.phone&&f.push(`<div class="c-line"><span class="c-label">Phone</span> ${C(d.phone)}</div>`),d.email&&f.push(`<div class="c-line"><span class="c-label">Email</span> ${C(d.email)}</div>`),d.location&&f.push(`<div class="c-line"><span class="c-label">Location</span> ${C(d.location)}</div>`);let g=(d.links||[]).filter(a=>(a?.label||a?.url)?.trim()).map((a,b)=>{let c=(a.label||a.url||"").trim(),d=(a.url||"").trim(),e=`${D(d)}|${D(c)}|${b}`;return`<div class="c-line" data-k="${C(e)}"><span class="c-label">${C(c)}</span> ${d?C(d):""}</div>`}),h=(a,b)=>b.trim()?`<section class="sec"><h2 class="sec-title">${C(a)}</h2>${b}</section>`:"",i=a.summary?.trim()?`<p class="p">${C(a.summary)}</p>`:"",j=a.skills?.length?`<ul class="pill-list">${a.skills.map(a=>`<li class="pill">${C(a)}</li>`).join("")}</ul>`:"",k=a.education?.length?`<div class="stack">
        ${a.education.map((a,b)=>{let c=[D(a.school),D(a.program),D(a.start),D(a.end),b].join("|"),d=`${C(a.start||"")}${a.start||a.end?" – ":""}${C(a.end||"")}`.trim();return`<div class="item" data-k="${C(c)}">
              <div class="row">
                <div class="strong">${C(a.program||"Program")}</div>
                <div class="muted">${C(d)}</div>
              </div>
              <div class="small">${C(a.school||"School")}</div>
              ${a.details?`<div class="small">${C(a.details)}</div>`:""}
            </div>`}).join("")}
      </div>`:"",l=a.experience?.length?`<div class="stack">
        ${a.experience.map((a,b)=>{let c=[D(a.company),D(a.role),D(a.start),D(a.end),b].join("|"),d=`${C(a.start||"")}${a.start||a.end?" – ":""}${C(a.end||"")}`.trim(),e=a.bullets?.length?`<ul class="bullets">${a.bullets.filter(Boolean).map(a=>`<li>${C(a)}</li>`).join("")}</ul>`:"";return`<div class="item" data-k="${C(c)}">
              <div class="row">
                <div class="strong">${C(a.role||"Role")}</div>
                <div class="muted">${C(d)}</div>
              </div>
              <div class="small">${C(a.company||"Company")}${a.location?` • ${C(a.location)}`:""}</div>
              ${e}
            </div>`}).join("")}
      </div>`:"",m=a.projects?.length?`<div class="stack">
        ${a.projects.map((a,b)=>{let c=[D(a.name),D(a.link),b].join("|"),d=a.bullets?.length?`<ul class="bullets">${a.bullets.filter(Boolean).map(a=>`<li>${C(a)}</li>`).join("")}</ul>`:"";return`<div class="item" data-k="${C(c)}">
              <div class="row">
                <div class="strong">${C(a.name||"Project")}</div>
                <div class="muted">${a.link?C(a.link):""}</div>
              </div>
              ${a.description?`<div class="small">${C(a.description)}</div>`:""}
              ${d}
            </div>`}).join("")}
      </div>`:"",n=a.certifications?.length?`<ul class="list">
        ${a.certifications.map(a=>{let b=`${C(a.issuer||"")}${a.year?` • ${C(a.year)}`:""}`.trim();return`<li><span class="strong">${C(a.name||"")}</span>${b?` <span class="small">(${b})</span>`:""}</li>`}).join("")}
      </ul>`:"",o=a.extras?`<div class="stack">
        ${a.extras.languages?.length?`<div><span class="strong">Languages:</span> ${C(a.extras.languages.join(", "))}</div>`:""}
        ${a.extras.interests?.length?`<div><span class="strong">Interests:</span> ${C(a.extras.interests.join(", "))}</div>`:""}
      </div>`:"",p=[],q=[];b.forEach(a=>{!1!==c[a]&&("summary"===a?p.push(h("Summary",i)):"skills"===a?p.push(h("Skills",j)):"education"===a?p.push(h("Education",k)):"experience"===a?q.push(h("Professional Experience",l)):"projects"===a?q.push(h("Projects",m)):"certifications"===a?q.push(h("Certifications",n)):"extras"===a&&p.push(h("Extras",o)))});let r=`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${e}
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
    <h1 class="name">${C(d.name||"Your Name")}</h1>
    <div class="headline">${C(d.headline||"Professional Headline")}</div>
    <div class="accent-bar"></div>
    <div class="grid">
      <aside>
        <div class="card">
          <p class="c-title">Contact</p>
          ${f.join("")}
          ${g.join("")}
        </div>
        <div style="height:10px"></div>
        ${p.join("")}
      </aside>
      <section>${q.join("")}</section>
    </div>
  </main>
</body>
</html>`;return(0,B.Y)("modern-teal",r),r})(a),[JSON.stringify(a)]),c=(0,x.useMemo)(()=>(0,B.L)(b),[b]);return(0,w.jsx)("iframe",{title:"Modern Teal",className:"min-h-full h-full w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"yes",srcDoc:c,style:{height:"100%",width:"100%",border:0}})},renderHtml:function(a={}){let b=m(a),c=r(b);return t(b,`<main class="page modernTealLayout"><div class="inner"><h1 class="name">${k(b.basics.name||"Your Name")}</h1><p class="headline">${k(b.basics.headline||"")}</p><div class="accent"></div><div class="grid"><aside>${["summary","skills","education","extras"].map(a=>n(b,a)&&c[a]||"").join("")}</aside><section>${["experience","projects","certifications"].map(a=>n(b,a)&&c[a]||"").join("")}</section></div></div></main>`,`${q}body{background:#f1f5f9;font-family:var(--fontFamily)}.inner{padding:11.5mm}.name{font-weight:800}.headline{margin:4px 0 0;color:var(--mutedTextColor);font-size:var(--resolvedHeadlineSize)}.accent{height:5px;background:var(--accent);margin:8px 0 0}.grid{display:grid;grid-template-columns:67mm 1fr;gap:9mm;margin-top:9mm}h2{letter-spacing:.12em;color:var(--primary);border-bottom:2px solid rgba(14,165,165,.35);padding-bottom:5px}`)}},{id:"modern-sidebar-blue",name:"Modern Blue Sidebar",category:"Modern",isAtsFriendly:!0,componentKey:"ModernSidebarBlue",description:"Blue sidebar with initials avatar and strong section blocks.",tags:["modern","sidebar","blue"],component:({draft:a})=>{let b=(0,x.useMemo)(()=>(function(a){let b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},d=a.basics||{},e=d.photoUrl?.trim()||"/assets/profile_photo.png",{cssVarBlock:f}=z(a),g=[d.email?`<div>${E(d.email)}</div>`:"",d.phone?`<div>${E(d.phone)}</div>`:"",d.location?`<div>${E(d.location)}</div>`:"",...(d.links||[]).filter(a=>(a?.label||a?.url)?.trim()).map(a=>`<div>${E(a.label||a.url||"")}${a.url?` \xb7 ${E(a.url)}`:""}</div>`)].filter(Boolean).join(""),h=(a.skills||[]).filter(Boolean).map(a=>`<li>${E(a)}</li>`).join(""),i=(a.extras?.languages||[]).filter(Boolean).map(a=>`<li>${E(a)}</li>`).join(""),j=a.summary?.trim()?`<p class="p">${E(a.summary)}</p>`:"",k=a.experience?.length?a.experience.map((a,b)=>{let c=[F(a.company),F(a.role),F(a.start),F(a.end),b].join("|"),d=`${E(a.start||"")}${a.start||a.end?" – ":""}${E(a.end||"")}`.trim(),e=a.bullets?.length?`<ul class="bullets">${a.bullets.filter(Boolean).map(a=>`<li>${E(a)}</li>`).join("")}</ul>`:"";return`<article class="item" data-k="${E(c)}"><h4>${E(a.role||"Role")} \xb7 ${E(a.company||"Company")}</h4><div class="meta">${E(d)}${a.location?` \xb7 ${E(a.location)}`:""}</div>${e}</article>`}).join(""):"",l=a.education?.length?a.education.map((a,b)=>{let c=[F(a.school),F(a.program),b].join("|");return`<article class="item" data-k="${E(c)}"><h4>${E(a.program||"Program")}</h4><div class="meta">${E(a.school||"School")} \xb7 ${E(a.start||"")}${a.start||a.end?" – ":""}${E(a.end||"")}</div>${a.details?`<p class="small">${E(a.details)}</p>`:""}</article>`}).join(""):"",m=a.certifications?.length?`<ul class="text-list">${a.certifications.map(a=>`<li><strong>${E(a.name||"")}</strong>${a.issuer?` \xb7 ${E(a.issuer)}`:""}${a.year?` (${E(a.year)})`:""}</li>`).join("")}</ul>`:"",n=a.projects?.length?a.projects.map((a,b)=>`<article class="item" data-k="${E(`${F(a.name)}|${b}`)}"><h4>${E(a.name||"Project")}</h4>${a.description?`<p class="small">${E(a.description)}</p>`:""}${a.bullets?.length?`<ul class="bullets">${a.bullets.filter(Boolean).map(a=>`<li>${E(a)}</li>`).join("")}</ul>`:""}</article>`).join(""):"",o=(a,b)=>b.trim()?`<section class="sec"><h3>${E(a)}</h3>${b}</section>`:"",p=[];b.forEach(a=>{!1!==c[a]&&("summary"===a&&p.push(o("Profile",j)),"experience"===a&&p.push(o("Experience",k)),"education"===a&&p.push(o("Education",l)),"projects"===a&&p.push(o("Projects",n)),"certifications"===a&&p.push(o("Certifications",m)))});let q=`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${f}
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
    <div class="avatar"><img class="avatar-img" src="${E(e)}" alt="Profile photo" /></div>
    <p class="side-name">${E(d.name||"Your Name")}</p>
    <p class="side-headline">${E(d.headline||"Professional Headline")}</p>
    <section class="s-block"><p class="s-title">Contact</p>${g||"<div>Add contact details</div>"}</section>
    ${h?`<section class="s-block"><p class="s-title">Skills</p><ul>${h}</ul></section>`:""}
    ${i?`<section class="s-block"><p class="s-title">Languages</p><ul>${i}</ul></section>`:""}
  </aside>
  <main>
    <h1 class="name">${E(d.name||"Your Name")}</h1>
    <p class="headline">${E(d.headline||"Professional Headline")}</p>
    <div style="height:10px"></div>
    ${p.join("")}
  </main>
</main>
</body>
</html>`;return(0,B.Y)("modern-sidebar-blue",q),q})(a),[JSON.stringify(a)]),c=(0,x.useMemo)(()=>(0,B.L)(b),[b]);return(0,w.jsx)("iframe",{title:"Modern Blue Sidebar",className:"min-h-full h-full w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"yes",srcDoc:c,style:{height:"100%",width:"100%",border:0}})},renderHtml:function(a={}){let b=m(a),c=u({...b,templateId:"modern-sidebar-blue"}).replace("modernSidebarLayout","modernSidebarBlueLayout"),d=(b.basics?.photoUrl||"").trim()||"/assets/profile_photo.png",e=`<img class="avatar-img" src="${k(d)}" alt="Profile photo" />`;return c.replace('<aside class="sidebar"><h1>',`<aside class="sidebar"><div class="avatar">${e}</div><h1>`).replace("</style>",".avatar{width:86px;height:108px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.2);margin-bottom:14px;border:2px solid rgba(255,255,255,.55);box-shadow:0 4px 16px rgba(15,23,42,.15)}.avatar-img{width:100%;height:100%;object-fit:cover;display:block}</style>")}},{id:"ats-compact",name:"Clean Compact ATS",category:"ATS",isAtsFriendly:!0,componentKey:"AtsCompact",description:"Compact single-column layout optimized for ATS parsing.",tags:["ats","compact","single-column"],component:({draft:a})=>{let b=(0,x.useMemo)(()=>{let b,c,d,e,f,g,h,i,j,k,l,m,n,o,p;return b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},e=[(d=a.basics||{}).email,d.phone,d.location].filter(Boolean).map(a=>`<span>${G(a)}</span>`).join('<span class="sep">•</span>'),f=(d.links||[]).filter(a=>(a?.label||a?.url)?.trim()).map(a=>`${G(a.label||a.url||"")}${a.url?` (${G(a.url)})`:""}`).join(" \xb7 "),g=(a,b)=>b.trim()?`<section class="sec"><h2>${G(a)}</h2>${b}</section>`:"",h=a.summary?.trim()?`<p>${G(a.summary)}</p>`:"",i=a.skills?.length?`<div class="skills-grid">${a.skills.map(a=>`<div>• ${G(a)}</div>`).join("")}</div>`:"",j=a.experience?.length?a.experience.map((a,b)=>{let c=[H(a.company),H(a.role),b].join("|"),d=`${G(a.start||"")}${a.start||a.end?" – ":""}${G(a.end||"")}`,e=a.bullets?.length?`<ul>${a.bullets.filter(Boolean).map(a=>`<li>${G(a)}</li>`).join("")}</ul>`:"";return`<article class="item" data-k="${G(c)}"><div class="row"><strong>${G(a.role||"Role")} \xb7 ${G(a.company||"Company")}</strong><span class="muted">${d}</span></div><div class="muted">${a.location?G(a.location):""}</div>${e}</article>`}).join(""):"",k=a.education?.length?a.education.map((a,b)=>{let c=[H(a.school),H(a.program),b].join("|");return`<article class="item" data-k="${G(c)}"><div class="row"><strong>${G(a.program||"Program")}</strong><span class="muted">${G(a.start||"")}${a.start||a.end?" – ":""}${G(a.end||"")}</span></div><div>${G(a.school||"School")}</div>${a.details?`<div class="muted">${G(a.details)}</div>`:""}</article>`}).join(""):"",l=a.projects?.length?a.projects.map((a,b)=>`<article class="item" data-k="${G(`${H(a.name)}|${b}`)}"><div class="row"><strong>${G(a.name||"Project")}</strong><span class="muted">${a.link?G(a.link):""}</span></div>${a.description?`<div>${G(a.description)}</div>`:""}${a.bullets?.length?`<ul>${a.bullets.filter(Boolean).map(a=>`<li>${G(a)}</li>`).join("")}</ul>`:""}</article>`).join(""):"",m=a.certifications?.length?`<ul>${a.certifications.map(a=>`<li><strong>${G(a.name||"")}</strong>${a.issuer?` \xb7 ${G(a.issuer)}`:""}${a.year?` (${G(a.year)})`:""}</li>`).join("")}</ul>`:"",n=a.extras?`<div>${a.extras.languages?.length?`<div><strong>Languages:</strong> ${G(a.extras.languages.join(", "))}</div>`:""}${a.extras.interests?.length?`<div><strong>Interests:</strong> ${G(a.extras.interests.join(", "))}</div>`:""}</div>`:"",o=[],b.forEach(a=>{!1!==c[a]&&("summary"===a&&o.push(g("Summary",h)),"skills"===a&&o.push(g("Skills",i)),"experience"===a&&o.push(g("Experience",j)),"education"===a&&o.push(g("Education",k)),"projects"===a&&o.push(g("Projects",l)),"certifications"===a&&o.push(g("Certifications",m)),"extras"===a&&o.push(g("Extras",n)))}),p=`<!doctype html>
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
  <h1 class="name">${G(d.name||"Your Name")}</h1>
  <p class="headline">${G(d.headline||"Professional Headline")}</p>
  <div class="contact">${e}</div>
  ${f?`<div class="links">${f}</div>`:""}
</header>
${o.join("")}
</main>
</body>
</html>`,(0,B.Y)("ats-compact",p),p},[JSON.stringify(a)]),c=(0,x.useMemo)(()=>(0,B.L)(b),[b]);return(0,w.jsx)("iframe",{title:"ATS Compact",className:"min-h-full h-full w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"yes",srcDoc:c,style:{height:"100%",width:"100%",border:0}})},renderHtml:function(a={}){let b=m(a),c=s(b,r(b));return t(b,`<main class="page atsCompactLayout"><div class="inner"><header><h1>${k(b.basics.name||"Your Name")}</h1><div>${o(b.basics)}</div></header>${c}</div></main>`,`${q}body{font-family:Inter,Arial,sans-serif;background:#fff}.inner{padding:10.5mm 12mm}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:6px}header div{font-size:var(--resolvedMetaSize)}h2{letter-spacing:.09em;margin:8px 0 5px;color:#111}`)}},{id:"compact-one-pager",name:"Compact One-Pager",category:"Compact",isAtsFriendly:!0,componentKey:"CompactOnePager",description:"Dense one-page layout for concise resumes.",tags:["compact","ats"],component:({draft:a})=>{let b=a.sectionOrder?.length?a.sectionOrder:y.Nl,c=a.sectionVisibility||{},d={summary:a.summary?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Summary"}),(0,w.jsx)("p",{className:"cv-body text-[14px]",children:a.summary})]}):null,skills:a.skills?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Skills"}),(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.skills.join(" • ")})]}):null,experience:a.experience?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Experience"}),(0,w.jsx)("div",{className:"space-y-2",children:a.experience.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsxs)("div",{className:"text-[14px] font-semibold",children:[a.role||"Role"," \xb7 ",a.company||"Company"]}),(0,w.jsxs)("div",{className:"text-[14px] text-gray-500",children:[a.start," - ",a.end]}),(0,w.jsx)("ul",{className:"mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-600",children:a.bullets?.map((b,c)=>(0,w.jsx)("li",{children:b},`${a.company}-${c}`))})]},`${a.company}-${b}`))})]}):null,education:a.education?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Education"}),(0,w.jsx)("div",{className:"space-y-2 text-[14px] text-gray-600",children:a.education.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("span",{className:"font-semibold",children:a.program||"Program"}),(0,w.jsxs)("span",{children:[" \xb7 ",a.school||"School"]}),(0,w.jsxs)("span",{className:"text-gray-400",children:[" ","(",a.start," - ",a.end,")"]})]},`${a.school}-${b}`))})]}):null,projects:a.projects?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Projects"}),(0,w.jsx)("div",{className:"space-y-2 text-[14px] text-gray-600",children:a.projects.map((a,b)=>(0,w.jsxs)("div",{children:[(0,w.jsx)("span",{className:"font-semibold",children:a.name||"Project"}),a.description?` — ${a.description}`:""]},`${a.name}-${b}`))})]}):null,certifications:a.certifications?.length?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Certifications"}),(0,w.jsx)("div",{className:"space-y-1 text-[14px] text-gray-600",children:a.certifications.map((a,b)=>(0,w.jsxs)("div",{children:[a.name," ",a.year?`(${a.year})`:""]},`${a.name}-${b}`))})]}):null,extras:a.extras?(0,w.jsxs)("section",{children:[(0,w.jsx)("h3",{className:"cv-section-title",children:"Extras"}),(0,w.jsxs)("div",{className:"space-y-1 text-[14px] text-gray-600",children:[a.extras.languages?.length?(0,w.jsxs)("p",{children:["Languages: ",a.extras.languages.join(", ")]}):null,a.extras.interests?.length?(0,w.jsxs)("p",{children:["Interests: ",a.extras.interests.join(", ")]}):null]})]}):null};return(0,w.jsxs)("div",{className:"grid gap-4 p-6 text-[14px]",children:[(0,w.jsxs)("header",{className:"text-center",children:[(0,w.jsx)("h1",{className:"text-2xl font-semibold",children:a.basics.name||"Your Name"}),(0,w.jsx)("p",{className:"text-[14px] text-gray-600",children:a.basics.headline||"Professional Headline"}),(0,w.jsxs)("div",{className:"mt-1 flex flex-wrap justify-center gap-3 text-[14px] text-gray-500",children:[(0,w.jsx)("span",{children:a.basics.email}),(0,w.jsx)("span",{children:a.basics.phone}),(0,w.jsx)("span",{children:a.basics.location})]})]}),(0,w.jsx)("div",{className:"grid gap-4",children:b.map(a=>!1!==c[a]?d[a]:null)})]})},renderHtml:function(a={}){let b=m(a),c=s(b,r(b));return t(b,`<main class="page compactOnePagerLayout"><div class="inner"><header><h1>${k(b.basics.name||"Your Name")}</h1><p>${k(b.basics.headline||"")}</p><p class="muted">${o(b.basics)}</p></header>${c}</div></main>`,`${q}body{background:#f8fafc;font-family:var(--fontFamily)}.inner{padding:10mm 11mm}header{margin-bottom:7px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{margin:7px 0 4px;letter-spacing:.1em;color:#0f172a}.muted{color:#64748b}`)}}],J=I.map(({component:a,renderHtml:b,...c})=>c),K=I.reduce((a,b)=>(a[b.id]=b,a),{})}};
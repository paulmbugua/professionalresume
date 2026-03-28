(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[1898],{10358:(e,t,i)=>{"use strict";i.d(t,{JV:()=>o,Nl:()=>a,dN:()=>c,nN:()=>n});let a=["summary","skills","experience","education","projects","certifications","extras"],s=a.reduce((e,t)=>(e[t]=!0,e),{}),r=new Set(a),n=(e,t=a)=>{let i=Array.isArray(e)?e:[],s=[],n=new Set;return i.forEach(e=>{!r.has(e)||n.has(e)||(n.add(e),s.push(e))}),t.forEach(e=>{n.has(e)||(n.add(e),s.push(e))}),s},o=e=>{let t={...s};return e&&a.forEach(i=>{"boolean"==typeof e[i]&&(t[i]=e[i])}),t},l={"modern-sidebar":{primary:"#0f172a",sidebarBg:"#0f172a",sidebarText:"#f8fafc",accent:"#38bdf8"},"bold-header":{primary:"#0f172a",headerBg:"#0f172a",headerText:"#ffffff",accent:"#38bdf8"},"modern-teal":{primary:"#0f766e",accent:"#0d9488",sectionBg:"#f0fdfa"},"modern-sidebar-blue":{primary:"#1d4ed8",sidebarBg:"#1d4ed8",sidebarText:"#eff6ff",accent:"#93c5fd"}};function c(e){let t=l[e.templateId]||{};return{...e,sectionOrder:n(e.sectionOrder),sectionVisibility:o(e.sectionVisibility),basics:{...e.basics||{},name:e.basics?.name||"",headline:e.basics?.headline||"",email:e.basics?.email||"",phone:e.basics?.phone||"",location:e.basics?.location||"",links:e.basics?.links||[],photoUrl:e.basics?.photoUrl||""},skills:e.skills||[],experience:e.experience||[],education:e.education||[],projects:e.projects||[],certifications:e.certifications||[],extras:{languages:[],interests:[],...e.extras},typography:{baseFontSize:14,h1Size:28,h2Size:13,h3Size:11,bodySize:14,lineHeight:1.48,fontFamily:"Inter, system-ui, Arial",...e.typography||{}},formatting:{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e",...e.formatting||{}},templateTheme:{primary:"#0f172a",...t,...e.templateTheme||{}},richText:{...e.richText||{}},coverLetter:{subject:e.coverLetter?.subject||"",greeting:e.coverLetter?.greeting||"",body:e.coverLetter?.body||"",closing:e.coverLetter?.closing||""},aiMeta:{...e.aiMeta||{}},generationMeta:{...e.generationMeta||{}},meta:{isDemoSeeded:!!e.meta?.isDemoSeeded,hasImportedCv:!!e.meta?.hasImportedCv,importedAt:e.meta?.importedAt,importMode:e.meta?.importMode}}}},43727:(e,t,i)=>{Promise.resolve().then(i.bind(i,66535))},66535:(e,t,i)=>{"use strict";i.r(t),i.d(t,{default:()=>d,renderAtsMinimalHtml:()=>c});var a=i(95155),s=i(12115),r=i(10358),n=i(94258);let o=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),l=e=>(e??"").toString().trim().toLowerCase();function c(e){let t=e.sectionOrder?.length?e.sectionOrder:r.Nl,i=e.sectionVisibility||{},a=e.basics||{},s=[];a.email&&s.push(`<span>${o(a.email)}</span>`),a.phone&&s.push(`<span>${o(a.phone)}</span>`),a.location&&s.push(`<span>${o(a.location)}</span>`);let c=(a.links||[]).filter(e=>(e?.label||e?.url)?.trim()).map((e,t)=>{let i=(e.label||e.url||"").trim(),a=(e.url||"").trim(),s=`${l(a)}|${l(i)}|${t}`;return`<span data-k="${o(s)}">${o(i)}${a?` <span class="muted">(${o(a)})</span>`:""}</span>`}),d={summary:e.summary?.trim()?`<section><h2 class="sec">Summary</h2><p>${o(e.summary)}</p></section>`:"",skills:e.skills?.length?`<section><h2 class="sec">Skills</h2><p>${o(e.skills.join(" • "))}</p></section>`:"",experience:e.experience?.length?`<section>
          <h2 class="sec">Experience</h2>
          <div class="stack">
            ${e.experience.map((e,t)=>{let i=[l(e.company),l(e.role),l(e.start),l(e.end),t].join("|"),a=`${o(e.start||"")}${e.start||e.end?" - ":""}${o(e.end||"")}`.trim(),s=e.bullets?.length?`<ul>
                        ${e.bullets.filter(Boolean).map((e,t)=>`<li data-k="${o(`${i}:b:${t}:${l(e).slice(0,24)}`)}">${o(e)}</li>`).join("")}
                      </ul>`:"";return`<div class="item" data-k="${o(i)}">
                  <div class="row">
                    <div class="strong">${o(e.role||"Role")} \xb7 ${o(e.company||"Company")}</div>
                    <div class="dates">${o(a)}</div>
                  </div>
                  ${e.location?`<div class="muted small">${o(e.location)}</div>`:""}
                  ${s}
                </div>`}).join("")}
          </div>
        </section>`:"",education:e.education?.length?`<section>
          <h2 class="sec">Education</h2>
          <div class="stack">
            ${e.education.map((e,t)=>{let i=[l(e.school),l(e.program),l(e.start),l(e.end),t].join("|"),a=`${o(e.start||"")}${e.start||e.end?" - ":""}${o(e.end||"")}`.trim();return`<div class="item" data-k="${o(i)}">
                  <div class="row">
                    <div class="strong">${o(e.program||"Program")} \xb7 ${o(e.school||"School")}</div>
                    <div class="dates">${o(a)}</div>
                  </div>
                  ${e.details?`<div class="muted">${o(e.details)}</div>`:""}
                </div>`}).join("")}
          </div>
        </section>`:"",projects:e.projects?.length?`<section>
          <h2 class="sec">Projects</h2>
          <div class="stack">
            ${e.projects.map((e,t)=>{let i=[l(e.name),l(e.link),t].join("|"),a=e.bullets?.length?`<ul>
                        ${e.bullets.filter(Boolean).map((e,t)=>`<li data-k="${o(`${i}:b:${t}:${l(e).slice(0,24)}`)}">${o(e)}</li>`).join("")}
                      </ul>`:"";return`<div class="item" data-k="${o(i)}">
                  <div class="row">
                    <div class="strong">${o(e.name||"Project")}</div>
                    <div class="dates">${e.link?`<span class="muted">${o(e.link)}</span>`:""}</div>
                  </div>
                  ${e.description?`<div class="muted">${o(e.description)}</div>`:""}
                  ${a}
                </div>`}).join("")}
          </div>
        </section>`:"",certifications:e.certifications?.length?`<section>
          <h2 class="sec">Certifications</h2>
          <div class="stack">
            ${e.certifications.map((e,t)=>{let i=[l(e.name),l(e.issuer),e.year??"",t].join("|"),a=`${o(e.issuer||"")}${e.year?` • ${o(e.year)}`:""}`.trim();return`<div class="row item" data-k="${o(i)}">
                  <div>${o(e.name||"")}</div>
                  <div class="dates muted">${o(a)}</div>
                </div>`}).join("")}
          </div>
        </section>`:"",extras:e.extras?`<section>
          <h2 class="sec">Extras</h2>
          <div class="muted">
            ${e.extras.languages?.length?`<div><span class="strong">Languages:</span> ${o(e.extras.languages.join(", "))}</div>`:""}
            ${e.extras.interests?.length?`<div><span class="strong">Interests:</span> ${o(e.extras.interests.join(", "))}</div>`:""}
          </div>
        </section>`:""},m=t.map(e=>!1!==i[e]?d[e]:"").filter(Boolean).join("\n"),p=`<!doctype html>
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
      <h1>${o(a.name||"Your Name")}</h1>
      <div class="headline">${o(a.headline||"Professional Headline")}</div>
      <div class="contact">
        ${s.join("")}
        ${c.join("")}
      </div>
    </header>

    ${m}
  </main>
</body>
</html>`;return(0,n.Y)("ats-minimal",p),p}let d=({draft:e})=>{let[t,i]=(0,s.useState)(1100),r=(0,s.useMemo)(()=>{let t=c(e),i=`
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
</script>`;return t.replace("</body>",`${i}</body>`)},[e]);return(0,s.useEffect)(()=>{let e=e=>{let t=e.data;if(!t||!0!==t.__cv_iframe_resize)return;let a=Number(t.height);Number.isFinite(a)&&!(a<=0)&&i(Math.min(Math.max(a+24,900),5e3))};return window.addEventListener("message",e),()=>window.removeEventListener("message",e)},[]),(0,a.jsx)("div",{className:"w-full",children:(0,a.jsx)("iframe",{title:"ATS Minimal",className:"w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"no",srcDoc:r,style:{height:t,width:"100%",border:0}})})}},94258:(e,t,i)=>{"use strict";i.d(t,{L:()=>o,Y:()=>l});let a=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,s=/\son\w+="[^"]*"/gi,r=/\son\w+='[^']*'/gi,n=/\son\w+=([^\s>]+)/gi;function o(e){return e.replace(a,"").replace(s,"").replace(r,"").replace(n,"")}function l(e,t){}}},e=>{e.O(0,[8441,3794,7358],()=>e(e.s=43727)),_N_E=e.O()}]);
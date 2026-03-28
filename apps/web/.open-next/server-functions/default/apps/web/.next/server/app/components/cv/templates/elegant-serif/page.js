(()=>{var a={};a.id=8224,a.ids=[8224],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},1778:(a,b,c)=>{"use strict";c.d(b,{JV:()=>h,Nl:()=>d,dN:()=>j,nN:()=>g});let d=["summary","skills","experience","education","projects","certifications","extras"],e=d.reduce((a,b)=>(a[b]=!0,a),{}),f=new Set(d),g=(a,b=d)=>{let c=Array.isArray(a)?a:[],e=[],g=new Set;return c.forEach(a=>{!f.has(a)||g.has(a)||(g.add(a),e.push(a))}),b.forEach(a=>{g.has(a)||(g.add(a),e.push(a))}),e},h=a=>{let b={...e};return a&&d.forEach(c=>{"boolean"==typeof a[c]&&(b[c]=a[c])}),b},i={"modern-sidebar":{primary:"#0f172a",sidebarBg:"#0f172a",sidebarText:"#f8fafc",accent:"#38bdf8"},"bold-header":{primary:"#0f172a",headerBg:"#0f172a",headerText:"#ffffff",accent:"#38bdf8"},"modern-teal":{primary:"#0f766e",accent:"#0d9488",sectionBg:"#f0fdfa"},"modern-sidebar-blue":{primary:"#1d4ed8",sidebarBg:"#1d4ed8",sidebarText:"#eff6ff",accent:"#93c5fd"}};function j(a){let b=i[a.templateId]||{};return{...a,sectionOrder:g(a.sectionOrder),sectionVisibility:h(a.sectionVisibility),basics:{...a.basics||{},name:a.basics?.name||"",headline:a.basics?.headline||"",email:a.basics?.email||"",phone:a.basics?.phone||"",location:a.basics?.location||"",links:a.basics?.links||[],photoUrl:a.basics?.photoUrl||""},skills:a.skills||[],experience:a.experience||[],education:a.education||[],projects:a.projects||[],certifications:a.certifications||[],extras:{languages:[],interests:[],...a.extras},typography:{baseFontSize:14,h1Size:28,h2Size:13,h3Size:11,bodySize:14,lineHeight:1.48,fontFamily:"Inter, system-ui, Arial",...a.typography||{}},formatting:{textColor:"#0f172a",mutedTextColor:"#475569",linkColor:"#0f766e",...a.formatting||{}},templateTheme:{primary:"#0f172a",...b,...a.templateTheme||{}},richText:{...a.richText||{}},coverLetter:{subject:a.coverLetter?.subject||"",greeting:a.coverLetter?.greeting||"",body:a.coverLetter?.body||"",closing:a.coverLetter?.closing||""},aiMeta:{...a.aiMeta||{}},generationMeta:{...a.generationMeta||{}},meta:{isDemoSeeded:!!a.meta?.isDemoSeeded,hasImportedCv:!!a.meta?.hasImportedCv,importedAt:a.meta?.importedAt,importMode:a.meta?.importMode}}}},1932:a=>{"use strict";a.exports=require("url")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},12412:a=>{"use strict";a.exports=require("assert")},17891:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/get-segment-param")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},21820:a=>{"use strict";a.exports=require("os")},26548:(a,b,c)=>{"use strict";c.d(b,{L:()=>h,Y:()=>i});let d=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,e=/\son\w+="[^"]*"/gi,f=/\son\w+='[^']*'/gi,g=/\son\w+=([^\s>]+)/gi;function h(a){return a.replace(d,"").replace(e,"").replace(f,"").replace(g,"")}function i(a,b){}},26713:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/is-bot")},27910:a=>{"use strict";a.exports=require("stream")},28354:a=>{"use strict";a.exports=require("util")},29021:a=>{"use strict";a.exports=require("fs")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31829:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>k,renderAtsMinimalHtml:()=>j});var d=c(48249),e=c(67484),f=c(1778),g=c(26548);let h=a=>String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),i=a=>(a??"").toString().trim().toLowerCase();function j(a){let b=a.sectionOrder?.length?a.sectionOrder:f.Nl,c=a.sectionVisibility||{},d=a.basics||{},e=[];d.email&&e.push(`<span>${h(d.email)}</span>`),d.phone&&e.push(`<span>${h(d.phone)}</span>`),d.location&&e.push(`<span>${h(d.location)}</span>`);let j=(d.links||[]).filter(a=>(a?.label||a?.url)?.trim()).map((a,b)=>{let c=(a.label||a.url||"").trim(),d=(a.url||"").trim(),e=`${i(d)}|${i(c)}|${b}`;return`<span data-k="${h(e)}">${h(c)}${d?` <span class="muted">(${h(d)})</span>`:""}</span>`}),k={summary:a.summary?.trim()?`<section><h2 class="sec">Summary</h2><p>${h(a.summary)}</p></section>`:"",skills:a.skills?.length?`<section><h2 class="sec">Skills</h2><p>${h(a.skills.join(" • "))}</p></section>`:"",experience:a.experience?.length?`<section>
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
</script>`;return b.replace("</body>",`${c}</body>`)},[a]);return(0,e.useEffect)(()=>{let a=a=>{let b=a.data;if(!b||!0!==b.__cv_iframe_resize)return;let d=Number(b.height);Number.isFinite(d)&&!(d<=0)&&c(Math.min(Math.max(d+24,900),5e3))};return window.addEventListener("message",a),()=>window.removeEventListener("message",a)},[]),(0,d.jsx)("div",{className:"w-full",children:(0,d.jsx)("iframe",{title:"ATS Minimal",className:"w-full rounded-xl border border-gray-200 bg-white",sandbox:"allow-same-origin",scrolling:"no",srcDoc:f,style:{height:b,width:"100%",border:0}})})}},33873:a=>{"use strict";a.exports=require("path")},34631:a=>{"use strict";a.exports=require("tls")},41025:a=>{"use strict";a.exports=require("next/dist/server/app-render/dynamic-access-async-storage.external.js")},43954:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/interception-routes")},46968:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>g});var d=c(5735),e=c(42781),f=c(63912);function g(){return(0,d.jsx)(e.A,{draft:{...f.py,templateId:"elegant-serif"}})}},55511:a=>{"use strict";a.exports=require("crypto")},55591:a=>{"use strict";a.exports=require("https")},58759:(a,b,c)=>{Promise.resolve().then(c.bind(c,56123))},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},70722:a=>{"use strict";a.exports=require("next/dist/shared/lib/invariant-error")},74075:a=>{"use strict";a.exports=require("zlib")},77068:a=>{"use strict";a.exports=require("next/dist/shared/lib/size-limit")},79428:a=>{"use strict";a.exports=require("buffer")},79646:a=>{"use strict";a.exports=require("child_process")},81630:a=>{"use strict";a.exports=require("http")},83997:a=>{"use strict";a.exports=require("tty")},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},89023:(a,b,c)=>{Promise.resolve().then(c.bind(c,31829))},91645:a=>{"use strict";a.exports=require("net")},94735:a=>{"use strict";a.exports=require("events")},98951:(a,b,c)=>{"use strict";c.r(b),c.d(b,{__next_app__:()=>M,handler:()=>O,routeModule:()=>N});var d=c(7553),e=c(84006),f=c(67798),g=c(34775),h=c(99373),i=c(73461),j=c(1020),k=c(26349),l=c(54365),m=c(16023),n=c(63747),o=c(24235),p=c(23938),q=c(261),r=c(66758),s=c(77243),t=c(26713),u=c(37527),v=c(22820),w=c(88216),x=c(47929),y=c(79551),z=c(71797),A=c(89125),B=c(86439),C=c(77068),D=c(27269),E=c(61287),F=c(81494),G=c(70722),H=c(70753),I=c(43954),J=c(17891),K={};for(let a in E)0>["default","__next_app__","routeModule","handler"].indexOf(a)&&(K[a]=()=>E[a]);c.d(b,K);let L={children:["",{children:["components",{children:["cv",{children:["templates",{children:["elegant-serif",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(c.bind(c,46968)),"C:\\projects\\cvpro\\apps\\web\\src\\app\\components\\cv\\templates\\elegant-serif\\page.tsx"]}]},{"global-error":[()=>Promise.resolve().then(c.t.bind(c,95547,23)),"next/dist/client/components/builtin/global-error.js"]},[]]},{"global-error":[()=>Promise.resolve().then(c.t.bind(c,95547,23)),"next/dist/client/components/builtin/global-error.js"]},[]]},{"global-error":[()=>Promise.resolve().then(c.t.bind(c,95547,23)),"next/dist/client/components/builtin/global-error.js"]},[]]},{"global-error":[()=>Promise.resolve().then(c.t.bind(c,95547,23)),"next/dist/client/components/builtin/global-error.js"]},[]]},{layout:[()=>Promise.resolve().then(c.bind(c,76537)),"C:\\projects\\cvpro\\apps\\web\\src\\app\\layout.tsx"],"global-error":[()=>Promise.resolve().then(c.t.bind(c,95547,23)),"next/dist/client/components/builtin/global-error.js"],"not-found":[()=>Promise.resolve().then(c.t.bind(c,55091,23)),"next/dist/client/components/builtin/not-found.js"],forbidden:[()=>Promise.resolve().then(c.t.bind(c,45270,23)),"next/dist/client/components/builtin/forbidden.js"],unauthorized:[()=>Promise.resolve().then(c.t.bind(c,28193,23)),"next/dist/client/components/builtin/unauthorized.js"]},[]]}.children,M={require:c,loadChunk:()=>Promise.resolve()},N=new d.AppPageRouteModule({definition:{kind:e.RouteKind.APP_PAGE,page:"/components/cv/templates/elegant-serif/page",pathname:"/components/cv/templates/elegant-serif",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:L},distDir:".next",relativeProjectDir:""});async function O(a,b,d){var K,P,Q,R,S;d.requestMeta&&(0,h.setRequestMeta)(a,d.requestMeta),N.isDev&&(0,h.addRequestMeta)(a,"devRequestTimingInternalsEnd",process.hrtime.bigint());let T=!!(0,h.getRequestMeta)(a,"minimalMode"),U="/components/cv/templates/elegant-serif/page";"/index"===U&&(U="/");let V=await N.prepare(a,b,{srcPage:U,multiZoneDraftMode:!1});if(!V)return b.statusCode=400,b.end("Bad Request"),null==d.waitUntil||d.waitUntil.call(d,Promise.resolve()),null;let{buildId:W,query:X,params:Y,pageIsDynamic:Z,buildManifest:$,nextFontManifest:_,reactLoadableManifest:aa,serverActionsManifest:ab,clientReferenceManifest:ac,subresourceIntegrityManifest:ad,prerenderManifest:ae,isDraftMode:af,resolvedPathname:ag,revalidateOnlyGenerated:ah,routerServerContext:ai,nextConfig:aj,parsedUrl:ak,interceptionRoutePatterns:al,deploymentId:am,clientAssetToken:an}=V,ao=(0,q.normalizeAppPath)(U),{isOnDemandRevalidate:ap}=V,aq=aj.experimental.ppr&&!aj.cacheComponents&&(0,I.isInterceptionRouteAppPath)(ag)?null:N.match(ag,ae),ar=(null==aq?void 0:aq.route)??null,as=!!ae.routes[ag],at=a.headers["user-agent"]||"",au=(0,t.getBotType)(at),av=(0,p.isHtmlBotRequest)(a),aw=(0,h.getRequestMeta)(a,"isPrefetchRSCRequest")??"1"===a.headers[s.NEXT_ROUTER_PREFETCH_HEADER],ax=(0,h.getRequestMeta)(a,"isRSCRequest")??!!a.headers[s.RSC_HEADER],ay=(0,r.getIsPossibleServerAction)(a),az=(0,m.checkIsAppPPREnabled)(aj.experimental.ppr),aA=a.headers[x.NEXT_RESUME_STATE_LENGTH_HEADER];if(!(0,h.getRequestMeta)(a,"postponed")&&T&&az&&ay&&aA&&"string"==typeof aA){let e=parseInt(aA,10),{maxPostponedStateSize:f,maxPostponedStateSizeBytes:g}=(0,D.getMaxPostponedStateSize)(aj.experimental.maxPostponedStateSize);if(!isNaN(e)&&e>0){if(e>g)return b.statusCode=413,b.end((0,D.getPostponedStateExceededErrorMessage)(f)),null==d.waitUntil||d.waitUntil.call(d,Promise.resolve()),null;let i="1 MB",j=(null==(S=aj.experimental.serverActions)?void 0:S.bodySizeLimit)??i,k=e+(j!==i?c(95726).parse(j):1048576),l=await (0,D.readBodyWithSizeLimit)(a,k);if(null===l)return b.statusCode=413,b.end("Request body exceeded limit. To configure the body size limit for Server Actions, see: https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit"),null==d.waitUntil||d.waitUntil.call(d,Promise.resolve()),null;if(l.length>=e){let b=l.subarray(0,e).toString("utf8");(0,h.addRequestMeta)(a,"postponed",b);let c=l.subarray(e);(0,h.addRequestMeta)(a,"actionBody",c)}else throw Object.defineProperty(Error(`invariant: expected ${e} bytes of postponed state but only received ${l.length} bytes`),"__NEXT_ERROR_CODE",{value:"E979",enumerable:!1,configurable:!0})}}if(!(0,h.getRequestMeta)(a,"postponed")&&az&&"1"===a.headers[x.NEXT_RESUME_HEADER]&&"POST"===a.method){let{maxPostponedStateSize:c,maxPostponedStateSizeBytes:e}=(0,D.getMaxPostponedStateSize)(aj.experimental.maxPostponedStateSize),f=await (0,D.readBodyWithSizeLimit)(a,e);if(null===f)return b.statusCode=413,b.end((0,D.getPostponedStateExceededErrorMessage)(c)),null==d.waitUntil||d.waitUntil.call(d,Promise.resolve()),null;let g=f.toString("utf8");(0,h.addRequestMeta)(a,"postponed",g)}let aB=!0===N.isDev||!0===aj.experimental.exposeTestingApiInProductionBuild,aC=aB&&("1"===a.headers[s.NEXT_INSTANT_PREFETCH_HEADER]||void 0===a.headers[s.RSC_HEADER]&&"string"==typeof a.headers.cookie&&a.headers.cookie.includes(s.NEXT_INSTANT_TEST_COOKIE+"=")),aD=(az||aC)&&((null==(K=ae.routes[ao]??ae.dynamicRoutes[ao])?void 0:K.renderingMode)==="PARTIALLY_STATIC"||aC&&(aB||(null==ai?void 0:ai.experimentalTestProxy)===!0)),aE=aC&&aD,aF=aE&&!0===N.isDev,aG=!1,aH=aD?(0,h.getRequestMeta)(a,"postponed"):void 0,aI=null==(P=ae.routes[ag])?void 0:P.prefetchDataRoute,aJ=aD&&ax&&!aw&&!aI;T&&(aJ=aJ&&!!aH);let aK=(0,h.getRequestMeta)(a,"segmentPrefetchRSCRequest"),aL=(!au||!aD)&&(!at||(0,p.shouldServeStreamingMetadata)(at,aj.htmlLimitedBots)),aM=!!((ar||as||ae.routes[ao])&&!(au&&aD)),aN=aD&&!0===aj.cacheComponents,aO=!0===N.isDev||!aM||"string"==typeof aH||(aN&&(0,h.getRequestMeta)(a,"onCacheEntryV2")?aJ&&!T:aJ),aP=!!au&&aD,aQ=(null==ar?void 0:ar.remainingPrerenderableParams)??[],aR=(null==ar?void 0:ar.fallback)===null&&((null==(Q=ar.fallbackRootParams)?void 0:Q.length)??0)>0,aS=null;if(!af&&aM&&!aO&&!ay&&!aH&&!aJ){let a=aq?"string"==typeof(null==ar?void 0:ar.fallback)?ar.fallback:aq.source:null;if(!0===aj.experimental.partialFallbacks&&a&&(null==ar?void 0:ar.fallbackRouteParams)&&!aR){if(aQ.length>0){let b,c=(b=new Map(aQ.map(a=>[a.paramName,a])),a.split("/").map(a=>{let c=(0,J.getSegmentParam)(a);if(!c)return a;let d=b.get(c.paramName);if(!d)return a;let e=null==Y?void 0:Y[d.paramName];if(!e)return a;let f=Array.isArray(e)?e.map(a=>encodeURIComponent(a)).join("/"):encodeURIComponent(e);return a.replace(function(a){let{repeat:b,optional:c}=(0,J.getParamProperties)(a.paramType);return c?`[[...${a.paramName}]]`:b?`[...${a.paramName}]`:`[${a.paramName}]`}(d),f)}).join("/")||"/");aS=c!==a?c:null}}else aS=ag}let aT=aS;!aT&&(N.isDev||aM&&Z&&(null==ar?void 0:ar.fallbackRouteParams)&&!ay)&&(aT=ag),N.isDev||af||!aM||!ax||aJ||(0,k.d)(a.headers);let aU={...E,tree:L,handler:O,routeModule:N,__next_app__:M};ab&&ac&&(0,o.setManifestsSingleton)({page:U,clientReferenceManifest:ac,serverActionsManifest:ab});let aV=a.method||"GET",aW=(0,g.getTracer)(),aX=aW.getActiveScopeSpan(),aY=!!(null==ai?void 0:ai.isWrappedByNextServer),aZ=!0===aj.experimental.partialFallbacks&&aQ.length>0?(null==ar||null==(R=ar.fallbackRouteParams)?void 0:R.filter(a=>!aQ.some(b=>b.paramName===a.paramName)))??[]:[],a$=async()=>((null==ai?void 0:ai.render404)?await ai.render404(a,b,ak,!1):b.end("This page could not be found"),null);try{let f,k=N.getVaryHeader(ag,al);b.setHeader("Vary",k);let m=async(c,d)=>{let e=new l.NodeNextRequest(a),g=new l.NodeNextResponse(b);return N.render(e,g,d).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let a=aW.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==i.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let d=a.get("next.route");if(d){let a=`${aV} ${d}`;c.setAttributes({"next.route":d,"http.route":d,"next.span_name":a}),c.updateName(a),f&&f!==c&&(f.setAttribute("http.route",d),f.updateName(a))}else c.updateName(`${aV} ${U}`)})},o=(0,h.getRequestMeta)(a,"incrementalCache")||await N.getIncrementalCache(a,aj,ae,T);null==o||o.resetRequestCache(),globalThis.__incrementalCache=o;let p=async({span:e,postponed:f,fallbackRouteParams:g,forceStaticRender:i})=>{let k={query:X,params:Y,page:ao,sharedContext:{buildId:W,deploymentId:am,clientAssetToken:an},serverComponentsHmrCache:(0,h.getRequestMeta)(a,"serverComponentsHmrCache"),fallbackRouteParams:g,renderOpts:{App:()=>null,Document:()=>null,pageConfig:{},ComponentMod:aU,Component:(0,j.T)(aU),params:Y,routeModule:N,page:U,postponed:f,shouldWaitOnAllReady:aP,serveStreamingMetadata:aL,supportsDynamicResponse:"string"==typeof f||aO,buildManifest:$,nextFontManifest:_,reactLoadableManifest:aa,subresourceIntegrityManifest:ad,setCacheStatus:null==ai?void 0:ai.setCacheStatus,setIsrStatus:null==ai?void 0:ai.setIsrStatus,setReactDebugChannel:null==ai?void 0:ai.setReactDebugChannel,sendErrorsToBrowser:null==ai?void 0:ai.sendErrorsToBrowser,dir:c(33873).join(process.cwd(),N.relativeProjectDir),isDraftMode:af,botType:au,isOnDemandRevalidate:ap,isPossibleServerAction:ay,assetPrefix:aj.assetPrefix,nextConfigOutput:aj.output,crossOrigin:aj.crossOrigin,trailingSlash:aj.trailingSlash,images:aj.images,previewProps:ae.preview,enableTainting:aj.experimental.taint,htmlLimitedBots:aj.htmlLimitedBots,reactMaxHeadersLength:aj.reactMaxHeadersLength,multiZoneDraftMode:!1,incrementalCache:o,cacheLifeProfiles:aj.cacheLife,basePath:aj.basePath,serverActions:aj.experimental.serverActions,logServerFunctions:"object"==typeof aj.logging&&!!aj.logging.serverFunctions,...aE||aF||aG?{isBuildTimePrerendering:!0,supportsDynamicResponse:!1,isStaticGeneration:!0,isDebugDynamicAccesses:aF}:{},cacheComponents:!!aj.cacheComponents,experimental:{isRoutePPREnabled:aD,expireTime:aj.expireTime,staleTimes:aj.experimental.staleTimes,dynamicOnHover:!!aj.experimental.dynamicOnHover,optimisticRouting:!!aj.experimental.optimisticRouting,inlineCss:!!aj.experimental.inlineCss,prefetchInlining:aj.experimental.prefetchInlining??!1,authInterrupts:!!aj.experimental.authInterrupts,cachedNavigations:!!aj.experimental.cachedNavigations,clientTraceMetadata:aj.experimental.clientTraceMetadata||[],clientParamParsingOrigins:aj.experimental.clientParamParsingOrigins,maxPostponedStateSizeBytes:(0,C.parseMaxPostponedStateSize)(aj.experimental.maxPostponedStateSize)},waitUntil:d.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:()=>{},onInstrumentationRequestError:(b,c,d,e)=>N.onRequestError(a,b,d,e,ai),err:(0,h.getRequestMeta)(a,"invokeError")}};i&&(k.renderOpts.supportsDynamicResponse=!1);let l=await m(e,k),{metadata:n}=l,{cacheControl:p,headers:q={},fetchTags:r,fetchMetrics:s}=n;if(r&&(q[x.NEXT_CACHE_TAGS_HEADER]=r),a.fetchMetrics=s,aM&&(null==p?void 0:p.revalidate)===0&&!N.isDev&&!aD){let a=n.staticBailoutInfo,b=Object.defineProperty(Error(`Page changed from static to dynamic at runtime ${ag}${(null==a?void 0:a.description)?`, reason: ${a.description}`:""}
see more here https://nextjs.org/docs/messages/app-static-to-dynamic-error`),"__NEXT_ERROR_CODE",{value:"E132",enumerable:!1,configurable:!0});if(null==a?void 0:a.stack){let c=a.stack;b.stack=b.message+c.substring(c.indexOf("\n"))}throw b}return{value:{kind:u.CachedRouteKind.APP_PAGE,html:l,headers:q,rscData:n.flightData,postponed:n.postponed,status:n.statusCode,segmentData:n.segmentData},cacheControl:p}},q=async({hasResolved:c,previousCacheEntry:f,isRevalidating:g,span:i,forceStaticRender:j=!1})=>{let k,l=!1===N.isDev,m=c||b.writableEnded;if(ap&&ah&&!f&&!T)return(null==ai?void 0:ai.render404)?await ai.render404(a,b):(b.statusCode=404,b.end("This page could not be found")),null;if(ar&&(k=(0,v.parseFallbackField)(ar.fallback)),!0===aj.experimental.partialFallbacks&&(null==ar?void 0:ar.fallback)===null&&!aR&&aQ.length>0&&(k=v.FallbackMode.PRERENDER),k===v.FallbackMode.PRERENDER&&(0,t.isBot)(at)&&(!aD||av)&&(k=v.FallbackMode.BLOCKING_STATIC_RENDER),(null==f?void 0:f.isStale)===-1&&(ap=!0),ap&&(k!==v.FallbackMode.NOT_FOUND||f)&&(k=v.FallbackMode.BLOCKING_STATIC_RENDER),!T&&k!==v.FallbackMode.BLOCKING_STATIC_RENDER&&aT&&!m&&!af&&Z&&(l||!as)){if((l||ar)&&k===v.FallbackMode.NOT_FOUND){if(aj.adapterPath)return await a$();throw new B.NoFallbackError}if(aD&&(aj.cacheComponents?!aJ:!ax)){let b=l&&"string"==typeof(null==ar?void 0:ar.fallback)?ar.fallback:ao,f=(l||aE)&&(null==ar?void 0:ar.fallbackRouteParams)?(0,n.createOpaqueFallbackRouteParams)(ar.fallbackRouteParams):aG?(0,n.getFallbackRouteParams)(ao,N):null;aE&&f&&(0,h.addRequestMeta)(a,"fallbackParams",f);let g=await N.handleResponse({cacheKey:b,req:a,nextConfig:aj,routeKind:e.RouteKind.APP_PAGE,isFallback:!0,prerenderManifest:ae,isRoutePPREnabled:aD,responseGenerator:async()=>p({span:i,postponed:void 0,fallbackRouteParams:f,forceStaticRender:!0}),waitUntil:d.waitUntil,isMinimalMode:T});if(null===g)return null;if(g)return T||!aD||!(aQ.length>0)||!0!==aj.experimental.partialFallbacks||!aS||!o||ap||aG||aB||aC||aw||(0,H.scheduleOnNextTick)(async()=>{let b=N.getResponseCache(a);try{await b.revalidate(aS,o,aD,!1,a=>p({span:a.span,postponed:void 0,fallbackRouteParams:aZ.length>0?(0,n.createOpaqueFallbackRouteParams)(aZ):null,forceStaticRender:!0}),null,c,d.waitUntil)}catch(a){console.error("Error revalidating the page in the background",a)}}),delete g.cacheControl,g}}let r=ap||g||!aH?void 0:aH;if(aN&&!T&&o&&(aJ||ay)&&!j){let b=await o.get(ag,{kind:u.IncrementalCacheKind.APP_PAGE,isRoutePPREnabled:!0,isFallback:!1});b&&b.value&&b.value.kind===u.CachedRouteKind.APP_PAGE&&(r=b.value.postponed,b&&(-1===b.isStale||!0===b.isStale)&&(0,H.scheduleOnNextTick)(async()=>{let b=N.getResponseCache(a);try{await b.revalidate(ag,o,aD,!1,a=>q({...a,forceStaticRender:!0}),null,c,d.waitUntil)}catch(a){console.error("Error revalidating the page in the background",a)}}))}if((aE||aF)&&void 0!==r)return{cacheControl:{revalidate:1,expire:void 0},value:{kind:u.CachedRouteKind.PAGES,html:w.default.EMPTY,pageData:{},headers:void 0,status:void 0}};let s=(l&&(0,h.getRequestMeta)(a,"renderFallbackShell")||aE&&!as)&&(null==ar?void 0:ar.fallbackRouteParams)?(0,n.createOpaqueFallbackRouteParams)(ar.fallbackRouteParams):aG?(0,n.getFallbackRouteParams)(ao,N):null;if((l||aE)&&aj.cacheComponents&&!as&&(null==ar?void 0:ar.fallbackRouteParams)){let b=(0,n.createOpaqueFallbackRouteParams)(ar.fallbackRouteParams);b&&(0,h.addRequestMeta)(a,"fallbackParams",b)}return p({span:i,postponed:r,fallbackRouteParams:s,forceStaticRender:j})},r=async c=>{var f,g,i,j,k;let l,m=await N.handleResponse({cacheKey:aS,responseGenerator:a=>q({span:c,...a}),routeKind:e.RouteKind.APP_PAGE,isOnDemandRevalidate:ap,isRoutePPREnabled:aD,req:a,nextConfig:aj,prerenderManifest:ae,waitUntil:d.waitUntil,isMinimalMode:T});if(af&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate"),N.isDev&&b.setHeader("Cache-Control","no-cache, must-revalidate"),!m){if(aS)throw Object.defineProperty(Error("invariant: cache entry required but not generated"),"__NEXT_ERROR_CODE",{value:"E62",enumerable:!1,configurable:!0});return null}if((null==(f=m.value)?void 0:f.kind)!==u.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant app-page handler received invalid cache entry ${null==(i=m.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E707",enumerable:!1,configurable:!0});let n="string"==typeof m.value.postponed;ax&&!ay&&am&&b.setHeader(x.NEXT_NAV_DEPLOYMENT_ID_HEADER,am),aM&&!aJ&&(!n||aw)&&(T||b.setHeader("x-nextjs-cache",ap?"REVALIDATED":m.isMiss?"MISS":m.isStale?"STALE":"HIT"),b.setHeader(s.NEXT_IS_PRERENDER_HEADER,"1"));let{value:o}=m;if(aH)l={revalidate:0,expire:void 0};else if(aJ)l={revalidate:0,expire:void 0};else if(!N.isDev)if(af)l={revalidate:0,expire:void 0};else if(aM){if(m.cacheControl)if("number"==typeof m.cacheControl.revalidate){if(m.cacheControl.revalidate<1)throw Object.defineProperty(Error(`Invalid revalidate configuration provided: ${m.cacheControl.revalidate} < 1`),"__NEXT_ERROR_CODE",{value:"E22",enumerable:!1,configurable:!0});l={revalidate:m.cacheControl.revalidate,expire:(null==(j=m.cacheControl)?void 0:j.expire)??aj.expireTime}}else l={revalidate:x.CACHE_ONE_YEAR_SECONDS,expire:void 0}}else b.getHeader("Cache-Control")||(l={revalidate:0,expire:void 0});if(m.cacheControl=l,"string"==typeof aK&&(null==o?void 0:o.kind)===u.CachedRouteKind.APP_PAGE&&o.segmentData){b.setHeader(s.NEXT_DID_POSTPONE_HEADER,"2");let c=null==(k=o.headers)?void 0:k[x.NEXT_CACHE_TAGS_HEADER];T&&aM&&c&&"string"==typeof c&&b.setHeader(x.NEXT_CACHE_TAGS_HEADER,c);let d=o.segmentData.get(aK);return void 0!==d?(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:w.default.fromStatic(d,s.RSC_CONTENT_TYPE_HEADER),cacheControl:m.cacheControl}):(b.statusCode=204,(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:w.default.EMPTY,cacheControl:m.cacheControl}))}let r=aN?(0,h.getRequestMeta)(a,"onCacheEntryV2")??(0,h.getRequestMeta)(a,"onCacheEntry"):(0,h.getRequestMeta)(a,"onCacheEntry");if(r&&await r(m,{url:(0,h.getRequestMeta)(a,"initURL")??a.url}))return null;if(o.headers){let a={...o.headers};for(let[c,d]of(T&&aM||delete a[x.NEXT_CACHE_TAGS_HEADER],Object.entries(a)))if(void 0!==d)if(Array.isArray(d))for(let a of d)b.appendHeader(c,a);else"number"==typeof d&&(d=d.toString()),b.appendHeader(c,d)}let t=null==(g=o.headers)?void 0:g[x.NEXT_CACHE_TAGS_HEADER];if(T&&aM&&t&&"string"==typeof t&&b.setHeader(x.NEXT_CACHE_TAGS_HEADER,t),!o.status||ax&&aD||(b.statusCode=o.status),!T&&o.status&&F.RedirectStatusCode[o.status]&&ax&&(b.statusCode=200),n&&!aJ&&b.setHeader(s.NEXT_DID_POSTPONE_HEADER,"1"),ax&&!af){if(void 0===o.rscData){if(o.html.contentType!==s.RSC_CONTENT_TYPE_HEADER)if(aj.cacheComponents)return b.statusCode=404,(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:w.default.EMPTY,cacheControl:m.cacheControl});else throw Object.defineProperty(new G.InvariantError(`Expected RSC response, got ${o.html.contentType}`),"__NEXT_ERROR_CODE",{value:"E789",enumerable:!1,configurable:!0});return(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:o.html,cacheControl:m.cacheControl})}return(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:w.default.fromStatic(o.rscData,s.RSC_CONTENT_TYPE_HEADER),cacheControl:m.cacheControl})}let v=o.html;if(aC&&aE){let c=!0===N.isDev?crypto.randomUUID():null;return v.pipeThrough((0,z.createInstantTestScriptInsertionTransformStream)(c)),(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:v,cacheControl:{revalidate:0,expire:void 0}})}if(!n||T||ax)return(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:v,cacheControl:m.cacheControl});if(aE||aF)return v.push(new ReadableStream({start(a){a.enqueue(y.ENCODED_TAGS.CLOSED.BODY_AND_HTML),a.close()}})),(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:v,cacheControl:{revalidate:0,expire:void 0}});let B=new TransformStream;return v.push(B.readable),p({span:c,postponed:o.postponed,fallbackRouteParams:null,forceStaticRender:!1}).then(async a=>{var b,c;if(!a)throw Object.defineProperty(Error("Invariant: expected a result to be returned"),"__NEXT_ERROR_CODE",{value:"E463",enumerable:!1,configurable:!0});if((null==(b=a.value)?void 0:b.kind)!==u.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant: expected a page response, got ${null==(c=a.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E305",enumerable:!1,configurable:!0});await a.value.html.pipeTo(B.writable)}).catch(a=>{B.writable.abort(a).catch(a=>{console.error("couldn't abort transformer",a)})}),(0,A.sendRenderResult)({req:a,res:b,generateEtags:aj.generateEtags,poweredByHeader:aj.poweredByHeader,result:v,cacheControl:{revalidate:0,expire:void 0}})};if(!aY||!aX)return f=aW.getActiveScopeSpan(),await aW.withPropagatedContext(a.headers,()=>aW.trace(i.BaseServerSpan.handleRequest,{spanName:`${aV} ${U}`,kind:g.SpanKind.SERVER,attributes:{"http.method":aV,"http.target":a.url}},r),void 0,!aY);await r(aX)}catch(b){throw b instanceof B.NoFallbackError||await N.onRequestError(a,b,{routerKind:"App Router",routePath:U,routeType:"render",revalidateReason:(0,f.c)({isStaticGeneration:aM,isOnDemandRevalidate:ap})},!1,ai),b}}}};var b=require("../../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[2179,8636,5806,3912],()=>b(b.s=98951));module.exports=c})();
const STYLE_ID = 'cv-smart-pagination';
const SCRIPT_ID = 'cv-smart-pagination-runtime';

export const smartPaginationCss = `
<style id="${STYLE_ID}">
:root{--cv-a4-height:297mm;--cv-a4-width:210mm;--cv-bottom-safe-area:8mm}
.page{width:var(--cv-a4-width);min-height:var(--cv-a4-height);position:relative}
section{break-before:auto;page-break-before:auto;break-inside:auto;page-break-inside:auto}
section>h2,.cv-keep-with-next{break-after:avoid-page;page-break-after:avoid}
.cv-entry-heading{break-inside:avoid-page;page-break-inside:avoid;break-after:avoid-page;page-break-after:avoid}
.cv-entry--splittable{break-inside:auto;page-break-inside:auto}
.cv-entry--compact,.cv-compact-block{break-inside:avoid-page;page-break-inside:avoid}
.cv-balance-forward{break-before:page;page-break-before:always}
.cv-entry--splittable>ul{break-inside:auto;page-break-inside:auto}
.cv-entry--splittable>ul>li{break-inside:avoid-page;page-break-inside:avoid;orphans:2;widows:2}
p,li{orphans:2;widows:2}
body.cv-layout-compact{--resolvedSectionGap:max(6px,calc(var(--resolvedSectionGap) - 2px));--resolvedItemGap:max(3px,calc(var(--resolvedItemGap) - 1.5px))}
.cv-page-boundary,.cv-layout-debug-label,.cv-pagination-spacer{display:none}
.cv-paginated-page{height:var(--cv-a4-height)!important;min-height:var(--cv-a4-height)!important;overflow:hidden!important;break-after:page;page-break-after:always}
.cv-paginated-page:last-of-type{break-after:auto;page-break-after:auto}
.cv-paginated-page>aside.sidebar{height:100%!important;min-height:100%!important}
.cv-paginated-page>.content{height:100%!important;min-height:0!important;overflow:hidden!important}
@media screen{
  .cv-pagination-spacer{display:block;width:100%;pointer-events:none}
  .cv-page-boundary{display:block;position:absolute;z-index:50;left:0;right:0;height:0;border-top:2px solid rgba(15,23,42,.24);pointer-events:none}
  .cv-page-boundary:after{content:'Page ' attr(data-page) ' starts';position:absolute;right:8px;top:3px;padding:2px 6px;border-radius:3px;background:rgba(15,23,42,.82);color:#fff;font:600 10px/1.3 Arial,sans-serif;letter-spacing:0}
  body:not(.cv-layout-debug) .cv-page-boundary:after{display:none}
  .cv-layout-debug-label{display:block;position:absolute;z-index:60;right:8px;padding:3px 6px;border-radius:3px;background:#111827;color:#fff;font:600 10px/1.3 Arial,sans-serif;letter-spacing:0;pointer-events:none}
  body.cv-layout-debug section,body.cv-layout-debug article{outline:1px dashed rgba(234,88,12,.38);outline-offset:1px}
}
@media print{
  .page{width:210mm!important;min-height:297mm!important;margin:0!important;box-shadow:none!important;overflow:visible!important}
  .cv-page-boundary,.cv-layout-debug-label,.cv-pagination-spacer{display:none!important}
}
</style>`;

export function buildSmartPaginationScript({ debug = false, notifyParent = false } = {}) {
  return `<script id="${SCRIPT_ID}">
(function(){
  var debug=${debug ? 'true' : 'false'};
  var notifyParent=${notifyParent ? 'true' : 'false'};
  function pagePixels(){
    var probe=document.createElement('div');
    probe.style.cssText='position:absolute;visibility:hidden;height:297mm;width:1px;pointer-events:none';
    document.body.appendChild(probe);
    var pixels=probe.getBoundingClientRect().height;
    probe.remove();
    return pixels||1122.519685;
  }
  function logicalBlocks(root){
    var selectors='header,.matrixSkills,.summaryBand,section>h2,section>article,section>p,section>ul,section>.item';
    return Array.prototype.slice.call(root.querySelectorAll(selectors)).filter(function(el){
      return el.offsetParent!==null&&!el.closest('.cv-layout-debug-label');
    });
  }
  function measure(root,pageHeight){
    var rootRect=root.getBoundingClientRect();
    var blocks=logicalBlocks(root);
    var contentHeight=Math.max(root.scrollHeight,rootRect.height);
    var pages=Math.max(1,Math.ceil((contentHeight-1)/pageHeight));
    var used=new Array(pages).fill(0);
    blocks.forEach(function(block){
      var rect=block.getBoundingClientRect();
      var top=Math.max(0,rect.top-rootRect.top);
      var bottom=Math.max(top,rect.bottom-rootRect.top);
      var first=Math.max(0,Math.floor(top/pageHeight));
      var last=Math.min(pages-1,Math.floor(Math.max(top,bottom-1)/pageHeight));
      for(var page=first;page<=last;page+=1){
        var localBottom=Math.min(pageHeight,bottom-page*pageHeight);
        if(localBottom>used[page]) used[page]=localBottom;
      }
    });
    var utilization=used.map(function(value){return Math.max(0,Math.min(100,(value/pageHeight)*100));});
    return {pageCount:pages,pageHeightPx:pageHeight,usedPx:used,utilization:utilization,contentHeightPx:contentHeight};
  }
  function clearDecorations(root){
    root.querySelectorAll('.cv-page-boundary,.cv-layout-debug-label').forEach(function(node){node.remove();});
  }
  function elementUsedHeight(container){
    var containerRect=container.getBoundingClientRect();
    var children=Array.prototype.slice.call(container.children).filter(function(node){return !node.classList.contains('cv-page-boundary')&&!node.classList.contains('cv-layout-debug-label');});
    if(!children.length) return 0;
    var bottom=Math.max.apply(null,children.map(function(node){return node.getBoundingClientRect().bottom;}));
    var style=getComputedStyle(container);
    return Math.max(0,bottom-containerRect.top+(parseFloat(style.paddingBottom)||0));
  }
  function paginateSidebar(root,pageHeight){
    var templateId=String(document.body.dataset.templateId||'');
    if(['modern-sidebar','modern-sidebar-blue','executive-navy-orange'].indexOf(templateId)===-1) return null;
    var sourceAside=root.querySelector(':scope > aside.sidebar');
    var sourceContent=root.querySelector(':scope > .content');
    if(!sourceAside||!sourceContent||root.scrollHeight<=pageHeight+2) return null;
    var sourceSections=Array.prototype.slice.call(sourceContent.children).filter(function(node){return node.tagName==='SECTION';});
    var pages=[];
    function createPage(first){
      var page=root.cloneNode(false);
      page.removeAttribute('style');
      page.classList.add('cv-paginated-page');
      var aside=sourceAside.cloneNode(first);
      if(!first) aside.replaceChildren();
      var content=sourceContent.cloneNode(false);
      page.appendChild(aside);
      page.appendChild(content);
      root.parentNode.insertBefore(page,root);
      var state={page:page,content:content,section:null};
      pages.push(state);
      return state;
    }
    function fits(state){return state.content.scrollHeight<=state.content.clientHeight+1;}
    function openSection(state,source,index,withHeading){
      var section=source.cloneNode(false);
      section.dataset.cvSourceSection=String(index);
      if(withHeading){
        var heading=source.querySelector(':scope > h2');
        if(heading) section.appendChild(heading.cloneNode(true));
      }
      state.content.appendChild(section);
      state.section=section;
      return section;
    }
    var state=createPage(true);
    sourceSections.forEach(function(sourceSection,sectionIndex){
      var children=Array.prototype.slice.call(sourceSection.children);
      var heading=children[0]&&children[0].tagName==='H2'?children.shift():null;
      var sectionStarted=false;
      var destination=openSection(state,sourceSection,sectionIndex,Boolean(heading));
      children.forEach(function(sourceBlock){
        var block=sourceBlock.cloneNode(true);
        destination.appendChild(block);
        if(fits(state)){sectionStarted=true;return;}
        block.remove();
        var canSplit=sourceBlock.classList.contains('cv-entry--splittable')&&sourceBlock.querySelector(':scope > ul > li');
        if(!canSplit){
          if(!sectionStarted&&destination.children.length<=1) destination.remove();
          state=createPage(false);
          destination=openSection(state,sourceSection,sectionIndex,!sectionStarted&&Boolean(heading));
          destination.appendChild(block);
          sectionStarted=true;
          return;
        }
        var entry=sourceBlock.cloneNode(true);
        var list=entry.querySelector(':scope > ul');
        var bullets=Array.prototype.slice.call(list.children);
        list.replaceChildren();
        destination.appendChild(entry);
        if(!fits(state)){
          entry.remove();
          if(!sectionStarted&&destination.children.length<=1) destination.remove();
          state=createPage(false);
          destination=openSection(state,sourceSection,sectionIndex,!sectionStarted&&Boolean(heading));
          destination.appendChild(entry);
        }
        var placed=0;
        bullets.forEach(function(sourceBullet){
          var bullet=sourceBullet.cloneNode(true);
          list.appendChild(bullet);
          if(fits(state)){placed+=1;return;}
          bullet.remove();
          if(placed===0&&entry.parentNode){
            entry.remove();
            state=createPage(false);
            destination=openSection(state,sourceSection,sectionIndex,false);
            destination.appendChild(entry);
            list.appendChild(bullet);
            placed=1;
            return;
          }
          state=createPage(false);
          destination=openSection(state,sourceSection,sectionIndex,false);
          entry=sourceBlock.cloneNode(false);
          entry.classList.add('cv-entry--continuation');
          list=document.createElement('ul');
          entry.appendChild(list);
          destination.appendChild(entry);
          list.appendChild(bullet);
          placed=1;
        });
        if(!list.children.length) list.remove();
        sectionStarted=true;
      });
      if(destination&&destination.children.length===0) destination.remove();
    });
    root.remove();
    if(pages.length>1){
      var last=pages[pages.length-1];
      var previous=pages[pages.length-2];
      var finalRatio=elementUsedHeight(last.content)/last.content.clientHeight;
      if(finalRatio<.35){
        var candidates=Array.prototype.slice.call(previous.content.querySelectorAll('.cv-entry--compact'));
        var candidate=candidates[candidates.length-1];
        if(candidate){
          var sourceIndex=candidate.parentElement&&candidate.parentElement.dataset.cvSourceSection;
          var target=last.content.querySelector('section[data-cv-source-section="'+sourceIndex+'"]');
          if(target){target.insertBefore(candidate,target.querySelector(':scope > h2')?target.children[1]||null:target.firstChild);}
        }
      }
    }
    var used=pages.map(function(page){return elementUsedHeight(page.content);});
    var utilization=pages.map(function(page,index){return Math.max(0,Math.min(100,used[index]/page.content.clientHeight*100));});
    return {pageCount:pages.length,pageHeightPx:pageHeight,usedPx:used,utilization:utilization,contentHeightPx:pages.length*pageHeight,rebalanced:true,explicitPages:true,pages:pages};
  }
  function balanceFinalPage(root,pageHeight,metrics){
    if(metrics.pageCount<2) return null;
    var finalUtilization=metrics.utilization[metrics.utilization.length-1]||0;
    if(finalUtilization>=35) return null;
    var rootRect=root.getBoundingClientRect();
    var previousPage=metrics.pageCount-2;
    var candidates=Array.prototype.slice.call(root.querySelectorAll('.cv-entry--compact,.cv-compact-block')).filter(function(block){
      var rect=block.getBoundingClientRect();
      var top=rect.top-rootRect.top;
      var localTop=top-previousPage*pageHeight;
      var localBottom=rect.bottom-rootRect.top-previousPage*pageHeight;
      return Math.floor(Math.max(0,top)/pageHeight)===previousPage&&localTop>=pageHeight*.75&&localBottom<=pageHeight-8;
    });
    var candidate=candidates[candidates.length-1];
    if(!candidate) return null;
    var candidateTop=candidate.getBoundingClientRect().top-rootRect.top;
    var localTop=candidateTop-previousPage*pageHeight;
    var spacer=document.createElement('div');
    spacer.className='cv-pagination-spacer';
    spacer.style.height=Math.max(0,pageHeight-localTop)+'px';
    spacer.setAttribute('aria-hidden','true');
    candidate.parentNode.insertBefore(spacer,candidate);
    candidate.classList.add('cv-balance-forward');
    return candidate.getAttribute('data-k')||candidate.textContent.trim().slice(0,80);
  }
  function decorate(root,metrics){
    clearDecorations(root);
    for(var page=1;page<metrics.pageCount;page+=1){
      var marker=document.createElement('div');
      marker.className='cv-page-boundary';
      marker.dataset.page=String(page+1);
      marker.style.top=(page*metrics.pageHeightPx)+'px';
      marker.setAttribute('aria-hidden','true');
      root.appendChild(marker);
    }
    if(debug){
      document.body.classList.add('cv-layout-debug');
      metrics.utilization.forEach(function(value,index){
        var label=document.createElement('div');
        label.className='cv-layout-debug-label';
        label.style.top=(index*metrics.pageHeightPx+8)+'px';
        label.textContent='Page '+(index+1)+': '+value.toFixed(1)+'% used';
        label.setAttribute('aria-hidden','true');
        root.appendChild(label);
      });
    }
  }
  function publish(metrics){
    window.__cvPaginationMetrics=metrics;
    window.__cvPaginationDone=true;
    document.documentElement.dataset.cvPaginationDone='true';
    document.documentElement.dataset.cvPageCount=String(metrics.pageCount);
    window.dispatchEvent(new CustomEvent('cv-pagination-ready',{detail:metrics}));
    if(notifyParent&&window.parent!==window){
      try{window.parent.postMessage({__cv_pagination:true,metrics:metrics},'*');}catch(error){}
    }
  }
  async function run(){
    window.__cvPaginationDone=false;
    if(document.fonts&&document.fonts.ready){try{await document.fonts.ready;}catch(error){}}
    var root=document.querySelector('.page');
    if(!root){publish({pageCount:0,pageHeightPx:0,usedPx:[],utilization:[],contentHeightPx:0});return;}
    var pageHeight=pagePixels();
    var sidebarResult=paginateSidebar(root,pageHeight);
    if(sidebarResult){
      sidebarResult.pages.forEach(function(page,index){
        page.page.dataset.cvPageCount=String(sidebarResult.pageCount);
        if(debug){
          document.body.classList.add('cv-layout-debug');
          var label=document.createElement('div');
          label.className='cv-layout-debug-label';
          label.style.top='8px';
          label.textContent='Page '+(index+1)+': '+sidebarResult.utilization[index].toFixed(1)+'% used';
          page.page.appendChild(label);
        }
      });
      delete sidebarResult.pages;
      publish(sidebarResult);
      return;
    }
    var metrics=measure(root,pageHeight);
    var finalUtilization=metrics.utilization[metrics.utilization.length-1]||0;
    if(metrics.pageCount>1&&finalUtilization<35){
      document.body.classList.add('cv-layout-compact');
      await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});});
      metrics=measure(root,pageHeight);
      metrics.rebalanced=true;
    }
    var movedBlock=balanceFinalPage(root,pageHeight,metrics);
    if(movedBlock){
      await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});});
      metrics=measure(root,pageHeight);
      metrics.rebalanced=true;
      metrics.balanceMovedBlock=movedBlock;
    }
    root.style.minHeight=(metrics.pageCount*pageHeight)+'px';
    root.style.height=(metrics.pageCount*pageHeight)+'px';
    var templateId=String(document.body.dataset.templateId||'');
    if(['modern-sidebar','modern-sidebar-blue','executive-navy-orange'].indexOf(templateId)!==-1){
      var sidebar=root.querySelector(':scope > aside.sidebar');
      if(sidebar){
        sidebar.style.minHeight=(metrics.pageCount*pageHeight)+'px';
        sidebar.style.height=(metrics.pageCount*pageHeight)+'px';
      }
    }
    root.style.setProperty('--cv-rendered-page-count',String(metrics.pageCount));
    root.dataset.cvPageCount=String(metrics.pageCount);
    decorate(root,metrics);
    publish(metrics);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();
</script>`;
}

export function injectSmartPagination(html, options = {}) {
  let next = String(html || '');
  if (!next.includes(`id="${STYLE_ID}"`)) {
    next = next.replace('</head>', `${smartPaginationCss}</head>`);
  }
  if (!next.includes(`id="${SCRIPT_ID}"`)) {
    next = next.replace('</body>', `${buildSmartPaginationScript(options)}</body>`);
  }
  return next;
}

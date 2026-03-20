import React, { useEffect, useMemo, useState } from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';
import { logScriptProbe } from '../../../utils/sanitizeHtmlForIframe';

type Props = { draft: CvDraft };

const esc = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeKey = (s?: string | null) => (s ?? '').toString().trim().toLowerCase();

export function renderAtsMinimalHtml(draft: CvDraft) {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;

  const basics = draft.basics || {};

  const contact: string[] = [];
  if (basics.email) contact.push(`<span>${esc(basics.email)}</span>`);
  if (basics.phone) contact.push(`<span>${esc(basics.phone)}</span>`);
  if (basics.location) contact.push(`<span>${esc(basics.location)}</span>`);

  const links = (basics.links || [])
    .filter((l) => (l?.label || l?.url)?.trim())
    .map((l, idx) => {
      const label = (l.label || l.url || '').trim();
      const url = (l.url || '').trim();
      const key = `${safeKey(url)}|${safeKey(label)}|${idx}`;
      return `<span data-k="${esc(key)}">${esc(label)}${
        url ? ` <span class="muted">(${esc(url)})</span>` : ''
      }</span>`;
    });

  const sectionMap: Record<CvSectionKey, string> = {
    summary: draft.summary?.trim()
      ? `<section><h2 class="sec">Summary</h2><p>${esc(draft.summary)}</p></section>`
      : '',

    skills: draft.skills?.length
      ? `<section><h2 class="sec">Skills</h2><p>${esc(draft.skills.join(' • '))}</p></section>`
      : '',

    experience: draft.experience?.length
      ? `<section>
          <h2 class="sec">Experience</h2>
          <div class="stack">
            ${draft.experience
              .map((exp, idx) => {
                const expKey = [
                  safeKey(exp.company),
                  safeKey(exp.role),
                  safeKey(exp.start),
                  safeKey(exp.end),
                  idx,
                ].join('|');

                const dates = `${esc(exp.start || '')}${exp.start || exp.end ? ' - ' : ''}${esc(
                  exp.end || ''
                )}`.trim();

                const bullets = exp.bullets?.length
                  ? `<ul>
                        ${exp.bullets
                          .filter(Boolean)
                          .map(
                            (b, i) =>
                              `<li data-k="${esc(
                                `${expKey}:b:${i}:${safeKey(b).slice(0, 24)}`
                              )}">${esc(b)}</li>`
                          )
                          .join('')}
                      </ul>`
                  : '';

                return `<div class="item" data-k="${esc(expKey)}">
                  <div class="row">
                    <div class="strong">${esc(exp.role || 'Role')} · ${esc(
                      exp.company || 'Company'
                    )}</div>
                    <div class="dates">${esc(dates)}</div>
                  </div>
                  ${exp.location ? `<div class="muted small">${esc(exp.location)}</div>` : ''}
                  ${bullets}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    education: draft.education?.length
      ? `<section>
          <h2 class="sec">Education</h2>
          <div class="stack">
            ${draft.education
              .map((edu, idx) => {
                const eduKey = [
                  safeKey(edu.school),
                  safeKey(edu.program),
                  safeKey(edu.start),
                  safeKey(edu.end),
                  idx,
                ].join('|');

                const dates = `${esc(edu.start || '')}${edu.start || edu.end ? ' - ' : ''}${esc(
                  edu.end || ''
                )}`.trim();

                return `<div class="item" data-k="${esc(eduKey)}">
                  <div class="row">
                    <div class="strong">${esc(edu.program || 'Program')} · ${esc(
                      edu.school || 'School'
                    )}</div>
                    <div class="dates">${esc(dates)}</div>
                  </div>
                  ${edu.details ? `<div class="muted">${esc(edu.details)}</div>` : ''}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    projects: draft.projects?.length
      ? `<section>
          <h2 class="sec">Projects</h2>
          <div class="stack">
            ${draft.projects
              .map((p, idx) => {
                const projKey = [safeKey(p.name), safeKey(p.link), idx].join('|');

                const bullets = p.bullets?.length
                  ? `<ul>
                        ${p.bullets
                          .filter(Boolean)
                          .map(
                            (b, i) =>
                              `<li data-k="${esc(
                                `${projKey}:b:${i}:${safeKey(b).slice(0, 24)}`
                              )}">${esc(b)}</li>`
                          )
                          .join('')}
                      </ul>`
                  : '';

                return `<div class="item" data-k="${esc(projKey)}">
                  <div class="row">
                    <div class="strong">${esc(p.name || 'Project')}</div>
                    <div class="dates">${p.link ? `<span class="muted">${esc(p.link)}</span>` : ''}</div>
                  </div>
                  ${p.description ? `<div class="muted">${esc(p.description)}</div>` : ''}
                  ${bullets}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    certifications: draft.certifications?.length
      ? `<section>
          <h2 class="sec">Certifications</h2>
          <div class="stack">
            ${draft.certifications
              .map((c, idx) => {
                const certKey = [safeKey(c.name), safeKey(c.issuer), c.year ?? '', idx].join('|');
                const rhs = `${esc(c.issuer || '')}${c.year ? ` • ${esc(c.year)}` : ''}`.trim();

                return `<div class="row item" data-k="${esc(certKey)}">
                  <div>${esc(c.name || '')}</div>
                  <div class="dates muted">${esc(rhs)}</div>
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    extras: draft.extras
      ? `<section>
          <h2 class="sec">Extras</h2>
          <div class="muted">
            ${
              draft.extras.languages?.length
                ? `<div><span class="strong">Languages:</span> ${esc(
                    draft.extras.languages.join(', ')
                  )}</div>`
                : ''
            }
            ${
              draft.extras.interests?.length
                ? `<div><span class="strong">Interests:</span> ${esc(
                    draft.extras.interests.join(', ')
                  )}</div>`
                : ''
            }
          </div>
        </section>`
      : '',
  };

  const sections = order
    .map((k) => (isVisible(k) ? sectionMap[k] : ''))
    .filter(Boolean)
    .join('\n');

  const html = `<!doctype html>
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
      <h1>${esc(basics.name || 'Your Name')}</h1>
      <div class="headline">${esc(basics.headline || 'Professional Headline')}</div>
      <div class="contact">
        ${contact.join('')}
        ${links.join('')}
      </div>
    </header>

    ${sections}
  </main>
</body>
</html>`;

  logScriptProbe('ats-minimal', html);
  return html;
}

const AtsMinimal: React.FC<Props> = ({ draft }) => {
  const [iframeHeight, setIframeHeight] = useState<number>(1100);

  const html = useMemo(() => {
    const raw = renderAtsMinimalHtml(draft);

    // ✅ add a tiny autosize script so iframe grows to full content height
    const autosize = `
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
</script>`;

    return raw.replace('</body>', `${autosize}</body>`);
  }, [draft]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data: any = e.data;
      if (!data || data.__cv_iframe_resize !== true) return;
      const next = Number(data.height);
      if (!Number.isFinite(next) || next <= 0) return;
      setIframeHeight(Math.min(Math.max(next + 24, 900), 5000));
    };

    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <div className="w-full">
      <iframe
        title="ATS Minimal"
        className="w-full rounded-xl border border-gray-200 bg-white"
        sandbox="allow-same-origin"
        scrolling="no"
        srcDoc={html}
        style={{ height: iframeHeight, width: '100%', border: 0 }}
      />
    </div>
  );
};

export default AtsMinimal;

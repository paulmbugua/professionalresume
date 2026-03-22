function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nlToBr(value = '') {
  return esc(value).replace(/\n/g, '<br>');
}

export function buildCoverLetterHtml(payload = {}) {
  const {
    applicantName = '',
    applicantEmail = '',
    applicantPhone = '',
    applicantLocation = '',
    recipientName = '',
    companyName = '',
    roleTitle = '',
    letterBody = '',
    closingLine = 'Sincerely,',
  } = payload;

  const contactBits = [applicantEmail, applicantPhone, applicantLocation].filter(Boolean);
  const heading = [recipientName, companyName, roleTitle].filter(Boolean).join(' · ');
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(applicantName || 'Cover Letter')} - Cover Letter</title>
    <style>
      @page { size: A4; margin: 16mm 16mm 18mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; }
      body { font: 14px/1.55 Inter, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .doc { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 16mm 18mm; }
      h1 { font-size: 26px; margin: 0 0 2mm; }
      .meta { color: #475569; font-size: 12px; margin-bottom: 7mm; }
      .heading { margin-bottom: 6mm; color: #1e293b; font-weight: 600; }
      .date { margin-bottom: 6mm; color: #334155; }
      .body { white-space: normal; font-size: 14px; }
      .body p { margin: 0 0 4mm; break-inside: avoid; page-break-inside: avoid; }
      .closing { margin-top: 9mm; }
      @media print {
        body { overflow: visible !important; }
        .doc { margin: 0 !important; width: 210mm !important; min-height: 297mm !important; padding: 16mm 16mm 18mm !important; }
      }
    </style>
  </head>
  <body data-document-kind="cover-letter">
    <main class="doc">
      <h1>${esc(applicantName)}</h1>
      <div class="meta">${esc(contactBits.join(' · '))}</div>
      <div class="date">${esc(date)}</div>
      <div class="heading">${esc(heading)}</div>
      <section class="body">
        ${nlToBr(letterBody || '').split('<br><br>').map((p) => `<p>${p || '&nbsp;'}</p>`).join('')}
      </section>
      <div class="closing">
        <p>${esc(closingLine)}</p>
        <p>${esc(applicantName)}</p>
      </div>
    </main>
  </body>
</html>`;
}

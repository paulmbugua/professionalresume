// apps/backend/services/transcriptService.js
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

/** Cloud name (supports both env names like your cert service) */
const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || '';

async function fetchBufferWithSignedRetry(url, { responseType = 'arraybuffer', timeout = 6000 } = {}) {
  const tryFetch = async (theUrl) =>
    axios.get(theUrl, { responseType, timeout, validateStatus: () => true });

  const first = await tryFetch(url);
  if (first.status === 200) return Buffer.from(first.data);

  if (first.status === 401 || first.status === 403) {
    const cfg = cloudinary.config() || {};
    if (cfg?.api_secret) {
      const u = new URL(url);
      const deliveryPath = u.pathname;
      const token = cloudinary.utils.generate_auth_token({
        start_time: Math.floor(Date.now() / 1000) - 30,
        duration: 300,
        acl: [deliveryPath],
      });
      const sep = u.search ? '&' : '?';
      const signedUrl = `${url}${sep}__cld_token__=${token}`;
      const second = await tryFetch(signedUrl);
      if (second.status === 200) return Buffer.from(second.data);
    }
  }
  return null;
}

async function fetchCloudinaryAsPngBuffer(cloudinaryPublicIdOrUrl, { w, h, q = 'auto' } = {}) {
  if (!cloudinaryPublicIdOrUrl) return null;

  // Accept full URLs too
  if (typeof cloudinaryPublicIdOrUrl === 'string' && cloudinaryPublicIdOrUrl.includes('://')) {
    try {
      const buf = await fetchBufferWithSignedRetry(cloudinaryPublicIdOrUrl, {
        responseType: 'arraybuffer',
        timeout: 6000,
      });
      if (buf) return buf;
    } catch {}
    return null;
  }

  if (!CLOUDINARY_CLOUD_NAME) return null;
  const parts = [];
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  parts.push('c_limit', `q_${q}`, 'f_png');
  const transform = parts.join(',');
  const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${cloudinaryPublicIdOrUrl}.png`;
  try {
    const buf = await fetchBufferWithSignedRetry(url, { responseType: 'arraybuffer', timeout: 6000 });
    return buf;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────
 * Watermarks / layout helpers
 * ───────────────────────────────────────────────────────── */

// Tiny tiled watermark (non-wrapping → never creates extra pages)
function drawTiledWatermarks(
  doc,
  label,
  { angle = -28, fontSize = 8, xGap = 110, yGap = 84, opacity = 0.085 } = {}
) {
  if (!label) return;
  const { width, height } = doc.page;
  doc.save();
  doc.font('Helvetica').fontSize(fontSize).fillColor('#0F172A').opacity(opacity);
  for (let y = -yGap; y < height + yGap; y += yGap) {
    for (let x = -xGap; x < width + xGap; x += xGap) {
      doc.save();
      doc.rotate(angle, { origin: [x, y] });
      // prevent wrapping/flow -> no extra pages
      doc.text(label, x, y, { lineBreak: false, width: 10000 });
      doc.restore();
    }
  }
  doc.restore();
}

function header(doc, brandName, logoPng) {
  if (logoPng) doc.image(logoPng, 48, 38, { width: 60 });
  doc
    .fontSize(18)
    .fillColor('#0F172A')
    .text(brandName || 'EduConnect', 118, 46, { width: 420, align: 'left', lineBreak: false });
  doc
    .moveTo(40, 100)
    .lineTo(555, 100)
    .lineWidth(1.2)
    .strokeColor('#DCE4EE')
    .stroke();
}

function keyValue(doc, k, v, y) {
  const left = 50;
  const right = 310;
  doc.fontSize(11).fillColor('#6B7280').text(k, left, y, { lineBreak: false });
  doc.fontSize(12).fillColor('#111827').text(v, right, y, { lineBreak: false });
}

function letterFromPct(pct) {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

/* ─────────────────────────────────────────────────────────
 * OG preview URL (big SAMPLE word; used only by /:id/og)
 * ───────────────────────────────────────────────────────── */
export function buildTranscriptOgUrl({ cloudName, transcriptId, brandPublicId, student, course }) {
  const safeBrand = (brandPublicId || 'branding/logo').replace(/\//g, ':');
  const t = [
    'pg_1',
    'w_1200,h_630,c_fill',
    'l_text:Arial_160_bold:SAMPLE,g_center,o_35,co_rgb:FFFFFF',
    `l_${safeBrand},w_180,g_north_west,x_40,y_40`,
  ];
  if (student) t.push(`l_text:Arial_48_bold:${encodeURIComponent(student)},g_south_west,x_40,y_120,co_rgb:0D141C`);
  if (course)  t.push(`l_text:Arial_36:${encodeURIComponent(course)},g_south_west,x_40,y_60,co_rgb:49739C`);
   return `https://res.cloudinary.com/${cloudName}/image/upload/${t.join('/')}/transcripts/${transcriptId}.jpg`;

}

/* ─────────────────────────────────────────────────────────
 * Main generator – strictly one page, tiny watermark
 * ───────────────────────────────────────────────────────── */
export async function generateTranscriptPdfBuffer({
  brand = {
    name: process.env.CERT_BRAND_NAME || 'EduConnect',
    logoPublicId: process.env.CERT_LOGO_PUBLIC_ID, // reuse brand logo
  },
  studentName = 'Student',
  studentId,
  courseTitle = 'Course',
  courseId,
  issuedAt = new Date(),
  overallPct = 0,
  passMark = 70,
  sections = [],            // optional: breakdown per quiz/section
  verificationUrl,         // public verify endpoint
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 42 });

  // Preload logo
  const [logoPng] = await Promise.all([
    fetchCloudinaryAsPngBuffer(brand.logoPublicId, { w: 200 }),
  ]);

  // Pre-make QR (optional)
  let qrBuffer = null;
  if (verificationUrl) {
    try {
      qrBuffer = await QRCode.toBuffer(verificationUrl, {
        type: 'png',
        width: 90,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch { /* ignore */ }
  }

  const bufs = [];
  return await new Promise((resolve, reject) => {
    doc.on('data', (b) => bufs.push(b));
    doc.on('end', () => resolve(Buffer.concat(bufs)));
    doc.on('error', reject);

    // Meta
    try {
      doc.info = {
        Title: `Transcript - ${studentName}`,
        Author: brand.name || 'Transcript Generator',
        Subject: `Transcript for ${courseTitle}`,
        Keywords: 'transcript, results',
        Creator: 'TutorApp',
        CreationDate: new Date(),
      };
    } catch {}

    // Light border
    doc.save();
    doc.lineWidth(2).strokeColor('#E5E7EB').roundedRect(32, 32, doc.page.width - 64, doc.page.height - 64, 10).stroke();
    doc.restore();

    // Tiny tiled watermark (safe – won’t create new pages)
    drawTiledWatermarks(doc, `${brand.name || 'EduConnect'} • ${studentName}`);

    // Reset ink/opacity for real content
    doc.save();
    doc.opacity(1).fillColor('#0F172A');

    // Header
    header(doc, brand.name, logoPng);

    // Title/subtitle
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(20)
       .text('Official Transcript', 50, 120, { width: 505, align: 'left', lineBreak: false });
    doc.font('Helvetica').fontSize(12).fillColor('#374151')
       .text('(Preview – watermark removed after payment)', 50, 145, { lineBreak: false });

    // Student/course meta
    const issuedText = (issuedAt instanceof Date ? issuedAt : new Date(issuedAt)).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    let y = 180;
    keyValue(doc, 'Student Name', studentName, y); y += 18;
    keyValue(doc, 'Student ID',   studentId || '—', y); y += 18;
    keyValue(doc, 'Course',       courseTitle, y); y += 18;
    keyValue(doc, 'Course ID',    courseId || '—', y); y += 18;
    keyValue(doc, 'Issued On',    issuedText, y); y += 24;

    // Summary box
    const boxY = y;
    const boxH = 70;
    doc.roundedRect(50, boxY, 505, boxH, 10).fillOpacity(0.06).fill('#16A34A').fillOpacity(1);
    doc.fillColor('#065F46').fontSize(12).text('Final Score', 65, boxY + 14, { lineBreak: false });
    doc.fontSize(26).fillColor('#064E3B').text(`${Math.round(overallPct)}%`, 65, boxY + 34, { lineBreak: false });
    doc.fillColor('#6B7280').fontSize(11).text('Pass Mark', 230, boxY + 14, { lineBreak: false });
    doc.fontSize(18).fillColor('#111827').text(`${Math.round(passMark)}%`, 230, boxY + 34, { lineBreak: false });
    const letter = letterFromPct(overallPct);
    doc.fillColor('#6B7280').fontSize(11).text('Letter Grade', 360, boxY + 14, { lineBreak: false });
    doc.fontSize(18).fillColor('#111827').text(letter, 360, boxY + 34, { lineBreak: false });

    y = boxY + boxH + 24;

    // Detailed breakdown (clamped to one page)
    const BOTTOM_LIMIT = 760; // never go below this; no addPage
    if (Array.isArray(sections) && sections.length) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F172A')
         .text('Detailed Breakdown', 50, y, { lineBreak: false });
      y += 18;

      outer: for (const sec of sections) {
        if (y > BOTTOM_LIMIT) break;
        doc.font('Helvetica').fontSize(12).fillColor('#1F2937')
           .text(sec.sectionTitle || 'Section', 50, y, { lineBreak: false });
        y += 12;

        for (const it of (sec.items || [])) {
          if (y > BOTTOM_LIMIT) { break outer; }
          doc.font('Helvetica').fontSize(11).fillColor('#374151')
             .text(`• ${it.label ?? ''}`, 60, y, { width: 360, lineBreak: false });
          const s = (it.scorePct ?? it.score ?? '') === '' ? '' : `${Math.round(it.scorePct ?? it.score)}%`;
          doc.font('Helvetica').fontSize(11).fillColor('#111827')
             .text(s, 530 - 80, y, { width: 80, align: 'right', lineBreak: false });
          y += 16;
        }
        y += 6;
      }
    }

    // QR (fixed spot, won’t push content)
    if (qrBuffer) {
      const qrX = 60, qrY = 742 - 40;
      doc.image(qrBuffer, qrX, qrY, { width: 80 });
      doc.fontSize(9).fillColor('#6B7280').text('Scan to verify', qrX, qrY + 86, {
        width: 90, align: 'center', lineBreak: false,
      });
    }

    // Footer host/brand line
    const host = (() => { try { return verificationUrl ? new URL(verificationUrl).host : ''; } catch { return ''; } })();
    doc.fontSize(10).fillColor('#6B7280')
       .text(`${brand.name || 'EduConnect'}${host ? ' • ' + host : ''}`, 50, 792, {
         width: 505, align: 'center', lineBreak: false,
       });

    doc.restore();
    doc.end();
  });
}

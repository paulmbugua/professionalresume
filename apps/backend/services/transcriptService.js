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

  if (first.status === 401) {
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

async function fetchCloudinaryAsPngBuffer(cloudinaryPublicId, { w, h, q = 'auto' } = {}) {
  if (!cloudinaryPublicId || !CLOUDINARY_CLOUD_NAME) return null;
  const parts = [];
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  parts.push('c_limit', `q_${q}`, 'f_png');
  const transform = parts.join(',');
  const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${cloudinaryPublicId}.png`;
  try {
    const buf = await fetchBufferWithSignedRetry(url, { responseType: 'arraybuffer', timeout: 6000 });
    return buf;
  } catch {
    return null;
  }
}

function drawWatermark(doc, text) {
  if (!text) return;
  const cx = doc.page.width / 2;
  const cy = doc.page.height / 2;
  doc.save();
  doc.opacity(0.10);
  doc.fillColor('#0F172A');
  doc.rotate(-24, { origin: [cx, cy] });
  doc.fontSize(120).text(text, cx - 360, cy - 60, { width: 720, align: 'center' });
  doc.restore();
}

function header(doc, brandName, logoPng) {
  if (logoPng) doc.image(logoPng, 48, 38, { width: 60 });
  doc
    .fontSize(18)
    .fillColor('#0F172A')
    .text(brandName || 'EduConnect', 118, 46, { width: 420, align: 'left' });
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
  doc.fontSize(11).fillColor('#6B7280').text(k, left, y);
  doc.fontSize(12).fillColor('#111827').text(v, right, y);
}

function letterFromPct(pct) {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

/**
 * Generate a modern “college transcript” PDF -> Buffer.
 * Items: array of { sectionTitle, items: [{ label, scorePct }...] }
 */
export async function generateTranscriptPdfBuffer({
  brand = {
    name: process.env.CERT_BRAND_NAME || 'EduConnect',
    logoPublicId: process.env.CERT_LOGO_PUBLIC_ID, // reuse brand logo
  },
  studentName,
  studentId,
  courseTitle,
  courseId,
  issuedAt = new Date(),
  overallPct = 0,
  passMark = 70,
  sections = [],            // optional: breakdown per quiz/section
  verificationUrl,         // public verify endpoint
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 42 });

  // preload assets
  const [logoPng] = await Promise.all([
    fetchCloudinaryAsPngBuffer(brand.logoPublicId, { w: 200 }),
  ]);

  // QR
  let qrBuffer = null;
  if (verificationUrl) {
    try {
      qrBuffer = await QRCode.toBuffer(verificationUrl, {
        type: 'png',
        width: 110,
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

    // meta
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

    // watermark
    drawWatermark(doc, brand.name || 'EduConnect');

    // header
    header(doc, brand.name, logoPng);

    // title
    doc.fillColor('#0F172A').fontSize(22).text('Official Transcript', 50, 120);
    doc.fontSize(12).fillColor('#374151').text('(Preview – watermark removed after payment)', 50, 145);

    // student/course meta
    const issuedText = (issuedAt instanceof Date ? issuedAt : new Date(issuedAt)).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    let y = 180;
    keyValue(doc, 'Student Name', studentName, y); y += 18;
    keyValue(doc, 'Student ID', studentId || '—', y); y += 18;
    keyValue(doc, 'Course', courseTitle, y); y += 18;
    keyValue(doc, 'Course ID', courseId || '—', y); y += 18;
    keyValue(doc, 'Issued On', issuedText, y); y += 24;

    // summary box
    const boxY = y;
    const boxH = 70;
    doc
      .roundedRect(50, boxY, 505, boxH, 10)
      .fillOpacity(0.06)
      .fill('#16A34A')
      .fillOpacity(1);

    doc
      .fillColor('#065F46')
      .fontSize(12)
      .text('Final Score', 65, boxY + 14);
    doc.fontSize(26).fillColor('#064E3B').text(`${overallPct}%`, 65, boxY + 34);

    doc
      .fillColor('#6B7280')
      .fontSize(11)
      .text('Pass Mark', 230, boxY + 14);
    doc.fontSize(18).fillColor('#111827').text(`${passMark}%`, 230, boxY + 34);

    const letter = letterFromPct(overallPct);
    doc
      .fillColor('#6B7280')
      .fontSize(11)
      .text('Letter Grade', 360, boxY + 14);
    doc.fontSize(18).fillColor('#111827').text(letter, 360, boxY + 34);

    y = boxY + boxH + 24;

    // sections
    if (Array.isArray(sections) && sections.length) {
      doc.fontSize(14).fillColor('#0F172A').text('Detailed Breakdown', 50, y); y += 14;
      sections.forEach((sec) => {
        y += 14;
        doc.fontSize(12).fillColor('#1F2937').text(sec.sectionTitle || 'Section', 50, y);
        y += 10;
        (sec.items || []).forEach((it) => {
          doc.fontSize(11).fillColor('#374151').text(`• ${it.label}`, 60, y);
          doc.fontSize(11).fillColor('#111827').text(`${it.scorePct}%`, 530 - 80, y, { width: 80, align: 'right' });
          y += 16;
          if (y > 760) { doc.addPage(); y = 80; }
        });
      });
      y += 8;
    }

    // QR & footer
    if (qrBuffer) {
      doc.image(qrBuffer, 60, 740 - 40, { width: 90 });
      doc.fontSize(9).fillColor('#6B7280').text('Scan to verify', 60, 742 + 58, { width: 90, align: 'center' });
    }
    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text(`${brand.name || 'EduConnect'} • https://daybreaklearner.com`, 50, 792, { width: 505, align: 'center' });

    doc.end();
  });
}

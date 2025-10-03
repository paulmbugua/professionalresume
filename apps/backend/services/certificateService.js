// services/certificateService.js
import PDFDocument from 'pdfkit';
import axios from 'axios';
import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import crc32 from 'crc-32';

/** Cloud name from env (supports both names) */
const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || '';

/* ─────────────────────────────────────────────────────────
 * ID generation helpers
 * ───────────────────────────────────────────────────────── */

const WORDS = [
  'amber','arbor','aurora','avena','basil','bay','birch','bison','bliss','bloom','breeze','brook',
  'cedar','charm','cider','citrus','cloud','clover','coral','cosmos','crown','crystal',
  'dawn','delta','dune','ember','ever','falcon','fern','flint','flora','fog','freya','glade',
  'glow','grain','grove','halo','harbor','hazel','honey','indigo','iris','jade','juno',
  'kelp','koi','lark','laurel','leaf','linen','lotus','lumen','maple','meadow','mirth','mist',
  'moss','nova','oasis','olive','onyx','opal','orbit','pearl','pine','plume','prairie','quartz',
  'rain','raven','reed','river','robin','rose','sable','sage','sand','sea','silk','sol',
  'sonar','sprig','spring','star','stone','storm','sumac','sun','surf','swift','tansy','tide',
  'topaz','vale','velvet','verge','vivid','wheat','whisper','willow','wind','yarrow','zephyr'
]; // 100 calm words

const crc32str = crc32.str;

function sha1Hex(str) {
  return crypto.createHash('sha1').update(str).digest('hex'); // 40 hex chars
}
function crc32Mod97(input) {
  const crcUnsigned = crc32str(String(input)) >>> 0;
  const mod = crcUnsigned % 97;
  return String(mod).padStart(2, '0');
}
function getOrgInitials(name) {
  const parts = String(name || '').trim().split(/[^A-Za-z]+/).filter(Boolean);
  if (parts.length === 0) return 'X';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  if (parts.length === 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
}
function pickWordsFromHash(hex, count = 2) {
  const words = [];
  for (let i = 0; i < count; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16);
    words.push(WORDS[byte % WORDS.length]);
  }
  return words;
}
function generateCertificateNumber({ brandName, studentName, courseTitle, issuedAt }) {
  const initials = getOrgInitials(brandName);
  const issuedStr =
    issuedAt instanceof Date ? issuedAt.toISOString().slice(0, 10) : String(issuedAt || '');
  const seed = `${brandName}||${studentName}||${courseTitle}||${issuedStr}`;
  const hex = sha1Hex(seed); // deterministic

  const [w1, w2] = pickWordsFromHash(hex, 2);
  const tailNum = String(parseInt(hex.slice(0, 8), 16) % 1_000_000).padStart(6, '0');
  const chk = crc32Mod97(hex);

  return `${initials}-${w1}-${w2}-${tailNum}${chk}`.toUpperCase();
}

/* ─────────────────────────────────────────────────────────
 * Cloudinary helpers
 * ───────────────────────────────────────────────────────── */
function tryCoerceCloudinaryUrlToPng(urlStr, { w, h, q = 'auto' } = {}) {
  try {
    const u = new URL(urlStr);
    if (!/\.cloudinary\.com$/i.test(u.hostname)) return null;
    const segs = u.pathname.split('/');
    const uploadIdx = segs.findIndex((s) => s === 'upload');
    if (uploadIdx === -1) return null;

    const parts = [];
    if (w) parts.push(`w_${w}`);
    if (h) parts.push(`h_${h}`);
    parts.push('c_limit', `q_${q}`, 'f_png');
    const transform = parts.join(',');

    segs.splice(uploadIdx + 1, 0, transform);
    const last = segs[segs.length - 1];
    segs[segs.length - 1] = last.replace(/\.[a-z0-9]+$/i, '') + '.png';
    u.pathname = segs.join('/');
    return u.toString();
  } catch {
    return null;
  }
}

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

  const xerr = first.headers?.['x-cld-error'];
  console.warn('[cert] fetchBufferWithSignedRetry failed', {
    status: first.status,
    x_cld_error: xerr,
    url,
  });
  return null;
}

async function fetchCloudinaryAsPngBuffer(cloudinaryIdOrUrl, { w, h, q = 'auto' } = {}) {
  if (!cloudinaryIdOrUrl) return null;

  if (typeof cloudinaryIdOrUrl === 'string' && cloudinaryIdOrUrl.includes('://')) {
    try {
      const buf = await fetchBufferWithSignedRetry(cloudinaryIdOrUrl, {
        responseType: 'arraybuffer',
        timeout: 6000,
      });
      if (buf) return buf;
    } catch {}
    const pngUrl = tryCoerceCloudinaryUrlToPng(cloudinaryIdOrUrl, { w, h, q });
    if (pngUrl) {
      try {
        const buf2 = await fetchBufferWithSignedRetry(pngUrl, {
          responseType: 'arraybuffer',
          timeout: 6000,
        });
        if (buf2) return buf2;
      } catch {}
    }
    console.warn('[cert] fetch image URL failed after PNG coercion:', { url: cloudinaryIdOrUrl });
    return null;
  }

  if (!CLOUDINARY_CLOUD_NAME) return null;

  const parts = [];
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  parts.push('c_limit', `q_${q}`, 'f_png');
  const transform = parts.join(',');

  const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${cloudinaryIdOrUrl}.png`;
  try {
    const buf = await fetchBufferWithSignedRetry(url, {
      responseType: 'arraybuffer',
      timeout: 6000,
    });
    return buf;
  } catch (e) {
    const status = e?.response?.status;
    console.warn('[cert] Cloudinary public_id fetch failed:', { url, status, msg: e?.message });
    return null;
  }
}

/* ─────────────────────────────────────────────────────────
 * Decor + watermarks (tiny on PDFs; big SAMPLE only for previews)
 * ───────────────────────────────────────────────────────── */
function drawWavyBackground(doc) {
  const { width, height } = doc.page;
  doc.save();
  doc.fillColor('#E8F1FB'); doc.opacity(0.75);
  doc.moveTo(0, 140);
  doc.bezierCurveTo(width * 0.15, 60, width * 0.35, 220, width * 0.55, 120);
  doc.bezierCurveTo(width * 0.75, 40, width * 0.95, 140, width, 90);
  doc.lineTo(width, 0).lineTo(0, 0).closePath().fill();
  doc.restore();

  doc.save();
  doc.fillColor('#E6FAF4'); doc.opacity(0.65);
  doc.moveTo(0, height - 140);
  doc.bezierCurveTo(width * 0.2, height - 60, width * 0.5, height - 220, width * 0.75, height - 110);
  doc.bezierCurveTo(width * 0.9, height - 60, width, height - 100, width, height);
  doc.lineTo(0, height).closePath().fill();
  doc.restore();

  doc.save();
  doc.lineWidth(2).strokeColor('#E5E7EB');
  doc.roundedRect(32, 32, width - 64, height - 64, 10).stroke();
  doc.restore();
}

// Tiny, non-wrapping tiled text to avoid extra page creation.
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

function drawFooterCertificateNumber(
  doc,
  certNumber,
  { y = 770, minPt = 10, maxPt = 28, baseColor = '#0B1220', letterSpacing = 1.2, font = 'Helvetica-Bold' } = {}
) {
  if (!certNumber) return;
  const chars = String(certNumber).split('');
  const n = chars.length; if (!n) return;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const sizes = chars.map((_, i) => {
    const t = easeOutCubic((i + 1) / n);
    return Math.round(minPt + (maxPt - minPt) * t);
  });

  let totalWidth = 0;
  for (let i = 0; i < n; i++) {
    doc.font(font).fontSize(sizes[i]);
    totalWidth += doc.widthOfString(chars[i]) + letterSpacing;
  }
  totalWidth -= letterSpacing;

  const startX = (doc.page.width - totalWidth) / 2;
  let x = startX;
  for (let i = 0; i < n; i++) {
    doc.font(font).fontSize(sizes[i]).fillColor(baseColor);
    const w = doc.widthOfString(chars[i]);
    doc.text(chars[i], x, y);
    x += w + letterSpacing;
  }
}

/* ─────────────────────────────────────────────────────────
 * Main generator
 * ───────────────────────────────────────────────────────── */
export async function generateCertificatePdfBuffer({
  studentName,
  courseTitle,
  issuedAt = new Date(),
  verificationUrl,
  titleText,
  certificateNumber, // optional; if missing we auto-generate
  brand = {
    name: process.env.CERT_BRAND_NAME || 'DayBreak Academy',
    logoPublicId: process.env.CERT_LOGO_PUBLIC_ID,
    signaturePublicId: process.env.CERT_SIGNATURE_PUBLIC_ID,
  },
  tutorSignaturePublicId,
  // 🔽 NEW: default ON — tiny watermark baked into PDFs
  tiledWatermark = false,
  tiledWatermarkLabel,               // optional custom label
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  try {
    doc.info = {
      Title: `Certificate - ${studentName}`,
      Author: brand.name || 'Certificate Generator',
      Subject: `Completion: ${courseTitle}`,
      Keywords: 'certificate, completion',
      Creator: 'TutorApp',
      CreationDate: new Date(),
    };
  } catch {}

  // Auto-generate human-friendly number
  const effectiveCertNumber =
    certificateNumber ||
    generateCertificateNumber({
      brandName: brand?.name,
      studentName,
      courseTitle,
      issuedAt,
    });

  const [logoPng, brandSignaturePng, tutorSignaturePng] = await Promise.all([
    fetchCloudinaryAsPngBuffer(brand.logoPublicId, { w: 220 }),
    fetchCloudinaryAsPngBuffer(brand.signaturePublicId, { w: 220 }),
    fetchCloudinaryAsPngBuffer(tutorSignaturePublicId, { w: 240 }),
  ]);

  let qrPngBuffer = null;
  if (verificationUrl) {
    try {
      qrPngBuffer = await QRCode.toBuffer(verificationUrl, {
        type: 'png',
        width: 120,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.warn('[cert] QR generation failed', e?.message);
    }
  }

 
  const chunks = [];
  return await new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Background
    drawWavyBackground(doc);

    // 🔹 Tiny tiled watermark
    const org = brand?.name || 'DayBreak Academy';
    const learner = studentName || 'Learner';
    if (tiledWatermark) {
      const label = tiledWatermarkLabel || `${org} • ${learner}`;
      drawTiledWatermarks(doc, label, { angle:-28, fontSize:8, xGap:110, yGap:84, opacity:0.085 });
    }

    // 🔸 Ensure normal drawing state for real content
    doc.save();                   // NEW
    doc.opacity(1).fillColor('#0F172A');  // NEW

    // Header
    if (logoPng) doc.image(logoPng, 58, 46, { width: 68 });
    doc.fontSize(18).fillColor('#0F172A')
       .text(org, 140, 56, { width: 340, align: 'left', lineBreak:false }); // NEW
    doc.moveTo(50, 120).lineTo(545, 120).lineWidth(1.2).strokeColor('#DCE4EE').stroke();

    // Title & body
    const issued = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
    const issuedText = issued.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
    const headline = titleText || 'Certificate of Completion';

    doc.fillColor('#0F172A').fontSize(32)
       .text(headline, 50, 160, { width:495, align:'center', lineBreak:false }); // NEW
    doc.fontSize(14).fillColor('#1F2937')
       .text('This certifies that', 50, 210, { width:495, align:'center', lineBreak:false }); // NEW
    doc.fontSize(26).fillColor('#0B1220')
       .text(studentName, 50, 240, { width:495, align:'center', underline:true, lineBreak:false }); // NEW
    doc.fontSize(14).fillColor('#1F2937')
       .text('has successfully completed the course', 50, 276, { width:495, align:'center', lineBreak:false }); // NEW
    doc.fontSize(20).fillColor('#0B1220')
       .text(`“${courseTitle}”`, 50, 306, { width:495, align:'center', lineBreak:false }); // NEW
    doc.fontSize(12).fillColor('#374151')
       .text(`Issued on: ${issuedText}`, 50, 344, { width:495, align:'center', lineBreak:false }); // NEW

    // Signatures
    const bandTop = 410;
    const sigLineY = bandTop + 68;
    const labelY   = sigLineY + 18;

    if (brandSignaturePng) doc.image(brandSignaturePng, 90, bandTop - 20, { width: 150 });
    doc.moveTo(70, sigLineY).lineTo(260, sigLineY).lineWidth(1.1).strokeColor('#9CA3AF').stroke();
    doc.fontSize(11).fillColor('#374151')
       .text(`${org} Registrar`, 70, labelY, { width:190, align:'center', lineBreak:false }); // NEW

    if (tutorSignaturePng) doc.image(tutorSignaturePng, 340, bandTop - 26, { width: 170 });
    doc.moveTo(325, sigLineY).lineTo(525, sigLineY).lineWidth(1.1).strokeColor('#9CA3AF').stroke();
    doc.fontSize(11).fillColor('#374151')
       .text('Course Instructor', 325, labelY, { width:200, align:'center', lineBreak:false }); // NEW

    // QR (optional)
    if (qrPngBuffer) {
      const qrX = 64, qrY = 708;
      doc.image(qrPngBuffer, qrX, qrY, { width: 92 });
      doc.fontSize(9).fillColor('#6B7280')
         .text('Scan to verify', qrX, qrY + 98, { width:100, align:'center', lineBreak:false }); // NEW
    }

    // Footer certificate number (kept)
    drawFooterCertificateNumber(doc, effectiveCertNumber, {
      y: 770, minPt:10, maxPt:28, baseColor:'#0B1220', letterSpacing:1.2, font:'Helvetica-Bold',
    });

    // Host/brand line
    let footerText = org || '';
    try { const host = verificationUrl ? new URL(verificationUrl).host : ''; if (host) footerText = `${footerText}${footerText ? ' • ' : ''}${host}`; } catch {}
    doc.fontSize(10).fillColor('#6B7280')
       .text(footerText, 50, 792, { width:495, align:'center', lineBreak:false }); // NEW

    doc.restore();                // NEW
    doc.end();
  });

}

/* ─────────────────────────────────────────────────────────
 * (Optional) helper: build OG with big SAMPLE word for previews
 * ───────────────────────────────────────────────────────── */

export function buildOgRedirectUrlWithSample({ cloudName, certificateId, brandPublicId, student, course }) {
  // brand overlay
  const safeBrand = (brandPublicId || 'branding/logo').replace(/\//g, ':');

  // Large SAMPLE word with opacity using o_ (overlay opacity)
  // - Put it near center so thumbnails clearly show it's a preview.
  const transforms = [
    'pg_1',
    'w_1200,h_630,c_fill',

    // big SAMPLE across the middle (o_35 => 35% opacity)
    'l_text:Arial_160_bold:SAMPLE,g_center,o_35,co_rgb:FFFFFF',

    // brand in top-left
    `l_${safeBrand},w_180,g_north_west,x_40,y_40`,
  ];

  // Optional contextual text (small)
  if (student) {
    const s = encodeURIComponent(student);
    transforms.push(`l_text:Arial_48_bold:${s},g_south_west,x_40,y_120,co_rgb:0D141C`);
  }
  if (course) {
    const c = encodeURIComponent(course);
    transforms.push(`l_text:Arial_36:${c},g_south_west,x_40,y_60,co_rgb:49739C`);
  }

 return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join('/')}/certificates/${certificateId}.jpg`;

}

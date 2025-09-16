// services/certificateService.js
import PDFDocument from 'pdfkit';
import axios from 'axios';
import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';

/** Cloud name from env (supports both names) */
const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || '';

/**
 * If given a Cloudinary delivery URL, inject transforms to coerce to PNG
 * and optionally apply width/height/quality.
 */
function tryCoerceCloudinaryUrlToPng(urlStr, { w, h, q = 'auto' } = {}) {
  try {
    const u = new URL(urlStr);
    if (!/\.cloudinary\.com$/i.test(u.hostname)) return null;

    const segs = u.pathname.split('/'); // e.g. /image/upload/v123/foo/bar.jpg
    const uploadIdx = segs.findIndex((s) => s === 'upload');
    if (uploadIdx === -1) return null;

    // Build transform segment
    const parts = [];
    if (w) parts.push(`w_${w}`);
    if (h) parts.push(`h_${h}`);
    parts.push('c_limit', `q_${q}`, 'f_png');
    const transform = parts.join(',');

    // Insert transforms immediately after "/upload"
    segs.splice(uploadIdx + 1, 0, transform);

    // Force .png extension on the last segment
    const last = segs[segs.length - 1];
    segs[segs.length - 1] = last.replace(/\.[a-z0-9]+$/i, '') + '.png';

    u.pathname = segs.join('/');
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Try fetch → if 200 OK return Buffer.
 * If 401/403 and Cloudinary api_secret is configured, retry with a short-lived auth token.
 */
async function fetchBufferWithSignedRetry(
  url,
  { responseType = 'arraybuffer', timeout = 6000 } = {}
) {
  const tryFetch = async (theUrl) =>
    axios.get(theUrl, { responseType, timeout, validateStatus: () => true });

  // 1) Try as-is (public / already signed)
  const first = await tryFetch(url);
  if (first.status === 200) return Buffer.from(first.data);

  // 2) If unauthorized and we can sign, retry with token
  if (first.status === 401 || first.status === 403) {
    const cfg = cloudinary.config() || {};
    if (cfg?.api_secret) {
      const u = new URL(url);
      const deliveryPath = u.pathname; // e.g. /image/upload/w_220,.../branding/logo.png

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

  // 3) Give up (soft-fail)
  const xerr = first.headers?.['x-cld-error'];
  console.warn('[cert] fetchBufferWithSignedRetry failed', {
    status: first.status,
    x_cld_error: xerr,
    url,
  });
  return null;
}

/**
 * Fetch an image as a PNG/JPEG buffer ready for PDFKit embedding.
 * Accepts either a full URL (Cloudinary or otherwise) or a Cloudinary public_id.
 * - For full URLs: fetch as-is; if Cloudinary and embedding fails, retry with f_png transform.
 * - For public_id: construct Cloudinary PNG delivery URL with transforms.
 */
async function fetchCloudinaryAsPngBuffer(
  cloudinaryIdOrUrl,
  { w, h, q = 'auto' } = {}
) {
  if (!cloudinaryIdOrUrl) return null;

  // Full URL branch (supports Cloudinary signed retry + PNG coercion fallback)
  if (typeof cloudinaryIdOrUrl === 'string' && cloudinaryIdOrUrl.includes('://')) {
    try {
      const buf = await fetchBufferWithSignedRetry(cloudinaryIdOrUrl, {
        responseType: 'arraybuffer',
        timeout: 6000,
      });
      if (buf) return buf; // JPEG/PNG OK; WEBP/SVG may fail to embed, so try PNG next.
    } catch {
      /* fall through to PNG coercion */
    }

    // If it’s a Cloudinary URL, try again forcing f_png (and optional w/h)
    const pngUrl = tryCoerceCloudinaryUrlToPng(cloudinaryIdOrUrl, { w, h, q });
    if (pngUrl) {
      try {
        const buf2 = await fetchBufferWithSignedRetry(pngUrl, {
          responseType: 'arraybuffer',
          timeout: 6000,
        });
        if (buf2) return buf2;
      } catch {
        /* noop */
      }
    }

    console.warn('[cert] fetch image URL failed after PNG coercion:', {
      url: cloudinaryIdOrUrl,
    });
    return null;
  }

  // public_id branch (needs cloud name)
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
    console.warn('[cert] Cloudinary public_id fetch failed:', {
      url,
      status,
      msg: e?.message,
    });
    return null;
  }
}

/** Decorative: soft wavy background bands */
function drawWavyBackground(doc) {
  const { width, height } = doc.page;

  // Upper-left wave (soft blue)
  doc.save();
  doc.fillColor('#E8F1FB'); // pale brand-ish blue
  doc.opacity(0.75);
  doc.moveTo(0, 140);
  doc.bezierCurveTo(width * 0.15, 60, width * 0.35, 220, width * 0.55, 120);
  doc.bezierCurveTo(width * 0.75, 40, width * 0.95, 140, width, 90);
  doc.lineTo(width, 0).lineTo(0, 0).closePath().fill();
  doc.restore();

  // Bottom wave (pale teal)
  doc.save();
  doc.fillColor('#E6FAF4');
  doc.opacity(0.65);
  doc.moveTo(0, height - 140);
  doc.bezierCurveTo(width * 0.2, height - 60, width * 0.5, height - 220, width * 0.75, height - 110);
  doc.bezierCurveTo(width * 0.9, height - 60, width, height - 100, width, height);
  doc.lineTo(0, height).closePath().fill();
  doc.restore();

  // Subtle frame border
  doc.save();
  doc.lineWidth(2).strokeColor('#E5E7EB');
  doc.roundedRect(32, 32, width - 64, height - 64, 10).stroke();
  doc.restore();
}

/** Decorative: centered watermark text, rotated with proper origin */
function drawWatermark(doc, text) {
  if (!text) return;
  const centerX = doc.page.width / 2;
  const centerY = doc.page.height / 2 + 10;
  doc.save();
  doc.opacity(0.12);
  doc.fillColor('#0F172A'); // deep slate
  doc.rotate(-18, { origin: [centerX, centerY] });
  doc.fontSize(86).text(text, centerX - 220, centerY - 40, {
    width: 440,
    align: 'center',
  });
  doc.restore();
}

/**
 * Generate branded, signed certificate PDF -> Buffer
 *
 * Accepts organization branding via `brand`:
 *  - brand.name
 *  - brand.logoPublicId (Cloudinary public_id OR full URL)
 *  - brand.signaturePublicId (Cloudinary public_id OR full URL)
 * Also supports per-course/tutor signature via `tutorSignaturePublicId` (public_id or URL).
 * `titleText` lets institutions override the default headline.
 */
export async function generateCertificatePdfBuffer({
  studentName,
  courseTitle,
  issuedAt = new Date(),
  verificationUrl, // e.g. https://api.example.com/api/certificates/verify/<certId>
  titleText,       // optional custom headline (e.g., org-provided certificate title)
  brand = {
    name: process.env.CERT_BRAND_NAME || 'DayBreak Academy',
    logoPublicId: process.env.CERT_LOGO_PUBLIC_ID,           // e.g. branding/logo or full URL
    signaturePublicId: process.env.CERT_SIGNATURE_PUBLIC_ID, // e.g. branding/signature or full URL
  },
  tutorSignaturePublicId, // may be null; also supports full URL
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Basic PDF metadata
  try {
    doc.info = {
      Title: `Certificate - ${studentName}`,
      Author: brand.name || 'Certificate Generator',
      Subject: `Completion: ${courseTitle}`,
      Keywords: 'certificate, completion',
      Creator: 'TutorApp',
      CreationDate: new Date(),
    };
  } catch {
    /* ignore */
  }

  // Preload assets (soft-fail to null). Accepts public_id or full URL.
  const [logoPng, brandSignaturePng, tutorSignaturePng] = await Promise.all([
    fetchCloudinaryAsPngBuffer(brand.logoPublicId, { w: 220 }),
    fetchCloudinaryAsPngBuffer(brand.signaturePublicId, { w: 220 }),
    fetchCloudinaryAsPngBuffer(tutorSignaturePublicId, { w: 240 }),
  ]);

  if (!logoPng)        console.warn('[cert] branding logo not embedded (null buffer) – check URL/public_id, format, or CLOUDINARY_CLOUD_NAME');
 if (!brandSignaturePng) console.warn('[cert] registrar signature not embedded – check URL/public_id/format');
 if (!tutorSignaturePng) console.warn('[cert] tutor signature not embedded – optional, may be null');

  // QR with higher error correction (robust when printed)
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

    // === BACKGROUND (wavy) & BORDER ===
    drawWavyBackground(doc);

    // === HEADER ===
    if (logoPng) doc.image(logoPng, 58, 46, { width: 68 });
    doc.fontSize(18).fillColor('#0F172A').text(brand.name || '', 140, 56, {
      width: 340,
      align: 'left',
    });
    doc.moveTo(50, 120).lineTo(545, 120).lineWidth(1.2).strokeColor('#DCE4EE').stroke();

    // === WATERMARK ===
    drawWatermark(doc, brand.name || '');

    // === TITLE & BODY ===
    const issued = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
    const issuedText = issued.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const headline = titleText || 'Certificate of Completion';

    // Headline stack
    doc
      .fillColor('#0F172A')
      .fontSize(32)
      .text(headline, 50, 160, { width: 495, align: 'center' })
      .moveDown(1.2);

    doc.fontSize(14).fillColor('#1F2937').text('This certifies that', { align: 'center' }).moveDown(0.6);

    doc
      .fontSize(26)
      .fillColor('#0B1220')
      .text(studentName, { align: 'center', underline: true })
      .moveDown(0.6);

    doc.fontSize(14).fillColor('#1F2937').text('has successfully completed the course', { align: 'center' }).moveDown(0.6);

    doc.fontSize(20).fillColor('#0B1220').text(`“${courseTitle}”`, { align: 'center' }).moveDown(1.2);

    doc.fontSize(12).fillColor('#374151').text(`Issued on: ${issuedText}`, { align: 'center' }).moveDown(2.8);

    // === SIGNATURES ROW ===
    const bandTop = doc.y + 34; // start of signature band
    const sigLineY = bandTop + 68; // horizontal line Y
    const labelY = sigLineY + 18;

    // Left (Brand registrar)
    if (brandSignaturePng) {
      doc.image(brandSignaturePng, 90, bandTop - 20, { width: 150 });
    }
    doc.moveTo(70, sigLineY).lineTo(260, sigLineY).lineWidth(1.1).strokeColor('#9CA3AF').stroke();
    doc.fontSize(11).fillColor('#374151').text(`${brand.name} Registrar`, 70, labelY, {
      width: 190,
      align: 'center',
    });

    // Right (Tutor)
    if (tutorSignaturePng) {
      doc.image(tutorSignaturePng, 340, bandTop - 26, { width: 170 });
    }
    doc.moveTo(325, sigLineY).lineTo(525, sigLineY).lineWidth(1.1).strokeColor('#9CA3AF').stroke();
    doc.fontSize(11).fillColor('#374151').text('Course Instructor', 325, labelY, {
      width: 200,
      align: 'center',
    });

    // === QR CODE (bottom-left) ===
    if (qrPngBuffer) {
      const qrX = 64;
      const qrY = 708;
      doc.image(qrPngBuffer, qrX, qrY, { width: 92 });
      doc.fontSize(9).fillColor('#6B7280').text('Scan to verify', qrX, qrY + 98, {
        width: 100,
        align: 'center',
      });
    }

    // === FOOTER === (brand + verification host; no platform domain)
    let footerText = brand.name || '';
    try {
      if (verificationUrl) {
        const host = new URL(verificationUrl).host;
        if (host) footerText = `${footerText}${footerText ? ' • ' : ''}${host}`;
      }
    } catch {
      /* ignore */
    }

    doc.fontSize(10).fillColor('#6B7280').text(footerText, 50, 772, {
      width: 495,
      align: 'center',
    });

    doc.end();
  });
}

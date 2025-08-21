// services/certificateService.js
import PDFDocument from 'pdfkit';
import axios from 'axios';
import QRCode from 'qrcode';


/** Fetch Cloudinary image (any format) as a PNG buffer for embedding into PDF */
async function fetchCloudinaryAsPngBuffer(cloudinaryPublicId, { w, h, q = 'auto' } = {}) {
  if (!cloudinaryPublicId) return null;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const size = [w ? `w_${w}` : null, h ? `h_${h}` : null, 'c_limit'].filter(Boolean).join(',');
  const url = `https://res.cloudinary.com/${cloudName}/image/upload/${size ? size + '/' : ''}q_${q}/${cloudinaryPublicId}.png`;
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

/**
 * Generate branded, signed certificate PDF -> Buffer
 * Adds:
 *  - Brand logo header + watermark (as before)
 *  - Tutor/Course signature (right side)
 *  - QR code linked to a verification URL (bottom-left)
 */
export async function generateCertificatePdfBuffer({
  studentName,
  courseTitle,
  issuedAt = new Date(),
  verificationUrl,                // e.g. https://api.example.com/api/certificates/verify/<certId>
  brand = {
    name: process.env.CERT_BRAND_NAME || 'EduConnect',
    logoPublicId: process.env.CERT_LOGO_PUBLIC_ID,           // e.g. branding/logo
    signaturePublicId: process.env.CERT_SIGNATURE_PUBLIC_ID, // e.g. branding/signature
  },
  tutorSignaturePublicId,         // e.g. courses.signature_public_id OR tutor profile signature
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // preload assets
  const [logoPng, brandSignaturePng, tutorSignaturePng] = await Promise.all([
    fetchCloudinaryAsPngBuffer(brand.logoPublicId, { w: 220 }),
    fetchCloudinaryAsPngBuffer(brand.signaturePublicId, { w: 200 }),
    fetchCloudinaryAsPngBuffer(tutorSignaturePublicId, { w: 220 }),
  ]);

  // prebuild QR code for verification URL
  const qrPngBuffer = verificationUrl
    ? await QRCode.toBuffer(verificationUrl, { type: 'png', width: 120, margin: 1 })
    : null;

  const chunks = [];
  return await new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // === HEADER ===
    if (logoPng) doc.image(logoPng, 50, 40, { width: 60 });
    doc.fontSize(16).fillColor('#111827').text(brand.name, 120, 50, { width: 300, align: 'left' });
    doc.moveTo(50, 110).lineTo(545, 110).lineWidth(1).strokeColor('#E5E7EB').stroke();

    // === WATERMARK ===
    const centerX = doc.page.width / 2;
    const centerY = doc.page.height / 2 + 30;
    doc.save();
    doc.fillColor('#E5E7EB').opacity(0.18).fontSize(70).text(brand.name, centerX - 160, centerY, {
      width: 320, align: 'center', rotate: -20,
    });
    doc.restore();

    // === TITLE & BODY ===
    doc.fillColor('#0f172a').fontSize(28).text('Certificate of Completion', 50, 150, { width: 495, align: 'center' }).moveDown(1.2);
    doc.fontSize(14).fillColor('#1f2937').text('This certifies that', { align: 'center' }).moveDown(0.6);
    doc.fontSize(22).fillColor('#111827').text(studentName, { align: 'center', underline: true }).moveDown(0.6);
    doc.fontSize(14).fillColor('#1f2937').text('has successfully completed the course', { align: 'center' }).moveDown(0.6);
    doc.fontSize(18).fillColor('#111827').text(`“${courseTitle}”`, { align: 'center' }).moveDown(1.2);
    doc.fontSize(12).fillColor('#374151').text(`Issued on: ${issuedAt.toDateString()}`, { align: 'center' }).moveDown(2.5);

    // === SIGNATURES ROW ===
    const yBase = doc.y + 40;

    // Left: Brand signature (optional)
    if (brandSignaturePng) {
      doc.image(brandSignaturePng, 90, yBase - 30, { width: 140 });
    }
    doc.moveTo(70, yBase + 28).lineTo(260, yBase + 28).lineWidth(1).strokeColor('#9CA3AF').stroke();
    doc.fontSize(11).fillColor('#374151').text(`${brand.name} Registrar`, 70, yBase + 32, { width: 190, align: 'center' });

    // Right: Tutor/Course signature (optional)
    if (tutorSignaturePng) {
      doc.image(tutorSignaturePng, 340, yBase - 30, { width: 160 });
    }
    doc.moveTo(325, yBase + 28).lineTo(525, yBase + 28).lineWidth(1).strokeColor('#9CA3AF').stroke();
    doc.fontSize(11).fillColor('#374151').text(`Course Instructor`, 325, yBase + 32, { width: 200, align: 'center' });

    // === QR CODE (bottom-left) ===
    if (qrPngBuffer) {
      const qrX = 60;
      const qrY = 700;
      doc.image(qrPngBuffer, qrX, qrY, { width: 90 });
      doc.fontSize(9).fillColor('#6B7280').text('Scan to verify', qrX, qrY + 96, { width: 100, align: 'center' });
    }

    // === FOOTER ===
    doc.fontSize(10).fillColor('#6B7280').text(`${brand.name} • https://yourdomain.example`, 50, 770, {
      width: 495, align: 'center',
    });

    doc.end();
  });
}

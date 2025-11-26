// apps/backend/services/orgExamPdfService.js
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';
import { PassThrough } from 'stream';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'node:crypto';
import crc32 from 'crc-32';

/* ─────────────────────────────────────────────────────────
 * Cloudinary + ID helpers (mirrors certificate service)
 * ───────────────────────────────────────────────────────── */

const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || '';

const oneline = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

function getOrgInitials(name) {
  const parts = oneline(name).split(/[^A-Za-z]+/).filter(Boolean);
  if (!parts.length) return 'X';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  if (parts.length === 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
}

const sha1Hex = (s) =>
  crypto.createHash('sha1').update(oneline(s)).digest('hex');

/** 2-digit checksum from CRC-32 % 97 (01..97) */
function crc32Mod97(input) {
  const u32 = (crc32.str(oneline(input)) >>> 0);
  const mod = u32 % 97;
  const chk = mod === 0 ? 97 : mod;
  return String(chk).padStart(2, '0');
}

/**
 * Final format: AA-NNNNNNCC (AA=org initials, N=6 digits, CC=2-digit checksum)
 * Deterministic based on org + learner + class + term + exam.
 */
function generateReportCardNumber({
  brandName,
  studentName,
  classLabel,
  termLabel,
  examLabel,
}) {
  const initials = getOrgInitials(brandName || 'School');
  const issuedStr = oneline(`${termLabel || ''} ${examLabel || ''}`);
  const seed = [
    oneline(brandName || ''),
    oneline(studentName || ''),
    oneline(classLabel || ''),
    issuedStr,
  ].join('||');

  const hex = sha1Hex(seed);
  const tail6 = String(parseInt(hex.slice(0, 8), 16) % 1_000_000).padStart(6, '0');
  const chk2 = crc32Mod97(seed);

  return `${initials}-${tail6}${chk2}`.toUpperCase();
}

/** Footer "Report No" renderer (centered near bottom) */
function drawFooterReportNumber(
  doc,
  reportNumber,
  { y = 800, size = 9, opacity = 0.32, tracking = 0.5, font = 'Helvetica-Bold' } = {},
) {
  if (!reportNumber) return;
  const label = `Report No: ${oneline(reportNumber)}`;
  doc.save();
  doc.font(font).fontSize(size).fillColor('#0B1220').opacity(opacity);
  const w =
    doc.widthOfString(label) +
    tracking * Math.max(0, label.length - 1);
  const x = (doc.page.width - w) / 2;
  doc.text(label, x, y, {
    lineBreak: false,
    characterSpacing: tracking,
  });
  doc.restore();
}

/* Cloudinary fetching with optional signed retry (same logic as certificate) */
async function fetchBufferWithSignedRetry(
  url,
  { responseType = 'arraybuffer', timeout = 6000 } = {},
) {
  const tryFetch = async (theUrl) =>
    axios.get(theUrl, {
      responseType,
      timeout,
      validateStatus: () => true,
    });

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

  const xerr = first.headers?.['x-cld-error'];
  // eslint-disable-next-line no-console
  console.warn('[examCard] fetchBufferWithSignedRetry failed', {
    status: first.status,
    x_cld_error: xerr,
    url,
  });
  return null;
}

/**
 * Accepts Cloudinary public_id OR full URL; returns PNG buffer or null
 * Options:
 *  - trim: apply Cloudinary e_trim (stabilizes thickness for signatures)
 *  - exact: use c_scale for exact width; otherwise c_limit
 *  - dpr: device pixel ratio hint
 */
async function fetchCloudinaryAsPngBuffer(
  idOrUrl,
  { w, h, q = 'auto', trim = false, exact = false, dpr = 2 } = {},
) {
  if (!idOrUrl) return null;

  // If already a full URL, just fetch (with signed retry when needed)
  if (typeof idOrUrl === 'string' && idOrUrl.includes('://')) {
    try {
      const buf = await fetchBufferWithSignedRetry(idOrUrl, {
        responseType: 'arraybuffer',
        timeout: 6000,
      });
      if (buf) return buf;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[examCard] direct image fetch failed', e?.message);
    }
    return null;
  }

  // Must have cloud name to build delivery URL
  if (!CLOUDINARY_CLOUD_NAME) return null;

  const parts = [];
  if (trim) parts.push('e_trim');
  if (typeof dpr === 'number' && dpr > 0) parts.push(`dpr_${dpr}`);
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  parts.push(exact ? 'c_scale' : 'c_limit');
  parts.push(`q_${q}`, 'f_png');

  const transform = parts.join(',');
  const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${idOrUrl}.png`;

  try {
    const buf = await fetchBufferWithSignedRetry(url, {
      responseType: 'arraybuffer',
      timeout: 6000,
    });
    return buf;
  } catch (e) {
    const status = e?.response?.status;
    // eslint-disable-next-line no-console
    console.warn('[examCard] Cloudinary fetch failed:', {
      url,
      status,
      msg: e?.message,
    });
    return null;
  }
}

/**
 * Try to load an image, preferring Cloudinary when:
 *  - value is a Cloudinary public_id, OR
 *  - value is a res.cloudinary.com URL
 * Falls back to Node 18 global fetch for arbitrary URLs.
 */
async function tryLoadImageBuffer(
  idOrUrl,
  { w, h, trim = false, exact = false, dpr = 2 } = {},
) {
  if (!idOrUrl) return null;

  const looksLikePublicId =
    typeof idOrUrl === 'string' && !idOrUrl.includes('://');
  const looksLikeCloudinaryUrl =
    typeof idOrUrl === 'string' &&
    idOrUrl.includes('res.cloudinary.com');

  if (looksLikePublicId || looksLikeCloudinaryUrl) {
    const buf = await fetchCloudinaryAsPngBuffer(idOrUrl, {
      w,
      h,
      trim,
      exact,
      dpr,
    });
    if (buf) return buf;
  }

  // Fallback for arbitrary URLs
  try {
    if (typeof fetch !== 'function') return null;
    const res = await fetch(idOrUrl);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────
 * Existing helpers
 * ───────────────────────────────────────────────────────── */

const ordinal = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  // 🔹 No suffix – just the number, e.g. "1", "2", "13"
  return String(num);
};


const clampPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

/**
 * Render a single-page A4 exam report card
 * card shape is the object returned by getStudentExamCard:
 * {
 *   org: {
 *     name,
 *     logo_url?,
 *     signature_url?,           // ✅ registrar signature
 *     address_line1?, address_line2?,
 *     phone_number?, contact_email?, website_url?
 *   },
 *   student: {
 *     id, name, email,
 *     admission_code?, class_label?,
 *     house_label?, dorm_label?, club_label?,
 *     photo_url?                 // ✅ Cloudinary-friendly
 *   },
 *   term: { year, label }?,
 *   session: { label }?,
 *   subjects: [...],
 *   summary: { ... },
 *   progressSeries?: [...],
 *   attendance?: { ... }
 * }
 */
export async function renderOrgExamStudentCardPdf(card) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const pass = new PassThrough();
  const bufferPromise = getStream.buffer(pass);
  doc.pipe(pass);

  // Page metrics
  const pageWidth = Number(doc.page.width) || 595.28;
  const pageHeight = Number(doc.page.height) || 841.89;
  const leftMargin = Number(doc.page.margins?.left) || 40;
  const rightMargin = Number(doc.page.margins?.right) || 40;
  const innerWidth = pageWidth - leftMargin - rightMargin;

  const schoolName =
    (card.org && card.org.name) || 'School Report Card';
  const learnerName = card.student?.name || 'Learner';

  const termLabel = card.term
    ? `${card.term.year} ${card.term.label}`
    : '';
  const examLabel = card.session?.label || '';

  // ✅ Deterministic report card number
  const reportNumber = generateReportCardNumber({
    brandName: schoolName,
    studentName: learnerName,
    classLabel:
      card.student?.class_label || card.summary?.classLabel || '',
    termLabel,
    examLabel,
  });

 // Pre-fetch images (logo + student photo + registrar + teacher signatures)
const [logoBuf, photoBuf, registrarSigBuf, teacherSigBuf] = await Promise.all([
  tryLoadImageBuffer(card.org?.logo_url, {
    w: 240,
    h: 240,
    trim: false,
    exact: false,
    dpr: 2,
  }),
  tryLoadImageBuffer(card.student?.photo_url, {
    w: 400,
    h: 400,
    trim: false,
    exact: false,
    dpr: 2,
  }),
  tryLoadImageBuffer(card.org?.signature_url, {
    w: 520,
    h: 200,
    trim: true, // trim for cleaner signature thickness
    exact: false,
    dpr: 2,
  }),
  tryLoadImageBuffer(
    card.teacher_signature_url ||
      card.class_teacher_signature_url ||
      card.summary?.teacher_signature_url ||
      card.summary?.class_teacher_signature_url,
    {
      w: 520,
      h: 200,
      trim: true,
      exact: false,
      dpr: 2,
    },
  ),
    tryLoadImageBuffer(
    card.teacher_signature_url ||
      card.class_teacher_signature_url ||
      card.summary?.teacher_signature_url ||
      card.summary?.class_teacher_signature_url ||
      card.org?.instructor_signature_url,   // ✅ NEW fallback
    {
      w: 520,
      h: 200,
      trim: true,
      exact: false,
      dpr: 2,
    },
  ),

]);



  // ───────────────────────────────── HEADER ─────────────────────────────────
  const headerHeight = 70;

  // Soft band background
  doc
    .save()
    .rect(0, 0, pageWidth, headerHeight)
    .fill('#f3f4f6')
    .restore();

  // Logo (if any)
  if (logoBuf) {
    try {
      doc.image(logoBuf, leftMargin, 14, {
        fit: [48, 48],
        align: 'left',
        valign: 'top',
      });
    } catch {
      // ignore logo failures
    }
  }

  // School name
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(17)
    .text(
      schoolName,
      leftMargin + (logoBuf ? 60 : 0),
      18,
      {
        width: innerWidth - (logoBuf ? 60 : 0),
        align: 'center',
      },
    );

  // Contact info
  const contactBits = [
    card.org?.address_line1,
    card.org?.address_line2,
  ].filter((x) => x && String(x).trim());

  const contactInlineBits = [
    card.org?.phone_number && `Tel: ${card.org.phone_number}`,
    card.org?.contact_email &&
      `Email: ${card.org.contact_email}`,
    card.org?.website_url &&
      `Website: ${card.org.website_url}`,
  ].filter(Boolean);

  const contactTextLines = [
    ...contactBits,
    contactInlineBits.length
      ? contactInlineBits.join('   •   ')
      : null,
  ].filter(Boolean);

  if (contactTextLines.length) {
    doc.font('Helvetica').fontSize(8).fillColor('#374151');
    contactTextLines.forEach((line, idx) => {
      doc.text(
        line,
        leftMargin + (logoBuf ? 60 : 0),
        40 + idx * 10,
        {
          width: innerWidth - (logoBuf ? 60 : 0),
          align: 'center',
        },
      );
    });
  }

  // Card title
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(
      'TERM REPORT CARD',
      leftMargin,
      headerHeight - 8,
      {
        width: innerWidth,
        align: 'center',
      },
    );

  doc
    .moveTo(leftMargin, headerHeight + 4)
    .lineTo(pageWidth - rightMargin, headerHeight + 4)
    .strokeColor('#d1d5db')
    .stroke();

  doc.y = headerHeight + 12;
  doc.fillColor('#111827');

  // ───────────────────────── LEARNER BLOCK + PHOTO ─────────────────────────
  const metaTopY = doc.y;
  const metaWidth = innerWidth * 0.68;
  const photoBoxSize = 80;
  const photoX = leftMargin + metaWidth + 12;
  const photoY = metaTopY;

  const student = card.student || {};
  const summary = card.summary || {};

  const learnerMetaRows = [
    ['Name', learnerName],
    ['Admission / ID', student.admission_code || student.id || ''],
    ['Class / Grade', student.class_label || summary.classLabel || ''],
    ['House', student.house_label || ''],
    ['Dorm / Residence', student.dorm_label || ''],
    ['Club / Activity', student.club_label || ''],
  ].filter(([, value]) => value && String(value).trim());

  const examMetaRows = [
    ['Term', card.term ? termLabel : ''],
    ['Exam', card.session?.label || ''],
  ].filter(([, value]) => value && String(value).trim());

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Learner details', leftMargin, metaTopY);
    doc.moveDown(0.25);

    doc.font('Helvetica').fontSize(9);

  let cursorY = doc.y;

    const drawRows = (rows, startX, startY) => {
    let y = startY;
    rows.forEach(([label, value]) => {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(label + ':', startX, y, { width: 80 });
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#111827')
        .text(String(value), startX + 84, y, {
          width: metaWidth - 92,
        });
      y += 12;
    });
    return y;
  };

  const afterLearnerY = drawRows(
    learnerMetaRows,
    leftMargin,
    cursorY,
  );
  const afterExamY = drawRows(
    examMetaRows,
    leftMargin,
    afterLearnerY + (examMetaRows.length ? 6 : 0),
  );

  const metaBlockBottom = Math.max(afterExamY, metaTopY + 50);

    // Rectangular border around learner details block
  doc
    .save()
    .roundedRect(
      leftMargin - 4,
      metaTopY - 6,
      metaWidth + 8,
      metaBlockBottom - metaTopY + 10,
      6,
    )
    .strokeColor('#d1d5db')
    .lineWidth(0.9)
    .stroke()
    .restore();


  // Photo frame + student photo (Cloudinary-aware)
  doc
    .save()
    .roundedRect(
      photoX,
      photoY,
      photoBoxSize,
      photoBoxSize,
      6,
    )
    .strokeColor('#d1d5db')
    .lineWidth(0.8)
    .stroke()
    .restore();

  if (photoBuf) {
    try {
      doc.image(photoBuf, photoX + 2, photoY + 2, {
        fit: [photoBoxSize - 4, photoBoxSize - 4],
      });
    } catch {
      // leave empty frame
    }
  } else {
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#9ca3af')
      .text('Photo', photoX, photoY + photoBoxSize / 2 - 4, {
        width: photoBoxSize,
        align: 'center',
      });
  }

  doc.y = metaBlockBottom + 10;
  doc.fillColor('#111827');

  // ───────────────────────── SUMMARY STRIP (KEY STATS) ─────────────────────
  const summaryItems = [];

  if (summary.totalScore != null && summary.totalMax != null) {
    summaryItems.push([
      'TOTAL SCORE',
      `${summary.totalScore}/${summary.totalMax}`,
    ]);
  }

  if (typeof summary.totalPercent === 'number') {
    summaryItems.push([
      'MEAN PERCENT',
      `${summary.totalPercent.toFixed(1)}%`,
    ]);
  }

  if (summary.meanGrade) {
    summaryItems.push(['MEAN GRADE', summary.meanGrade]);
  } else if (summary.overallGrade) {
    summaryItems.push(['OVERALL GRADE', summary.overallGrade]);
  }

  if (summary.classRank && summary.classSize) {
    summaryItems.push([
      'CLASS POSITION',
      `${ordinal(summary.classRank)} of ${summary.classSize}`,
    ]);
  }

  if (summary.overallRank && summary.overallSize) {
    summaryItems.push([
      'OVERALL POSITION',
      `${ordinal(summary.overallRank)} of ${summary.overallSize}`,
    ]);
  }

  if (summary.streamRank && summary.streamSize) {
    summaryItems.push([
      'STREAM POSITION',
      `${ordinal(summary.streamRank)} of ${summary.streamSize}`,
    ]);
  }

  if (summary.daysAbsent != null) {
    summaryItems.push(['DAYS ABSENT', String(summary.daysAbsent)]);
  }

  if (summaryItems.length) {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Summary', leftMargin, doc.y);
    doc.moveDown(0.2);

    const boxHeight = 32;
    const cols = Math.min(4, summaryItems.length);
    const colWidth = innerWidth / cols;

    let idx = 0;
    let y = doc.y;

    while (idx < summaryItems.length) {
      for (
        let c = 0;
        c < cols && idx < summaryItems.length;
        c++, idx++
      ) {
        const [label, value] = summaryItems[idx];

        const x = leftMargin + c * colWidth;
        doc
          .save()
          .roundedRect(x, y, colWidth - 6, boxHeight, 6)
          .fill('#f9fafb')
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .stroke()
          .restore();

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#6b7280')
          .text(label, x + 6, y + 4, {
            width: colWidth - 16,
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111827')
          .text(String(value), x + 6, y + 14, {
            width: colWidth - 16,
          });
      }
      y += boxHeight + 4;
    }

    doc.y = y + 4;
  }

     // ───────────────────────── SUBJECT PERFORMANCE TABLE ─────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .fillColor('#111827')
    .text('SUBJECT PERFORMANCE', leftMargin, doc.y);
  doc.moveDown(0.4); // extra space between heading and table

  const subjects = Array.isArray(card.subjects) ? card.subjects : [];

  const tableLeft = leftMargin;
  const tableRight = pageWidth - rightMargin;

  const hasAnyGrade = subjects.some(
    (s) => s && s.grade && String(s.grade).trim(),
  );

  // Allow backend to force score-only mode with card.settings.showGrades = false
  const showGradeColumn =
    card.settings && Object.prototype.hasOwnProperty.call(card.settings, 'showGrades')
      ? card.settings.showGrades !== false && hasAnyGrade
      : hasAnyGrade;

  const colSubject = tableLeft;
  const colScore = colSubject + 140;
  const colPercent = colScore + 60;
  let colGrade = colPercent;
  let colPosition;
  let colRemarks;
  let colInitials;

  if (showGradeColumn) {
    colGrade = colPercent + 50;
    colPosition = colGrade + 55;
  } else {
    colPosition = colPercent + 55;
  }
  colRemarks = colPosition + 85;
  colInitials = colRemarks + 75;

  const headerY = doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#374151');

  doc.text('SUBJECT', colSubject, headerY, {
    width: colScore - colSubject - 4,
  });
  doc.text('SCORE', colScore, headerY, {
    width: colPercent - colScore - 4,
    align: 'right',
  });
  doc.text('%', colPercent, headerY, {
    width: (showGradeColumn ? colGrade : colPosition) - colPercent - 4,
    align: 'right',
  });

  if (showGradeColumn) {
    doc.text('GRADE', colGrade, headerY, {
      width: colPosition - colGrade - 4,
      align: 'right',
    });
  }

  doc.text('POSITION', colPosition, headerY, {
    width: colRemarks - colPosition - 4,
    align: 'right',
  });
  doc.text('REMARKS', colRemarks, headerY, {
    width: colInitials - colRemarks - 4,
  });
  doc.text('INITIALS', colInitials, headerY, {
    width: tableRight - colInitials - 4,
    align: 'right',
  });

  doc.moveDown(0.2);

  const headerBottomY = doc.y;
  doc
    .moveTo(tableLeft, headerBottomY)
    .lineTo(tableRight, headerBottomY)
    .strokeColor('#9ca3af')
    .lineWidth(0.8)
    .stroke();

 // … after we set up colSubject / colScore / colPercent / colGrade / colPosition / colRemarks / colInitials …

doc.font('Helvetica').fontSize(8).fillColor('#111827');

const bodyTopY = doc.y;

subjects.forEach((s) => {
  const y = doc.y;

  const subjectName = (s.subject || '—').toString().trim().toUpperCase();
  const scoreText = `${s.score ?? 0}/${s.max_score ?? 0}`;
  const pctText =
    typeof s.percent === 'number'
      ? `${Math.round(clampPercent(s.percent))}%`
      : '—';
  const gradeText = (s.grade || '').toString().trim().toUpperCase();

  let posText = '—';
  if (s.classRank && s.classSize) {
    const ord = ordinal(s.classRank).toUpperCase();
    posText = `${ord} OF ${s.classSize}`;
  }

  const remarkRaw = (s.remark || '').toString().trim();
  const remarkText = remarkRaw ? remarkRaw.toUpperCase() : '';

  const initialsRaw =
    (s.teacher_initials || s.teacherInitials || '').toString().trim();
  const initialsText = initialsRaw ? initialsRaw.toUpperCase() : '—';

  // ✅ NEW: format extras (Effort, NextStep, Homework…) as sub-lines in Remarks
  const extrasObj =
    s.extra && typeof s.extra === 'object' && !Array.isArray(s.extra)
      ? s.extra
      : null;

  const remarkLines = [];
  if (remarkText) {
    remarkLines.push(remarkText);
  }

  if (extrasObj) {
    const extrasKeys = Object.keys(extrasObj);

    const pick = (...names) =>
      names
        .map((n) => extrasKeys.find((k) => k.toLowerCase() === n.toLowerCase()))
        .find(Boolean);

    const effortKey = pick('Effort', 'EFFORT', 'effort');
    const nextStepKey = pick('NextStep', 'Next Step', 'next_step', 'NEXT STEP');
    const homeworkKey = pick('Homework', 'HW', 'homework');

    const chips = [];

    if (effortKey) {
      const v = oneline(extrasObj[effortKey] ?? '').toUpperCase();
      if (v) chips.push(`EFFORT: ${v}`);
    }

    if (homeworkKey) {
      const v = oneline(extrasObj[homeworkKey] ?? '');
      if (v) chips.push(`HOMEWORK: ${v.toUpperCase()}`);
    }

    if (nextStepKey) {
      const raw = oneline(extrasObj[nextStepKey] ?? '');
      if (raw) {
        // keep NextStep short to preserve layout
        const truncated =
          raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
        chips.push(`NEXT: ${truncated.toUpperCase()}`);
      }
    }

    // Any other extras → show at most 2 as KEY: VALUE
    const usedKeys = new Set(
      [effortKey, nextStepKey, homeworkKey].filter(Boolean),
    );
    const fallbackKeys = extrasKeys
      .filter((k) => !usedKeys.has(k))
      .slice(0, 2);

    fallbackKeys.forEach((k) => {
      const raw = oneline(extrasObj[k] ?? '');
      if (!raw) return;
      const label = k.toString().toUpperCase();
      const truncated =
        raw.length > 60 ? `${raw.slice(0, 57)}…` : raw;
      chips.push(`${label}: ${truncated.toUpperCase()}`);
    });

    if (chips.length) {
      // Combine extras into one or two concise lines under the main remark
      const extrasBlock = chips.join('   •   ');
      remarkLines.push(extrasBlock);
    }
  }

  const remarkBlock =
    remarkLines.length > 0 ? remarkLines.join('\n') : '—';

  // SUBJECT label
  doc.text(subjectName, colSubject, y, {
    width: colScore - colSubject - 4,
  });

  // SCORE
  doc.text(scoreText, colScore, y, {
    width: colPercent - colScore - 4,
    align: 'right',
  });

  // PERCENT
  doc.text(pctText, colPercent, y, {
    width: (showGradeColumn ? colGrade : colPosition) - colPercent - 4,
    align: 'right',
  });

  // GRADE (optional)
  if (showGradeColumn) {
    doc.text(gradeText || '—', colGrade, y, {
      width: colPosition - colGrade - 4,
      align: 'right',
    });
  }

  // POSITION
  doc.text(posText, colPosition, y, {
    width: colRemarks - colPosition - 4,
    align: 'right',
  });

  // REMARKS + EXTRAS (multi-line)
  doc.text(remarkBlock, colRemarks, y, {
    width: colInitials - colRemarks - 4,
    lineGap: 1.2,
  });

  // INITIALS
  doc.text(initialsText, colInitials, y, {
    width: tableRight - colInitials - 4,
    align: 'right',
  });

  // Move down based on the tallest cell (Remarks)
  doc.moveDown(0.12);
});


  const tableBottomY = doc.y;

  doc
    .strokeColor('#9ca3af')
    .lineWidth(0.8)
    .moveTo(tableLeft, bodyTopY - 4)
    .lineTo(tableRight, bodyTopY - 4)
    .stroke();

  doc.moveTo(tableLeft, bodyTopY - 4).lineTo(tableLeft, tableBottomY).stroke();
  doc.moveTo(tableRight, bodyTopY - 4).lineTo(tableRight, tableBottomY).stroke();

  doc.moveTo(colScore, bodyTopY - 4).lineTo(colScore, tableBottomY).stroke();
  doc.moveTo(colPercent, bodyTopY - 4).lineTo(colPercent, tableBottomY).stroke();

  if (showGradeColumn) {
    doc.moveTo(colGrade, bodyTopY - 4).lineTo(colGrade, tableBottomY).stroke();
  }

  doc.moveTo(colPosition, bodyTopY - 4).lineTo(colPosition, tableBottomY).stroke();
  doc.moveTo(colRemarks, bodyTopY - 4).lineTo(colRemarks, tableBottomY).stroke();
  doc.moveTo(colInitials, bodyTopY - 4).lineTo(colInitials, tableBottomY).stroke();

  doc.y = tableBottomY + 8;



  // ───────────────────────── MINI PROGRESS SPARKLINE (OPTIONAL) ────────────
  const series = (card.progressSeries || []).filter(
    (p) => typeof p.percent === 'number',
  );

  // Slightly stricter cutoff to keep 1-page layout
  if (series.length >= 2 && doc.y < pageHeight * 0.65) {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Progress trend', leftMargin, doc.y);
    doc.moveDown(0.1);

    const chartHeight = 40;
    const chartWidth = innerWidth * 0.55;
    const chartLeft = leftMargin;
    const chartTop = doc.y + 4;
    const chartBottom = chartTop + chartHeight;

        // Axis – slightly thicker for clearer print
    doc
      .strokeColor('#9ca3af')
      .lineWidth(1.1)
      .moveTo(chartLeft, chartBottom)
      .lineTo(chartLeft + chartWidth, chartBottom)
      .stroke();
    doc
      .moveTo(chartLeft, chartTop)
      .lineTo(chartLeft, chartBottom)
      .stroke();

    const stepX = chartWidth / Math.max(1, series.length - 1);
    const barMaxHeight = chartHeight - 10;

    // line path
    doc.strokeColor('#3b82f6').lineWidth(1.4);
    series.forEach((p, idx) => {
      const x = chartLeft + idx * stepX;
      const pct = clampPercent(p.percent);
      const y =
        chartBottom - (pct / 100) * barMaxHeight;

      if (idx === 0) {
        doc.moveTo(x, y);
      } else {
        doc.lineTo(x, y);
      }
    });
    doc.stroke();

    // dots
    series.forEach((p, idx) => {
      const x = chartLeft + idx * stepX;
      const pct = clampPercent(p.percent);
      const y =
        chartBottom - (pct / 100) * barMaxHeight;

      const isCurrent = !!p.isCurrent;
      doc
        .save()
        .circle(x, y, isCurrent ? 3 : 2)
        .fill(isCurrent ? '#3b82f6' : '#9ca3af')
        .restore();
    });

       // labels under axis – full labels (eg "2025 Term 1", no ellipsis)
    doc.font('Helvetica').fontSize(6).fillColor('#6b7280');
    series.forEach((p, idx) => {
      const x = chartLeft + idx * stepX;
      const label = (p.label || '').toString();
      doc.text(label, x - 22, chartBottom + 2, {
        width: 44,
        align: 'center',
      });
    });


    doc.y = chartBottom + 20;
  }

  // ───────────────────────── ATTENDANCE & BEHAVIOUR ────────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#111827')
    .text('Attendance & behaviour', leftMargin, doc.y);
  doc.moveDown(0.15);

  const a = card.attendance;

  if (a) {
    doc.font('Helvetica').fontSize(8).fillColor('#111827');

    const lines = [];

    if (a.lessonsAttended != null && a.lessonsHeld != null) {
      lines.push(
        `Lessons attended: ${a.lessonsAttended} of ${a.lessonsHeld}`,
      );
    }
    if (typeof a.attendancePercent === 'number') {
      lines.push(
        `Attendance: ${a.attendancePercent.toFixed(1)}%`,
      );
    }
    if (a.behaviorRating != null) {
      lines.push(`Behaviour: ${a.behaviorRating} / 5`);
    }
    if (a.punctualityRating != null) {
      lines.push(`Punctuality: ${a.punctualityRating} / 5`);
    }

    if (lines.length) {
      lines.forEach((line) =>
        doc.text(line, { width: innerWidth }),
      );
    } else {
      doc.text(
        'Attendance details have not been recorded for this term.',
      );
    }

    if (a.teacherComment) {
      doc.moveDown(0.15);
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(`Class teacher’s remarks: ${a.teacherComment}`, {
          width: innerWidth,
        });
    }
  } else {
    doc
      .font('Helvetica')
      .fontSize(8)
      .text('Attendance data not recorded for this term.', {
        width: innerWidth,
      });
  }

  doc.moveDown(0.4);

  // ───────────────────────── GENERAL REMARKS (PRINCIPAL SECTION) ────────────
const overallRemark = summary.overallRemark;
const principalRemark = summary.principalRemark;

doc
  .font('Helvetica-Bold')
  .fontSize(9)
  .fillColor('#111827')
  .text('Remarks', leftMargin, doc.y);
doc.moveDown(0.15);

// (a) Overall remark from grading bands / system
if (overallRemark) {
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#6b7280')
    .text('Overall remark:', { width: innerWidth });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#111827')
    .text(String(overallRemark), { width: innerWidth });
  doc.moveDown(0.2);
}

// (b) Principal’s dedicated remarks area – ALWAYS shown
doc
  .font('Helvetica')
  .fontSize(8)
  .fillColor('#6b7280')
  .text("Principal's remarks:", { width: innerWidth });
doc.moveDown(0.1);

if (principalRemark) {
  // If stored from backend, print it
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#111827')
    .text(String(principalRemark), { width: innerWidth });
  doc.moveDown(0.3);
} else {
  // Otherwise, provide 3 tidy lines for handwritten comments
  const lineWidth = innerWidth;
  let y = doc.y + 2;
  const lineSpacing = 12;

  for (let i = 0; i < 3; i++) {
    doc
      .strokeColor('#d1d5db')
      .lineWidth(0.9)
      .moveTo(leftMargin, y)
      .lineTo(leftMargin + lineWidth, y)
      .stroke();
    y += lineSpacing;
  }

  doc.y = y + 2;
}


    // ───────────────────────── SIGNATURES ───────────────────────────────
  doc.moveDown(0.6);

  // Push signatures block towards the bottom so there is more room for signing
  const signatureBlockHeight = 80;
  const sigBlockTop = Math.max(
    doc.y,
    pageHeight - signatureBlockHeight - 80,
  );

  const teacherX = leftMargin;
  const principalX = leftMargin + innerWidth / 2;
  const sigLineWidth = innerWidth / 2 - 10;

  const sigLineY = sigBlockTop + 40;

  // Optional class teacher / instructor signature image
  if (teacherSigBuf) {
    try {
      const sigWidth = 110;
      const sigX = teacherX + (sigLineWidth - sigWidth) / 2;
      const sigY = sigBlockTop + 4;
      doc.image(teacherSigBuf, sigX, sigY, {
        width: sigWidth,
      });
    } catch {
      // ignore image failures
    }
  }

  // Class teacher / Instructor line + label
  doc
    .strokeColor('#d1d5db')
    .lineWidth(0.9)
    .moveTo(teacherX, sigLineY)
    .lineTo(teacherX + sigLineWidth, sigLineY)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#111827')
    .text('Class teacher / Instructor', teacherX, sigLineY + 4, {
      width: sigLineWidth,
    });

  // Principal / Registrar signature image (Cloudinary) + line + label
  if (registrarSigBuf) {
    try {
      const sigWidth = 110;
      const sigX = principalX + (sigLineWidth - sigWidth) / 2;
      const sigY = sigBlockTop + 4;
      doc.image(registrarSigBuf, sigX, sigY, {
        width: sigWidth,
      });
    } catch {
      // ignore image failures
    }
  }

  doc
    .strokeColor('#d1d5db')
    .lineWidth(0.9)
    .moveTo(principalX, sigLineY)
    .lineTo(principalX + sigLineWidth, sigLineY)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#111827')
    .text('Head teacher / Principal', principalX, sigLineY + 4, {
      width: sigLineWidth,
    });


  // We don't really need doc.y after this; footer goes to fixed Y.
  // ───────────────────────── FOOTER: REPORT CARD NUMBER ────────────────────
  drawFooterReportNumber(doc, reportNumber, {
    y: pageHeight - 30,
    size: 9,
    opacity: 0.32,
    tracking: 0.6,
    font: 'Helvetica-Bold',
  });

  doc.end();
  return bufferPromise;
}

/**
 * Class report (one-page) for a single class & exam session.
 *
 * Input shape (from controller):
 * {
 *   org: { ...organizations row... },
 *   examMeta: {
 *     classLabel: string,
 *     termLabel?: string,
 *     termYear?: number | string,
 *     examLabel?: string,
 *   },
 *   subjectStats: Array<{
 *     subject: string,
 *     scripts?: number | string,
 *     avg_percent?: number | string,
 *     min_percent?: number | string,
 *     max_percent?: number | string,
 *   }>,
 *   studentRows: Array<{
 *     admission_code?: string,
 *     student_name?: string,
 *     total_score?: number | string,
 *     total_max?: number | string,
 *     total_percent?: number | string,
 *     overall_grade?: string,
 *     position?: number,
 *   }>,
 *   format?: 'booklet' | 'list',
 * }
 */
export async function renderOrgExamClassReportPdf(payload) {
  const {
    org = {},
    examMeta = {},
    subjectStats = [],
    studentRows = [],
    format = 'booklet',
  } = payload || {};

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const pass = new PassThrough();
  const bufferPromise = getStream.buffer(pass);
  doc.pipe(pass);

  const pageWidth = Number(doc.page.width) || 595.28;
  const pageHeight = Number(doc.page.height) || 841.89;
  const leftMargin = Number(doc.page.margins?.left) || 40;
  const rightMargin = Number(doc.page.margins?.right) || 40;
  const innerWidth = pageWidth - leftMargin - rightMargin;
  const bottomMarginY = pageHeight - 60;

  const schoolName = org.name || 'School class report';
  const classLabel = examMeta.classLabel || '';
  const termLabel = examMeta.termLabel || '';
  const termYear = examMeta.termYear || '';
  const examLabel = examMeta.examLabel || '';

  const headerLineBits = [
    classLabel && `Class: ${classLabel}`,
    termYear && termLabel && `Term: ${termYear} ${termLabel}`,
    examLabel && `Exam: ${examLabel}`,
  ].filter(Boolean);

  // Basic numeric helpers for stats
  const asNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const cleanStudents = studentRows
    .map((s) => ({
      ...s,
      total_score: asNum(s.total_score),
      total_max: asNum(s.total_max),
      total_percent: asNum(s.total_percent),
      position: s.position || null,
    }))
    .filter((s) => s.total_score != null || s.total_percent != null);

  const classSize = cleanStudents.length;
  const percentValues = cleanStudents
    .map((s) => asNum(s.total_percent))
    .filter((v) => v != null);
  const meanPercent =
    percentValues.length > 0
      ? percentValues.reduce((a, b) => a + b, 0) / percentValues.length
      : null;
  const bestPercent =
    percentValues.length > 0 ? Math.max(...percentValues) : null;
  const worstPercent =
    percentValues.length > 0 ? Math.min(...percentValues) : null;

  // Sort by percent desc and assign positions if missing
  cleanStudents.sort((a, b) => {
    const pa = a.total_percent ?? -Infinity;
    const pb = b.total_percent ?? -Infinity;
    if (pb !== pa) return pb - pa;
    const na = (a.student_name || '').toString();
    const nb = (b.student_name || '').toString();
    return na.localeCompare(nb);
  });

  let currentPos = 1;
  const rankedStudents = cleanStudents.map((s) => ({
    ...s,
    position: s.position || currentPos++,
  }));

  // Preload org logo (same Cloudinary-aware helper as report card)
  const logoBuf = await tryLoadImageBuffer(org.logo_url, {
    w: 240,
    h: 240,
    trim: false,
    exact: false,
    dpr: 2,
  });

  /* ───────────────────────── HEADER HELPERS ───────────────────────── */

  const headerHeight = 70;

  const drawPageHeader = () => {
    doc
      .save()
      .rect(0, 0, pageWidth, headerHeight)
      .fill('#f3f4f6')
      .restore();

    if (logoBuf) {
      try {
        doc.image(logoBuf, leftMargin, 14, {
          fit: [48, 48],
          align: 'left',
          valign: 'top',
        });
      } catch {
        // ignore
      }
    }

    // School name
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(
        schoolName,
        leftMargin + (logoBuf ? 60 : 0),
        18,
        {
          width: innerWidth - (logoBuf ? 60 : 0),
          align: 'center',
        },
      );

    // Optional contact lines
    const contactBits = [
      org.address_line1,
      org.address_line2,
    ].filter((x) => x && String(x).trim());

    const contactInlineBits = [
      org.phone_number && `Tel: ${org.phone_number}`,
      org.contact_email && `Email: ${org.contact_email}`,
      org.website_url && `Website: ${org.website_url}`,
    ].filter(Boolean);

    const contactTextLines = [
      ...contactBits,
      contactInlineBits.length ? contactInlineBits.join('   •   ') : null,
    ].filter(Boolean);

    if (contactTextLines.length) {
      doc.font('Helvetica').fontSize(8).fillColor('#374151');
      contactTextLines.forEach((line, idx) => {
        doc.text(
          line,
          leftMargin + (logoBuf ? 60 : 0),
          40 + idx * 10,
          {
            width: innerWidth - (logoBuf ? 60 : 0),
            align: 'center',
          },
        );
      });
    }

    // Report title
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(
        'CLASS PERFORMANCE REPORT',
        leftMargin,
        headerHeight - 8,
        {
          width: innerWidth,
          align: 'center',
        },
      );

    if (headerLineBits.length) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#374151')
        .text(
          headerLineBits.join('   •   '),
          leftMargin,
          headerHeight + 4,
          {
            width: innerWidth,
            align: 'center',
          },
        );
    }

    doc
      .moveTo(leftMargin, headerHeight + 20)
      .lineTo(pageWidth - rightMargin, headerHeight + 20)
      .strokeColor('#d1d5db')
      .lineWidth(0.8)
      .stroke();

    doc.y = headerHeight + 28;
    doc.fillColor('#111827');
  };

  const ensureSpace = (minHeight = 40) => {
    if (doc.y + minHeight <= bottomMarginY) return;
    doc.addPage();
    drawPageHeader();
  };

  // initial page header
  drawPageHeader();

  /* ───────────────────────── SUMMARY TILES ───────────────────────── */

  const summaryItems = [];

  summaryItems.push(['CANDIDATES', classSize || 0]);

  if (meanPercent != null) {
    summaryItems.push(['MEAN PERCENT', `${meanPercent.toFixed(1)}%`]);
  }

  if (bestPercent != null) {
    summaryItems.push(['BEST PERCENT', `${bestPercent.toFixed(1)}%`]);
  }

  if (worstPercent != null) {
    summaryItems.push(['LOWEST PERCENT', `${worstPercent.toFixed(1)}%`]);
  }

  if (summaryItems.length) {
    ensureSpace(60);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Summary', leftMargin, doc.y);
    doc.moveDown(0.2);

    const boxHeight = 32;
    const cols = Math.min(4, summaryItems.length);
    const colWidth = innerWidth / cols;
    let idx = 0;
    let y = doc.y;

    while (idx < summaryItems.length) {
      ensureSpace(boxHeight + 8);
      for (let c = 0; c < cols && idx < summaryItems.length; c++, idx++) {
        const [label, value] = summaryItems[idx];
        const x = leftMargin + c * colWidth;

        doc
          .save()
          .roundedRect(x, y, colWidth - 6, boxHeight, 6)
          .fill('#f9fafb')
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .stroke()
          .restore();

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#6b7280')
          .text(label, x + 6, y + 4, {
            width: colWidth - 16,
          });

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111827')
          .text(String(value), x + 6, y + 14, {
            width: colWidth - 16,
          });
      }
      y += boxHeight + 4;
    }

    doc.y = y + 4;
  }

  /* ───────────────────────── SUBJECT SUMMARY (MULTI-PAGE) ───────────────────────── */

  const safeSubjectStats = (Array.isArray(subjectStats) ? subjectStats : []).map(
    (s) => ({
      subject: s.subject || '—',
      scripts: asNum(s.scripts) ?? s.scripts ?? '',
      avg_percent: asNum(s.avg_percent),
      min_percent: asNum(s.min_percent),
      max_percent: asNum(s.max_percent),
    }),
  );

  const drawSubjectSummaryHeader = (continued = false) => {
    ensureSpace(40);
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text(
        continued ? 'SUBJECT SUMMARY (cont.)' : 'SUBJECT SUMMARY',
        leftMargin,
        doc.y,
      );
    doc.moveDown(0.3);

    const tableLeft = leftMargin;
    const tableRight = pageWidth - rightMargin;

    const colSubject = tableLeft;
    const colScripts = colSubject + 170;
    const colAvg = colScripts + 60;
    const colMin = colAvg + 55;
    const colMax = colMin + 55;

    const headerY = doc.y;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#374151');

    doc.text('SUBJECT', colSubject, headerY, {
      width: colScripts - colSubject - 4,
    });
    doc.text('SCRIPTS', colScripts, headerY, {
      width: colAvg - colScripts - 4,
      align: 'right',
    });
    doc.text('AVG %', colAvg, headerY, {
      width: colMin - colAvg - 4,
      align: 'right',
    });
    doc.text('MIN %', colMin, headerY, {
      width: colMax - colMin - 4,
      align: 'right',
    });
    doc.text('MAX %', colMax, headerY, {
      width: tableRight - colMax - 4,
      align: 'right',
    });

    doc.moveDown(0.2);
    const headerBottomY = doc.y;

    doc
      .moveTo(tableLeft, headerBottomY)
      .lineTo(tableRight, headerBottomY)
      .strokeColor('#9ca3af')
      .lineWidth(0.7)
      .stroke();

    doc.font('Helvetica').fontSize(8).fillColor('#111827');

    return { tableLeft, tableRight, colSubject, colScripts, colAvg, colMin, colMax };
  };

  if (safeSubjectStats.length) {
    let subjectTableLayout = drawSubjectSummaryHeader(false);

    for (let i = 0; i < safeSubjectStats.length; i++) {
      if (doc.y > bottomMarginY) {
        doc.addPage();
        drawPageHeader();
        subjectTableLayout = drawSubjectSummaryHeader(true);
      }

      const s = safeSubjectStats[i];
      const {
        tableRight,
        colSubject,
        colScripts,
        colAvg,
        colMin,
        colMax,
      } = subjectTableLayout;

      const y = doc.y;
      const avgTxt =
        s.avg_percent != null ? `${s.avg_percent.toFixed(1)}%` : '—';
      const minTxt =
        s.min_percent != null ? `${s.min_percent.toFixed(1)}%` : '—';
      const maxTxt =
        s.max_percent != null ? `${s.max_percent.toFixed(1)}%` : '—';

      doc.text(String(s.subject).toUpperCase(), colSubject, y, {
        width: colScripts - colSubject - 4,
      });
      doc.text(String(s.scripts ?? '—'), colScripts, y, {
        width: colAvg - colScripts - 4,
        align: 'right',
      });
      doc.text(avgTxt, colAvg, y, {
        width: colMin - colAvg - 4,
        align: 'right',
      });
      doc.text(minTxt, colMin, y, {
        width: colMax - colMin - 4,
        align: 'right',
      });
      doc.text(maxTxt, colMax, y, {
        width: tableRight - colMax - 4,
        align: 'right',
      });

      doc.moveDown(0.12);
    }

    doc.y += 6;
  }

  /* ───────────────────────── TOP LEARNERS / RANK LIST (MULTI-PAGE) ───────────────────────── */

  const learners = rankedStudents;

  const drawTopLearnersHeader = (continued = false) => {
    ensureSpace(40);
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text(
        continued ? 'TOP LEARNERS (cont.)' : 'TOP LEARNERS',
        leftMargin,
        doc.y,
      );
    doc.moveDown(0.3);

    const tableLeft = leftMargin;
    const tableRight = pageWidth - rightMargin;

    const colPos = tableLeft;
    const colAdmName = colPos + 40;
    const colTotal = colAdmName + 210;
    const colPercent = colTotal + 70;
    const colGrade = colPercent + 60;

    const headerY = doc.y;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#374151');

    doc.text('POS', colPos, headerY, {
      width: colAdmName - colPos - 4,
    });
    doc.text('ADM / NAME', colAdmName, headerY, {
      width: colTotal - colAdmName - 4,
    });
    doc.text('TOTAL', colTotal, headerY, {
      width: colPercent - colTotal - 4,
      align: 'right',
    });
    doc.text('%', colPercent, headerY, {
      width: colGrade - colPercent - 4,
      align: 'right',
    });
    doc.text('GRADE', colGrade, headerY, {
      width: tableRight - colGrade - 4,
      align: 'right',
    });

    doc.moveDown(0.2);

    const headerBottomY = doc.y;
    doc
      .moveTo(tableLeft, headerBottomY)
      .lineTo(tableRight, headerBottomY)
      .strokeColor('#9ca3af')
      .lineWidth(0.7)
      .stroke();

    doc.font('Helvetica').fontSize(8).fillColor('#111827');

    return {
      tableLeft,
      tableRight,
      colPos,
      colAdmName,
      colTotal,
      colPercent,
      colGrade,
    };
  };

  if (learners.length) {
    let learnersTableLayout = drawTopLearnersHeader(false);

    for (let i = 0; i < learners.length; i++) {
      if (doc.y > bottomMarginY) {
        doc.addPage();
        drawPageHeader();
        learnersTableLayout = drawTopLearnersHeader(true);
      }

      const s = learners[i];
      const {
        tableRight,
        colPos,
        colAdmName,
        colTotal,
        colPercent,
        colGrade,
      } = learnersTableLayout;

      const y = doc.y;

      const pos = s.position || 0;
      const posText = pos ? ordinal(pos).toUpperCase() : '—';

      const nameLine = [
        s.admission_code && String(s.admission_code).trim(),
        s.student_name && String(s.student_name).trim(),
      ]
        .filter(Boolean)
        .join(' – ');

      const totalText =
        s.total_score != null && s.total_max != null
          ? `${s.total_score}/${s.total_max}`
          : s.total_score != null
          ? String(s.total_score)
          : '—';

      const pctText =
        s.total_percent != null
          ? `${clampPercent(s.total_percent).toFixed(1)}%`
          : '—';

      const gradeText = (s.overall_grade || '').toString().toUpperCase();

      doc.text(posText, colPos, y, {
        width: colAdmName - colPos - 4,
      });
      doc.text(nameLine || 'Learner', colAdmName, y, {
        width: colTotal - colAdmName - 4,
      });
      doc.text(totalText, colTotal, y, {
        width: colPercent - colTotal - 4,
        align: 'right',
      });
      doc.text(pctText, colPercent, y, {
        width: colGrade - colPercent - 4,
        align: 'right',
      });
      doc.text(gradeText || '—', colGrade, y, {
        width: tableRight - colGrade - 4,
        align: 'right',
      });

      doc.moveDown(0.12);
    }

    ensureSpace(20);
    if (classSize > learners.length) {
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#6b7280')
        .text(
          `Showing ${learners.length} of ${classSize} learners in ${classLabel}.`,
          leftMargin,
          doc.y,
          { width: innerWidth },
        );
    }
  }

  doc.end();
  return bufferPromise;
}

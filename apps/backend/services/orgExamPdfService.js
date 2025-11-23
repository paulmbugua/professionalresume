// apps/backend/services/orgExamPdfService.js
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';
import { PassThrough } from 'stream';

const ordinal = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  const v = num % 100;
  const suffix =
    v >= 11 && v <= 13
      ? 'th'
      : ['th', 'st', 'nd', 'rd'][Math.min(num % 10, 3)] || 'th';
  return `${num}${suffix}`;
};

/**
 * card shape is the object returned by getStudentExamCard:
 * {
 *   org,
 *   student,
 *   term,
 *   session,
 *   subjects: [{ subject, score, max_score, percent, grade, ...positions }],
 *   summary: { totalScore, totalMax, totalPercent, overallGrade, classRank, classSize, ... },
 *   progressSeries: [{ label, percent, isCurrent }, ...],
 *   attendance: { lessonsAttended, lessonsHeld, attendancePercent, behaviorRating, punctualityRating, teacherComment }
 * }
 */
export async function renderOrgExamStudentCardPdf(card) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const pass = new PassThrough();
  const bufferPromise = getStream.buffer(pass);
  doc.pipe(pass);

  const schoolName =
    (card.org && card.org.name) || 'School Report Card';
  const learnerName = card.student?.name || 'Learner';

  // Page geometry helpers
  const pageWidth = Number(doc.page.width) || 595.28; // A4 default
  const pageHeight = Number(doc.page.height) || 841.89;
  const leftMargin = Number(doc.page.margins?.left) || 40;
  const rightMargin = Number(doc.page.margins?.right) || 40;
  const innerWidth = pageWidth - leftMargin - rightMargin;

  const clampPercent = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };

  // ─────────────────────────────────────────────
  // Compact chart helpers (bar + pie)
  // ─────────────────────────────────────────────

  function drawSubjectBarChart() {
    const subjects = (card.subjects || []).filter(
      (s) => typeof s.percent === 'number'
    );

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Subject Performance (Bar)', { underline: true });
    doc.moveDown(0.2);

    if (!subjects.length) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .text('No subject percentage data available.');
      doc.moveDown(0.3);
      return;
    }

    const startY = doc.y;
    const chartHeight = 55; // compact
    const chartWidth = Math.max(80, innerWidth * 0.6);
    const chartLeft = leftMargin + (innerWidth - chartWidth) / 2;
    const chartBottom = startY + chartHeight;

    // Axes
    doc
      .moveTo(chartLeft, chartBottom)
      .lineTo(chartLeft + chartWidth, chartBottom)
      .stroke();
    doc
      .moveTo(chartLeft, chartBottom)
      .lineTo(chartLeft, chartBottom - chartHeight)
      .stroke();

    const n = subjects.length;
    const maxBarAreaWidth = chartWidth * 0.9;
    const barSpacing = maxBarAreaWidth / (n * 1.6);
    const barWidth = Math.max(5, barSpacing);

    let x = chartLeft + (chartWidth - maxBarAreaWidth) / 2;

    subjects.forEach((s) => {
      const pct = clampPercent(s.percent);
      const barMaxHeight = chartHeight - 20;
      const barH = (pct / 100) * barMaxHeight;
      const barTop = chartBottom - barH;

      if (barWidth > 0 && barH > 0) {
        doc
          .save()
          .rect(x, barTop, barWidth, barH)
          .fill('#3b82f6')
          .restore();
      }

      // Percent label
      doc.font('Helvetica').fontSize(6);
      doc.text(
        `${Math.round(pct)}%`,
        x,
        barTop - 8,
        { width: barWidth, align: 'center' }
      );

      // Subject label
      const subjLabel = (s.subject || '').toString();
      const shortLabel =
        subjLabel.length > 8 ? `${subjLabel.slice(0, 7)}…` : subjLabel || '—';

      doc.text(
        shortLabel,
        x,
        chartBottom + 2,
        { width: barWidth, align: 'center' }
      );

      x += barWidth * 1.6;
    });

    // Fix chart block height
    doc.y = startY + chartHeight + 24;
  }

  function drawSubjectPieChart() {
    const data = (card.subjects || [])
      .map((s) => ({
        label: (s.subject || '').toString() || 'Subject',
        value: Number(s.score) || 0,
      }))
      .filter((d) => Number.isFinite(d.value) && d.value > 0);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Subject Contribution (Pie)', { underline: true });
    doc.moveDown(0.2);

    if (!data.length) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .text('No subject score data available.');
      doc.moveDown(0.3);
      return;
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (!Number.isFinite(total) || total <= 0) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .text('No subject score data available.');
      doc.moveDown(0.3);
      return;
    }

    const startY = doc.y;
    const radius = 32; // compact
    const cx = leftMargin + innerWidth * 0.22;
    const cy = startY + radius + 6;

    const colors = [
      '#3b82f6',
      '#22c55e',
      '#f97316',
      '#a855f7',
      '#ef4444',
      '#0ea5e9',
      '#84cc16',
      '#eab308',
    ];

    let currentAngle = 0;

    data.forEach((d, idx) => {
      const fraction = d.value / total;
      const sliceAngle = Number.isFinite(fraction)
        ? fraction * Math.PI * 2
        : 0;
      if (sliceAngle <= 0) return;

      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle)) return;

      const color = colors[idx % colors.length];

      doc.save();
      doc.moveTo(cx, cy);
      doc.arc(cx, cy, radius, startAngle, endAngle);
      doc.closePath();
      doc.fill(color);
      doc.restore();

      currentAngle = endAngle;
    });

    // Compact legend to the right
    let legendX = leftMargin + innerWidth * 0.48;
    let legendY = startY + 2;
    doc.font('Helvetica').fontSize(7);

    data.forEach((d, idx) => {
      const color = colors[idx % colors.length];
      const fraction = d.value / total;
      const pct = Number.isFinite(fraction) ? fraction * 100 : 0;

      const labelText = `${d.label} (${pct.toFixed(0)}%)`;

      doc.save();
      doc.rect(legendX, legendY, 6, 6).fill(color).restore();

      doc.text(
        labelText,
        legendX + 10,
        legendY - 1,
        {
          width: innerWidth - (legendX - leftMargin) - 10,
        }
      );

      legendY += 10;
    });

    doc.y = startY + radius * 2 + 26;
  }

  function drawProgressBarChart() {
    const series = (card.progressSeries || []).filter(
      (p) => typeof p.percent === 'number'
    );

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Progress Over Time (Bar)', { underline: true });
    doc.moveDown(0.2);

    if (!series.length) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Historical exam data not available yet. Once previous exams are recorded, this chart will show the learner’s trend.'
        );
      doc.moveDown(0.3);
      return;
    }

    const startY = doc.y;
    const chartHeight = 50; // compact
    const chartWidth = Math.max(80, innerWidth * 0.6);
    const chartLeft = leftMargin + (innerWidth - chartWidth) / 2;
    const chartBottom = startY + chartHeight;

    // Axes
    doc
      .moveTo(chartLeft, chartBottom)
      .lineTo(chartLeft + chartWidth, chartBottom)
      .stroke();
    doc
      .moveTo(chartLeft, chartBottom)
      .lineTo(chartLeft, chartBottom - chartHeight)
      .stroke();

    const n = series.length;
    const maxBarAreaWidth = chartWidth * 0.9;
    const barSpacing = maxBarAreaWidth / (n * 1.6);
    const barWidth = Math.max(5, barSpacing);
    let x = chartLeft + (chartWidth - maxBarAreaWidth) / 2;

    series.forEach((p) => {
      const pct = clampPercent(p.percent);
      const barMaxHeight = chartHeight - 20;
      const barH = (pct / 100) * barMaxHeight;
      const barTop = chartBottom - barH;

      const isCurrent = !!p.isCurrent;

      if (barWidth > 0 && barH > 0) {
        doc.save();
        doc
          .rect(x, barTop, barWidth, barH)
          .fill(isCurrent ? '#3b82f6' : '#9ca3af');
        doc.restore();
      }

      doc.font('Helvetica').fontSize(6);
      doc.text(
        `${pct.toFixed(0)}%`,
        x,
        barTop - 8,
        { width: barWidth, align: 'center' }
      );

      const label = (p.label || 'Exam').toString();
      const shortLabel =
        label.length > 10 ? `${label.slice(0, 9)}…` : label;

      doc.text(
        shortLabel,
        x,
        chartBottom + 2,
        { width: barWidth, align: 'center' }
      );

      x += barWidth * 1.6;
    });

    doc.y = startY + chartHeight + 22;
  }

  // ───────── Header ─────────
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(schoolName, { align: 'center' })
    .moveDown(0.25);

  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('TERM REPORT CARD', { align: 'center' })
    .moveDown(0.4);

  // ───────── Learner meta ─────────
  doc.font('Helvetica').fontSize(9);

  doc.text(`Name: ${learnerName}`);
  if (card.student?.admission_code) {
    doc.text(`Admission: ${card.student.admission_code}`);
  }
  if (card.student?.class_label || card.summary?.classLabel) {
    doc.text(`Class: ${card.student.class_label || card.summary.classLabel}`);
  }
  if (card.term) {
    doc.text(`Term: ${card.term.year} – ${card.term.label}`);
  }
  if (card.session) {
    doc.text(`Exam: ${card.session.label}`);
  }

  doc.moveDown(0.4);

  // ───────── Overall summary + position ─────────
  const parts = [];

  if (typeof card.summary?.totalPercent === 'number') {
    parts.push(`Overall: ${card.summary.totalPercent.toFixed(1)}%`);
  }
  if (card.summary?.overallGrade) {
    parts.push(`Grade: ${card.summary.overallGrade}`);
  }
  if (card.summary?.classRank && card.summary?.classSize) {
    parts.push(
      `Position: ${ordinal(card.summary.classRank)} of ${card.summary.classSize}`
    );
  }

  if (parts.length) {
    doc.fontSize(9).text(parts.join('   '));
  }

  doc.moveDown(0.5);

  // ───────── Subject Performance Table ─────────
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Subject Performance', { underline: true });
  doc.moveDown(0.2);

  const tableLeft = leftMargin;
  const tableRight = pageWidth - rightMargin;
  const colSubject = tableLeft;
  const colScore = colSubject + 150;
  const colPercent = colScore + 70;
  const colPosition = colPercent + 90;

  const tableTopY = doc.y;

  // Header row
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Subject', colSubject, doc.y, { continued: true });
  doc.text('Score', colScore, doc.y, { continued: true });
  doc.text('% / Grade', colPercent, doc.y, { continued: true });
  doc.text('Position', colPosition, doc.y);
  doc.moveDown(0.15);

  const headerBottomY = doc.y;
  doc.moveTo(tableLeft, headerBottomY).lineTo(tableRight, headerBottomY).stroke();
  doc.moveDown(0.05);

  doc.font('Helvetica').fontSize(8);

  (card.subjects || []).forEach((s) => {
    const y = doc.y;
    const pct =
      typeof s.percent === 'number' ? `${Math.round(s.percent)}%` : '—';
    const gradePart = s.grade ? ` (${s.grade})` : '';

    let positionText = '—';
    if (s.classRank && s.classSize) {
      positionText = `${ordinal(s.classRank)} of ${s.classSize}`;
    }

    doc.text(s.subject || '—', colSubject, y, {
      width: colScore - colSubject - 4,
      continued: true,
    });
    doc.text(
      `${s.score ?? 0}/${s.max_score ?? 0}`,
      colScore,
      y,
      {
        width: colPercent - colScore - 4,
        continued: true,
      }
    );
    doc.text(
      `${pct}${gradePart}`,
      colPercent,
      y,
      {
        width: colPosition - colPercent - 4,
        continued: true,
      }
    );
    doc.text(positionText, colPosition, y, {
      width: tableRight - colPosition - 4,
    });

    doc.moveDown(0.12);
  });

  const tableBottomY = doc.y;

  // Table borders & grid
  doc
    .moveTo(tableLeft, tableTopY)
    .lineTo(tableRight, tableTopY)
    .stroke();
  doc
    .moveTo(tableLeft, tableBottomY)
    .lineTo(tableRight, tableBottomY)
    .stroke();
  doc
    .moveTo(tableLeft, tableTopY)
    .lineTo(tableLeft, tableBottomY)
    .stroke();
  doc
    .moveTo(tableRight, tableTopY)
    .lineTo(tableRight, tableBottomY)
    .stroke();

  doc
    .moveTo(colScore, tableTopY)
    .lineTo(colScore, tableBottomY)
    .stroke();
  doc
    .moveTo(colPercent, tableTopY)
    .lineTo(colPercent, tableBottomY)
    .stroke();
  doc
    .moveTo(colPosition, tableTopY)
    .lineTo(colPosition, tableBottomY)
    .stroke();

  doc.moveDown(0.4);

  // ───────── Visual summary (charts) – compact & fixed area ─────────
  const chartsBandTop = pageHeight * 0.48; // ~ middle of page
  const chartsStartY = Math.max(doc.y, chartsBandTop);
  doc.y = chartsStartY;

  drawSubjectBarChart();
  drawSubjectPieChart();
  drawProgressBarChart();

  // ───────── Attendance & Behaviour ─────────
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Attendance & Behaviour', { underline: true });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(8);

  if (card.attendance) {
    const a = card.attendance;

    if (a.lessonsAttended != null && a.lessonsHeld != null) {
      doc.text(
        `Lessons attended: ${a.lessonsAttended} of ${a.lessonsHeld}`
      );
    }
    if (typeof a.attendancePercent === 'number') {
      doc.text(`Attendance rate: ${a.attendancePercent.toFixed(1)}%`);
    }
    if (a.behaviorRating != null) {
      doc.text(`Behaviour rating: ${a.behaviorRating} / 5`);
    }
    if (a.punctualityRating != null) {
      doc.text(`Punctuality rating: ${a.punctualityRating} / 5`);
    }
    if (a.teacherComment) {
      doc.moveDown(0.15);
      doc.text(`Teacher comment: ${a.teacherComment}`, {
        width: innerWidth,
        align: 'left',
      });
    }
  } else {
    doc.text('Attendance and behaviour data not recorded for this term.');
  }

  doc.moveDown(0.5);

  // ───────── Signature lines ─────────
  doc.font('Helvetica').fontSize(8);
  const ySig = doc.y;
  doc.text('Class teacher: ____________________________', leftMargin, ySig, {
    continued: true,
  });
  doc.text(
    'Head teacher / Principal: ____________________________',
    leftMargin + innerWidth / 2,
    ySig
  );

  // No extra pages; keep everything on first page
  doc.end();

  const buffer = await bufferPromise;
  return buffer;
}

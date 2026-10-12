import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
} from 'docx';
import { normalizeCvDraft } from '../../../packages/shared/cv/renderers/index.js';
import { getResumeTemplateMetadata } from '../../../packages/shared/cv/templateMetadata.js';

export async function resumeToDocxBuffer(input) {
  const d = normalizeCvDraft(input);
  const design = getResumeTemplateMetadata(d.templateId);
  const accent = (d.templateTheme.accent || '#176c64').replace('#', '');
  const heading = (title, sidebar = false) =>
    new Paragraph({
      spacing: { before: 220, after: 100 },
      keepNext: true,
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 22,
          color: sidebar
            ? d.templateId === 'executive-navy-orange'
              ? 'EF8B42'
              : 'FFFFFF'
            : accent,
        }),
      ],
    });
  const paragraph = (text, sidebar = false, bold = false) =>
    new Paragraph({
      spacing: { after: 90, line: 276 },
      children: [
        new TextRun({
          text: String(text || ''),
          bold,
          size: 22,
          color: sidebar ? 'FFFFFF' : '17212C',
        }),
      ],
    });
  const bullet = (text, sidebar = false) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 65 },
      children: [
        new TextRun({ text, size: 22, color: sidebar ? 'FFFFFF' : '17212C' }),
      ],
    });
  const sections = (key, side = false) => {
    if (d.sectionVisibility[key] === false) return [];
    const items = [];
    const label = d.sectionLabels?.[key] || key;
    if (key === 'summary' && d.summary) items.push(paragraph(d.summary, side));
    if (key === 'skills' && d.skills.length)
      items.push(paragraph(d.skills.join(' | '), side));
    if (key === 'experience')
      for (const entry of d.experience) {
        items.push(
          paragraph(
            [entry.role, entry.company].filter(Boolean).join(' - '),
            side,
            true,
          ),
          paragraph(
            [entry.start, entry.end, entry.location]
              .filter(Boolean)
              .join(' | '),
            side,
          ),
        );
        if (entry.description) items.push(paragraph(entry.description, side));
        items.push(
          ...entry.bullets.filter(Boolean).map((text) => bullet(text, side)),
        );
      }
    if (key === 'education')
      for (const entry of d.education) {
        items.push(
          paragraph(
            [entry.program, entry.school].filter(Boolean).join(' - '),
            side,
            true,
          ),
          paragraph([entry.start, entry.end].filter(Boolean).join(' - '), side),
        );
        if (entry.details) items.push(paragraph(entry.details, side));
      }
    if (key === 'projects')
      for (const entry of d.projects) {
        items.push(paragraph(entry.name, side, true));
        if (entry.link) items.push(paragraph(entry.link, side));
        if (entry.description) items.push(paragraph(entry.description, side));
        items.push(
          ...entry.bullets.filter(Boolean).map((text) => bullet(text, side)),
        );
      }
    if (key === 'certifications')
      items.push(
        ...d.certifications.map((entry) =>
          paragraph(
            [entry.name, entry.issuer, entry.year].filter(Boolean).join(' | '),
            side,
          ),
        ),
      );
    if (key === 'extras') {
      if (d.extras.languages.length)
        items.push(
          paragraph(`Languages: ${d.extras.languages.join(', ')}`, side),
        );
      if (d.extras.interests.length)
        items.push(
          paragraph(`Interests: ${d.extras.interests.join(', ')}`, side),
        );
    }
    if (key === 'additionalSections')
      return (d.additionalSections || [])
        .filter(
          (entry) =>
            design.layout !== 'sidebar-main' ||
            (entry.placement === 'sidebar') === side,
        )
        .flatMap((entry) => [
          heading(entry.title, side),
          ...(entry.content ? [paragraph(entry.content, side)] : []),
          ...entry.bullets.map((text) => bullet(text, side)),
        ]);
    return items.length ? [heading(label, side), ...items] : [];
  };
  const identity = (side = false) => [
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: d.basics.name,
          bold: true,
          size: 44,
          color: side ? 'FFFFFF' : '17212C',
        }),
      ],
    }),
    paragraph(d.basics.headline, side, true),
    paragraph(
      [d.basics.email, d.basics.phone, d.basics.location]
        .filter(Boolean)
        .join(' | '),
      side,
    ),
    ...d.basics.links.map((link) =>
      paragraph([link.label, link.url].filter(Boolean).join(': '), side),
    ),
  ];
  let children;
  if (design.layout === 'sidebar-main') {
    const noBorder = { style: BorderStyle.NONE, size: 0 };
    children = [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3400, 6700],
        borders: {
          top: noBorder,
          bottom: noBorder,
          left: noBorder,
          right: noBorder,
          insideHorizontal: noBorder,
          insideVertical: noBorder,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 3400, type: WidthType.DXA },
                shading: {
                  type: ShadingType.CLEAR,
                  fill: (d.templateTheme.sidebarBg || '#10243a').replace(
                    '#',
                    '',
                  ),
                },
                margins: { top: 280, bottom: 280, left: 220, right: 220 },
                children: [
                  ...identity(true),
                  ...design.sidebarSections.flatMap((key) =>
                    sections(key, true),
                  ),
                  ...sections('additionalSections', true),
                ],
              }),
              new TableCell({
                width: { size: 6700, type: WidthType.DXA },
                margins: { top: 280, bottom: 280, left: 360, right: 260 },
                children: d.sectionOrder
                  .filter((key) => !design.sidebarSections.includes(key))
                  .flatMap((key) => sections(key)),
              }),
            ],
          }),
        ],
      }),
    ];
  } else
    children = [
      ...identity(),
      ...d.sectionOrder.flatMap((key) => sections(key)),
    ];
  return Packer.toBuffer(
    new Document({
      creator: 'ProfessionalResume.co.ke',
      title: d.title,
      styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 700, bottom: 700, left: 700, right: 700 },
            },
          },
          children,
        },
      ],
    }),
  );
}

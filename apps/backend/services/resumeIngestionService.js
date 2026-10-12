import crypto from 'node:crypto';
import mammoth from 'mammoth';

export const MAX_RESUME_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 120000;
export const resumeMimeTypes = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function resumeError(
  message,
  status = 400,
  code = 'RESUME_BUILD_ERROR',
) {
  return Object.assign(new Error(message), { status, code });
}

// Ingestion preserves document contents. It never identifies candidate fields or sections.
export async function ingestResume({ buffer, filename = '', mimetype = '' }) {
  if (!Buffer.isBuffer(buffer) || !buffer.length)
    throw resumeError('Upload your original resume.');
  if (buffer.length > MAX_RESUME_BYTES)
    throw resumeError('Resume uploads must be 8 MB or smaller.', 413);
  const extension = filename.toLowerCase().split('.').pop();
  const mime = resumeMimeTypes[extension];
  if (
    !mime ||
    (mimetype && mimetype !== mime && mimetype !== 'application/octet-stream')
  ) {
    throw resumeError('Upload a PDF, DOCX, TXT, PNG, JPEG or WebP resume.');
  }
  if (extension === 'pdf' && buffer.subarray(0, 5).toString() !== '%PDF-')
    throw resumeError('Invalid PDF file.');
  if (
    extension === 'docx' &&
    (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50)
  )
    throw resumeError('Invalid DOCX file.');
  if (
    mime === 'image/png' &&
    !buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw resumeError('Invalid PNG file.');
  if (mime === 'image/jpeg' && (buffer[0] !== 255 || buffer[1] !== 216))
    throw resumeError('Invalid JPEG file.');
  if (
    mime === 'image/webp' &&
    (buffer.subarray(0, 4).toString() !== 'RIFF' ||
      buffer.subarray(8, 12).toString() !== 'WEBP')
  )
    throw resumeError('Invalid WebP file.');
  let text = '';
  let warnings = [];
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
    warnings = result.messages.map((message) => message.message);
  } else if (extension === 'txt') {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  }
  if (['docx', 'txt'].includes(extension) && text.trim().length < 40) {
    throw resumeError(
      'The document has too little readable content. Upload a PDF or image for a scanned resume.',
    );
  }
  if (text.length > MAX_DOCUMENT_CHARS)
    throw resumeError(
      'This document is too long. Upload a resume with fewer than 120,000 characters.',
      413,
    );
  return {
    filename: filename.replace(/[\r\n\\/]/g, '_'),
    mimetype: mime,
    buffer,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    document: {
      kind:
        extension === 'pdf'
          ? 'pdf'
          : extension === 'docx'
            ? 'docx'
            : mime.startsWith('image/')
              ? 'image'
              : 'text',
      text,
      warnings,
    },
  };
}

export function originalDocumentInput(source) {
  if (source.document.kind === 'pdf' || source.document.kind === 'docx') {
    return [
      {
        type: 'input_file',
        filename: source.filename,
        file_data: `data:${source.mimetype};base64,${source.buffer.toString('base64')}`,
      },
    ];
  }
  if (source.document.kind === 'image') {
    return [
      {
        type: 'input_image',
        image_url: `data:${source.mimetype};base64,${source.buffer.toString('base64')}`,
        detail: 'high',
      },
    ];
  }
  return [
    {
      type: 'input_text',
      text: `COMPLETE ORIGINAL RESUME DOCUMENT\n${source.document.text}`,
    },
  ];
}

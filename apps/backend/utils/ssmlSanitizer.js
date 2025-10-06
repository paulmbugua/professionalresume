// utils/ssmlSanitizer.js

/** Get locale from Azure voice, e.g. "en-US-JennyNeural" -> "en-US" */
function getLocaleFromVoice(voiceName) {
  if (typeof voiceName !== 'string') return 'en-US';
  const parts = voiceName.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'en-US';
}

/**
 * Sanitize SSML for Azure’s parser:
 * - enforce single <speak xml:lang="...">
 * - strip nested <lang> blocks
 * - strip unknown namespaced tags/attrs (unless preserveMstts=true)
 * - escape stray &
 * - fix accidental "=="
 *
 * @param {string} ssmlIn
 * @param {object} [opts]
 * @param {string} [opts.locale]        e.g. "en-US"
 * @param {boolean} [opts.preserveMstts] keep <mstts:...> tags, add xmlns if needed
 * @returns {string}
 */
function sanitizeForAzure(ssmlIn, opts = {}) {
  const locale = opts.locale || 'en-US';
  const preserveMstts = !!opts.preserveMstts;

  let s = String(ssmlIn || '').trim();

  // 1) Remove any existing <speak> wrapper so we can re-wrap cleanly
  if (/^\s*<\s*speak[\s>]/i.test(s)) {
    s = s.replace(/^\s*<\s*speak[^>]*>/i, '').replace(/<\/\s*speak\s*>\s*$/i, '');
  }

  // 2) Remove nested <lang> blocks (multiple languages triggers Azure error)
  // Uses dotAll "s"; supported on modern Node/Chrome. If not, swap with [\s\S].
  s = s.replace(/<\s*lang\b[^>]*>.*?<\/\s*lang\s*>/gis, '');

  // 3) Handle namespaced elements/attrs
  if (!preserveMstts) {
    // Remove namespaced tags like <mstts:express-as ...> ... </mstts:express-as>
    s = s.replace(/<\s*\/?\s*[a-zA-Z0-9]+:[a-zA-Z0-9._-]+[^>]*>/g, '');
    // Remove namespaced attributes like foo:bar="..."
    s = s.replace(/\s+[a-zA-Z0-9]+:[a-zA-Z0-9._-]+\s*=\s*"[^"]*"/g, '');
  } else {
    // If preserving mstts, still drop *other* random namespaces in attrs
    s = s.replace(
      /\s+(?!mstts:)[a-zA-Z0-9]+:[a-zA-Z0-9._-]+\s*=\s*"[^"]*"/g,
      ''
    );
  }

  // 4) Escape stray & (not already an entity)
  s = s.replace(/&(?!(amp;|lt;|gt;|quot;|apos;))/g, '&amp;');

  // 5) Fix accidental "=="
  s = s.replace(/\b([a-zA-Z_:][\w:.-]*)\s*==\s*"/g, '$1="');

  // 6) Re-wrap with a clean <speak/>
  const xmlnsMstts =
    preserveMstts ? ' xmlns:mstts="https://www.w3.org/2001/mstts"' : '';
  const wrapped = `<speak version="1.0" xml:lang="${locale}"${xmlnsMstts}>${s}</speak>`;

  return wrapped;
}

/** Convenience: sanitize using locale derived from the voice name */
function sanitizeForAzureWithVoice(ssmlIn, voiceName, opts = {}) {
  return sanitizeForAzure(ssmlIn, {
    ...opts,
    locale: opts.locale || getLocaleFromVoice(voiceName),
  });
}

// ESM exports
export { sanitizeForAzure, sanitizeForAzureWithVoice, getLocaleFromVoice };

// CommonJS fallback (uncomment if your build expects require())
// module.exports = { sanitizeForAzure, sanitizeForAzureWithVoice, getLocaleFromVoice };

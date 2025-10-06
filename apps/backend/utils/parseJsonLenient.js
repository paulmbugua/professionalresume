// apps/backend/utils/parseJsonLenient.js
import { jsonrepair } from 'jsonrepair';

/**
 * Safely parse JSON that may be truncated, fenced, or slightly invalid.
 * Returns `null` if all attempts fail.
 */
export function parseJsonLenient(input) {
  if (!input) return null;

  // 1) As-is
  try { return JSON.parse(input); } catch {}

  // 2) Try fenced blocks ```json ... ```
  const fence =
    input.match(/```json\s*([\s\S]*?)```/i) ||
    input.match(/```\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try { return JSON.parse(fence[1]); } catch {}
    try { return JSON.parse(jsonrepair(fence[1])); } catch {}
  }

  // 3) jsonrepair on whole payload
  try { return JSON.parse(jsonrepair(input)); } catch {}

  // 4) Crude tail trim: try to close the last object/array
  const trimmed = input.replace(/[\s\u0000-\u001F]+$/g, '');
  try { return JSON.parse(jsonrepair(trimmed)); } catch {}

  return null;
}

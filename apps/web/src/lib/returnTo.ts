type QueryObject = { [key: string]: string | string[] | undefined };

type SearchLike = {
  get: (name: string) => string | null;
};

export const DEFAULT_RETURN_TO = '/builder';

/**
 * Avoid open redirects.
 * - Allow only internal paths like "/builder", "/templates"
 * - Disallow "https://evil.com", "//evil.com", "javascript:..."
 */
export function sanitizeInternalReturnTo(raw?: string | null, fallback = DEFAULT_RETURN_TO): string {
  const candidate = (raw || '').trim();
  if (!candidate) return fallback;

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) return fallback;
  if (candidate.startsWith('//')) return fallback;
  if (!candidate.startsWith('/')) return fallback;

  return candidate.replace(/\/{2,}/g, '/');
}

export function getReturnToFromQuery(
  query: URLSearchParams | SearchLike | QueryObject | null | undefined,
  fallback = DEFAULT_RETURN_TO,
): string {
  if (!query) return fallback;

  const readValue = (key: string): string | undefined => {
    if (query instanceof URLSearchParams) {
      return query.get(key) ?? undefined;
    }

    if (typeof (query as SearchLike).get === 'function') {
      return (query as SearchLike).get(key) ?? undefined;
    }

    const raw = (query as QueryObject)[key];
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  const candidate = readValue('returnTo') || readValue('next') || fallback;
  return sanitizeInternalReturnTo(candidate, fallback);
}

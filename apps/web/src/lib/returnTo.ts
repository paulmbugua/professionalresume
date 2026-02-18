type QueryObject = { [key: string]: string | string[] | undefined };

type SearchLike = {
  get: (name: string) => string | null;
};

export function getReturnToFromQuery(
  query: URLSearchParams | SearchLike | QueryObject | null | undefined,
  fallback = '/builder',
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

  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  if (/^https?:\/\//i.test(candidate)) return fallback;

  return candidate;
}

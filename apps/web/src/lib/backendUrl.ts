const PROD_BACKEND_URL = 'https://server.onedollarcvpro.com';
const DEV_BACKEND_URL = 'http://localhost:4000';

export function resolveBackendUrl(envValue?: string | null): string {
  const trimmed = (envValue ?? '').trim();
  if (trimmed) return trimmed.replace(/\/+$/, '');

  if (process.env.NODE_ENV === 'development') {
    return DEV_BACKEND_URL;
  }

  return PROD_BACKEND_URL;
}

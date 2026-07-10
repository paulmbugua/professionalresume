import { brand } from './brand';

const PROD_BACKEND_URL = brand.backendUrl;
const DEV_BACKEND_URL = 'http://localhost:4006';

const PRODUCTION_HOST_PATTERNS = [
  'professionalresume.co.ke',
  'www.professionalresume.co.ke',
  'server.professionalresume.co.ke',
];

const isDev = process.env.NODE_ENV !== 'production';

const normalizeUrl = (value?: string | null): string => String(value || '').trim().replace(/\/+$/, '');

const isProductionHostname = (hostname?: string): boolean => {
  const host = String(hostname || '').toLowerCase().trim();
  if (!host) return false;
  return PRODUCTION_HOST_PATTERNS.some((pattern) => host === pattern || host.endsWith(`.${pattern}`));
};

export function resolveBackendUrl(envValue?: string | null): string {
  const envUrl = normalizeUrl(envValue);
  if (envUrl) return envUrl;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (isProductionHostname(hostname)) {
    return PROD_BACKEND_URL;
  }

  if (isDev) {
    return DEV_BACKEND_URL;
  }

  return PROD_BACKEND_URL;
}

let didLogBackendResolution = false;

export function logResolvedBackendUrl(context: string, backendUrl: string) {
  if (!isDev || didLogBackendResolution) return;
  didLogBackendResolution = true;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server';
  console.info('[backend-url] resolved', {
    context,
    backendUrl,
    hostname,
    hasPublicEnv: Boolean(normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL)),
    nodeEnv: process.env.NODE_ENV,
  });
}

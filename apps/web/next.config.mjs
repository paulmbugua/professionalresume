/** @type {import('next').NextConfig} */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Helpful: proves Next sees env at startup (server-side)
console.log('[next] env check', {
  hasApiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  hasAuthDomain: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  hasProjectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  hasAppId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
});

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cvpro/shared'],

  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
    externalDir: true,
  },

  // ✅ Safety net: ensure these are always exposed to the client bundle
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  },

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@tanstack/react-query': require.resolve('@tanstack/react-query'),
      '@tanstack/query-core': require.resolve('@tanstack/query-core'),
    };
    return config;
  },
};

export default nextConfig;
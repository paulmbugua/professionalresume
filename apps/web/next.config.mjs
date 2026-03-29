/** @type {import('next').NextConfig} */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Helpful: proves Next sees env at startup (server-side)
console.log('[next] env check', {
  hasBackendUrl: Boolean(process.env.NEXT_PUBLIC_BACKEND_URL),
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
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN,
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

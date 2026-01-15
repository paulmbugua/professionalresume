/** @type {import('next').NextConfig} */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mytutorapp/shared'],

  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
    externalDir: true,
  },

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // ✅ Force a single physical instance across workspaces
      '@tanstack/react-query': require.resolve('@tanstack/react-query'),
      '@tanstack/query-core': require.resolve('@tanstack/query-core'),
    };
    return config;
  },
};

export default nextConfig;

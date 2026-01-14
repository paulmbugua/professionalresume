/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mytutorapp/shared'],
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
  },
};

export default nextConfig;

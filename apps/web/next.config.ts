import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  cacheComponents: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  transpilePackages: [
    '@carcheck/db',
    '@carcheck/cache',
    '@carcheck/shared-types',
    '@carcheck/sources',
    '@carcheck/risk-engine',
    '@carcheck/ai-analyst',
  ],
};

export default nextConfig;

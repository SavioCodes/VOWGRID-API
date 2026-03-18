import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vowgrid/contracts', '@vowgrid/ui'],
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
};

export default nextConfig;

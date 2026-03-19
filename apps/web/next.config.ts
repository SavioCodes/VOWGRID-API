import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV !== 'production';

function resolveConnectSources() {
  const sources = new Set(["'self'"]);
  const candidates = [process.env.VOWGRID_API_BASE_URL, process.env.VOWGRID_WEB_BASE_URL];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      sources.add(new URL(candidate).origin);
    } catch {
      // Ignore malformed optional local env values here. Validation happens elsewhere.
    }
  }

  return Array.from(sources);
}

function buildContentSecurityPolicy() {
  const directives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `connect-src ${resolveConnectSources().join(' ')}`,
    `font-src 'self' data: https:`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `img-src 'self' data: https:`,
    `object-src 'none'`,
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    !isDevelopment ? 'upgrade-insecure-requests' : '',
  ].filter(Boolean);

  return directives.join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@vowgrid/contracts', '@vowgrid/ui'],
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

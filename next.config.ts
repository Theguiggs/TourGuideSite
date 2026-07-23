import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  [
    "img-src 'self' data: blob:",
    'https://*.amazonaws.com',
    'https://*.tile.openstreetmap.org',
    'https://flagcdn.com',
    'https://api.qrserver.com',
  ].join(' '),
  "media-src 'self' data: blob: https://*.amazonaws.com",
  [
    "connect-src 'self'",
    'https://*.amazonaws.com',
    'wss://*.amazonaws.com',
    'https://api2.amplitude.com',
    'https://api.eu.amplitude.com',
    'https://api.stripe.com',
    'https://*.stripe.com',
    'https://api.openrouteservice.org',
    'https://nominatim.openstreetmap.org',
    ...(isDevelopment ? ['http://localhost:*', 'ws://localhost:*'] : []),
  ].join(' '),
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
].join('; ');

const nextConfig: NextConfig = {
  transpilePackages: ['@murmure/design-system'],
  output: 'standalone',
  typescript: { ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === 'true' },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), microphone=(self), geolocation=(self), payment=(self "https://js.stripe.com"), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

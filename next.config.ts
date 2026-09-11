import type { NextConfig } from 'next';

// La Content-Security-Policy ne vit PLUS ici : elle exige un nonce par requête,
// donc un en-tête calculé à la demande — voir `src/proxy.ts` et
// `src/lib/security/csp.ts`. Une politique statique posée depuis ce fichier ne
// peut pas porter de nonce, et c'est pourquoi elle portait `'unsafe-inline'`.

const nextConfig: NextConfig = {
  // Empreinte de framework offerte gratuitement aux scanners : retirée.
  poweredByHeader: false,
  transpilePackages: ['@murmure/design-system'],
  turbopack: {
    // Keep workspace detection inside this app even when a parent directory
    // contains an unrelated lockfile.
    root: process.cwd(),
  },
  output: 'standalone',
  typescript: { ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === 'true' },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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

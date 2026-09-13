import type { NextConfig } from 'next';

// La Content-Security-Policy ne vit PLUS ici : elle exige un nonce par requête,
// donc un en-tête calculé à la demande — voir `src/proxy.ts` et
// `src/lib/security/csp.ts`. Une politique statique posée depuis ce fichier ne
// peut pas porter de nonce, et c'est pourquoi elle portait `'unsafe-inline'`.

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
  async rewrites() {
    return [{ source: '/hors-ligne', destination: '/offline/fr.html' }, { source: '/en/hors-ligne', destination: '/offline/en.html' },
      ...['es', 'de', 'it', 'nl'].map(locale => ({ source: `/${locale}/hors-ligne`, destination: `/offline/${locale}.html` }))];
  },
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      // Sitemap et robots sont rendus a la demande (le client AppSync serveur
      // interdit la generation statique). Sans en-tete de cache, chaque passage
      // de robot rouvrait le catalogue entier : une heure de cache partage, et
      // une journee de service pendant la revalidation.
      {
        source: '/:file(sitemap.xml|robots.txt)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }],
      },
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

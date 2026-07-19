import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, DM_Serif_Text, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteChrome } from '@/components/SiteChrome';
import AmplifyProvider from '@/components/AmplifyProvider';
import AmplitudeProvider from '@/components/AmplitudeProvider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { DsVersionAttribute } from '@/components/DsVersionAttribute';
import { PendingTourConfirmRecovery } from '@/components/checkout/pending-tour-confirm-recovery';

// Story 1.3 — 4 familles DS auto-loadées via next/font/google.
// Chaque font écrit sa variable CSS, alignée avec les noms de tokens.css
// (--tg-font-display, --tg-font-editorial, --tg-font-sans, --tg-font-mono),
// pour que la cascade côté <html> override le `:root` du DS et que Tailwind
// (`font-display`, `font-editorial`, `font-sans`, `font-mono`) résolve sur
// la font Next hashée plutôt que sur le fallback Georgia / system-ui.
const dmSerifDisplay = DM_Serif_Display({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--tg-font-display',
  display: 'swap',
});

const dmSerifText = DM_Serif_Text({
  weight: ['400'],
  style: ['italic'],
  subsets: ['latin'],
  variable: '--tg-font-editorial',
  display: 'swap',
});

const manrope = Manrope({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--tg-font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--tg-font-mono',
  display: 'swap',
});

// OG image: opengraph-image.tsx in this directory generates the default at /opengraph-image.
// Tour pages extend metadata via generateMetadata pointing to /og/tour/[city]/[tourSlug].
export const metadata: Metadata = {
  metadataBase: new URL('https://murmure-visit.com'),
  title: {
    default: 'Murmure — Visites guidees audio immersives',
    template: '%s | Murmure',
  },
  description:
    "Decouvrez les villes autrement avec Murmure. Visites guidees audio immersives, " +
    "creees par des guides locaux passionnes. Telecharger l'app gratuite.",
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Murmure',
    url: 'https://murmure-visit.com',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Murmure — Le monde a une voix.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Murmure — Le monde a une voix.',
    description:
      "Audio guides editoriaux pour explorer les villes autrement. " +
      "Telecharger l'app gratuite.",
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Murmure',
      },
    ],
  },
  // Story 3.4 — Favicon + apple-touch-icon + manifest PWA.
  // Les binaires (favicon.svg, favicon-{32,192,512}.png, apple-touch-icon-180.png,
  // favicon.ico) sont produits par le pipeline Story 3.1 (`tg:export-icons --variant
  // light`). Tant que les `.TODO.md` placeholders dans `public/` ne sont pas
  // remplacés par les vrais binaires, ces URLs renverront 404 — voir
  // `docs/favicon-setup.md` pour la procédure manuelle de copie.
  // `src/app/favicon.ico` a été supprimé pour éviter le conflit Next.js
  // auto-detect ↔ déclaration explicite via `metadata.icons`.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-touch-icon-180.png', sizes: '180x180' },
    ],
  },
  manifest: '/manifest.json',
};

// Story 3.4 — Next.js 14+ a déplacé `themeColor` de `metadata` vers `viewport`.
// Cette valeur doit rester strictement alignée avec `tg.colors.grenadine` du
// package `@murmure/design-system/tokens` (`#C1262A`). Si Story 5.1 modifie
// la palette, rouvrir Story 3.4 pour aligner.
export const viewport: Viewport = {
  themeColor: '#C1262A',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVariables = `${dmSerifDisplay.variable} ${dmSerifText.variable} ${manrope.variable} ${jetBrainsMono.variable}`;
  return (
    // SSR default `data-ds="v2"` — Story 1.7 default safe. DsVersionAttribute
    // updates this attribute côté client après hydration si flag = 'v1'.
    <html lang="fr" data-ds="v2" className={fontVariables}>
      <body className="antialiased">
        <DsVersionAttribute>
          <AmplitudeProvider>
            <AmplifyProvider>
              <AuthProvider>
                <PendingTourConfirmRecovery />
                <SiteChrome>{children}</SiteChrome>
              </AuthProvider>
            </AmplifyProvider>
          </AmplitudeProvider>
        </DsVersionAttribute>
      </body>
    </html>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { JetBrains_Mono } from 'next/font/google';
import AuthGuard from '@/components/AuthGuard';
import { StudioLocaleProvider } from '@/lib/i18n/studio-locale';

// Seuls les écrans guide (Studio, revenus, code OTP) et admin affichent du
// `font-mono` : la police est chargée ici, pas sur le site public.
const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--tg-font-mono',
  display: 'swap',
});

const PUBLIC_GUIDE_ROUTES = new Set([
  '/guide/login',
  '/guide/signup',
  '/guide/reset-password',
]);

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  if (PUBLIC_GUIDE_ROUTES.has(pathname)) {
    // Connexion, inscription, réinitialisation : même réglage de langue que
    // le Studio (l'en-tête public y bascule par ce même stockage).
    return (
      <StudioLocaleProvider>
        <div className={jetBrainsMono.variable}>{children}</div>
      </StudioLocaleProvider>
    );
  }

  return (
    <div className={jetBrainsMono.variable}>
      <AuthGuard requireGuide>{children}</AuthGuard>
    </div>
  );
}

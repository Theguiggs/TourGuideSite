import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AmplifyProvider from '@/components/AmplifyProvider';
import { AuthProvider } from '@/lib/auth/auth-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'TourGuide — Visites guidees audio immersives',
    template: '%s | TourGuide',
  },
  description:
    "Decouvrez les villes autrement avec TourGuide. Visites guidees audio immersives, " +
    "creees par des guides locaux passionnes. Telecharger l'app gratuite.",
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'TourGuide',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} antialiased`}>
        <AmplifyProvider>
          <AuthProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </AuthProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}

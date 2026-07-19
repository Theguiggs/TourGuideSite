import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import pkg from '../../package.json';

// Story 4.2 (T6) — Footer migré : tokens DS + lexique strict (Hors-ligne, Tour),
// accents FR préservés (Télécharger, confidentialité, réservés).
interface FooterProps {
  locale?: 'fr' | 'en';
}

const FOOTER_COPY = {
  fr: {
    tagline: 'Visites guidées audio. Hors-ligne, où que vous soyez.',
    navigation: 'Navigation',
    catalogue: 'Catalogue des tours',
    help: 'Aide',
    guide: 'Devenir guide',
    privacy: 'Politique de confidentialité',
    deletion: 'Supprimer mon compte',
    download: 'Télécharger',
    rights: 'Tous droits réservés.',
  },
  en: {
    tagline: 'Audio walking tours. Offline, wherever you are.',
    navigation: 'Navigation',
    catalogue: 'Tour catalogue',
    help: 'Help',
    guide: 'Become a guide',
    privacy: 'Privacy policy',
    deletion: 'Delete my account',
    download: 'Download',
    rights: 'All rights reserved.',
  },
} as const;

export default function Footer({ locale = 'fr' }: FooterProps) {
  const year = new Date().getFullYear();
  const copy = FOOTER_COPY[locale];
  const catalogueHref = locale === 'en' ? '/en/catalogue' : '/catalogue';
  const helpHref = locale === 'en' ? '/en/help' : '/aide';
  return (
    <footer
      className="bg-ink"
      style={{ color: tg.colors.paperSoft }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3
              className="font-display mb-4"
              style={{
                color: tg.colors.paper,
                fontSize: tg.fontSize.h5,
                lineHeight: 1.2,
              }}
            >
              Murmure
            </h3>
            <p
              className="font-sans"
              style={{
                color: tg.colors.paperSoft,
                fontSize: tg.fontSize.body,
                lineHeight: 1.55,
              }}
            >
              {copy.tagline}
            </p>
          </div>
          <div>
            <h4
              className="font-sans mb-4"
              style={{
                color: tg.colors.paper,
                fontSize: tg.fontSize.bodyLg,
                fontWeight: 600,
              }}
            >
              {copy.navigation}
            </h4>
            <ul className="space-y-2" style={{ fontSize: tg.fontSize.body }}>
              <li>
                <Link
                  href={catalogueHref}
                  style={{ color: tg.colors.paperSoft }}
                  className="hover:opacity-80"
                >
                  {copy.catalogue}
                </Link>
              </li>
              <li>
                <Link
                  href={helpHref}
                  style={{ color: tg.colors.paperSoft }}
                  className="hover:opacity-80"
                >
                  {copy.help}
                </Link>
              </li>
              <li>
                <Link
                  href="/guide/signup"
                  style={{ color: tg.colors.paperSoft }}
                  className="hover:opacity-80"
                >
                  {copy.guide}
                </Link>
              </li>
              <li>
                <Link
                  href={locale === 'en' ? '/en/privacy' : '/confidentialite'}
                  style={{ color: tg.colors.paperSoft }}
                  className="hover:opacity-80"
                >
                  {copy.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={locale === 'en' ? '/en/delete-account' : '/supprimer-mon-compte'}
                  style={{ color: tg.colors.paperSoft }}
                  className="hover:opacity-80"
                >
                  {copy.deletion}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className="font-sans mb-4"
              style={{
                color: tg.colors.paper,
                fontSize: tg.fontSize.bodyLg,
                fontWeight: 600,
              }}
            >
              {copy.download}
            </h4>
            <div
              className="flex flex-col gap-2"
              style={{ fontSize: tg.fontSize.body }}
            >
              <a
                href={process.env.NEXT_PUBLIC_APP_STORE_IOS || '#'}
                style={{ color: tg.colors.paperSoft }}
                className="hover:opacity-80"
              >
                App Store (iOS)
              </a>
              <a
                href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                style={{ color: tg.colors.paperSoft }}
                className="hover:opacity-80"
              >
                Google Play (Android)
              </a>
            </div>
          </div>
        </div>
        <div
          className="mt-8 pt-8 text-center font-sans"
          style={{
            borderTop: `1px solid ${tg.colors.ink80}`,
            color: tg.colors.paperSoft,
            fontSize: tg.fontSize.body,
          }}
        >
          &copy; {year} Murmure. {copy.rights}
          <span
            style={{
              marginLeft: '1rem',
              opacity: 0.45,
              fontSize: tg.fontSize.caption ?? '0.75rem',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            v{pkg.version}
          </span>
        </div>
      </div>
    </footer>
  );
}

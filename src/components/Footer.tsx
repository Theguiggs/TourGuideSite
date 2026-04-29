import Link from 'next/link';
import { tg } from '@tourguide/design-system/tokens';

// Story 4.2 (T6) — Footer migré : tokens DS + lexique strict (Hors-ligne, Tour),
// accents FR préservés (Télécharger, confidentialité, réservés).
export default function Footer() {
  const year = new Date().getFullYear();
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
              TourGuide
            </h3>
            <p
              className="font-sans"
              style={{
                color: tg.colors.paperSoft,
                fontSize: tg.fontSize.body,
                lineHeight: 1.55,
              }}
            >
              Visites guidées audio. Hors-ligne, où que vous soyez.
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
              Navigation
            </h4>
            <ul className="space-y-2" style={{ fontSize: tg.fontSize.body }}>
              <li>
                <Link
                  href="/catalogue"
                  style={{ color: tg.colors.paperSoft }}
                  className="hover:opacity-80"
                >
                  Catalogue des tours
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy.html"
                  style={{ color: tg.colors.paperSoft }}
                  className="hover:opacity-80"
                >
                  Politique de confidentialité
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
              Télécharger
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
          &copy; {year} TourGuide. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

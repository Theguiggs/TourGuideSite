import type { Metadata } from 'next';
import TrackPageView from '@/components/TrackPageView';
import CitiesSection from '@/components/CitiesSection';
import HeroCta from './_components/HeroCta';
import { AnalyticsEvents } from '@/lib/analytics';
import { tg } from '@tourguide/design-system/tokens';
import { editorial } from '@tourguide/design-system/editorial';
import {
  Button,
  Card,
  Eyebrow,
  PullQuote,
  NumberMark,
} from '@tourguide/design-system/web';

// Story 4.2 (T7) — Override léger du title pour la home (les autres metadata
// héritent de `layout.tsx` Story 3.5, dont l'OG image `/og-default.png`).
export const metadata: Metadata = {
  title: 'TourGuide — Le monde a une voix.',
  description: 'Là où les villes se racontent, à voix basse.',
};

const VALUE_PROPS = [
  {
    n: 1,
    title: "Audio d'abord",
    body: 'Levez les yeux. Le tour vous suit, au creux de l’oreille.',
  },
  {
    n: 2,
    title: 'Voix locales',
    body: 'Chaque guide raconte sa ville comme un ami partage un secret.',
  },
  {
    n: 3,
    title: 'Hors-ligne',
    body: 'Téléchargez avant le départ. Profitez sans réseau, où que vous soyez.',
  },
] as const;

const STATS = [
  { value: '10+', label: 'Tours disponibles' },
  { value: '5+', label: 'Villes' },
  { value: '4.7', label: 'Note moyenne' },
] as const;

export default function LandingPage() {
  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_LANDING_VISIT} />

      {/* ─── Hero éditorial (AC 1, 2) ─────────────────────────────────────── */}
      <section className="bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow color={tg.colors.grenadine}>Audio guide</Eyebrow>
            <h1
              className="font-display text-h3 md:text-h2 lg:text-h1 mt-4"
              style={{ color: tg.colors.ink }}
            >
              Le monde a une voix.
            </h1>
            <PullQuote size="md" style={{ marginTop: tg.space[4] }}>
              Là où les villes se racontent, à voix basse.
            </PullQuote>
            <div className="mt-10">
              <HeroCta label={`${editorial.cta.listen} un tour gratuit`} href="/catalogue" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Value Proposition (AC 3) ────────────────────────────────────── */}
      <section className="bg-paper-soft py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 lg:text-h2 text-center mb-16"
            style={{ color: tg.colors.ink }}
          >
            Pourquoi TourGuide ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUE_PROPS.map((item) => (
              <Card key={item.n} variant="flat">
                <Card.Header style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <NumberMark n={item.n} color={tg.colors.grenadine} />
                </Card.Header>
                <Card.Body>
                  <h3
                    className="font-display"
                    style={{
                      color: tg.colors.ink,
                      fontSize: tg.fontSize.h5,
                      lineHeight: 1.2,
                      marginTop: 0,
                      marginBottom: tg.space[3],
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="font-sans"
                    style={{
                      color: tg.colors.ink80,
                      fontSize: tg.fontSize.bodyLg,
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {item.body}
                  </p>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof (AC 4) ─────────────────────────────────────────── */}
      <section className="bg-paper-soft py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Eyebrow color={tg.colors.ink60} style={{ display: 'inline-block' }}>
              En chiffres
            </Eyebrow>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div
                  className="font-display"
                  style={{
                    color: tg.colors.grenadine,
                    fontSize: tg.fontSize.h2,
                    lineHeight: 1,
                    letterSpacing: tg.tracking.display,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="font-sans mt-2"
                  style={{
                    color: tg.colors.ink60,
                    fontSize: tg.fontSize.body,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Cities Preview (hors scope 4.2 — Story 4.3 owns) ─────────────── */}
      <CitiesSection />

      {/* ─── Final CTA color-block grenadine (AC 5) ───────────────────────── */}
      <section
        className="bg-grenadine py-20 text-center"
        style={{ color: tg.colors.paper }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 lg:text-h2 mb-6"
            style={{ color: tg.colors.paper }}
          >
            Prêt à écouter ?
          </h2>
          <p
            className="font-editorial italic mb-10"
            style={{
              color: tg.colors.paper,
              fontSize: tg.fontSize.h6,
              lineHeight: 1.4,
            }}
          >
            Une ville, un casque, et plus rien d&apos;autre.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              href={process.env.NEXT_PUBLIC_APP_STORE_IOS || '#'}
              variant="primary"
              size="lg"
              accessibilityLabel="Télécharger sur l’App Store"
            >
              App Store
            </Button>
            <Button
              href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
              variant="primary"
              size="lg"
              accessibilityLabel="Télécharger sur Google Play"
            >
              Google Play
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

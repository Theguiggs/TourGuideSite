import type { Metadata } from 'next';
import Link from 'next/link';
import TrackPageView from '@/components/TrackPageView';
import CitiesSection from '@/components/CitiesSection';
import HeroCta from './_components/HeroCta';
import { AnalyticsEvents } from '@/lib/analytics';
import { tg } from '@murmure/design-system/tokens';
import {
  Button,
  Card,
  Eyebrow,
  PullQuote,
  NumberMark,
} from '@murmure/design-system/web';

// Story 4.6 — Pivot guide-first. La home s'adresse d'abord aux créateurs (guides)
// puis sert de référence secondaire aux voyageurs (qui vivent l'expérience dans l'app).
// metadata (AC6) — les autres champs (OG image, etc.) héritent de `layout.tsx`.
export const metadata: Metadata = {
  title: 'Murmure — Créez des visites audio de votre ville',
  description:
    'Donnez de la voix à votre ville. Créez, traduisez et publiez vos parcours audio ; les voyageurs les écoutent partout, même hors-ligne.',
};

// AC2 — étapes de création, liées aux ancres de la page d'aide.
const STEPS = [
  {
    n: 1,
    title: 'Créez',
    body: 'Un titre, une ville. Votre parcours est né.',
    href: '/aide#creer',
  },
  {
    n: 2,
    title: 'Tracez',
    body: "Posez vos points d'intérêt sur la carte, l'itinéraire se dessine.",
    href: '/aide#tracer',
  },
  {
    n: 3,
    title: 'Racontez',
    body: 'Écrivez, enregistrez, ou laissez la voix de synthèse lire votre texte.',
    href: '/aide#raconter',
  },
  {
    n: 4,
    title: 'Publiez',
    body: 'Traduisez en un clic, soumettez, et votre tour part dans le monde.',
    href: '/aide#publier',
  },
] as const;

// AC3 — bénéfices côté guide.
const BENEFITS = [
  {
    title: 'Vos revenus',
    body: 'Vous touchez une part majoritaire de chaque vente. Suivez vos gains en direct.',
  },
  {
    title: 'Votre voix, vos règles',
    body: 'Choisissez vos lieux, votre ton, votre histoire. Aucune ligne éditoriale imposée.',
  },
  {
    title: 'Une audience mondiale',
    body: "Votre tour vit dans le catalogue web et l'app, traduit en plusieurs langues.",
  },
  {
    title: 'Des outils intégrés',
    body: 'Carte, voix de synthèse, traduction automatique, transcription : tout est dans l’atelier.',
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_LANDING_VISIT} />

      {/* ─── Hero guide-first (AC1) ───────────────────────────────────────── */}
      <section className="bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow color={tg.colors.grenadine}>Créateurs Murmure</Eyebrow>
            <h1
              className="font-display text-h3 md:text-h2 lg:text-h1 mt-4"
              style={{ color: tg.colors.ink }}
            >
              Donnez de la voix à votre ville.
            </h1>
            <PullQuote size="md" style={{ marginTop: tg.space[4] }}>
              Votre connaissance devient un parcours audio que le monde écoute.
            </PullQuote>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <HeroCta label="Devenir guide" href="/guide/signup" />
              <Button
                href="/aide"
                variant="ghost"
                size="lg"
                accessibilityLabel="Comment ça marche — guide complet"
              >
                Comment ça marche
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comment ça marche (AC2) ──────────────────────────────────────── */}
      <section className="bg-paper-soft py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 lg:text-h2 text-center mb-4"
            style={{ color: tg.colors.ink }}
          >
            Comment ça marche
          </h2>
          <p
            className="font-sans text-center mb-16 mx-auto"
            style={{
              color: tg.colors.ink60,
              fontSize: tg.fontSize.bodyLg,
              maxWidth: '40rem',
            }}
          >
            Quatre étapes pour transformer ce que vous connaissez en parcours
            audio. Cliquez pour le détail.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <Link key={step.n} href={step.href} className="no-underline group">
                <Card variant="flat">
                  <Card.Header style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <NumberMark n={step.n} color={tg.colors.grenadine} />
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
                      {step.title}
                    </h3>
                    <p
                      className="font-sans"
                      style={{
                        color: tg.colors.ink80,
                        fontSize: tg.fontSize.body,
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {step.body}
                    </p>
                  </Card.Body>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pourquoi créer sur Murmure ? (AC3) ───────────────────────────── */}
      <section className="bg-paper py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 lg:text-h2 text-center mb-16"
            style={{ color: tg.colors.ink }}
          >
            Pourquoi créer sur Murmure ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((item) => (
              <Card key={item.title} variant="flat">
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
                      fontSize: tg.fontSize.body,
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

      {/* ─── Bloc voyageur secondaire (AC4) ───────────────────────────────── */}
      <section className="bg-paper-soft py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Eyebrow color={tg.colors.ink60} style={{ display: 'inline-block' }}>
            Vous êtes voyageur ?
          </Eyebrow>
          <p
            className="font-editorial italic mt-4 mb-8 mx-auto"
            style={{
              color: tg.colors.ink80,
              fontSize: tg.fontSize.h6,
              lineHeight: 1.4,
              maxWidth: '36rem',
            }}
          >
            Murmure se vit surtout dans l’app. Téléchargez vos tours et écoutez,
            même hors-ligne.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              href="/catalogue"
              variant="ghost"
              size="md"
              accessibilityLabel="Voir le catalogue des tours"
            >
              Voir le catalogue
            </Button>
            <Button
              href={process.env.NEXT_PUBLIC_APP_STORE_IOS || '#'}
              variant="primary"
              size="md"
              accessibilityLabel="Télécharger sur l’App Store"
            >
              App Store
            </Button>
            <Button
              href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
              variant="primary"
              size="md"
              accessibilityLabel="Télécharger sur Google Play"
            >
              Google Play
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Aperçu des villes (conservé, hors scope rédactionnel) ────────── */}
      <CitiesSection />

      {/* ─── Color-block final grenadine (AC5) ────────────────────────────── */}
      <section
        className="bg-grenadine py-20 text-center"
        style={{ color: tg.colors.paper }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 lg:text-h2 mb-6"
            style={{ color: tg.colors.paper }}
          >
            Prêt à faire entendre votre ville ?
          </h2>
          <p
            className="font-editorial italic mb-10"
            style={{
              color: tg.colors.paper,
              fontSize: tg.fontSize.h6,
              lineHeight: 1.4,
            }}
          >
            Une histoire, une voix, et le monde qui écoute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              href="/guide/signup"
              variant="primary"
              size="lg"
              accessibilityLabel="Créer mon premier parcours"
            >
              Créer mon premier parcours
            </Button>
            <Link
              href="/aide"
              className="font-sans no-underline hover:opacity-80"
              style={{
                color: tg.colors.paper,
                fontSize: tg.fontSize.body,
                fontWeight: 600,
              }}
            >
              Lire le guide complet
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

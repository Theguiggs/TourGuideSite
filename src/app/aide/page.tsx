import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Button, Eyebrow, PullQuote } from '@murmure/design-system/web';
import StepCard from './_components/StepCard';
import Faq from './_components/Faq';
import {
  STEPS,
  TIPS,
  FAQ_GUIDES,
  FAQ_VOYAGEURS,
  SUPPORT_EMAIL,
} from './_content';

// Story 4.6 — Page d'aide : explique le site et la création de parcours.
export const metadata: Metadata = {
  title: 'Aide — Murmure',
  description:
    'Le guide complet de Murmure : créez un parcours audio étape par étape, et trouvez les réponses aux questions des guides comme des voyageurs.',
  alternates: {
    canonical: '/aide',
    languages: {fr: '/aide', en: '/en/help'},
  },
};

export default function AidePage() {
  return (
    <>
      {/* ─── Hero (AC7) ───────────────────────────────────────────────────── */}
      <section className="bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Eyebrow color={tg.colors.grenadine}>Centre d’aide</Eyebrow>
            <h1
              className="font-display text-h3 md:text-h2 mt-4"
              style={{ color: tg.colors.ink }}
            >
              Tout pour créer, écouter, partager.
            </h1>
            <PullQuote size="md" style={{ marginTop: tg.space[4] }}>
              Le guide complet de Murmure — pour les créateurs comme pour les
              voyageurs.
            </PullQuote>
          </div>
        </div>
      </section>

      {/* ─── Qu'est-ce que Murmure ? (AC8) ────────────────────────────────── */}
      <section className="bg-paper-soft py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 mb-6"
            style={{ color: tg.colors.ink }}
          >
            Qu’est-ce que Murmure ?
          </h2>
          <p
            className="font-sans"
            style={{
              color: tg.colors.ink80,
              fontSize: tg.fontSize.bodyLg,
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            Murmure, ce sont des visites guidées audio. Les voyageurs écoutent
            des parcours immersifs dans l’app, même hors-ligne. Les guides créent
            ces parcours dans l’atelier web, sans compétence technique.
          </p>
        </div>
      </section>

      {/* ─── Créer un parcours, étape par étape (AC9) ─────────────────────── */}
      <section className="bg-paper py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 mb-4 text-center"
            style={{ color: tg.colors.ink }}
          >
            Créer un parcours, étape par étape
          </h2>
          <p
            className="font-sans text-center mb-12 mx-auto"
            style={{
              color: tg.colors.ink60,
              fontSize: tg.fontSize.bodyLg,
              maxWidth: '40rem',
            }}
          >
            De l’idée à la publication, voici le chemin complet dans l’atelier.
          </p>
          <div className="flex flex-col gap-6">
            {STEPS.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button
              href="/guide/studio/nouveau"
              variant="accent"
              size="lg"
              accessibilityLabel="Créer mon parcours dans l’atelier"
            >
              Créer mon parcours
            </Button>
            <p
              className="font-sans mt-3"
              style={{ color: tg.colors.ink60, fontSize: tg.fontSize.caption }}
            >
              Pas encore de compte ?{' '}
              <Link
                href="/guide/signup"
                style={{ color: tg.colors.grenadine, fontWeight: 600 }}
              >
                Devenir guide
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Conseils (AC10) ──────────────────────────────────────────────── */}
      <section className="bg-paper-soft py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 mb-8"
            style={{ color: tg.colors.ink }}
          >
            Conseils pour un parcours réussi
          </h2>
          <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {TIPS.map((tip) => (
              <li
                key={tip}
                className="font-sans"
                style={{
                  color: tg.colors.ink80,
                  fontSize: tg.fontSize.bodyLg,
                  lineHeight: 1.55,
                  paddingLeft: tg.space[5],
                  position: 'relative',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: tg.colors.grenadine,
                    fontWeight: 700,
                  }}
                >
                  →
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── FAQ (AC11) ───────────────────────────────────────────────────── */}
      <section className="bg-paper py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 mb-10 text-center"
            style={{ color: tg.colors.ink }}
          >
            Questions fréquentes
          </h2>

          <h3
            className="font-display mb-2"
            style={{ color: tg.colors.ink, fontSize: tg.fontSize.h5 }}
          >
            Pour les guides
          </h3>
          <Faq items={FAQ_GUIDES} />

          <h3
            className="font-display mb-2 mt-12"
            style={{ color: tg.colors.ink, fontSize: tg.fontSize.h5 }}
          >
            Pour les voyageurs
          </h3>
          <Faq items={FAQ_VOYAGEURS} />
        </div>
      </section>

      {/* ─── Besoin d'aide ? (AC12) ───────────────────────────────────────── */}
      <section
        className="bg-grenadine py-20 text-center"
        style={{ color: tg.colors.paper }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="font-display text-h4 md:text-h3 mb-6"
            style={{ color: tg.colors.paper }}
          >
            Besoin d’aide ?
          </h2>
          <p
            className="font-editorial italic mb-10"
            style={{
              color: tg.colors.paper,
              fontSize: tg.fontSize.h6,
              lineHeight: 1.4,
            }}
          >
            Une question qui n’a pas sa réponse ici ? Écrivez-nous.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              href={`mailto:${SUPPORT_EMAIL}`}
              variant="primary"
              size="lg"
              accessibilityLabel="Contacter le support par e-mail"
            >
              Contacter le support
            </Button>
            <Link
              href="/catalogue"
              className="font-sans no-underline hover:opacity-80"
              style={{
                color: tg.colors.paper,
                fontSize: tg.fontSize.body,
                fontWeight: 600,
              }}
            >
              Voir le catalogue
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

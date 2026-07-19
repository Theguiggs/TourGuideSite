import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Button, Eyebrow, PullQuote } from '@murmure/design-system/web';
import StepCard from '../../aide/_components/StepCard';
import Faq from '../../aide/_components/Faq';
import { FAQ_GUIDES, FAQ_TRAVELLERS, STEPS, SUPPORT_EMAIL, TIPS } from './_content';

export const metadata: Metadata = {
  title: 'Help - Murmure',
  description: 'Learn how to create, translate, publish and listen to multilingual Murmure audio tours.',
  alternates: {
    canonical: '/en/help',
    languages: {fr: '/aide', en: '/en/help'},
  },
  openGraph: {locale: 'en_US'},
};

export default function EnglishHelpPage() {
  return (
    <>
      <section className="bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Eyebrow color={tg.colors.grenadine}>Help centre</Eyebrow>
            <h1 className="font-display text-h3 md:text-h2 mt-4" style={{color: tg.colors.ink}}>
              Everything you need to create, listen and share.
            </h1>
            <PullQuote size="md" style={{marginTop: tg.space[4]}}>
              The complete Murmure guide for creators and travellers.
            </PullQuote>
          </div>
        </div>
      </section>

      <section className="bg-paper-soft py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 mb-6" style={{color: tg.colors.ink}}>What is Murmure?</h2>
          <p className="font-sans" style={{color: tg.colors.ink80, fontSize: tg.fontSize.bodyLg, lineHeight: 1.65}}>
            Murmure offers immersive audio walking tours. Travellers listen in the mobile app, even offline, while guides create and translate tours in the web studio.
          </p>
        </div>
      </section>

      <section className="bg-paper py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 mb-4 text-center" style={{color: tg.colors.ink}}>Create a tour, step by step</h2>
          <p className="font-sans text-center mb-12" style={{color: tg.colors.ink60, fontSize: tg.fontSize.bodyLg}}>From the first idea to publication in seven clear steps.</p>
          <div className="flex flex-col gap-6">
            {STEPS.map((step) => <StepCard key={step.id} step={step} locale="en" />)}
          </div>
          <div className="mt-12 text-center">
            <Button href="/guide/studio/nouveau" variant="accent" size="lg" accessibilityLabel="Create a tour in the studio">Create my tour</Button>
          </div>
        </div>
      </section>

      <section className="bg-paper-soft py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 mb-8" style={{color: tg.colors.ink}}>Tips for a successful tour</h2>
          <ul className="space-y-3">
            {TIPS.map((tip) => <li key={tip} className="font-sans text-ink-80">• {tip}</li>)}
          </ul>
        </div>
      </section>

      <section className="bg-paper py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 mb-10 text-center" style={{color: tg.colors.ink}}>Frequently asked questions</h2>
          <h3 className="font-display mb-2" style={{color: tg.colors.ink, fontSize: tg.fontSize.h5}}>For guides</h3>
          <Faq items={FAQ_GUIDES} />
          <h3 className="font-display mb-2 mt-12" style={{color: tg.colors.ink, fontSize: tg.fontSize.h5}}>For travellers</h3>
          <Faq items={FAQ_TRAVELLERS} />
        </div>
      </section>

      <section className="bg-grenadine py-20 text-center" style={{color: tg.colors.paper}}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 mb-6" style={{color: tg.colors.paper}}>Need more help?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button href={`mailto:${SUPPORT_EMAIL}`} variant="primary" size="lg" accessibilityLabel="Contact support by email">Contact support</Button>
            <Link href="/en/catalogue" className="font-sans no-underline hover:opacity-80" style={{color: tg.colors.paper, fontWeight: 600}}>Browse the catalogue</Link>
          </div>
        </div>
      </section>
    </>
  );
}

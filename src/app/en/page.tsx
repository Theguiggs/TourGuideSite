import type { Metadata } from 'next';
import Link from 'next/link';
import TrackPageView from '@/components/TrackPageView';
import CitiesSection from '@/components/CitiesSection';
import HeroCta from '../_components/HeroCta';
import { AnalyticsEvents } from '@/lib/analytics';
import { tg } from '@murmure/design-system/tokens';
import { Button, Card, Eyebrow, NumberMark, PullQuote } from '@murmure/design-system/web';

export const metadata: Metadata = {
  title: 'Murmure - Create audio tours of your city',
  description:
    'Give your city a voice. Create, translate and publish audio tours for travellers to enjoy, even offline.',
  alternates: {
    canonical: '/en',
    languages: {fr: '/', en: '/en'},
  },
  openGraph: {locale: 'en_US'},
};

const STEPS = [
  {n: 1, title: 'Create', body: 'Choose a title and a city. Your tour is born.', href: '/en/help#create'},
  {n: 2, title: 'Map', body: 'Place your points of interest and shape the route.', href: '/en/help#map'},
  {n: 3, title: 'Tell', body: 'Write, record, or let a synthetic voice narrate your text.', href: '/en/help#tell'},
  {n: 4, title: 'Publish', body: 'Translate, submit and share your tour with the world.', href: '/en/help#publish'},
] as const;

const BENEFITS = [
  {title: 'Your revenue', body: 'Receive a majority share of every sale and monitor your earnings.'},
  {title: 'Your voice, your rules', body: 'Choose the places, tone and stories that make your city unique.'},
  {title: 'A worldwide audience', body: 'Your tour lives in the web and app catalogues in multiple languages.'},
  {title: 'Built-in tools', body: 'Maps, transcription, translation and text-to-speech all live in one studio.'},
] as const;

export default function EnglishLandingPage() {
  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_LANDING_VISIT} />

      <section className="bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow color={tg.colors.grenadine}>Murmure creators</Eyebrow>
            <h1 className="font-display text-h3 md:text-h2 lg:text-h1 mt-4" style={{color: tg.colors.ink}}>
              Give your city a voice.
            </h1>
            <PullQuote size="md" style={{marginTop: tg.space[4]}}>
              Turn your local knowledge into an audio journey for the world to hear.
            </PullQuote>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <HeroCta label="Become a guide" href="/guide/signup" />
              <Button href="/en/help" variant="ghost" size="lg" accessibilityLabel="Read the complete guide">
                How it works
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper-soft py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 lg:text-h2 text-center mb-4" style={{color: tg.colors.ink}}>
            How it works
          </h2>
          <p className="font-sans text-center mb-16 mx-auto" style={{color: tg.colors.ink60, fontSize: tg.fontSize.bodyLg, maxWidth: '40rem'}}>
            Four steps turn what you know into an audio tour.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <Link key={step.n} href={step.href} className="no-underline group">
                <Card variant="flat">
                  <Card.Header style={{borderBottom: 'none', paddingBottom: 0}}>
                    <NumberMark n={step.n} color={tg.colors.grenadine} />
                  </Card.Header>
                  <Card.Body>
                    <h3 className="font-display" style={{color: tg.colors.ink, fontSize: tg.fontSize.h5, marginTop: 0, marginBottom: tg.space[3]}}>{step.title}</h3>
                    <p className="font-sans" style={{color: tg.colors.ink80, lineHeight: 1.55, margin: 0}}>{step.body}</p>
                  </Card.Body>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 lg:text-h2 text-center mb-16" style={{color: tg.colors.ink}}>
            Why create with Murmure?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((item) => (
              <Card key={item.title} variant="flat">
                <Card.Body>
                  <h3 className="font-display" style={{color: tg.colors.ink, fontSize: tg.fontSize.h5, margin: 0, marginBottom: tg.space[3]}}>{item.title}</h3>
                  <p className="font-sans" style={{color: tg.colors.ink80, lineHeight: 1.55, margin: 0}}>{item.body}</p>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper-soft py-20 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow color={tg.colors.ink60}>Travelling?</Eyebrow>
          <p className="font-editorial italic mt-4 mb-8" style={{color: tg.colors.ink80, fontSize: tg.fontSize.h6}}>
            Discover tours in the app and listen wherever you go, even offline.
          </p>
          <Button href="/en/catalogue" variant="ghost" size="md" accessibilityLabel="Browse the tour catalogue">
            Browse the catalogue
          </Button>
        </div>
      </section>

      <CitiesSection locale="en" />

      <section className="bg-grenadine py-20 text-center" style={{color: tg.colors.paper}}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-h4 md:text-h3 lg:text-h2 mb-6" style={{color: tg.colors.paper}}>
            Ready to make your city heard?
          </h2>
          <p className="font-editorial italic mb-10" style={{fontSize: tg.fontSize.h6}}>
            One story, one voice, and a world ready to listen.
          </p>
          <HeroCta label="Create my first tour" href="/guide/signup" />
        </div>
      </section>
    </>
  );
}

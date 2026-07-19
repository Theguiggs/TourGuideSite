import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';
import { LegalLanguageSwitcher } from '@/components/legal/LegalLanguageSwitcher';

export const metadata: Metadata = {
  title: 'Terms of use - Murmure',
  description: 'Terms governing use of the Murmure app and web studio.',
  alternates: {
    canonical: '/en/terms',
    languages: { fr: '/cgu', en: '/en/terms' },
  },
};

const CONTACT_EMAIL = 'tourguideyeup@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: tg.space[10] }}>
      <h2
        className="font-display"
        style={{ color: tg.colors.ink, fontSize: tg.fontSize.h5, marginBottom: tg.space[3] }}
      >
        {title}
      </h2>
      <div className="font-sans" style={{ color: tg.colors.ink80, lineHeight: 1.65 }}>
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Eyebrow color={tg.colors.grenadine}>Legal information</Eyebrow>
          <h1 className="font-display text-h3 md:text-h2 mt-4" style={{ color: tg.colors.ink }}>
            Terms of use
          </h1>
          <p className="font-sans mt-4" style={{ color: tg.colors.ink60 }}>
            Last updated: July 2, 2026
          </p>
          <LegalLanguageSwitcher locale="en" frenchHref="/cgu" englishHref="/en/terms" />
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Section title="1. Purpose">
            <p>
              These terms govern access to and use of the Murmure mobile app and web studio (the
              Service), provided by [TO BE COMPLETED: legal name]. By using the Service, you accept
              these terms.
            </p>
          </Section>
          <Section title="2. Service">
            <p>
              Travellers can listen to audio tours, including offline. Guides can create and publish
              tours through the web studio. Some features or tours are free and others are paid.
            </p>
          </Section>
          <Section title="3. Account">
            <p>
              An account may be required for some features. You are responsible for accurate
              information, keeping credentials confidential and meeting the applicable minimum age.
            </p>
          </Section>
          <Section title="4. Creator content">
            <p>
              Guides remain responsible for their recordings, text, images and locations and must
              hold the necessary rights. Content may be moderated, refused or removed when it breaks
              these terms or the law.
            </p>
          </Section>
          <Section title="5. Intellectual property">
            <p>
              The Murmure service, brand, design and software are protected. No ownership rights are
              transferred except for licences expressly granted for operating the Service.
            </p>
          </Section>
          <Section title="6. Purchases and subscriptions">
            <p>
              Mobile purchases are processed by Apple or Google and web purchases by Stripe.
              Subscriptions renew until cancelled through the relevant platform. Refunds follow the
              payment platform rules and applicable consumer law.
            </p>
          </Section>
          <Section title="7. Acceptable use">
            <p>
              You must not misuse the Service, seek unauthorised access, or publish illegal,
              misleading or rights-infringing content.
            </p>
          </Section>
          <Section title="8. Liability and safety">
            <p>
              The Service is provided as available. Audio tours use location information; remain
              aware of traffic, signs, restricted areas and your surroundings while walking.
            </p>
          </Section>
          <Section title="9. Personal data">
            <p>
              Our handling of personal data is described in the{' '}
              <Link href="/en/privacy" style={{ color: tg.colors.grenadine, fontWeight: 600 }}>
                privacy policy
              </Link>
              .
            </p>
          </Section>
          <Section title="10. Termination">
            <p>
              You may stop using Murmure and delete your account at any time. Access may be suspended
              or closed when these terms are breached.
            </p>
          </Section>
          <Section title="11. Governing law">
            <p>
              These terms are governed by [TO BE COMPLETED: applicable law]. Parties will first seek
              an amicable resolution before using the competent courts.
            </p>
          </Section>
          <Section title="12. Contact">
            <p>
              Questions can be sent to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </section>
    </>
  );
}

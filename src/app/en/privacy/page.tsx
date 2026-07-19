import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';
import { LegalLanguageSwitcher } from '@/components/legal/LegalLanguageSwitcher';

export const metadata: Metadata = {
  title: 'Privacy policy - Murmure',
  description: 'How Murmure collects, uses and protects your personal data.',
  alternates: {
    canonical: '/en/privacy',
    languages: { fr: '/confidentialite', en: '/en/privacy' },
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
      <div
        className="font-sans"
        style={{ color: tg.colors.ink80, fontSize: tg.fontSize.body, lineHeight: 1.65 }}
      >
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Eyebrow color={tg.colors.grenadine}>Legal information</Eyebrow>
          <h1 className="font-display text-h3 md:text-h2 mt-4" style={{ color: tg.colors.ink }}>
            Privacy policy
          </h1>
          <p className="font-sans mt-4" style={{ color: tg.colors.ink60 }}>
            Last updated: July 2, 2026
          </p>
          <LegalLanguageSwitcher
            locale="en"
            frenchHref="/confidentialite"
            englishHref="/en/privacy"
          />
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p
            className="font-sans"
            style={{ color: tg.colors.ink80, fontSize: tg.fontSize.bodyLg, lineHeight: 1.65 }}
          >
            Murmure provides audio walking tours through a mobile app, including offline use, and a
            web studio for creators. This policy explains what data we process and how you remain in
            control.
          </p>

          <Section title="1. Data controller">
            <p>
              The data controller is [TO BE COMPLETED: legal name, legal form, registration number
              and registered address]. Contact:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Data we collect">
            <ul style={{ paddingLeft: tg.space[5], margin: 0 }}>
              <li><strong>Account:</strong> email address and account identifier.</li>
              <li><strong>Payments:</strong> purchase and subscription status. Card details are handled by payment providers.</li>
              <li><strong>Creator content:</strong> recordings, text, photos and points of interest, including location data.</li>
              <li><strong>Usage:</strong> technical events, diagnostics and aggregated analytics.</li>
              <li><strong>Location:</strong> precise location while a tour or creator capture is actively in use.</li>
            </ul>
          </Section>

          <Section title="3. Purposes and legal bases">
            <p>
              We process data to provide the service and perform our contract, improve and secure
              Murmure based on our legitimate interests, meet legal obligations, and send optional
              communications where you have consented.
            </p>
          </Section>

          <Section title="4. Service providers">
            <p>
              We use Amazon Web Services for hosting, authentication and storage; Stripe,
              RevenueCat, Apple and Google for payments; and analytics, notification and diagnostic
              providers. They only receive data needed for their services.
            </p>
          </Section>

          <Section title="5. Retention">
            <p>
              Account data is retained while the account is active, then deleted or anonymised.
              Billing records may be retained for statutory accounting periods. [TO BE COMPLETED:
              precise retention periods by category.]
            </p>
          </Section>

          <Section title="6. International transfers">
            <p>
              Where data is processed outside the European Economic Area, transfers rely on an
              adequacy decision or appropriate safeguards such as standard contractual clauses.
            </p>
          </Section>

          <Section title="7. Your rights">
            <p>
              You may request access, correction, deletion, restriction, objection or portability
              by contacting{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              . You may also lodge a complaint with your local data protection authority.
            </p>
          </Section>

          <Section title="8. Delete your account">
            <p>
              In the Murmure app, open <strong>Settings</strong>, then <strong>Personal data</strong>
              and choose <strong>Delete my account</strong>. If you cannot access the app, use the{' '}
              <Link href="/en/delete-account" style={{ color: tg.colors.grenadine }}>
                account deletion request page
              </Link>
              .
            </p>
          </Section>

          <Section title="9. Local storage and cookies">
            <p>
              The web portal uses browser storage to maintain your session and preferences. Murmure
              does not use advertising cookies. [TO BE COMPLETED: audience measurement details.]
            </p>
          </Section>

          <Section title="10. Security">
            <p>
              We use encryption in transit, access controls and secured hosting. No system can be
              guaranteed completely secure, so users should also choose a strong password.
            </p>
          </Section>

          <Section title="11. Changes and contact">
            <p>
              Material changes will be shown on this page with an updated date. Questions can be
              sent to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <p className="font-sans" style={{ marginTop: tg.space[10] }}>
            <Link href="/en/terms" style={{ color: tg.colors.grenadine, fontWeight: 600 }}>
              Read the terms of use
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

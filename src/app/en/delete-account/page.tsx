import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';
import { LegalLanguageSwitcher } from '@/components/legal/LegalLanguageSwitcher';

export const metadata: Metadata = {
  title: 'Delete my account - Murmure',
  description: 'Request deletion of your Murmure account and associated data.',
  alternates: {
    canonical: '/en/delete-account',
    languages: { fr: '/supprimer-mon-compte', en: '/en/delete-account' },
  },
};

const SUPPORT_EMAIL = 'tourguideyeup@gmail.com';

export default function DeleteAccountPage() {
  const emailSubject = encodeURIComponent('Murmure account deletion request');
  const emailBody = encodeURIComponent(
    'Hello,\n\nI would like to delete my Murmure account.\n\nAccount email address: \n\nThank you.',
  );

  return (
    <>
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Eyebrow color={tg.colors.grenadine}>Personal data</Eyebrow>
          <h1 className="font-display text-h3 md:text-h2 mt-4" style={{ color: tg.colors.ink }}>
            Delete my account
          </h1>
          <p
            className="font-sans mt-6"
            style={{ color: tg.colors.ink80, fontSize: tg.fontSize.bodyLg, lineHeight: 1.65 }}
          >
            You can permanently delete your Murmure account and its associated data.
          </p>
          <LegalLanguageSwitcher
            locale="en"
            frenchHref="/supprimer-mon-compte"
            englishHref="/en/delete-account"
          />
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-display text-h5" style={{ color: tg.colors.ink }}>
            From the app
          </h2>
          <p className="font-sans mt-4" style={{ color: tg.colors.ink80, lineHeight: 1.65 }}>
            Sign in, open <strong>Settings</strong>, then <strong>Personal data</strong>, and choose
            <strong> Delete my account</strong>. Deletion is irreversible and a confirmation is sent
            by email.
          </p>

          <h2 className="font-display text-h5 mt-12" style={{ color: tg.colors.ink }}>
            If you can no longer access the app
          </h2>
          <p className="font-sans mt-4" style={{ color: tg.colors.ink80, lineHeight: 1.65 }}>
            Send the request from the email address associated with your account. We will verify
            your identity before deleting it. Information that must be retained for legal reasons,
            such as some billing records, remains stored for the applicable retention period.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${emailSubject}&body=${emailBody}`}
            className="inline-flex mt-6 font-sans no-underline hover:opacity-80"
            style={{ color: tg.colors.grenadine, fontWeight: 600 }}
          >
            Request deletion by email
          </a>

          <p className="font-sans mt-12" style={{ color: tg.colors.ink80 }}>
            <Link href="/en/privacy" style={{ color: tg.colors.grenadine, fontWeight: 600 }}>
              Read the privacy policy
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';

export const metadata: Metadata = {
  title: 'Supprimer mon compte - Murmure',
  description: 'Demandez la suppression de votre compte Murmure et de vos donnees associees.',
};

const SUPPORT_EMAIL = 'tourguideyeup@gmail.com';

export default function AccountDeletionPage() {
  const emailSubject = encodeURIComponent('Demande de suppression de compte Murmure');
  const emailBody = encodeURIComponent(
    'Bonjour,\n\nJe demande la suppression de mon compte Murmure.\n\nAdresse e-mail du compte : \n\nMerci.',
  );

  return (
    <>
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Eyebrow color={tg.colors.grenadine}>Donnees personnelles</Eyebrow>
          <h1 className="font-display text-h3 md:text-h2 mt-4" style={{ color: tg.colors.ink }}>
            Supprimer mon compte
          </h1>
          <p
            className="font-sans mt-6"
            style={{ color: tg.colors.ink80, fontSize: tg.fontSize.bodyLg, lineHeight: 1.65 }}
          >
            Vous pouvez supprimer definitivement votre compte Murmure et les donnees associees.
          </p>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-display text-h5" style={{ color: tg.colors.ink }}>
            Depuis l&apos;application
          </h2>
          <p className="font-sans mt-4" style={{ color: tg.colors.ink80, lineHeight: 1.65 }}>
            Connectez-vous, ouvrez <strong>Reglages</strong>, puis <strong>Donnees personnelles</strong>
            et choisissez <strong>Supprimer mon compte</strong>. La suppression est irreversible et
            une confirmation est envoyee par e-mail.
          </p>

          <h2 className="font-display text-h5 mt-12" style={{ color: tg.colors.ink }}>
            Si vous ne pouvez plus acceder a l&apos;application
          </h2>
          <p className="font-sans mt-4" style={{ color: tg.colors.ink80, lineHeight: 1.65 }}>
            Envoyez une demande depuis l&apos;adresse e-mail associee au compte. Nous verifierons votre
            identite avant de supprimer le compte. Les elements que nous devons conserver pour des
            obligations legales, comme certaines donnees de facturation, restent conserves selon les
            durees applicables.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${emailSubject}&body=${emailBody}`}
            className="inline-flex mt-6 font-sans no-underline hover:opacity-80"
            style={{ color: tg.colors.grenadine, fontWeight: 600 }}
          >
            Demander la suppression par e-mail
          </a>

          <p className="font-sans mt-12" style={{ color: tg.colors.ink80 }}>
            <Link href="/confidentialite" style={{ color: tg.colors.grenadine, fontWeight: 600 }}>
              Consulter la politique de confidentialite
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';
import { LegalLanguageSwitcher } from '@/components/legal/LegalLanguageSwitcher';

/**
 * Politique de confidentialité — page légale RGPD.
 *
 * Prérequis de validation store (Apple / Google exigent une URL de politique
 * de confidentialité accessible publiquement). Le contenu ci-dessous est une
 * base structurée : les mentions marquées [À COMPLÉTER] doivent être renseignées
 * (raison sociale, SIREN, adresse du responsable de traitement) et l’ensemble
 * relu par un juriste avant soumission.
 */
export const metadata: Metadata = {
  title: 'Politique de confidentialité — Murmure',
  description:
    'Comment Murmure collecte, utilise et protège vos données personnelles, et comment exercer vos droits RGPD.',
  alternates: {
    canonical: '/confidentialite',
    languages: {fr: '/confidentialite', en: '/en/privacy'},
  },
};

const EFFECTIVE_DATE = '2 juillet 2026';
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

export default function ConfidentialitePage() {
  return (
    <>
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Eyebrow color={tg.colors.grenadine}>Mentions légales</Eyebrow>
          <h1 className="font-display text-h3 md:text-h2 mt-4" style={{ color: tg.colors.ink }}>
            Politique de confidentialité
          </h1>
          <p
            className="font-sans mt-4"
            style={{ color: tg.colors.ink60, fontSize: tg.fontSize.caption }}
          >
            Dernière mise à jour : {EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      <section className="bg-paper-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p
            className="font-sans"
            style={{ color: tg.colors.ink80, fontSize: tg.fontSize.bodyLg, lineHeight: 1.65 }}
          >
            Murmure propose des visites guidées audio : une application mobile pour écouter des
            parcours (y compris hors-ligne) et un atelier web pour les créateurs. La présente
            politique explique quelles données nous traitons, pourquoi, et comment vous gardez le
            contrôle.
          </p>

          <Section title="1. Responsable du traitement">
            <p>
              Le responsable du traitement est [À COMPLÉTER : raison sociale], [À COMPLÉTER : forme
              juridique] immatriculée sous le numéro [À COMPLÉTER : SIREN/SIRET], dont le siège est
              situé [À COMPLÉTER : adresse]. Contact :{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Données que nous collectons">
            <ul style={{ paddingLeft: tg.space[5], margin: 0 }}>
              <li>
                <strong>Compte</strong> : adresse e-mail et identifiant de compte (authentification
                via Amazon Cognito).
              </li>
              <li>
                <strong>Paiements</strong> : les achats et abonnements sont traités par nos
                prestataires de paiement (Stripe sur le web, RevenueCat / Apple App Store / Google
                Play sur mobile). Nous ne stockons pas vos données de carte bancaire.
              </li>
              <li>
                <strong>Contenu créateur</strong> : pour les guides, les enregistrements audio,
                textes et points d’intérêt (dont des données de localisation) fournis pour créer un
                parcours.
              </li>
              <li>
                <strong>Usage</strong> : données techniques et statistiques d’utilisation
                (événements analytiques, diagnostics) pour améliorer le service.
              </li>
            </ul>
          </Section>

          <Section title="3. Finalités et bases légales">
            <p>
              Nous traitons vos données pour : fournir le service et exécuter le contrat (compte,
              lecture des parcours, achats) ; améliorer et sécuriser le service (intérêt légitime) ;
              respecter nos obligations légales (facturation, comptabilité) ; et, le cas échéant,
              pour des communications soumises à votre consentement.
            </p>
          </Section>

          <Section title="4. Destinataires et sous-traitants">
            <p>
              Nous faisons appel à des sous-traitants qui traitent des données pour notre compte,
              notamment : Amazon Web Services (hébergement, authentification et stockage), Stripe et
              RevenueCat (paiements et gestion des abonnements), et nos outils d’analytique et de
              diagnostic. Chacun est encadré par des garanties contractuelles appropriées.
            </p>
          </Section>

          <Section title="5. Durée de conservation">
            <p>
              Vos données sont conservées le temps nécessaire aux finalités décrites, puis
              supprimées ou anonymisées. Les données de compte sont conservées tant que votre compte
              est actif ; les données de facturation sont conservées selon les durées légales
              applicables. [À COMPLÉTER : durées précises par catégorie.]
            </p>
          </Section>

          <Section title="6. Transferts hors de l’Union européenne">
            <p>
              Certains sous-traitants peuvent traiter des données en dehors de l’UE. Dans ce cas,
              les transferts sont encadrés par des mécanismes reconnus (clauses contractuelles types
              de la Commission européenne ou décisions d’adéquation).
            </p>
          </Section>

          <Section title="7. Vos droits">
            <p>
              Conformément au RGPD, vous disposez d’un droit d’accès, de rectification,
              d’effacement, de limitation, d’opposition et de portabilité de vos données, ainsi que
              du droit de définir des directives post-mortem. Pour les exercer, écrivez à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              . Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
            </p>
          </Section>

          <Section title="Supprimer votre compte">
            <p>
              Dans l&apos;application Murmure, ouvrez <strong>Reglages</strong>, puis{' '}
              <strong>Donnees personnelles</strong> et choisissez <strong>Supprimer mon compte</strong>.
              Cette action efface definitivement le compte et les donnees associees. Si vous ne
              pouvez plus acceder a l&apos;application, utilisez notre{' '}
              <Link href="/supprimer-mon-compte" style={{ color: tg.colors.grenadine }}>
                page de demande de suppression
              </Link>
              .
            </p>
          </Section>

          <Section title="8. Cookies et stockage local">
            <p>
              Le portail web utilise le stockage local de votre navigateur pour maintenir votre
              session d’authentification et vos préférences. Nous n’utilisons pas de cookies
              publicitaires. [À COMPLÉTER : détailler tout cookie de mesure d’audience si applicable.]
            </p>
          </Section>

          <Section title="9. Sécurité">
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos
              données (chiffrement en transit, contrôle d’accès, hébergement sécurisé). Aucun système
              n’étant infaillible, nous vous invitons à choisir un mot de passe robuste.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Pour toute question relative à cette politique ou à vos données, contactez-nous à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="11. Modifications">
            <p>
              Nous pouvons mettre à jour cette politique. Toute modification substantielle sera
              signalée sur cette page, avec une date de mise à jour actualisée.
            </p>
          </Section>

          <LegalLanguageSwitcher
            locale="fr"
            frenchHref="/confidentialite"
            englishHref="/en/privacy"
          />

          <p className="font-sans" style={{ marginTop: tg.space[10] }}>
            <Link href="/cgu" style={{ color: tg.colors.grenadine, fontWeight: 600 }}>
              Voir les Conditions Générales d’Utilisation →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

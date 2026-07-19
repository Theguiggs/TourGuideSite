import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';
import { LegalLanguageSwitcher } from '@/components/legal/LegalLanguageSwitcher';

/**
 * Conditions Générales d’Utilisation — page légale.
 *
 * Base structurée à relire par un juriste avant soumission store. Les mentions
 * [À COMPLÉTER] (raison sociale, droit applicable, juridiction) doivent être
 * renseignées.
 */
export const metadata: Metadata = {
  title: "Conditions Générales d’Utilisation — Murmure",
  description:
    "Les conditions qui régissent l’utilisation de l’application et de l’atelier web Murmure.",
  alternates: {
    canonical: '/cgu',
    languages: {fr: '/cgu', en: '/en/terms'},
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

export default function CguPage() {
  return (
    <>
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <Eyebrow color={tg.colors.grenadine}>Mentions légales</Eyebrow>
          <h1 className="font-display text-h3 md:text-h2 mt-4" style={{ color: tg.colors.ink }}>
            Conditions Générales d’Utilisation
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
          <Section title="1. Objet">
            <p>
              Les présentes conditions (les « CGU ») régissent l’accès et l’utilisation de
              l’application mobile et de l’atelier web Murmure (le « Service »), édités par [À
              COMPLÉTER : raison sociale]. En utilisant le Service, vous acceptez les CGU.
            </p>
          </Section>

          <Section title="2. Description du Service">
            <p>
              Murmure permet aux voyageurs d’écouter des visites guidées audio, y compris hors-ligne,
              et aux guides de créer et publier des parcours via l’atelier web. Certaines
              fonctionnalités ou parcours sont gratuits, d’autres payants (achat à l’unité ou
              abonnement).
            </p>
          </Section>

          <Section title="3. Compte">
            <p>
              La création d’un compte peut être requise pour accéder à certaines fonctionnalités.
              Vous êtes responsable de l’exactitude des informations fournies et de la
              confidentialité de vos identifiants. Vous devez avoir l’âge légal requis pour
              contracter.
            </p>
          </Section>

          <Section title="4. Contenu des guides">
            <p>
              Les guides restent responsables des contenus qu’ils créent (audio, textes,
              localisations) et garantissent disposer des droits nécessaires. Les parcours sont
              soumis à une modération avant publication ; nous pouvons refuser ou retirer un contenu
              qui enfreint les CGU ou la loi. En publiant, le guide concède à Murmure une licence
              nécessaire à l’hébergement et à la diffusion du parcours dans le Service. [À COMPLÉTER :
              étendue de la licence et rémunération des guides.]
            </p>
          </Section>

          <Section title="5. Propriété intellectuelle">
            <p>
              Le Service, sa marque, son design et ses composants logiciels sont protégés. Aucune
              disposition des CGU n’emporte cession de droits de propriété intellectuelle en dehors
              des licences expressément consenties.
            </p>
          </Section>

          <Section title="6. Achats, abonnements et remboursements">
            <p>
              Les achats effectués sur mobile sont traités par l’App Store (Apple) ou Google Play et
              soumis à leurs conditions ; les achats sur le web sont traités par Stripe. Les
              abonnements se renouvellent automatiquement jusqu’à résiliation via la plateforme
              concernée. Les demandes de remboursement relèvent des politiques des plateformes de
              paiement. [À COMPLÉTER : politique de remboursement propre le cas échéant, droit de
              rétractation applicable.]
            </p>
          </Section>

          <Section title="7. Utilisation acceptable">
            <p>
              Vous vous engagez à ne pas détourner le Service, à ne pas tenter d’y accéder de manière
              non autorisée, à ne pas publier de contenu illicite, trompeur ou portant atteinte aux
              droits de tiers.
            </p>
          </Section>

          <Section title="8. Responsabilité">
            <p>
              Le Service est fourni « en l’état ». Dans les limites permises par la loi, Murmure ne
              saurait être tenu responsable des dommages indirects. Les parcours reposent sur des
              données de localisation : restez attentif à votre environnement lors de vos
              déplacements.
            </p>
          </Section>

          <Section title="9. Données personnelles">
            <p>
              Le traitement de vos données est décrit dans notre{' '}
              <Link href="/confidentialite" style={{ color: tg.colors.grenadine, fontWeight: 600 }}>
                Politique de confidentialité
              </Link>
              .
            </p>
          </Section>

          <Section title="10. Résiliation">
            <p>
              Vous pouvez cesser d’utiliser le Service à tout moment et demander la suppression de
              votre compte. Nous pouvons suspendre ou clôturer un accès en cas de manquement aux CGU.
            </p>
          </Section>

          <Section title="11. Droit applicable et litiges">
            <p>
              Les CGU sont régies par le droit [À COMPLÉTER : droit applicable, ex. français]. En cas
              de litige, une solution amiable sera recherchée avant toute action ; à défaut, les
              tribunaux compétents seront ceux de [À COMPLÉTER : juridiction].
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Pour toute question, contactez-nous à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <LegalLanguageSwitcher locale="fr" frenchHref="/cgu" englishHref="/en/terms" />

          <p className="font-sans" style={{ marginTop: tg.space[10] }}>
            <Link href="/confidentialite" style={{ color: tg.colors.grenadine, fontWeight: 600 }}>
              Voir la Politique de confidentialité →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

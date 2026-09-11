import type { Metadata } from 'next';
import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { Eyebrow } from '@murmure/design-system/web';
import { LegalLanguageSwitcher } from '@/components/legal/LegalLanguageSwitcher';
import { LEGAL_IDENTITY, publisherLine } from '@/lib/legal/identity';

/**
 * Conditions Générales d’Utilisation — page légale.
 *
 * L'identité de l'éditeur, le droit applicable et l'adresse de contact viennent
 * de `lib/legal/identity.ts`. À relire par un juriste avant toute évolution
 * commerciale (rémunération des guides, abonnements).
 */
export const metadata: Metadata = {
  title: "Conditions Générales d’Utilisation",
  description:
    "Les conditions qui régissent l’utilisation de l’application et de l’atelier web Murmure.",
  alternates: {
    canonical: '/cgu',
    languages: {fr: '/cgu', en: '/en/terms'},
  },
};

const EFFECTIVE_DATE = LEGAL_IDENTITY.effectiveDate.fr;
const CONTACT_EMAIL = LEGAL_IDENTITY.contactEmail;

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
              l’application mobile et de l’atelier web Murmure (le « Service »), édités par{' '}
              {publisherLine('fr')}. En utilisant le Service, vous acceptez les CGU.
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
              qui enfreint les CGU ou la loi. Les guides conservent l’intégralité de leurs droits
              sur leurs contenus. En publiant, le guide concède à Murmure une licence non exclusive,
              mondiale et gratuite, pour la durée de la publication, afin d’héberger, diffuser,
              traduire et adapter techniquement le parcours dans le Service. Lorsqu’un parcours est
              payant, la part revenant au guide est celle affichée dans l’atelier au moment de la
              publication ; elle lui est reversée selon les modalités indiquées dans son espace
              « Revenus ».
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
              concernée. Pour les achats sur mobile, les demandes de remboursement s’adressent à
              Apple ou Google selon le magasin d’achat. Pour les achats sur le web, le contenu
              numérique est mis à disposition immédiatement après le paiement : conformément à
              l’article L221-28 13° du Code de la consommation, vous acceptez que l’exécution commence
              aussitôt et renoncez à votre droit de rétractation de quatorze jours. Si un parcours
              acheté est défectueux ou inaccessible, écrivez-nous à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: tg.colors.grenadine }}>
                {CONTACT_EMAIL}
              </a>
              {' '}: nous le corrigeons ou vous remboursons.
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
              Les CGU sont régies par {LEGAL_IDENTITY.governingLaw.fr}. En cas de litige, une
              solution amiable sera recherchée avant toute action : écrivez-nous d’abord à l’adresse
              indiquée à l’article 12. Vous pouvez ensuite recourir gratuitement à la médiation de la
              consommation (articles L611-1 et suivants du Code de la consommation). À défaut, les
              tribunaux français sont compétents, sous réserve des dispositions impératives
              applicables aux consommateurs.
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

/**
 * Identité de l'éditeur — UNE seule source pour toutes les pages légales.
 *
 * Avant : chaque page redéclarait son adresse de contact et gardait des
 * « [À COMPLÉTER] » pour la raison sociale, le siège ou le droit applicable ;
 * les documents remis aux stores (privacy.html à la racine, non servi)
 * donnaient une AUTRE adresse de contact. Ce module tranche, et les pages
 * lisent ici.
 *
 * Valeurs tirées des documents remis aux stores (privacy.html, terms.html).
 * `siren` est vide tant que le numéro n'a pas été communiqué : la mention
 * est alors omise, jamais remplacée par un texte à trous.
 */

export const LEGAL_IDENTITY = {
  brand: 'Murmure',
  publisher: 'Steffen Guillaume',
  legalForm: { fr: 'entrepreneur individuel', en: 'sole proprietor (entrepreneur individuel)' },
  /** Numéro SIREN (9 chiffres). Vide = mention omise. */
  siren: '',
  address: '25 boulevard commandant Autran, 06130 Grasse, France',
  /** Contact unique : support, RGPD, litiges. */
  contactEmail: 'tourguideyeup@gmail.com',
  hosting: {
    fr: 'Amazon Web Services (région us-east-1, États-Unis), sous clauses contractuelles types et Data Privacy Framework UE-USA',
    en: 'Amazon Web Services (us-east-1 region, United States), under standard contractual clauses and the EU-US Data Privacy Framework',
  },
  supervisoryAuthority: {
    fr: 'CNIL, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 (www.cnil.fr)',
    en: 'CNIL, the French data protection authority (www.cnil.fr)',
  },
  governingLaw: { fr: 'le droit français', en: 'French law' },
  effectiveDate: { fr: '2 juillet 2026', en: '2 July 2026' },
} as const;

/** Durées de conservation, alignées sur la politique remise aux stores. */
export const RETENTION: ReadonlyArray<{ fr: [string, string]; en: [string, string] }> = [
  { fr: ['Compte actif', 'tant que le compte existe'], en: ['Active account', 'for as long as the account exists'] },
  { fr: ['Compte inactif (36 mois sans connexion)', 'suppression automatique'], en: ['Inactive account (36 months without sign-in)', 'automatic deletion'] },
  { fr: ['Après suppression du compte', 'effacement immédiat ; pièces de facturation conservées 10 ans (obligation légale)'], en: ['After account deletion', 'immediate erasure; billing records kept 10 years (legal obligation)'] },
  { fr: ['Journaux techniques', '30 jours'], en: ['Technical logs', '30 days'] },
  { fr: ['Mesure d’audience (Amplitude, avec votre consentement)', '5 ans, données pseudonymisées'], en: ['Audience measurement (Amplitude, with your consent)', '5 years, pseudonymised'] },
  { fr: ['Exports de données (liens signés)', '7 jours'], en: ['Data exports (signed links)', '7 days'] },
];

/** « Steffen Guillaume, entrepreneur individuel, 25 boulevard… » */
export function publisherLine(locale: 'fr' | 'en'): string {
  const sirenPart = LEGAL_IDENTITY.siren
    ? locale === 'en'
      ? `, registered under SIREN no. ${LEGAL_IDENTITY.siren}`
      : `, immatriculé sous le numéro SIREN ${LEGAL_IDENTITY.siren}`
    : '';
  return `${LEGAL_IDENTITY.publisher}, ${LEGAL_IDENTITY.legalForm[locale]}${sirenPart}, ${LEGAL_IDENTITY.address}`;
}

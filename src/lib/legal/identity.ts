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

import type { InterfaceLocale } from '@/lib/i18n/locales';

export const LEGAL_IDENTITY = {
  brand: 'Murmure',
  publisher: 'Steffen Guillaume',
  legalForm: { fr: 'entrepreneur individuel', en: 'sole proprietor (entrepreneur individuel)', es: 'empresario individual', de: 'Einzelunternehmer', it: 'imprenditore individuale', nl: 'eenmanszaak' },
  /** Numéro SIREN (9 chiffres). Vide = mention omise. */
  siren: '',
  address: '25 boulevard commandant Autran, 06130 Grasse, France',
  /** Contact unique : support, RGPD, litiges. */
  contactEmail: 'tourguideyeup@gmail.com',
  hosting: {
    fr: 'Amazon Web Services (région us-east-1, États-Unis), sous clauses contractuelles types et Data Privacy Framework UE-USA',
    en: 'Amazon Web Services (us-east-1 region, United States), under standard contractual clauses and the EU-US Data Privacy Framework',
    es: 'Amazon Web Services (región us-east-1, Estados Unidos), con cláusulas contractuales tipo y el Marco de Privacidad de Datos UE-EE. UU.',
    de: 'Amazon Web Services (Region us-east-1, USA), unter Standardvertragsklauseln und dem EU-US Data Privacy Framework',
    it: 'Amazon Web Services (regione us-east-1, Stati Uniti), con clausole contrattuali tipo e Data Privacy Framework UE-USA',
    nl: 'Amazon Web Services (regio us-east-1, Verenigde Staten), onder standaardcontractbepalingen en het EU-US Data Privacy Framework',
  },
  supervisoryAuthority: {
    fr: 'CNIL, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 (www.cnil.fr)',
    en: 'CNIL, the French data protection authority (www.cnil.fr)',
    es: 'la CNIL, autoridad francesa de protección de datos (www.cnil.fr)',
    de: 'der CNIL, der französischen Datenschutzbehörde (www.cnil.fr)',
    it: 'la CNIL, autorità francese per la protezione dei dati (www.cnil.fr)',
    nl: 'de CNIL, de Franse privacytoezichthouder (www.cnil.fr)',
  },
  governingLaw: { fr: 'le droit français', en: 'French law', es: 'el derecho francés', de: 'französisches Recht', it: 'il diritto francese', nl: 'Frans recht' },
  effectiveDate: { fr: '2 juillet 2026', en: '2 July 2026', es: '2 de julio de 2026', de: '2. Juli 2026', it: '2 luglio 2026', nl: '2 juli 2026' },
} as const;

/** Durées de conservation, alignées sur la politique remise aux stores. */
export const RETENTION: ReadonlyArray<Record<InterfaceLocale, [string, string]>> = [
  { fr: ['Compte actif', 'tant que le compte existe'], en: ['Active account', 'for as long as the account exists'], es: ['Cuenta activa', 'mientras exista la cuenta'], de: ['Aktives Konto', 'solange das Konto besteht'], it: ['Account attivo', 'finché esiste l’account'], nl: ['Actief account', 'zolang het account bestaat'] },
  { fr: ['Compte inactif (36 mois sans connexion)', 'suppression automatique'], en: ['Inactive account (36 months without sign-in)', 'automatic deletion'], es: ['Cuenta inactiva (36 meses sin iniciar sesión)', 'eliminación automática'], de: ['Inaktives Konto (36 Monate ohne Anmeldung)', 'automatische Löschung'], it: ['Account inattivo (36 mesi senza accesso)', 'eliminazione automatica'], nl: ['Inactief account (36 maanden niet ingelogd)', 'automatische verwijdering'] },
  { fr: ['Après suppression du compte', 'effacement immédiat ; pièces de facturation conservées 10 ans (obligation légale)'], en: ['After account deletion', 'immediate erasure; billing records kept 10 years (legal obligation)'], es: ['Tras eliminar la cuenta', 'borrado inmediato; documentos de facturación conservados 10 años por obligación legal'], de: ['Nach Kontolöschung', 'sofortige Löschung; Rechnungsunterlagen werden aufgrund gesetzlicher Pflicht 10 Jahre aufbewahrt'], it: ['Dopo l’eliminazione dell’account', 'cancellazione immediata; documenti di fatturazione conservati 10 anni per obbligo legale'], nl: ['Na verwijdering van het account', 'directe verwijdering; factuurgegevens worden wettelijk 10 jaar bewaard'] },
  { fr: ['Journaux techniques', '30 jours'], en: ['Technical logs', '30 days'], es: ['Registros técnicos', '30 días'], de: ['Technische Protokolle', '30 Tage'], it: ['Registri tecnici', '30 giorni'], nl: ['Technische logboeken', '30 dagen'] },
  { fr: ['Mesure d’audience (Amplitude, avec votre consentement)', '5 ans, données pseudonymisées'], en: ['Audience measurement (Amplitude, with your consent)', '5 years, pseudonymised'], es: ['Medición de audiencia (Amplitude, con tu consentimiento)', '5 años, datos seudonimizados'], de: ['Reichweitenmessung (Amplitude, mit Einwilligung)', '5 Jahre, pseudonymisierte Daten'], it: ['Misurazione del pubblico (Amplitude, con consenso)', '5 anni, dati pseudonimizzati'], nl: ['Publieksmeting (Amplitude, met toestemming)', '5 jaar, gepseudonimiseerde gegevens'] },
  { fr: ['Exports de données (liens signés)', '7 jours'], en: ['Data exports (signed links)', '7 days'], es: ['Exportaciones de datos (enlaces firmados)', '7 días'], de: ['Datenexporte (signierte Links)', '7 Tage'], it: ['Esportazioni di dati (link firmati)', '7 giorni'], nl: ['Gegevensexporten (ondertekende links)', '7 dagen'] },
];

/** « Steffen Guillaume, entrepreneur individuel, 25 boulevard… » */
export function publisherLine(locale: InterfaceLocale): string {
  const sirenPart = LEGAL_IDENTITY.siren
    ? `, ${{fr: 'immatriculé sous le numéro SIREN', en: 'registered under SIREN no.', es: 'número de registro SIREN', de: 'SIREN-Registernummer', it: 'numero di registrazione SIREN', nl: 'SIREN-registratienummer'}[locale]} ${LEGAL_IDENTITY.siren}`
    : '';
  return `${LEGAL_IDENTITY.publisher}, ${LEGAL_IDENTITY.legalForm[locale]}${sirenPart}, ${LEGAL_IDENTITY.address}`;
}

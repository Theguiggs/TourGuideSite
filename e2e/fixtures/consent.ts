/**
 * Version du texte de consentement RGPD du Studio, à garder identique à
 * `CONSENT_VERSION` dans `src/lib/stores/studio-consent-store.ts` (un test
 * Jest le vérifie). Une graine sans version, ou d'une autre version, fait
 * réapparaître le bandeau — c'est voulu pour les vrais guides.
 */
export const STUDIO_CONSENT_VERSION = '2026-09-12';

export function studioConsentSeed(): string {
  return JSON.stringify({ consentDate: new Date().toISOString(), version: STUDIO_CONSENT_VERSION });
}

import { SITE_LOCALES, isInterfaceLocale, type InterfaceLocale } from './locales';

/**
 * La langue que le navigateur réclame, lue dans `Accept-Language`.
 *
 * Le site ne redirige PAS sur cette valeur, et c'est délibéré : Google explore
 * depuis les États-Unis avec un `Accept-Language` vide ou anglais, et une
 * redirection automatique l'empêcherait de découvrir les autres variantes. La
 * recommandation de Google sur les versions localisées est celle qu'on suit —
 * annotations hreflang et choix visible.
 *
 * Cette lecture sert donc à *suggérer*, jamais à décider : un visiteur allemand
 * qui arrive par un QR code ou un lien partagé sur la page française se voit
 * proposer la version allemande, en allemand, et reste libre de l'ignorer.
 *
 * La négociation respecte les facteurs de qualité (`;q=`) et l'ordre d'écriture
 * à qualité égale. `*` est ignoré : il ne demande aucune langue en particulier.
 */
export function preferredLocale(acceptLanguage: string | null | undefined): InterfaceLocale | null {
  if (!acceptLanguage) return null;
  const candidates = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(';');
      const quality = parameters
        .map((parameter) => parameter.trim().match(/^q=([01](?:\.\d{1,3})?)$/i))
        .find(Boolean);
      return {
        // « fr-CA » demande du français ; seule la sous-étiquette primaire compte ici.
        locale: tag.trim().toLowerCase().split('-')[0],
        quality: quality ? Number.parseFloat(quality[1]) : 1,
        index,
      };
    })
    .filter((candidate) => candidate.quality > 0 && isInterfaceLocale(candidate.locale))
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  return (candidates[0]?.locale as InterfaceLocale | undefined) ?? null;
}

/**
 * La variante à proposer, ou `null` s'il n'y a rien à dire.
 *
 * Rien à dire quand : le visiteur est déjà dans sa langue, il a déjà choisi
 * une langue sur ce site, sa langue n'est pas publiée pour cette page, ou son
 * navigateur n'en réclame aucune que nous parlions.
 */
export function suggestedLocale({
  acceptLanguage,
  current,
  published,
  chosenLocale,
}: {
  acceptLanguage: string | null | undefined;
  current: InterfaceLocale;
  published: Iterable<InterfaceLocale>;
  /** Langue déjà choisie par le visiteur (cookie `murmure-locale`). */
  chosenLocale?: string | null;
}): InterfaceLocale | null {
  // Un choix explicite ne se discute pas, même s'il diffère du navigateur.
  if (isInterfaceLocale(chosenLocale)) return null;
  const wanted = preferredLocale(acceptLanguage);
  if (!wanted || wanted === current) return null;
  const available = new Set(published);
  return available.has(wanted) ? wanted : null;
}

/** Les langues du site, pour les appelants qui veulent toutes les proposer. */
export const ALL_LOCALES: readonly InterfaceLocale[] = SITE_LOCALES;

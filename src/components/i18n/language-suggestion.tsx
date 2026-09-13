import { cookies, headers } from 'next/headers';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { suggestedLocale } from '@/lib/i18n/preferred-locale';
import { publicPath } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES } from '@/lib/seo/availability';
import { LanguageSuggestionBanner } from './language-suggestion-banner';

/**
 * Propose sa langue à un visiteur arrivé dans une autre.
 *
 * Le problème qu'il résout : depuis Google, un Allemand qui cherche
 * « Audiotour Nizza » atterrit sur `/de/catalogue/nice`, et tout va bien. Mais
 * un QR code, un lien partagé, une publicité mènent tous à la version
 * française — et rien ne lui disait que sa langue existe.
 *
 * Le site ne REDIRIGE pas pour autant. Google explore avec un `Accept-Language`
 * vide ou anglais : une redirection automatique lui cacherait les autres
 * variantes. On suggère, il décide, et son choix est mémorisé.
 *
 * La suggestion ne porte que sur une variante **publiée** pour cette page
 * (`published`), jamais sur une page de repli : envoyer un Néerlandais vers une
 * fiche dont le texte est resté français ne lui rend pas service.
 */
export async function LanguageSuggestion({
  sourcePath,
  locale,
  published = EVERGREEN_LOCALES,
}: {
  /** Chemin français sans préfixe, comme partout ailleurs. */
  sourcePath: string;
  locale: InterfaceLocale;
  published?: Iterable<InterfaceLocale>;
}) {
  const [requestHeaders, requestCookies] = await Promise.all([headers(), cookies()]);
  const suggested = suggestedLocale({
    acceptLanguage: requestHeaders.get('accept-language'),
    current: locale,
    published,
    chosenLocale: requestCookies.get('murmure-locale')?.value,
  });
  if (!suggested) return null;

  return (
    <LanguageSuggestionBanner
      suggested={suggested}
      current={locale}
      href={publicPath(sourcePath, suggested)}
    />
  );
}

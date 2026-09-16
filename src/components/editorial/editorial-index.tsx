import Link from 'next/link';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { publicPath } from '@/lib/seo/urls';
import { safeJsonLd } from '@/lib/security/safe-json-ld';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { articleSourcePath, articlesForLocale, resolveArticleCopy, tipsIndexLocales, ARTICLES, TIPS_SOURCE_PATH } from '@/lib/editorial/articles';
import { EDITORIAL_UI } from '@/lib/editorial/editorial-copy';
import { LanguageSuggestion } from '@/components/i18n/language-suggestion';

/**
 * L'index des conseils : un lien par article publié dans la langue de la page.
 * Quand aucun ne l'est, la liste montre les originaux, et la page est en
 * `noindex` (voir `tipsIndexMetadata`).
 */
export function TipsIndex({ locale }: { locale: InterfaceLocale }) {
  const ui = EDITORIAL_UI[locale];
  const own = articlesForLocale(locale);
  const articles = own.length > 0 ? own : [...ARTICLES];
  const homePath = publicPath('/', locale);
  return (
    <>
      <LanguageSuggestion sourcePath={TIPS_SOURCE_PATH} locale={locale} published={tipsIndexLocales()} />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd([{ name: ui.home, path: homePath }, { name: ui.tips }])) }}
        />
        <nav aria-label={ui.tips} className="mb-8 flex flex-wrap gap-2 text-body text-ink-60">
          <Link href={homePath}>{ui.home}</Link>
          <span aria-hidden="true">/</span>
          <span>{ui.tips}</span>
        </nav>
        <h1 className="max-w-3xl font-display text-h3 leading-tight text-ink sm:text-h2">{ui.indexTitle}</h1>
        <p className="my-6 max-w-3xl text-body-lg leading-relaxed text-ink-80">{ui.indexLead}</p>
        {own.length === 0 && <p className="mb-6 rounded-lg bg-paper-soft px-4 py-3 text-body text-ink-80">{ui.fallback}</p>}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {articles.map((article) => {
            const { copy } = resolveArticleCopy(article, locale);
            const href = publicPath(articleSourcePath(article), locale);
            return (
              <li key={article.slug} className="flex flex-col rounded-xl border border-line p-5">
                <p className="text-caption uppercase tracking-wide text-ink-60">{article.city.name}</p>
                <h2 className="mt-1 font-display text-h5 text-ink">
                  <Link href={href} className="text-ink no-underline hover:text-grenadine">
                    {copy.title}
                  </Link>
                </h2>
                <p className="mt-2 text-body text-ink-80">{copy.lead}</p>
                <Link href={href} className="mt-3 inline-flex min-h-11 items-center font-semibold text-grenadine underline underline-offset-4">
                  {ui.readArticle}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

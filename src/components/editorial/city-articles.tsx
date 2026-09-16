import Link from 'next/link';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { publicPath } from '@/lib/seo/urls';
import { articleSourcePath, articlesForCity } from '@/lib/editorial/articles';
import { EDITORIAL_UI } from '@/lib/editorial/editorial-copy';

/**
 * Sur une page ville : les conseils publiés dans la langue de la page. Rien
 * n'est affiché dans une langue où l'article n'est pas relu — la page ville ne
 * doit pas devenir bilingue par accident.
 */
export function CityArticles({ citySlug, cityName, locale }: { citySlug: string; cityName: string; locale: InterfaceLocale }) {
  const articles = articlesForCity(citySlug).filter((article) => Boolean(article.copy[locale]));
  if (articles.length === 0) return null;
  const ui = EDITORIAL_UI[locale];
  return (
    <section aria-labelledby="city-articles-title" className="my-10 max-w-3xl space-y-5 text-body leading-relaxed text-ink-80">
      <h2 id="city-articles-title" className="font-display text-h4 text-ink">{ui.planCity(cityName)}</h2>
      {articles.map((article) => {
        const copy = article.copy[locale]!;
        return (
          <div key={article.slug} className="space-y-2">
            <h3 className="font-display text-h5 text-ink">{copy.title}</h3>
            <p>{copy.lead}</p>
            <Link href={publicPath(articleSourcePath(article), locale)} className="inline-flex min-h-11 items-center font-semibold text-grenadine underline underline-offset-4">
              {ui.readArticle}
            </Link>
          </div>
        );
      })}
    </section>
  );
}

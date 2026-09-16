import Image from 'next/image';
import Link from 'next/link';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { LOCALE_FORMATS } from '@/lib/i18n/locales';
import { publicPath } from '@/lib/seo/urls';
import { safeJsonLd } from '@/lib/security/safe-json-ld';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { getCityBySlug, getCityTourSummaries } from '@/lib/api/tours-server';
import { logger } from '@/lib/logger';
import type { Tour } from '@/types/tour';
import {
  articleLocales,
  articleSourcePath,
  articlesForLocale,
  resolveArticleCopy,
  tourMatches,
  TIPS_SOURCE_PATH,
  type EditorialArticle as Article,
} from '@/lib/editorial/articles';
import { EDITORIAL_UI } from '@/lib/editorial/editorial-copy';
import { LanguageSuggestion } from '@/components/i18n/language-suggestion';

const SERVICE_NAME = 'EditorialArticle';

/**
 * Un article de conseils, rendu côté serveur : le robot reçoit le texte entier,
 * les schémas `Article` et `BreadcrumbList`, et les liens de maillage.
 *
 * La fiche visite et la page ville ne sont reliées que si elles existent au
 * moment du rendu : un article peut précéder la publication de sa visite, et
 * ne doit alors mener nulle part plutôt que vers une page introuvable. Une
 * panne de lecture n'empêche pas l'article de s'afficher.
 */
async function safely<T>(what: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    logger.warn(SERVICE_NAME, `${what} unavailable`, { error: error instanceof Error ? error.message : String(error) });
    return fallback;
  }
}

export async function articleLinks(article: Article): Promise<{ cityExists: boolean; tour: Tour | null }> {
  const [city, tours] = await Promise.all([
    safely('city', () => getCityBySlug(article.city.slug), null),
    article.tour ? safely('tours', () => getCityTourSummaries(article.city.slug), [] as Tour[]) : Promise.resolve([] as Tour[]),
  ]);
  const ref = article.tour;
  const tour = ref ? tours.find((t) => tourMatches(ref, t.slug)) ?? null : null;
  return { cityExists: Boolean(city), tour };
}

export async function EditorialArticle({ article, locale }: { article: Article; locale: InterfaceLocale }) {
  const { copy, fallback } = resolveArticleCopy(article, locale);
  const ui = EDITORIAL_UI[locale];
  const { cityExists, tour } = await articleLinks(article);

  const homePath = publicPath('/', locale);
  const tipsPath = publicPath(TIPS_SOURCE_PATH, locale);
  const cityPath = cityExists ? publicPath(`/catalogue/${article.city.slug}`, locale) : null;
  const tourPath = tour ? publicPath(`/catalogue/${article.city.slug}/${tour.slug}#itineraire`, locale) : null;
  const others = articlesForLocale(locale).filter((other) => other.slug !== article.slug).slice(0, 6);
  const published = new Intl.DateTimeFormat(LOCALE_FORMATS[locale], { dateStyle: 'long' }).format(new Date(article.publishedAt));

  return (
    <>
      <LanguageSuggestion sourcePath={articleSourcePath(article)} locale={locale} published={articleLocales(article)} />
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd(article, locale)) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(breadcrumbJsonLd([{ name: ui.home, path: homePath }, { name: ui.tips, path: tipsPath }, { name: copy.label }])),
          }}
        />
        <nav aria-label={ui.tips} className="mb-8 flex flex-wrap gap-2 text-body text-ink-60">
          <Link href={homePath}>{ui.home}</Link>
          <span aria-hidden="true">/</span>
          <Link href={tipsPath}>{ui.tips}</Link>
          <span aria-hidden="true">/</span>
          <span>{copy.label}</span>
        </nav>
        {fallback && <p className="mb-6 rounded-lg bg-paper-soft px-4 py-3 text-body text-ink-80">{ui.fallback}</p>}
        <h1 className="max-w-3xl font-display text-h3 leading-tight text-ink sm:text-h2">{copy.title}</h1>
        <p className="mt-3 text-caption text-ink-60">
          {ui.publishedOn} <time dateTime={article.publishedAt}>{published}</time>
        </p>
        <p className="my-6 max-w-3xl text-body-lg leading-relaxed text-ink-80">{copy.lead}</p>
        {article.image && (
          <Image
            src={article.image.src}
            alt={copy.imageAlt ?? copy.title}
            width={article.image.width}
            height={article.image.height}
            sizes="(max-width: 895px) 100vw, 840px"
            className="mb-10 h-auto w-full rounded-lg"
          />
        )}
        <div className="max-w-3xl space-y-9 text-body leading-relaxed text-ink-80">
          {copy.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="font-display text-h4 text-ink">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
          {copy.stops && (
            <section className="space-y-3">
              <h2 className="font-display text-h4 text-ink">{copy.stops.title}</h2>
              {copy.stops.intro && <p>{copy.stops.intro}</p>}
              <ol className="list-decimal space-y-1 pl-6">
                {copy.stops.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          )}
          <section className="space-y-3 rounded-lg bg-paper-soft p-6 sm:p-8">
            <h2 className="font-display text-h4 text-ink">{copy.tour.title}</h2>
            <p>{copy.tour.body}</p>
            {tourPath && (
              <Link href={tourPath} className="inline-flex min-h-11 items-center rounded-pill bg-grenadine px-5 py-3 font-semibold text-paper no-underline">
                {copy.tour.cta}
              </Link>
            )}
            <p>
              <Link href={cityPath ?? publicPath('/catalogue', locale)} className="inline-flex min-h-11 items-center text-grenadine underline underline-offset-4">
                {ui.cityTours(article.city.name)}
              </Link>
            </p>
          </section>
          {copy.sources && (
            <section className="space-y-3">
              <h2 className="font-display text-h5 text-ink">{copy.sources.title}</h2>
              <p>
                {copy.sources.intro}{' '}
                {copy.sources.links.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 && ' · '}
                    <a className="text-grenadine underline underline-offset-4" href={link.href} rel="noopener">
                      {link.label}
                    </a>
                  </span>
                ))}
                {copy.sources.note && `. ${copy.sources.note}`}
              </p>
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-h5 text-ink">{ui.otherTips}</h2>
              <ul className="flex flex-wrap gap-2">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={publicPath(articleSourcePath(other), locale)}
                      className="inline-flex min-h-11 items-center rounded-pill border border-line px-4 text-body text-ink no-underline hover:border-grenadine"
                    >
                      {other.copy[locale]?.label ?? other.city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </>
  );
}

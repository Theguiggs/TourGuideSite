import Link from 'next/link';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { publicPath } from '@/lib/seo/urls';
import { articleForTour, articleSourcePath } from '@/lib/editorial/articles';
import { EDITORIAL_UI } from '@/lib/editorial/editorial-copy';

/**
 * Sur une fiche visite : le texte « À propos de cette visite » écrit pour elle,
 * et le lien vers l'article de conseils de sa ville.
 *
 * La fiche ne portait que la description de la visite et deux étapes
 * d'aperçu : trop peu pour qu'un moteur sache de quoi elle parle. Ce bloc dit,
 * dans le HTML servi, ce que l'on voit et pourquoi — sans révéler la narration.
 */
export function TourEditorialNotes({ citySlug, tourSlug, locale }: { citySlug: string; tourSlug: string; locale: InterfaceLocale }) {
  const article = articleForTour(citySlug, tourSlug);
  const copy = article?.copy[locale];
  if (!article || !copy) return null;
  const ui = EDITORIAL_UI[locale];
  const href = publicPath(articleSourcePath(article), locale);
  return (
    <section aria-labelledby="tour-notes-title" className="mb-10">
      {copy.note && (
        <>
          <h2 id="tour-notes-title" className="mb-4 font-display text-h4 text-ink">{copy.note.title}</h2>
          <div className="space-y-3 text-body-lg leading-relaxed text-ink-80">
            {copy.note.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </>
      )}
      <p className={`text-body text-ink-80${copy.note ? ' mt-4' : ''}`}>
        {ui.beforeLeaving}{' '}
        <Link href={href} className="font-semibold text-grenadine underline underline-offset-4">
          {copy.label}
        </Link>
      </p>
    </section>
  );
}

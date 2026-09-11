/**
 * Squelettes des pages du catalogue, servis par les `loading.tsx` de chaque
 * segment (FR et EN).
 *
 * Toutes les pages du catalogue sont `force-dynamic` : sans `loading.tsx`,
 * chaque navigation attendait l'aller-retour AppSync sur un écran vide.
 * Les blocs reprennent la géométrie des vraies pages (largeur, grille,
 * hauteur des cartes) pour que le contenu se substitue sans saut.
 * `.animate-pulse` est neutralisé par `prefers-reduced-motion` dans
 * globals.css.
 */

const LABELS = {
  fr: 'Chargement du catalogue',
  en: 'Loading the catalogue',
};

function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded bg-paper-deep ${className}`} />;
}

function CardGrid({ count, imageHeight }: { count: number; imageHeight: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-line">
          <div className={`${imageHeight} bg-paper-deep`} />
          <div className="p-4 space-y-3">
            <Bar className="h-4 w-3/4" />
            <Bar className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export type CatalogueSkeletonVariant = 'cities' | 'city' | 'tour';

export function CatalogueSkeleton({
  variant,
  locale = 'fr',
}: {
  variant: CatalogueSkeletonVariant;
  locale?: 'fr' | 'en';
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={LABELS[locale]}
      data-testid={`catalogue-skeleton-${variant}`}
      className="animate-pulse"
    >
      <span className="sr-only">{LABELS[locale]}…</span>
      {variant === 'cities' && (
        <section className="py-20 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Bar className="h-8 w-64 mb-10" />
            <CardGrid count={6} imageHeight="h-48" />
          </div>
        </section>
      )}
      {variant === 'city' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Bar className="h-4 w-40 mb-6" />
          <Bar className="h-9 w-72 mb-3" />
          <Bar className="h-4 w-full max-w-2xl mb-10" />
          <CardGrid count={6} imageHeight="h-44" />
        </div>
      )}
      {variant === 'tour' && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <Bar className="h-4 w-56 mb-6" />
          </div>
          <div className="h-72 sm:h-96 bg-paper-deep" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-4">
              <Bar className="h-9 w-3/4" />
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-11/12" />
              <Bar className="h-4 w-2/3" />
              <div className="pt-6 space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Bar key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Bar className="h-40 w-full" />
              <Bar className="h-12 w-full" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

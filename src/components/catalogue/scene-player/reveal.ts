/**
 * LW-2 — amener un élément dans le champ de vision.
 *
 * Deux appelants : la liste, qui suit l'étape en cours pendant une séquence, et
 * le message de fin, qui doit être vu là où le défilement automatique vient
 * justement d'emmener la vue ailleurs.
 *
 * `behavior: 'smooth'` est une animation : `prefers-reduced-motion` la refuse
 * pour les personnes que le mouvement gêne (vertiges, migraines). On l'honore —
 * la vue va au même endroit, sans glissement. `scrollIntoView` est gardé :
 * jsdom ne l'implémente pas.
 */

/** Vrai si le visiteur a demandé moins de mouvement. */
export function prefersReducedMotion(): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export function revealElement(element: Element | null | undefined): void {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  element.scrollIntoView({
    block: 'nearest',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

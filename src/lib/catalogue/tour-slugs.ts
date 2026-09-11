/**
 * Adresses des visites : un slug UNIQUE par ville, dérivé du titre.
 *
 * Aucun slug n'est persisté sur GuideTour : l'adresse est recalculée du titre
 * à chaque rendu. Deux visites de même titre dans la même ville partageaient
 * donc la même URL — la seconde était injoignable, et laquelle gagnait
 * dépendait de l'ordre de lecture. Ici l'ordre est stable (date de création,
 * puis identifiant) et les doublons reçoivent `-2`, `-3`… Un titre sans
 * lettre ni chiffre (émojis, idéogrammes) donnait un slug vide et l'URL
 * `/catalogue/nice/` : il reçoit `visite-<début d'identifiant>`.
 */

import { generateSlug } from '@/lib/api/tours';

export interface SluggableTour {
  id: string;
  title: string;
  city: string;
  createdAt?: string | null;
}

export interface TourSlugs {
  slug: string;
  citySlug: string;
}

function baseSlug(tour: SluggableTour): string {
  const fromTitle = generateSlug(tour.title ?? '');
  return fromTitle || `visite-${tour.id.slice(0, 8)}`;
}

/** Slugs uniques pour toute la liste, indexés par identifiant de visite. */
export function assignUniqueSlugs<T extends SluggableTour>(tours: readonly T[]): Map<string, TourSlugs> {
  const ordered = [...tours].sort((a, b) => {
    const byDate = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
  const taken = new Set<string>();
  const result = new Map<string, TourSlugs>();
  for (const tour of ordered) {
    const citySlug = generateSlug(tour.city ?? '');
    const base = baseSlug(tour);
    let slug = base;
    let n = 2;
    while (taken.has(`${citySlug}/${slug}`)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    taken.add(`${citySlug}/${slug}`);
    result.set(tour.id, { slug, citySlug });
  }
  return result;
}

/** La visite qui répond à cette adresse, ou null. */
export function findTourBySlugs<T extends SluggableTour>(
  tours: readonly T[],
  citySlug: string,
  tourSlug: string,
): T | null {
  const slugs = assignUniqueSlugs(tours);
  return (
    tours.find((tour) => {
      const s = slugs.get(tour.id);
      return s?.citySlug === citySlug && s.slug === tourSlug;
    }) ?? null
  );
}

import type { GuideProfile } from '@/types/tour';
import type { Tour } from '@/types/tour';
import { shouldUseStubs } from '@/config/api-mode';
import * as appsync from './appsync-client';

/**
 * Public guide data access layer.
 * Stub mode: mock data. Real mode: Amplify AppSync.
 */

// --- Slug Utility ---

export function generateGuideSlug(displayName: string, city: string): string {
  return `${displayName}-${city}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// --- Mock Data ---

const MOCK_PUBLIC_GUIDES: (GuideProfile & { totalListens: number })[] = [
  {
    id: 'guide-1',
    userId: 'user-guide-1',
    displayName: 'Marie Dupont',
    bio: 'Guide touristique passionnee par Grasse et son patrimoine parfumier. 15 ans d\'experience a faire decouvrir les secrets des maitres parfumeurs et l\'histoire fascinante de la capitale mondiale du parfum.',
    photoUrl: '/images/guides/marie.jpg',
    city: 'Grasse',
    parcoursSignature: "L'Ame des Parfumeurs",
    yearsExperience: 15,
    specialties: ['Parfumerie', 'Histoire locale', 'Architecture provencale'],
    languages: ['Francais', 'Anglais', 'Italien'],
    rating: 4.7,
    tourCount: 1,
    verified: true,
    totalListens: 289,
  },
  {
    id: 'guide-2',
    userId: 'user-guide-2',
    displayName: 'Pierre Martin',
    bio: 'Historien de formation, je fais decouvrir la vieille ville de Grasse depuis 8 ans. Passionnee d\'architecture medievale et de gastronomie provencale.',
    photoUrl: null,
    city: 'Grasse',
    parcoursSignature: null,
    yearsExperience: 8,
    specialties: ['Histoire medievale', 'Architecture', 'Gastronomie'],
    languages: ['Francais', 'Anglais'],
    rating: 4.0,
    tourCount: 1,
    verified: true,
    totalListens: 58,
  },
  {
    id: 'guide-3',
    userId: 'user-guide-3',
    displayName: 'Sophie Bernard',
    bio: 'Artiste et guide, je vous emmene dans le Paris boheme de Montmartre. Decouvrez les ateliers, les bistrots et les histoires secretes de la butte.',
    photoUrl: '/images/guides/sophie.jpg',
    city: 'Paris',
    parcoursSignature: 'Secrets de Montmartre',
    yearsExperience: 12,
    specialties: ['Art', 'Boheme', 'Histoire de Paris'],
    languages: ['Francais', 'Anglais', 'Espagnol'],
    rating: 5.0,
    tourCount: 1,
    verified: true,
    totalListens: 104,
  },
  {
    id: 'guide-4',
    userId: 'user-guide-4',
    displayName: 'Antoine Rossi',
    bio: 'Ne a Lyon, je connais chaque traboule du Vieux Lyon. Ancien architecte, je partage ma passion pour le patrimoine Renaissance de ma ville.',
    photoUrl: null,
    city: 'Lyon',
    parcoursSignature: 'Traboules du Vieux Lyon',
    yearsExperience: 6,
    specialties: ['Architecture Renaissance', 'Patrimoine UNESCO', 'Gastronomie lyonnaise'],
    languages: ['Francais', 'Italien'],
    rating: 4.0,
    tourCount: 1,
    verified: true,
    totalListens: 45,
  },
];

const MOCK_GUIDE_TOURS: Record<string, Tour[]> = {
  'guide-1': [
    { id: 'grasse-ame-parfumeurs', title: "L'Ame des Parfumeurs", slug: 'ame-des-parfumeurs', city: 'Grasse', citySlug: 'grasse', guideId: 'guide-1', guideName: 'Marie Dupont', guidePhotoUrl: '/images/guides/marie.jpg', description: 'Plongez dans l\'histoire de Grasse, capitale mondiale du parfum.', shortDescription: 'Decouvrez Grasse, capitale mondiale du parfum.', duration: 45, distance: 2.1, poiCount: 6, imageUrl: '/images/tours/grasse-parfumeurs.jpg', isFree: true, status: 'published' },
  ],
  'guide-2': [
    { id: 'grasse-vieille-ville', title: 'La Vieille Ville de Grasse', slug: 'vieille-ville', city: 'Grasse', citySlug: 'grasse', guideId: 'guide-2', guideName: 'Pierre Martin', description: 'Parcourez les ruelles medievales de la vieille ville de Grasse.', shortDescription: 'Les ruelles medievales et panoramas de la vieille ville.', duration: 35, distance: 1.5, poiCount: 5, isFree: false, status: 'published' },
  ],
  'guide-3': [
    { id: 'paris-montmartre', title: 'Secrets de Montmartre', slug: 'secrets-de-montmartre', city: 'Paris', citySlug: 'paris', guideId: 'guide-3', guideName: 'Sophie Bernard', guidePhotoUrl: '/images/guides/sophie.jpg', description: 'De la Place du Tertre au Sacre-Coeur, decouvrez les histoires cachees de la butte Montmartre.', shortDescription: 'Les histoires cachees de la butte Montmartre.', duration: 60, distance: 3.0, poiCount: 8, imageUrl: '/images/tours/paris-montmartre.jpg', isFree: false, status: 'published' },
  ],
  'guide-4': [
    { id: 'lyon-vieux-lyon', title: 'Traboules du Vieux Lyon', slug: 'traboules-vieux-lyon', city: 'Lyon', citySlug: 'lyon', guideId: 'guide-4', guideName: 'Antoine Rossi', description: 'Explorez les traboules secretes du Vieux Lyon, classees au patrimoine mondial de l\'UNESCO.', shortDescription: 'Les traboules secretes du Vieux Lyon UNESCO.', duration: 50, distance: 2.5, poiCount: 7, isFree: false, status: 'published' },
  ],
};

// --- Public API ---

export interface PublicGuideProfile extends GuideProfile {
  slug: string;
  totalListens: number;
}

function generateSlug(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// --- Stub functions ---

function getStubGuideBySlug(slug: string): PublicGuideProfile | null {
  const guide = MOCK_PUBLIC_GUIDES.find((g) => generateGuideSlug(g.displayName, g.city) === slug);
  if (!guide) return null;
  return { ...guide, slug };
}

function getStubGuidePublicTours(guideId: string): Tour[] {
  return MOCK_GUIDE_TOURS[guideId] || [];
}

function getStubAllPublicGuides(): PublicGuideProfile[] {
  return MOCK_PUBLIC_GUIDES.map((g) => ({ ...g, slug: generateGuideSlug(g.displayName, g.city) }));
}

function getStubGuidesByCity(citySlug: string): PublicGuideProfile[] {
  return MOCK_PUBLIC_GUIDES
    .filter((g) => g.city.toLowerCase() === citySlug.toLowerCase())
    .map((g) => ({ ...g, slug: generateGuideSlug(g.displayName, g.city) }));
}

// --- Real API functions ---

async function getRealAllPublicGuides(): Promise<PublicGuideProfile[]> {
  const profiles = await appsync.listGuideProfiles();
  return profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    displayName: p.displayName,
    bio: p.bio ?? null,
    photoUrl: p.photoUrl ?? null,
    city: p.city,
    parcoursSignature: p.parcoursSignature ?? null,
    yearsExperience: p.yearsExperience ?? null,
    specialties: (p.specialties as string[]) ?? [],
    languages: (p.languages as string[]) ?? [],
    rating: p.rating ?? null,
    tourCount: p.tourCount ?? null,
    verified: p.verified ?? false,
    slug: generateGuideSlug(p.displayName, p.city),
    totalListens: 0,
  }));
}

// --- Public API ---

export async function getGuideBySlug(slug: string): Promise<PublicGuideProfile | null> {
  if (shouldUseStubs()) return getStubGuideBySlug(slug);
  const guides = await getRealAllPublicGuides();
  return guides.find((g) => g.slug === slug) ?? null;
}

export async function getGuidePublicTours(guideId: string): Promise<Tour[]> {
  if (shouldUseStubs()) return getStubGuidePublicTours(guideId);
  const tours = await appsync.listGuideTours({ status: 'published' });
  return tours
    .filter((t) => t.guideId === guideId)
    .map((t) => ({
      id: t.id,
      title: t.title,
      slug: generateSlug(t.title),
      city: t.city,
      citySlug: generateSlug(t.city),
      guideId: t.guideId,
      guideName: '',
      description: t.description || '',
      shortDescription: (t.description || '').substring(0, 100),
      duration: t.duration || 0,
      distance: t.distance || 0,
      poiCount: t.poiCount || 0,
      isFree: false,
      status: (t.status || 'draft') as Tour['status'],
    }));
}

export async function getAllPublicGuides(): Promise<PublicGuideProfile[]> {
  if (shouldUseStubs()) return getStubAllPublicGuides();
  return getRealAllPublicGuides();
}

export async function getGuidesByCity(citySlug: string): Promise<PublicGuideProfile[]> {
  if (shouldUseStubs()) return getStubGuidesByCity(citySlug);
  const guides = await getRealAllPublicGuides();
  return guides.filter((g) => generateSlug(g.city) === citySlug);
}

export async function getGuideSlugByGuideId(guideId: string): Promise<string | null> {
  if (shouldUseStubs()) {
    const guide = MOCK_PUBLIC_GUIDES.find((g) => g.id === guideId);
    if (!guide) return null;
    return generateGuideSlug(guide.displayName, guide.city);
  }
  const profile = await appsync.getGuideProfileById(guideId);
  if (!profile) return null;
  return generateGuideSlug(profile.displayName, profile.city);
}

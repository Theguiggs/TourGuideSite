/**
 * Server-side public guides API.
 * Mirrors guides-public.ts but uses the server AppSync client (cookies-based).
 *
 * Browser code keeps using guides-public.ts — this module is server-only.
 */

import 'server-only';
import type { GuideProfile, Tour } from '@/types/tour';
import { shouldUseStubs } from '@/config/api-mode';
import {
  listGuideProfilesServer,
  listGuideToursServer,
  getGuideProfileByIdServer,
} from './appsync-server-public';
import { generateGuideSlug, type PublicGuideProfile } from './guides-public';
// Re-export non-async helpers/mock fallbacks via shouldUseStubs checks handled inline

function generateSlug(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function mapProfile(p: {
  id: string; userId: string; displayName: string;
  bio?: string | null; photoUrl?: string | null; city: string;
  parcoursSignature?: string | null; yearsExperience?: number | null;
  specialties?: unknown; languages?: unknown; rating?: number | null;
  tourCount?: number | null; verified?: boolean | null;
}): Promise<PublicGuideProfile> {
  return {
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
    freeLanguageUsed: ((p as Record<string, unknown>).freeLanguageUsed as boolean | undefined) ?? false,
    slug: generateGuideSlug(p.displayName, p.city),
    totalListens: 0,
  };
}

async function getRealAllPublicGuides(): Promise<PublicGuideProfile[]> {
  const profiles = await listGuideProfilesServer();
  return Promise.all(profiles.map((p) => mapProfile(p)));
}

// Stub fallbacks delegate to guides-public (client file) mock data — duplicated here
// would bloat the server bundle; for stubs we return [] and rely on dev using the browser path.
// In stub mode Server Components are rare, but keep behavior safe.
async function getStubAllPublicGuides(): Promise<PublicGuideProfile[]> {
  if (typeof window !== 'undefined') return [];
  return [];
}

export async function getAllPublicGuides(): Promise<PublicGuideProfile[]> {
  if (shouldUseStubs()) {
    // Delegate to mock-based function from the client module (safe: pure data, no React hooks)
    const { getAllPublicGuides: stubFn } = await import('./guides-public');
    return stubFn();
  }
  return getRealAllPublicGuides();
}

export async function getGuideBySlug(slug: string): Promise<PublicGuideProfile | null> {
  if (shouldUseStubs()) {
    const { getGuideBySlug: stubFn } = await import('./guides-public');
    return stubFn(slug);
  }
  const guides = await getRealAllPublicGuides();
  return guides.find((g) => g.slug === slug) ?? null;
}

export async function getGuidesByCity(citySlug: string): Promise<PublicGuideProfile[]> {
  if (shouldUseStubs()) {
    const { getGuidesByCity: stubFn } = await import('./guides-public');
    return stubFn(citySlug);
  }
  const guides = await getRealAllPublicGuides();
  return guides.filter((g) => generateSlug(g.city) === citySlug);
}

export async function getGuideSlugByGuideId(guideId: string): Promise<string | null> {
  if (shouldUseStubs()) {
    const { getGuideSlugByGuideId: stubFn } = await import('./guides-public');
    return stubFn(guideId);
  }
  const profile = await getGuideProfileByIdServer(guideId);
  if (!profile) return null;
  return generateGuideSlug(profile.displayName, profile.city);
}

export async function getGuidePublicTours(guideId: string): Promise<Tour[]> {
  if (shouldUseStubs()) {
    const { getGuidePublicTours: stubFn } = await import('./guides-public');
    return stubFn(guideId);
  }
  const tours = await listGuideToursServer({ status: 'published' });
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
      availableLanguages: Array.isArray((t as Record<string, unknown>).availableLanguages)
        ? (t as Record<string, unknown>).availableLanguages as string[]
        : ['fr'],
      createdAt: ((t as Record<string, unknown>).createdAt as string) ?? '',
    }));
}

// Re-export shared types
export type { PublicGuideProfile } from './guides-public';
export { generateGuideSlug } from './guides-public';
// Suppress unused-import warning
void ({} as GuideProfile);

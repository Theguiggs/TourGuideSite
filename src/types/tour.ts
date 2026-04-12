/** Shared types between mobile and web — mirrors Amplify schema */

export interface City {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  tourCount: number;
}

export interface Tour {
  id: string;
  title: string;
  slug: string;
  city: string;
  citySlug: string;
  guideId: string;
  guideName: string;
  guidePhotoUrl?: string;
  description: string;
  shortDescription: string;
  duration: number; // minutes
  distance: number; // km
  poiCount: number;
  imageUrl?: string;
  isFree: boolean;
  status: 'draft' | 'pending_moderation' | 'published' | 'rejected' | 'archived';
  availableLanguages?: string[];
  createdAt?: string;
  languageAudioTypes?: Record<string, 'tts' | 'recording' | 'mixed'>;
  latitude?: number;
  longitude?: number;
}

export interface POI {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  order: number;
}

export interface TourDetail extends Tour {
  pois: POI[];
  reviews: TourReview[];
  averageRating: number;
  reviewCount: number;
  completionCount: number;
}

export interface TourReview {
  id: string;
  userId: string;
  rating: number;
  comment: string | null;
  visitedAt: number;
  language: string;
  createdAt: string;
}

export interface GuideProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  city: string;
  parcoursSignature: string | null;
  yearsExperience: number | null;
  specialties: string[];
  languages: string[];
  rating: number | null;
  tourCount: number | null;
  verified: boolean;
  freeLanguageUsed: boolean;
}

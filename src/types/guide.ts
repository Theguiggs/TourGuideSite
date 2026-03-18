/** Guide dashboard types — mirrors Amplify schema */

export interface GuideDashboardStats {
  totalListens: number;
  revenueThisMonth: number;
  averageRating: number;
  pendingToursCount: number;
}

export type GuideTourStatus =
  | 'draft'
  | 'synced'
  | 'editing'
  | 'review'
  | 'revision_requested'
  | 'published'
  | 'pending_moderation'
  | 'rejected'
  | 'archived';

export interface GuideTourSummary {
  id: string;
  title: string;
  city: string;
  status: GuideTourStatus;
  listens: number;
  completionRate: number;
  rating: number;
  lastListenDate: string | null;
  rejectionFeedback: string | null;
  sessionId: string | null;
}

/** Scene data within a tour — audio recorded on mobile */
export interface TourScene {
  id: string;
  title: string;
  order: number;
  audioRef: string;
  photosRefs: string[];
  durationSeconds: number;
}

/** Admin comment on a tour — global or per-scene */
export interface AdminComment {
  id: string;
  sceneId?: string;
  comment: string;
  date: string;
  reviewerId: string;
  reviewerName: string;
}

export type TourDifficulty = 'facile' | 'moyen' | 'difficile';

/** Full tour detail for the guide editor */
export interface GuideTourDetail {
  id: string;
  guideId: string;
  title: string;
  descriptionLongue: string;
  city: string;
  status: GuideTourStatus;
  duration: number;
  distance: number;
  poiCount: number;
  difficulty: TourDifficulty;
  themes: string[];
  languePrincipale: string;
  scenes: TourScene[];
  adminComments: AdminComment[];
  heroImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuideRevenueSummary {
  thisMonth: number;
  total: number;
  currency: string;
}

export interface GuideRevenueMonth {
  month: string; // YYYY-MM
  grossRevenue: number;
  guideShare: number;
  tourguideShare: number;
  listens: number;
}

export interface GuideRevenueTour {
  tourId: string;
  tourTitle: string;
  listens: number;
  revenue: number;
  percentage: number;
}

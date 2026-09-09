/** Moderation types — mirrors Story 4.5 backend schema */

export type ModerationStatus = 'pending' | 'resubmitted' | 'in_review' | 'approved' | 'rejected';
export type NarrationMode = 'recording' | 'tts_on_demand';

export interface ModerationItem {
  id: string;
  tourId: string;
  sessionId: string;
  tourTitle: string;
  guideId: string;
  guideName: string;
  guidePhotoUrl: string | null;
  city: string;
  submissionDate: string; // ISO date
  status: ModerationStatus;
  isResubmission: boolean;
  poiCount: number;
  duration: number; // minutes
  distance: number; // km
  narrationMode?: NarrationMode | null;
  sourceLanguage?: string | null;
}

export interface ModerationDetail extends ModerationItem {
  description: string;
  descriptionLongue: string;
  pois: ModerationPOI[];
  guideSubmissionCount: number;
  guideApprovalRate: number;
  isFirstSubmission: boolean;
  // Enriched fields (Story 14-3)
  themes: string[];
  languePrincipale: string;
  difficulty: string;
  scenes: ModerationScene[];
  adminComments: ModerationAdminComment[];
  heroImageUrl: string | null;
  coverPhotoKey: string | null;
  contentProvenance: ContentProvenance | null;
  purchaseType: string | null;
  priceCents: number | null;
  guideBio: string | null;
  guideLanguages: string[];
  guideTourCount: number;
}

export type ContentProvenance = 'human' | 'ai' | 'mixed';

export interface AdminValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

export interface AdminValidationReport {
  ready: boolean;
  blockingCount: number;
  checks: AdminValidationCheck[];
}

export interface ModerationPOI {
  id: string;
  order: number;
  title: string;
  descriptionFr: string;
  descriptionEn: string;
  audioUrl: string | null;
  audioDuration: number; // seconds
  latitude: number;
  longitude: number;
  wordCountFr: number;
  wordCountEn: number;
}

export interface QualityChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  note: string;
}

export const QUALITY_CHECKLIST_TEMPLATE: Omit<QualityChecklistItem, 'checked' | 'note'>[] = [
  { id: 'audio_clarity', label: 'Clarte audio', description: "L'audio est clair, sans bruit excessif ni coupures" },
  { id: 'content_quality', label: 'Contenu precis et interessant', description: 'Les informations sont correctes et engageantes' },
  { id: 'no_inappropriate', label: 'Aucun contenu inapproprie', description: 'Pas de propos offensants, discriminatoires ou illegaux' },
  { id: 'gps_walkable', label: 'Parcours GPS praticable', description: 'Le parcours est accessible a pied et securise' },
  { id: 'translation_quality', label: 'Qualite de traduction', description: 'La traduction FR/EN est naturelle et fidele' },
];

export function getQualityChecklistTemplate(
  isTranslation: boolean,
  narrationMode: NarrationMode | null = 'recording',
): Omit<QualityChecklistItem, 'checked' | 'note'>[] {
  const common = QUALITY_CHECKLIST_TEMPLATE.filter(
    (item) => isTranslation || item.id !== 'translation_quality',
  );
  if (narrationMode === 'tts_on_demand') {
    return [
      ...common.filter((item) => item.id !== 'audio_clarity'),
      {
        id: 'text_pronounceability',
        label: 'Prononçabilité du texte',
        description: 'Le texte est final, naturel à l’oral et ne contient aucune instruction technique',
      },
    ];
  }
  return common;
}

export type RejectionCategory = 'audio_quality' | 'content_accuracy' | 'inappropriate' | 'gps_issues' | 'translation' | 'other';

export const REJECTION_CATEGORIES: { value: RejectionCategory; label: string }[] = [
  { value: 'audio_quality', label: 'Qualite audio' },
  { value: 'content_accuracy', label: 'Precision du contenu' },
  { value: 'inappropriate', label: 'Contenu inapproprie' },
  { value: 'gps_issues', label: 'Problemes GPS/parcours' },
  { value: 'translation', label: 'Problemes de traduction' },
  { value: 'other', label: 'Autre' },
];

export interface ModerationMetrics {
  pendingCount: number;
  avgReviewTimeMinutes: number;
  approvalRate: number;
  reviewedThisMonth: number;
}

export interface ModerationScene {
  id: string;
  title: string;
  order: number;
  audioRef: string;
  baseAudioSource?: 'tts' | 'recording' | null;
  photosRefs: string[];
  durationSeconds: number;
  latitude: number | null;
  longitude: number | null;
  poiDescription: string | null;
  transcriptText: string | null;
}

export interface ModerationAdminComment {
  id: string;
  sceneId?: string;
  comment: string;
  date: string;
  reviewerId: string;
  reviewerName: string;
}

export interface LanguageModerationItem {
  id: string;
  tourId: string;
  sessionId: string;
  moderationItemId: string; // Original ModerationItem.id for detail page link
  tourTitle: string;
  guideName: string;
  guidePhotoUrl: string | null;
  city: string;
  language: string;
  qualityTier: string;
  submissionDate: string; // ISO date from purchase createdAt
  moderationStatus: ModerationStatus;
  purchaseId: string;
  isSourceLanguage?: boolean; // true for tour-level rows synthesized from ModerationItem (no purchase)
  narrationMode?: NarrationMode | null;
}

export interface ModerationHistoryItem {
  id: string;
  tourTitle: string;
  guideName: string;
  city: string;
  decision: 'approved' | 'rejected';
  reviewDate: string;
  reviewerName: string;
  feedback: string | null;
}

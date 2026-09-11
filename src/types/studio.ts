/** Studio types — mirrors Amplify AppSync schema for Audio Studio Web */

// --- Enums ---

export type StudioSessionStatus =
  | 'draft'
  | 'transcribing'
  | 'editing'
  | 'recording'
  | 'ready'
  | 'submitted'
  | 'published'
  | 'paused'
  | 'revision_requested'
  | 'rejected'
  | 'archived'
  | 'ready_for_cleanup';

export type CaptureMode = 'scene_builder' | 'phased_capture';
export type NarrationMode = 'recording' | 'tts_on_demand';

export type SceneStatus =
  | 'empty'
  | 'has_original'
  | 'transcribed'
  | 'edited'
  | 'recorded'
  | 'finalized';

export type TranscriptionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type QualityScore = 'good' | 'needs_improvement' | null;

export type CodecStatus =
  | 'native_aac'
  | 'pending_conversion'
  | 'converted'
  | 'conversion_failed';

// --- Models ---

export interface StudioSession {
  id: string;
  guideId: string;
  sourceSessionId: string;
  tourId: string | null;
  title: string | null;
  status: StudioSessionStatus;
  language: string;
  transcriptionQuotaUsed: number | null;
  coverPhotoKey: string | null;
  availableLanguages: string[];
  translatedTitles: Record<string, string> | null;        // { en: "Walking Tour", es: "..." }
  translatedDescriptions: Record<string, string> | null;  // { en: "A lovely walk...", es: "..." }
  version: number;
  consentRGPD: boolean;
  captureMode?: CaptureMode | null;
  captureSessionRef?: string | null;
  narrationMode?: NarrationMode | null;
  // GCI-4.2: global tour metadata captured during /cleanup
  description?: string | null;
  themes?: string[] | null;
  durationMinutes?: number | null;
  cleanedAt?: string | null;
  // Itinerary tracer state — see RoutePath below
  routePath?: RoutePath | null;
  /**
   * Modèle d'accès de la Visite publiée (GuideTour), rapporté par
   * `withPublishedStatus` pour l'affichage côté guide. Absent quand la session
   * n'a pas encore de visite ou que la lecture a échoué.
   */
  tourAccess?: {
    purchaseType: 'free' | 'paid' | 'subscription_only' | null;
    priceCents: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/** Persisted itinerary tracer state. Stored as JSON in StudioSession.routePathJson. */
export interface RoutePath {
  waypoints: Array<{ id: string; lat: number; lng: number; afterPoiIndex: number; order: number }>;
  manualMode: boolean;
  pathOverride: {
    source: 'gpx';
    path: Array<{ lat: number; lng: number }>;
    distanceMeters: number;
    capturedAt: number;
  } | null;
  /** Final polyline (lat/lng) to render on read-only views (catalogue, moderation). */
  computedPath: Array<{ lat: number; lng: number }> | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  updatedAt: number;
}

/** Theme enum for tours (GCI-4.2) */
export const TOUR_THEMES = [
  'histoire',
  'gastronomie',
  'art',
  'nature',
  'architecture',
  'legendes',
] as const;
export type TourTheme = (typeof TOUR_THEMES)[number];

/** Supported languages for tour content */
export const TOUR_LANGUAGES = ['fr', 'en', 'es', 'de', 'it', 'ja'] as const;
export type TourLanguage = (typeof TOUR_LANGUAGES)[number];

export interface StudioScene {
  id: string;
  sessionId: string;
  sceneIndex: number;
  title: string | null;
  originalAudioKey: string | null;
  studioAudioKey: string | null;
  baseAudioSource?: AudioSource | null; // how the base-lang audio was made: 'tts' | 'recording'
  transcriptText: string | null;
  transcriptionJobId: string | null;
  transcriptionStatus: TranscriptionStatus | null;
  qualityScore: QualityScore;
  qualityDetailsJson: string | null;
  codecStatus: CodecStatus | null;
  status: SceneStatus;
  takesCount: number | null;
  selectedTakeIndex: number | null;
  moderationFeedback: string | null;
  photosRefs: string[];          // max 3 photos per scene (S3 keys)
  latitude: number | null;       // POI GPS
  longitude: number | null;
  poiDescription: string | null; // aide touriste
  heroPhotoRef?: string | null;   // selected hero photo among photosRefs
  trimStart?: number | null;      // audio trim start (seconds)
  trimEnd?: number | null;        // audio trim end (seconds)
  archived: boolean;             // archived = hidden from scenes & preview, data preserved
  createdAt: string;
  updatedAt: string;
}

export interface WalkSegment {
  id: string;
  sessionId: string;
  order: number;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  distanceM: number | null;
  gpsTrackJson: string | null;
  audioRefs: string[];
  photoRefs: string[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const MAX_PHOTOS_PER_SCENE = 3;

// --- Error codes 23xx ---

export const StudioErrorCode = {
  MIC_PERMISSION_DENIED: 2301,
  RECORDER_START_FAILED: 2302,
  RECORDER_STOPPED_UNEXPECTEDLY: 2303,
  CODEC_DETECTION_FAILED: 2304,
  UPLOAD_AUDIO_FAILED: 2305,
  TRANSCRIPTION_TRIGGER_FAILED: 2306,
  TRANSCRIPTION_QUOTA_EXCEEDED: 2307,
  DRAFT_SAVE_FAILED: 2308,
  FILE_IMPORT_INVALID: 2309,
  QUALITY_ANALYSIS_FAILED: 2310,
  PHOTO_UPLOAD_FAILED: 2311,
  SESSION_NOT_FOUND: 2312,
  SCENE_NOT_FOUND: 2313,
  SUBMISSION_FAILED: 2314,
  SIGNED_URL_FAILED: 2315,
} as const;

export type StudioErrorCodeValue = (typeof StudioErrorCode)[keyof typeof StudioErrorCode];

export interface StudioError {
  code: StudioErrorCodeValue;
  message: string;
}

export function createStudioError(code: StudioErrorCodeValue, message: string): StudioError {
  return { code, message };
}

// --- Result pattern (matches mobile ADR-017) ---

export type StudioResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StudioError };

export function Ok<T>(value: T): StudioResult<T> {
  return { ok: true, value };
}

export function Err<T>(error: StudioError): StudioResult<T> {
  return { ok: false, error };
}

// --- Progress steps ---

export const STUDIO_WORKFLOW_STEPS = [
  { key: 'general', label: 'Informations', icon: '📋' },
  { key: 'itinerary', label: 'Itinéraire', icon: '🗺️' },
  { key: 'scenes', label: 'Scènes', icon: '🎬' },
  { key: 'preview', label: 'Aperçu', icon: '👁️' },
  { key: 'submission', label: 'Envoyer', icon: '📤' },
] as const;

export type StudioWorkflowStep = (typeof STUDIO_WORKFLOW_STEPS)[number]['key'];

// --- SceneSegment (multi-segment per scene) ---

export type SegmentStatus =
  | 'empty'
  | 'transcribed'
  | 'translated'
  | 'tts_generated'
  | 'finalized';

/**
 * Moteurs de traduction. `claude` est le moteur de LANGUE de la story 4 :
 * une Scène entière, un seul appel, aucune langue intermédiaire.
 *
 * Il porte son propre nom plutôt que de réemployer `openai` — qui aurait évité
 * une migration de schéma : `translationProvider` est ce que lit la
 * certification pour décider si un segment vient d'un moteur proscrit. Une
 * mesure sous une fausse étiquette est pire qu'une absence d'étiquette.
 *
 * Miroir de `SceneSegment.translationProvider` (TourGuideApp/amplify/data/resource.ts).
 */
export type TranslationProvider = 'marianmt' | 'deepl' | 'openai' | 'claude';

export type TranslationJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type TTSJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type AudioSource = 'tts' | 'recording';

export interface SceneSegment {
  id: string;
  sceneId: string;
  segmentIndex: number;
  audioKey: string | null;
  transcriptText: string | null;
  startTimeMs: number | null;
  endTimeMs: number | null;
  language: string;
  sourceSegmentId: string | null;
  ttsGenerated: boolean;
  translationProvider: TranslationProvider | null;
  costProvider: number | null;   // centimes, real API cost
  costCharged: number | null;    // centimes, with margin applied
  status: SegmentStatus;
  manuallyEdited: boolean;
  audioSource?: AudioSource;     // 'tts' | 'recording' — source of the current audioKey
  translatedTitle: string | null; // translated POI/scene title for this language
  sourceUpdatedAt: string | null;
  sourceTextHash?: string | null; // hash of source text at translation time (staleness)
  createdAt: string;
  updatedAt: string;
}

/** Stable FNV-1a hash of a scene's source text (transcript + title). Used to
 *  detect whether a translation is stale based on CONTENT, not on the scene's
 *  updatedAt (which also bumps on GPS/photo edits). Mirrored in the migration
 *  script (scripts/) — keep the two in sync. */
export function hashSourceText(transcriptText: string | null, title: string | null): string {
  // SÉPARATEUR : caractère NUL, écrit ici en ÉCHAPPEMENT (contre-oblique zéro).
  // Il était présent en OCTET NUL littéral dans la source. Conséquence : git et
  // grep classaient studio.ts comme BINAIRE, le fichier ne diffait plus, et
  // toute relecture de ce module — y compris celle du type élargi plus haut —
  // était aveugle. L'échappement produit exactement la même chaîne, donc
  // exactement la même empreinte : les 3 810 `sourceTextHash` déjà semés
  // restent valides, ce que l'épreuve de `source-hash.cjs` épingle.
  const s = `${transcriptText ?? ''}\0${title ?? ''}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

// --- Multilang Purchase Types ---

export type QualityTier = 'standard' | 'pro' | 'manual';

export type PurchaseType = 'single' | 'pack_3' | 'pack_all' | 'free_first' | 'manual';

export type PurchaseStatus = 'active' | 'refunded';

export type PurchaseModerationStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';

export interface TourLanguagePurchase {
  id: string;
  guideId: string;
  sessionId: string;
  language: string;
  qualityTier: QualityTier;
  provider: 'marianmt' | 'deepl' | null;
  purchaseType: PurchaseType;
  amountCents: number;
  stripePaymentIntentId: string | null;
  moderationStatus: PurchaseModerationStatus;
  status: PurchaseStatus;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Error codes 24xx (Translation) ---

export const TranslationErrorCode = {
  TRANSLATION_TRIGGER_FAILED: 2401,
  TRANSLATION_POLLING_FAILED: 2402,
  TRANSLATION_TEXT_EMPTY: 2403,
  TRANSLATION_PROVIDER_UNAVAILABLE: 2404,
  TRANSLATION_COST_ESTIMATION_FAILED: 2405,
  TRANSLATION_LANGUAGE_UNSUPPORTED: 2406,
  TRANSLATION_SAVE_FAILED: 2407,
} as const;

export type TranslationErrorCodeValue = (typeof TranslationErrorCode)[keyof typeof TranslationErrorCode];

// --- Error codes 25xx (TTS) ---

export const TTSErrorCode = {
  TTS_TRIGGER_FAILED: 2501,
  TTS_POLLING_FAILED: 2502,
  TTS_TEXT_EMPTY: 2503,
  TTS_GPU_UNAVAILABLE: 2504,
  TTS_AUDIO_GENERATION_FAILED: 2505,
  TTS_LANGUAGE_UNSUPPORTED: 2506,
  TTS_UPLOAD_FAILED: 2507,
} as const;

export type TTSErrorCodeValue = (typeof TTSErrorCode)[keyof typeof TTSErrorCode];

// --- Error codes 26xx (Multilang Purchase) ---

export const MultilangErrorCode = {
  PAYMENT_FAILED: 2601,
  PAYMENT_INTENT_CREATION_FAILED: 2602,
  LANGUAGE_ALREADY_PURCHASED: 2603,
  PURCHASE_NOT_FOUND: 2604,
  REFUND_FAILED: 2605,
  FREE_LANGUAGE_ALREADY_USED: 2606,
} as const;

export type MultilangErrorCodeValue = (typeof MultilangErrorCode)[keyof typeof MultilangErrorCode];

// Union of all studio error code values
export type AllStudioErrorCodeValue = StudioErrorCodeValue | TranslationErrorCodeValue | TTSErrorCodeValue | MultilangErrorCodeValue;

// --- Helper: get segments with legacy compat ---

/** Returns segments for a scene. If no segments exist, creates an implicit one from scene data. */
export function getSceneSegments(scene: StudioScene, segments: SceneSegment[]): SceneSegment[] {
  if (segments.length > 0) {
    return [...segments].sort((a, b) => a.segmentIndex - b.segmentIndex);
  }

  // Legacy compat: create implicit single segment from scene data
  return [{
    id: `implicit-${scene.id}`,
    sceneId: scene.id,
    segmentIndex: 0,
    audioKey: scene.studioAudioKey ?? scene.originalAudioKey ?? null,
    transcriptText: scene.transcriptText ?? null,
    startTimeMs: null,
    endTimeMs: null,
    language: 'fr',
    sourceSegmentId: null,
    ttsGenerated: false,
    translationProvider: null,
    costProvider: null,
    costCharged: null,
    status: scene.transcriptText ? 'transcribed' : 'empty',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: null,
    createdAt: scene.createdAt,
    updatedAt: scene.updatedAt,
  }];
}

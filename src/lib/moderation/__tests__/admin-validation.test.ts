import {
  buildAdminValidationReport,
  canApproveAdminReview,
  getModerationScenePresentation,
  hasValidCoordinates,
} from '../admin-validation';
import type { ModerationDetail } from '@/types/moderation';
import type { SceneSegment } from '@/types/studio';
import { getQualityChecklistTemplate } from '@/types/moderation';

const detail: ModerationDetail = {
  id: 'moderation-1',
  tourId: 'tour-1',
  sessionId: 'session-1',
  tourTitle: 'Les remparts',
  guideId: 'guide-1',
  guideName: 'Guide',
  guidePhotoUrl: null,
  city: 'Mennetou-sur-Cher',
  submissionDate: '2026-09-09T08:00:00.000Z',
  status: 'pending',
  isResubmission: false,
  poiCount: 2,
  duration: 20,
  distance: 1.2,
  description: 'Une visite historique.',
  descriptionLongue: '',
  pois: [],
  guideSubmissionCount: 0,
  guideApprovalRate: 0,
  isFirstSubmission: true,
  themes: ['patrimoine'],
  languePrincipale: 'fr',
  difficulty: 'facile',
  scenes: [
    {
      id: 'scene-1', title: 'Porte basse', order: 1, audioRef: 'audio/fr/1.mp3',
      photosRefs: [], durationSeconds: 60, latitude: 0, longitude: 0,
      poiDescription: null, transcriptText: 'Texte un.',
    },
    {
      id: 'scene-2', title: 'Porte haute', order: 2, audioRef: 'audio/fr/2.mp3',
      photosRefs: [], durationSeconds: 60, latitude: 47.2, longitude: 1.8,
      poiDescription: null, transcriptText: 'Texte deux.',
    },
  ],
  adminComments: [],
  heroImageUrl: null,
  coverPhotoKey: 'covers/tour-1.jpg',
  contentProvenance: 'ai',
  purchaseType: 'free',
  priceCents: 0,
  guideBio: null,
  guideLanguages: ['fr'],
  guideTourCount: 1,
};

const routePath = [{ lat: 0, lng: 0 }, { lat: 47.2, lng: 1.8 }];

function translatedSegment(sceneId: string): SceneSegment {
  return {
    id: `segment-${sceneId}`,
    sceneId,
    segmentIndex: 0,
    language: 'en',
    transcriptText: 'Translated text.',
    audioKey: `audio/en/${sceneId}.mp3`,
    startTimeMs: null,
    endTimeMs: null,
    sourceSegmentId: null,
    ttsGenerated: true,
    translationProvider: 'claude',
    costProvider: null,
    costCharged: null,
    status: 'finalized',
    manuallyEdited: false,
    translatedTitle: `Translated ${sceneId}`,
    sourceUpdatedAt: null,
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-09T08:00:00.000Z',
  };
}

describe('buildAdminValidationReport', () => {
  it('autorise une visite source complète et accepte les coordonnées zéro', () => {
    const report = buildAdminValidationReport({
      detail,
      language: 'fr',
      segmentsByScene: {},
      routePath,
      dependentDataLoaded: true,
    });

    expect(report.ready).toBe(true);
    expect(report.blockingCount).toBe(0);
    expect(hasValidCoordinates(0, 0)).toBe(true);
  });

  it('bloque une traduction incomplète et nomme la scène et les champs absents', () => {
    const segmentsByScene = {
      'scene-1': [translatedSegment('scene-1')],
      'scene-2': [{ ...translatedSegment('scene-2'), translatedTitle: null, audioKey: null }],
    };
    const report = buildAdminValidationReport({
      detail,
      language: 'en',
      segmentsByScene,
      routePath,
      dependentDataLoaded: true,
    });
    const contentCheck = report.checks.find((item) => item.id === 'translated_content');

    expect(report.ready).toBe(false);
    expect(contentCheck?.evidence).toContain('Porte haute');
    expect(contentCheck?.evidence).toContain('titre traduit');
    expect(contentCheck?.evidence).toContain('audio traduit');
  });

  it('bloque les métadonnées globales traduites absentes', () => {
    const segmentsByScene = {
      'scene-1': [translatedSegment('scene-1')],
      'scene-2': [translatedSegment('scene-2')],
    };
    const report = buildAdminValidationReport({
      detail,
      language: 'en',
      segmentsByScene,
      routePath,
      dependentDataLoaded: true,
    });

    expect(report.checks.find((item) => item.id === 'translated_identity')?.passed).toBe(false);
  });

  it.each([
    ['texte composé d’espaces', { transcriptText: '   ' }],
    ['audio composé d’espaces', { audioKey: '   ' }],
    ['statut non final', { status: 'translated' as const }],
    ['traduction périmée', { sourceTextHash: 'ancienne-empreinte' }],
  ])('bloque un segment traduit invalide : %s', (_label, override) => {
    const invalid = { ...translatedSegment('scene-1'), ...override };
    const report = buildAdminValidationReport({
      detail,
      language: 'en',
      segmentsByScene: {
        'scene-1': [invalid],
        'scene-2': [translatedSegment('scene-2')],
      },
      routePath,
      dependentDataLoaded: true,
      translatedTourTitle: 'The ramparts',
      translatedTourDescription: 'A historical tour.',
    });

    expect(report.checks.find((item) => item.id === 'translated_content')?.passed).toBe(false);
  });

  it('bloque plusieurs segments concurrents pour une même scène et une même langue', () => {
    const first = translatedSegment('scene-1');
    const report = buildAdminValidationReport({
      detail,
      language: 'en',
      segmentsByScene: {
        'scene-1': [first, { ...first, id: 'segment-duplicate' }],
        'scene-2': [translatedSegment('scene-2')],
      },
      routePath,
      dependentDataLoaded: true,
      translatedTourTitle: 'The ramparts',
      translatedTourDescription: 'A historical tour.',
    });

    expect(report.checks.find((item) => item.id === 'translated_content')?.evidence).toContain('segment unique');
  });

  it('ne remplace jamais une traduction manquante par le contenu source', () => {
    const presentation = getModerationScenePresentation(detail.scenes[0], undefined, true);

    expect(presentation).toEqual({
      title: 'Titre non traduit',
      text: null,
      audioKey: null,
    });
    expect(presentation.title).not.toBe(detail.scenes[0].title);
    expect(presentation.text).not.toBe(detail.scenes[0].transcriptText);
    expect(presentation.audioKey).not.toBe(detail.scenes[0].audioRef);
  });

  it.each([
    ['gastronomie', { themes: ['gastronomie'] }, 'themes'],
    ['restaurant', { themes: ['restaurants et marchés'] }, 'themes'],
    ['thème vide', { themes: ['   '] }, 'themes'],
    ['provenance absente', { contentProvenance: null }, 'provenance'],
    ['couverture absente', { coverPhotoKey: null }, 'cover'],
    ['accès payant', { purchaseType: 'paid' }, 'access'],
  ])('bloque la métadonnée globale invalide : %s', (_label, override, checkId) => {
    const report = buildAdminValidationReport({
      detail: { ...detail, ...override },
      language: 'fr',
      segmentsByScene: {},
      routePath,
      dependentDataLoaded: true,
    });

    expect(report.ready).toBe(false);
    expect(report.checks.find((item) => item.id === checkId)?.passed).toBe(false);
  });

  it('bloque pendant le chargement des données dépendantes', () => {
    const report = buildAdminValidationReport({
      detail,
      language: 'fr',
      segmentsByScene: {},
      routePath: null,
      dependentDataLoaded: false,
    });

    expect(report).toEqual({
      ready: false,
      blockingCount: 1,
      checks: [expect.objectContaining({ id: 'dependent_data', passed: false })],
    });
    expect(canApproveAdminReview(report, [{
      id: 'content_quality',
      label: 'Qualité',
      description: 'Contrôle humain',
      checked: true,
      note: '',
    }])).toBe(false);
  });

  it('n’autorise l’approbation qu’après les contrôles automatiques et humains', () => {
    const report = buildAdminValidationReport({
      detail,
      language: 'fr',
      segmentsByScene: {},
      routePath,
      dependentDataLoaded: true,
    });
    const item = {
      id: 'content_quality',
      label: 'Qualité',
      description: 'Contrôle humain',
      checked: false,
      note: '',
    };

    expect(canApproveAdminReview(report, [item])).toBe(false);
    expect(canApproveAdminReview(report, [{ ...item, checked: true }])).toBe(true);
  });

  it('refuse les coordonnées non finies ou hors bornes', () => {
    expect(hasValidCoordinates(Number.NaN, 1)).toBe(false);
    expect(hasValidCoordinates(91, 1)).toBe(false);
    expect(hasValidCoordinates(45, 181)).toBe(false);
    expect(hasValidCoordinates(null, 1)).toBe(false);
  });

  it('refuse un tracé composé de points identiques', () => {
    const report = buildAdminValidationReport({
      detail,
      language: 'fr',
      segmentsByScene: {},
      routePath: [{ lat: 47, lng: 1 }, { lat: 47, lng: 1 }],
      dependentDataLoaded: true,
    });

    expect(report.checks.find((item) => item.id === 'route')?.passed).toBe(false);
  });

  it('adapte la checklist humaine à la langue examinée', () => {
    expect(getQualityChecklistTemplate(false).map((item) => item.id)).not.toContain('translation_quality');
    expect(getQualityChecklistTemplate(true).map((item) => item.id)).toContain('translation_quality');
  });
});

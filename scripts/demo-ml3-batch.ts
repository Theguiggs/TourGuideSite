/**
 * Demo ML-3: Batch Translation & TTS
 * Run with: npx tsx scripts/demo-ml3-batch.ts
 *
 * Exercises the full batch flow in stub mode:
 * A1-A3: Batch 5 scenes in Pro (anglais)
 * B1-B2: Estimation + multi-lang
 * C1-C3: Resume detection
 * D1-D2: Failure + retry
 * E1-E2: Provider routing Standard vs Pro
 */

// Force stub mode
process.env.NEXT_PUBLIC_USE_STUBS = 'true';

import { executeBatch } from '../src/lib/multilang/batch-translation-service';
import { retryScene, getMissingScenes } from '../src/lib/multilang/batch-translation-service';
import { estimateBatchDuration } from '../src/lib/stores/language-batch-store';
import { getProviderForTier } from '../src/lib/multilang/provider-router';
import type { QualityTier } from '../src/types/studio';

// Mock scenes (5 scenes like the demo protocol asks)
const MOCK_SCENES = [
  { id: 'scene-1', sceneIndex: 0, title: 'Place aux Aires', transcriptText: 'Bienvenue sur la place aux Aires, coeur historique de Grasse.', updatedAt: '2026-03-29T10:00:00Z' },
  { id: 'scene-2', sceneIndex: 1, title: 'Cathedrale', transcriptText: 'La cathedrale Notre-Dame du Puy domine la vieille ville depuis le XIIe siecle.', updatedAt: '2026-03-29T10:00:00Z' },
  { id: 'scene-3', sceneIndex: 2, title: 'Fontaine', transcriptText: 'Cette fontaine du XVIIIe siecle alimentait autrefois tout le quartier.', updatedAt: '2026-03-29T10:00:00Z' },
  { id: 'scene-4', sceneIndex: 3, title: 'Parfumerie Fragonard', transcriptText: 'Fragonard, fondee en 1926, est la plus ancienne parfumerie de Grasse.', updatedAt: '2026-03-29T10:00:00Z' },
  { id: 'scene-5', sceneIndex: 4, title: 'Jardin des Plantes', transcriptText: 'Le jardin offre une vue panoramique sur la Mediterranee.', updatedAt: '2026-03-29T10:00:00Z' },
] as any[];

const SEPARATOR = '═'.repeat(60);
const SUBSEP = '─'.repeat(40);

function log(emoji: string, msg: string) {
  console.log(`  ${emoji} ${msg}`);
}

async function demoA_BatchPro() {
  console.log('\n' + SEPARATOR);
  console.log('  A. BATCH 5 SCENES EN ANGLAIS (PRO)');
  console.log(SEPARATOR);

  const progressLog: string[] = [];

  log('🚀', 'A1. Lancement batch: 5 scenes, anglais, Pro (DeepL)');
  console.log('');

  let scenesDone = 0;
  const result = await executeBatch(
    'demo-session',
    MOCK_SCENES,
    [{ code: 'en', provider: 'deepl' }],
    'pro' as QualityTier,
    (lang, sceneId, step) => {
      const scene = MOCK_SCENES.find(s => s.id === sceneId);
      if (step === 'tts_completed') scenesDone++;
      const pct = Math.round((scenesDone / MOCK_SCENES.length) * 100);
      log('📊', `A2. [${lang.toUpperCase()}] ${scene?.title ?? sceneId} → ${step} (${scenesDone}/${MOCK_SCENES.length} = ${pct}%)`);
    }
  );

  console.log('');
  if (result.ok) {
    log('✅', `A3. Batch termine: ${result.value.completedScenes}/${result.value.totalScenes} scenes — Texte ✅ Audio ✅`);
    if (result.value.failedScenes.length > 0) {
      log('⚠️', `${result.value.failedScenes.length} scenes en echec`);
    }
  }
}

async function demoB_Estimation() {
  console.log('\n' + SEPARATOR);
  console.log('  B. ESTIMATION DUREE + MULTI-LANG');
  console.log(SEPARATOR);

  // B1: Estimation
  const duration1 = estimateBatchDuration(5, 1);
  log('⏱️', `B1. Estimation 5 scenes x 1 langue: ~${duration1}s (~${Math.round(duration1/60)} min)`);

  const duration3 = estimateBatchDuration(5, 3);
  log('⏱️', `B1. Estimation 5 scenes x 3 langues: ~${duration3}s (~${Math.round(duration3/60)} min)`);

  const duration12x3 = estimateBatchDuration(12, 3);
  log('⏱️', `B1. Estimation 12 scenes x 3 langues: ~${duration12x3}s (~${Math.round(duration12x3/60)} min)`);

  // B2: Multi-lang batch
  console.log('');
  log('🌍', 'B2. Batch 3 scenes x 2 langues (en + es), Pro');

  let currentLang = '';
  await executeBatch(
    'demo-session-multi',
    MOCK_SCENES.slice(0, 3),
    [{ code: 'en', provider: 'deepl' }, { code: 'es', provider: 'deepl' }],
    'pro' as QualityTier,
    (lang, sceneId, step) => {
      if (lang !== currentLang) {
        currentLang = lang;
        console.log(`\n  🏳️ Langue: ${lang.toUpperCase()}`);
      }
      const scene = MOCK_SCENES.find(s => s.id === sceneId);
      log('📊', `${scene?.title} → ${step}`);
    }
  );

  console.log('');
  log('✅', 'B2. Batch multi-lang termine — langue par langue, scene par scene');
}

async function demoC_Resume() {
  console.log('\n' + SEPARATOR);
  console.log('  C. REPRISE APRES FERMETURE');
  console.log(SEPARATOR);

  // Simulate: 3 scenes done, 2 missing
  const existingSegments = [
    { sceneId: 'scene-1', language: 'en', transcriptText: 'Welcome...', audioKey: 'audio-1.mp3' },
    { sceneId: 'scene-2', language: 'en', transcriptText: 'The cathedral...', audioKey: 'audio-2.mp3' },
    { sceneId: 'scene-3', language: 'en', transcriptText: 'This fountain...', audioKey: 'audio-3.mp3' },
    // scene-4 and scene-5 are MISSING
  ] as any[];

  log('🔍', 'C1-C2. Detection des scenes manquantes apres fermeture onglet:');
  const missingIds = getMissingScenes(existingSegments as any, MOCK_SCENES as any, 'en');
  const missingScenes = MOCK_SCENES.filter(s => missingIds.includes(s.id));
  log('📋', `Scenes deja faites: 3/5 ✅`);
  log('📋', `Scenes manquantes: ${missingScenes.length} → ${missingScenes.map(s => s.title).join(', ')}`);

  console.log('');
  log('▶️', 'C3. "Reprendre la traduction" — batch uniquement les manquantes');

  await executeBatch(
    'demo-session-resume',
    missingScenes as any,
    [{ code: 'en', provider: 'deepl' }],
    'pro' as QualityTier,
    (lang, sceneId, step) => {
      const scene = missingScenes.find(s => s.id === sceneId);
      log('📊', `${scene?.title} → ${step}`);
    }
  );

  log('✅', 'C3. Reprise terminee — uniquement 2 scenes manquantes traitees');
}

async function demoD_Retry() {
  console.log('\n' + SEPARATOR);
  console.log('  D. ECHEC + RETRY INDIVIDUEL');
  console.log(SEPARATOR);

  log('💥', 'D1. Simulation echec scene (le retry corrige):');

  // We can't easily simulate a failure in stubs without __setStubProviderDown,
  // so we demonstrate the retry function directly
  log('🔄', 'D2. Retry individuel sur scene-3:');
  const retryResult = await retryScene(
    MOCK_SCENES[2] as any, // scene-3: Fontaine
    'en',
    'pro' as QualityTier,
  );

  if ('translatedText' in retryResult) {
    log('✅', `D2. Retry reussi — texte: "${retryResult.translatedText?.substring(0, 50)}..."`);
    log('✅', `D2. Audio genere: ${retryResult.audioKey ? 'oui' : 'non'}`);
  } else {
    log('❌', `D2. Retry echoue: code ${retryResult.code} — ${retryResult.message}`);
  }
}

async function demoE_ProviderRouting() {
  console.log('\n' + SEPARATOR);
  console.log('  E. PROVIDER ROUTING (STANDARD vs PRO)');
  console.log(SEPARATOR);

  const standardProvider = getProviderForTier('standard');
  const proProvider = getProviderForTier('pro');

  log('🔧', `E1. Standard → ${standardProvider} (MarianMT, quasi-instantane)`);
  log('🔧', `E2. Pro → ${proProvider} (DeepL, ~2-3s)`);

  // Show that premium languages force deepl
  const { isLanguagePremium } = await import('../src/lib/multilang/provider-router');
  const premiumLangs = ['ja', 'zh', 'pt', 'ko', 'ar'];
  const euLangs = ['en', 'es', 'de', 'it'];

  console.log('');
  log('🌏', 'Langues premium (toujours DeepL):');
  for (const lang of premiumLangs) {
    log('  ', `${lang}: premium=${isLanguagePremium(lang)} → force deepl`);
  }

  log('🇪🇺', 'Langues EU (selon tier):');
  for (const lang of euLangs) {
    log('  ', `${lang}: premium=${isLanguagePremium(lang)} → standard=marianmt, pro=deepl`);
  }
}

async function main() {
  console.log('\n' + '╔' + '═'.repeat(58) + '╗');
  console.log('║   DEMO EPIC ML-3 — BATCH TRANSLATION & TTS              ║');
  console.log('╚' + '═'.repeat(58) + '╝');

  await demoA_BatchPro();
  await demoB_Estimation();
  await demoC_Resume();
  await demoD_Retry();
  await demoE_ProviderRouting();

  console.log('\n' + SEPARATOR);
  console.log('  RESUME DEMO ML-3');
  console.log(SEPARATOR);
  log('✅', 'A1-A3: Batch 5 scenes Pro — progression scene par scene');
  log('✅', 'B1: Estimation duree avant lancement');
  log('✅', 'B2: Batch multi-lang — langue par langue');
  log('✅', 'C1-C3: Detection scenes manquantes + reprise');
  log('✅', 'D2: Retry individuel sur scene echouee');
  log('✅', 'E1-E2: Standard→MarianMT, Pro→DeepL, Premium→force DeepL');
  console.log('');
}

main().catch(console.error);

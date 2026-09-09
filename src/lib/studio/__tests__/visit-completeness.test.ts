import { evaluateVisitCompleteness } from '../visit-completeness';

function scene(id: string, text: string | null, audio: string | null) {
  return {
    id,
    title: id,
    transcriptText: text,
    studioAudioKey: audio,
    originalAudioKey: null,
    baseAudioSource: audio ? ('recording' as const) : null,
    archived: false,
  };
}

describe('evaluateVisitCompleteness', () => {
  it('accepte la voix humaine seulement avec texte et audio par scène', () => {
    const complete = evaluateVisitCompleteness({
      narrationMode: 'recording',
      sourceLanguage: 'fr',
      scenes: [scene('s1', 'Texte final', 'audio/s1.wav')],
    });
    const incomplete = evaluateVisitCompleteness({
      narrationMode: 'recording',
      sourceLanguage: 'fr',
      scenes: [scene('s1', 'Texte final', null)],
    });

    expect(complete.ready).toBe(true);
    expect(incomplete.ready).toBe(false);
    expect(incomplete.blockingSceneIds).toEqual(['s1']);
  });

  it('accepte le TTS différé avec textes finaux et sans aucun audio', () => {
    const report = evaluateVisitCompleteness({
      narrationMode: 'tts_on_demand',
      sourceLanguage: 'fr',
      scenes: [scene('s1', 'Texte final', null), scene('s2', 'Suite', null)],
    });

    expect(report.ready).toBe(true);
    expect(report.checks.find((check) => check.id === 'source_audio')?.passed).toBe(true);
  });

  it('bloque un audio présent dans une version TTS différée', () => {
    const report = evaluateVisitCompleteness({
      narrationMode: 'tts_on_demand',
      sourceLanguage: 'fr',
      scenes: [scene('s1', 'Texte final', 'audio/historique.wav')],
    });

    expect(report.ready).toBe(false);
    expect(report.checks.find((check) => check.id === 'audio_mode_consistency')?.passed).toBe(false);
  });

  it('bloque et rapporte un historique sans mode sans inférence audio', () => {
    const report = evaluateVisitCompleteness({
      narrationMode: null,
      sourceLanguage: 'fr',
      scenes: [scene('s1', 'Texte final', 'audio/s1.wav')],
    });

    expect(report.ready).toBe(false);
    expect(report.narrationMode).toBeNull();
    expect(report.checks.find((check) => check.id === 'narration_mode')?.evidence).toContain(
      'manquant',
    );
  });
});

import { sessionStatusLabel } from '../status-labels';

describe('sessionStatusLabel (lot 6.1)', () => {
  it('traduit tous les statuts, y compris ceux que les anciennes tables oubliaient', () => {
    for (const status of ['rejected', 'paused', 'submitted', 'ready', 'ready_for_cleanup', 'transcribing'] as const) {
      expect(sessionStatusLabel(status, 'en')).not.toBe(sessionStatusLabel(status, 'fr'));
    }
    expect(sessionStatusLabel('rejected')).toBe('Refusé');
    expect(sessionStatusLabel('paused', 'en')).toBe('Paused');
  });

  it('rend le statut brut plutôt que planter sur une valeur inconnue', () => {
    expect(sessionStatusLabel('pending_moderation', 'en')).toBe('pending_moderation');
  });
});

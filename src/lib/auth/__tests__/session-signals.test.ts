import { SESSION_REFUSAL_EVENT, refusalFromStatus, reportSessionRefusal } from '../session-signals';

describe('session-signals (lot 6.4)', () => {
  it('distingue expiré (401) de retiré (403) et ignore le reste', () => {
    expect(refusalFromStatus(401)).toBe('expired');
    expect(refusalFromStatus(403)).toBe('revoked');
    expect(refusalFromStatus(500)).toBeNull();
    expect(reportSessionRefusal(429)).toBeNull();
  });

  it('émet un événement que le fournisseur d’authentification peut écouter', () => {
    const seen: string[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<string>).detail);
    window.addEventListener(SESSION_REFUSAL_EVENT, handler);
    expect(reportSessionRefusal(401)).toMatch(/Session expirée/);
    expect(reportSessionRefusal(403)).toMatch(/Accès guide retiré/);
    window.removeEventListener(SESSION_REFUSAL_EVENT, handler);
    expect(seen).toEqual(['expired', 'revoked']);
  });
});

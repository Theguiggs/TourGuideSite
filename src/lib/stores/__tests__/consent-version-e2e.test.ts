import fs from 'fs';
import path from 'path';
import { CONSENT_VERSION } from '../studio-consent-store';

it('les graines E2E portent la même version de consentement que le Studio', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'e2e/fixtures/consent.ts'), 'utf-8');
  const m = src.match(/STUDIO_CONSENT_VERSION = '([^']+)'/);
  expect(m?.[1]).toBe(CONSENT_VERSION);
});

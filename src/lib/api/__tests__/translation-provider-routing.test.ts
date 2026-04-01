import {
  requestTranslation,
  __resetTranslationStubs,
  __setStubProviderDown,
} from '../translation';

// Force stub mode
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('TranslationAPI - Provider Routing (ML-3.4)', () => {
  beforeEach(() => {
    __resetTranslationStubs();
    jest.useRealTimers();
  });

  it('3.4.1 - standard tier routes to marianmt', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'en', 'standard');
    expect(result.provider).toBe('marianmt');
    expect(result.status).toBe('processing');
  });

  it('3.4.2 - pro tier routes to deepl', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'en', 'pro');
    expect(result.provider).toBe('deepl');
    expect(result.status).toBe('processing');
  });

  it('3.4.3 - premium language (ja) with standard tier forces deepl', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'ja', 'standard');
    expect(result.provider).toBe('deepl');
  });

  it('3.4.4 - premium language (zh) with standard tier forces deepl', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'zh', 'standard');
    expect(result.provider).toBe('deepl');
  });

  it('3.4.5 - premium language (ko) with pro tier stays deepl', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'ko', 'pro');
    expect(result.provider).toBe('deepl');
  });

  it('3.4.6 - EU language (en) with standard tier stays marianmt', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'en', 'standard');
    expect(result.provider).toBe('marianmt');
  });

  it('3.4.7 - provider unavailable returns errorCode 2609', async () => {
    __setStubProviderDown('marianmt', true);
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'en', 'standard');
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe(2609);
    expect(result.provider).toBe('marianmt');
  });

  it('3.4.8 - deepl provider down returns errorCode 2609', async () => {
    __setStubProviderDown('deepl', true);
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'en', 'pro');
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe(2609);
    expect(result.provider).toBe('deepl');
  });

  it('3.4.9 - premium override + deepl down returns errorCode 2609', async () => {
    __setStubProviderDown('deepl', true);
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'ja', 'standard');
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe(2609);
    expect(result.provider).toBe('deepl');
  });

  it('3.4.10 - provider not down returns no errorCode', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour', 'fr', 'en', 'standard');
    expect(result.errorCode).toBeUndefined();
  });
});

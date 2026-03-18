import { shouldUseStubs, shouldUseRealApi } from '../api-mode';

describe('api-mode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use stubs when NEXT_PUBLIC_USE_STUBS=true', () => {
    process.env.NEXT_PUBLIC_USE_STUBS = 'true';
    expect(shouldUseStubs()).toBe(true);
    expect(shouldUseRealApi()).toBe(false);
  });

  it('should use real API when NEXT_PUBLIC_USE_STUBS=false', () => {
    process.env.NEXT_PUBLIC_USE_STUBS = 'false';
    expect(shouldUseStubs()).toBe(false);
    expect(shouldUseRealApi()).toBe(true);
  });

  it('should use real API when NEXT_PUBLIC_USE_STUBS is unset', () => {
    delete process.env.NEXT_PUBLIC_USE_STUBS;
    expect(shouldUseStubs()).toBe(false);
    expect(shouldUseRealApi()).toBe(true);
  });
});

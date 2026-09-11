import nextConfig from '../../../../next.config';

/**
 * Les en-têtes de défense STATIQUES restent posés par `next.config.ts`. La
 * Content-Security-Policy, elle, n'y est plus : elle exige un nonce par requête
 * et vit dans `src/proxy.ts` (voir `csp.test.ts`). Une CSP statique ici serait
 * le signe qu'elle a retrouvé `'unsafe-inline'`.
 */
describe('security response headers', () => {
  it('applies browser defenses globally and leaves the CSP to the proxy', async () => {
    const rules = await nextConfig.headers!();
    const globalHeaders = Object.fromEntries(
      rules[0].headers.map(({ key, value }) => [key, value]),
    );

    expect(rules[0].source).toBe('/(.*)');
    expect(globalHeaders['Content-Security-Policy']).toBeUndefined();
    expect(globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(globalHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(globalHeaders['Permissions-Policy']).toContain('microphone=(self)');
  });

  it('does not advertise the framework', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

import nextConfig from '../../../../next.config';

describe('security response headers', () => {
  it('applies browser defenses globally while allowing required integrations', async () => {
    const rules = await nextConfig.headers!();
    const globalHeaders = Object.fromEntries(
      rules[0].headers.map(({ key, value }) => [key, value]),
    );

    expect(rules[0].source).toBe('/(.*)');
    expect(globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(globalHeaders['Content-Security-Policy']).toContain('https://js.stripe.com');
    expect(globalHeaders['Content-Security-Policy']).toContain('https://*.amazonaws.com');
    expect(globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(globalHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(globalHeaders['Permissions-Policy']).toContain('microphone=(self)');
  });
});

import { safeJsonLd } from '../safe-json-ld';

describe('safeJsonLd', () => {
  it('neutralise a closing script tag while keeping valid JSON', () => {
    const serialized = safeJsonLd({
      name: '</script><script>window.pwned=true</script>',
    });

    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual({
      name: '</script><script>window.pwned=true</script>',
    });
  });

  it('escapes HTML delimiters and JavaScript line separators', () => {
    const serialized = safeJsonLd({ value: '<>&\u2028\u2029' });

    expect(serialized).toContain('\\u003c\\u003e\\u0026\\u2028\\u2029');
    expect(JSON.parse(serialized)).toEqual({ value: '<>&\u2028\u2029' });
  });

  it('keeps a valid JSON payload for non-serializable top-level values', () => {
    expect(safeJsonLd(undefined)).toBe('null');
  });

  it('fails closed for cyclic values', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(safeJsonLd(cyclic)).toBe('null');
  });
});

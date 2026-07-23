const JSON_LD_ESCAPE_MAP: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Serialize structured data without allowing user-controlled values to close
 * the containing script element or introduce JavaScript line separators.
 */
export function safeJsonLd(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return 'null';
    return serialized.replace(
      /[<>&\u2028\u2029]/g,
      (character) => JSON_LD_ESCAPE_MAP[character],
    );
  } catch {
    return 'null';
  }
}

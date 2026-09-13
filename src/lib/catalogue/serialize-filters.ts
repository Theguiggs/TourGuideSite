export function serializeFilters(values?: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const key of ['q', 'audio', 'duration', 'price']) {
    const value = values?.[key];
    if (typeof value === 'string') query.set(key, value.slice(0, 120));
  }
  return query.toString();
}

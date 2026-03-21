export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeout = 15_000, interval = 1_000 } = {},
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await fn();
    if (predicate(result)) return result;
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`pollUntil timed out after ${timeout}ms`);
}

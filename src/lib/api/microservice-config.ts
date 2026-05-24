/** Shared config for microservice API calls (TTS, translation, silence detection).
 *
 * The browser ALWAYS talks to /api/microservice/* (Next.js server-side proxy).
 * The proxy injects the real API key from a server-only env var. This keeps the
 * shared secret out of the bundled JS.
 */

export function getMicroserviceUrl(): string {
  return '/api/microservice';
}

export function getMicroserviceHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

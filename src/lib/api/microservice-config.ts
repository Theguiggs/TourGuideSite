/** Shared config for microservice API calls (TTS, translation, silence detection). */

export function getMicroserviceUrl(): string {
  return process.env.NEXT_PUBLIC_MICROSERVICE_URL ?? 'http://localhost:8000';
}

export function getMicroserviceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Skip ngrok free tier interstitial page
    'ngrok-skip-browser-warning': 'true',
  };
  const apiKey = process.env.NEXT_PUBLIC_MICROSERVICE_API_KEY;
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return headers;
}

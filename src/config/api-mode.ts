/**
 * API mode toggle for the web portal.
 *
 * When NEXT_PUBLIC_USE_STUBS=true, the portal uses mock data (default for dev).
 * When false or unset, real Amplify AppSync calls are used.
 */

export function shouldUseStubs(): boolean {
  return process.env.NEXT_PUBLIC_USE_STUBS === 'true';
}

export function shouldUseRealApi(): boolean {
  return !shouldUseStubs();
}

const BASE_URL = 'https://tourguide.app';

/**
 * Generate QR code URL for a tour.
 * Uses the Google Charts QR API for simplicity in MVP.
 * Will be replaced with branded SVG generation later.
 */
export function getQrCodeUrl(tourSlug: string, citySlug: string, officeId?: string): string {
  const tourUrl = `${BASE_URL}/catalogue/${citySlug}/${tourSlug}?source=qr${officeId ? `&office=${officeId}` : ''}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tourUrl)}`;
}

/**
 * Generate the deep link for opening a tour in the app.
 */
export function getDeepLink(tourId: string): string {
  return `tourguide://tour/${tourId}`;
}

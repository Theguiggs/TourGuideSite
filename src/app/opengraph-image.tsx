import { publicImage } from '@/lib/og/public-image';
export const runtime = 'nodejs';
export const alt = 'Murmure — Découvrez les villes en visite audio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() { return publicImage('fr', false); }

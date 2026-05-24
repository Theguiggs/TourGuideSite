export const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL
  ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION
  ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

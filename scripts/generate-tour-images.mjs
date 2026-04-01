/**
 * generate-tour-images.mjs — Generate placeholder SVG images for premium tours
 *
 * Creates gradient SVG images with tour/POI names for each tour.
 * These are meant to be replaced with real photos later.
 *
 * Usage: node scripts/generate-tour-images.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(import.meta.dirname, '..', 'public', 'images');

// Tour definitions with color themes
const tours = [
  {
    slug: 'seed-pm-crimes-scandales-riviera',
    title: 'Crimes & Scandales\nde la Riviera',
    city: 'Nice',
    gradient: ['#1a1a2e', '#16213e', '#e94560'],
    pois: [
      'Jardin Albert 1er',
      'Opéra de Nice',
      'Cours Saleya',
      'Palais Lascaris',
      'Place Rossetti',
      'Colline du Château',
      'Port Lympia',
      'Place Garibaldi',
      'Hôtel Negresco',
      'Promenade des Anglais',
    ],
  },
  {
    slug: 'seed-pm-monaco-dynastie-demesure',
    title: 'Monaco\nDynastie & Démesure',
    city: 'Monaco',
    gradient: ['#0f3460', '#16213e', '#e94560'],
    pois: [
      'Place du Palais',
      'Cathédrale de Monaco',
      'Musée Océanographique',
      'Port Hercule',
      'Casino Monte-Carlo',
      'Hôtel de Paris',
      'Jardin Japonais',
      'Plage du Larvotto',
    ],
  },
  {
    slug: 'seed-pm-eze-nid-aigle',
    title: 'Èze\nLe Nid d\'Aigle',
    city: 'Èze',
    gradient: ['#2d6a4f', '#40916c', '#95d5b2'],
    pois: [
      'Porte des Maures',
      'Rue principale',
      'Chapelle Pénitents Blancs',
      'Église Notre-Dame',
      'Jardin Exotique',
      'Sentier Nietzsche',
      'Parfumerie Fragonard',
      'Belvédère Corniche',
    ],
  },
  {
    slug: 'seed-pm-villefranche-cocteau-rade',
    title: 'Villefranche\nCocteau & la Rade',
    city: 'Villefranche-sur-Mer',
    gradient: ['#023e8a', '#0077b6', '#48cae4'],
    pois: [
      'Port de la Santé',
      'Chapelle Saint-Pierre',
      'Rue Obscure',
      'Citadelle Saint-Elme',
      'Église Saint-Michel',
      'Plage des Marinières',
      'Pointe des Marinières',
    ],
  },
  {
    slug: 'seed-pm-cap-ferrat-milliardaires',
    title: 'Cap Ferrat\nLa Presqu\'île',
    city: 'Saint-Jean-Cap-Ferrat',
    gradient: ['#6a040f', '#9d0208', '#dc2f02'],
    pois: [
      'Port de Saint-Jean',
      'Villa Ephrussi',
      'Sentier du Littoral',
      'Chapelle Saint-Hospice',
      'Villa Santo Sospir',
      'Promenade Rouvier',
      'Grand Hôtel',
    ],
  },
];

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function generateTourHeroSvg(tour) {
  const [c1, c2, c3] = tour.gradient;
  const lines = tour.title.split('\n');
  const titleY = lines.length === 1 ? 200 : 180;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="50%" style="stop-color:${c2}"/>
      <stop offset="100%" style="stop-color:${c3}"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="800" height="400" fill="url(#bg)"/>
  <rect x="0" y="300" width="800" height="100" fill="rgba(0,0,0,0.4)"/>
  ${lines.map((line, i) => `<text x="400" y="${titleY + i * 50}" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="white" filter="url(#shadow)">${escapeXml(line)}</text>`).join('\n  ')}
  <text x="400" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)">${escapeXml(tour.city)} — Audio Tour Premium</text>
  <text x="400" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">Photo placeholder — à remplacer</text>
  <rect x="20" y="20" width="120" height="30" rx="15" fill="rgba(255,255,255,0.2)"/>
  <text x="80" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">PREMIUM</text>
</svg>`;
}

function generatePoiSvg(tour, poiTitle, index) {
  const [c1, c2] = tour.gradient;
  const hue = (index * 37 + 120) % 360;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:hsl(${hue}, 40%, 35%)"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#bg)"/>
  <circle cx="300" cy="160" r="60" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <text x="300" y="170" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="rgba(255,255,255,0.4)">${index + 1}</text>
  <rect x="0" y="260" width="600" height="140" fill="rgba(0,0,0,0.5)"/>
  <text x="300" y="310" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="white">${escapeXml(poiTitle)}</text>
  <text x="300" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">${escapeXml(tour.city)} — POI ${index + 1}/${tour.pois.length}</text>
  <text x="300" y="375" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.4)">Photo placeholder — à remplacer par une vraie photo</text>
</svg>`;
}

function generateCitySvg(cityName, gradient) {
  const [c1, c2, c3] = gradient;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="50%" style="stop-color:${c2}"/>
      <stop offset="100%" style="stop-color:${c3}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <text x="400" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="bold" fill="white">${escapeXml(cityName)}</text>
  <text x="400" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.6)">Côte d'Azur — Photo placeholder</text>
</svg>`;
}

// ── Main ──────────────────────────────────────────────

console.log('=== Generating Premium Tour Images ===\n');

// Ensure directories exist
const toursDir = join(PUBLIC_DIR, 'tours');
const citiesDir = join(PUBLIC_DIR, 'cities');
if (!existsSync(toursDir)) mkdirSync(toursDir, { recursive: true });
if (!existsSync(citiesDir)) mkdirSync(citiesDir, { recursive: true });

let totalFiles = 0;

for (const tour of tours) {
  // Hero image for tour
  const heroFile = join(toursDir, `${tour.slug}.svg`);
  writeFileSync(heroFile, generateTourHeroSvg(tour));
  console.log(`  Hero: ${tour.slug}.svg`);
  totalFiles++;

  // POI images directory
  const poiDir = join(PUBLIC_DIR, 'tours', 'pois', tour.slug);
  if (!existsSync(poiDir)) mkdirSync(poiDir, { recursive: true });

  for (let i = 0; i < tour.pois.length; i++) {
    const poiFile = join(poiDir, `poi_${i}.svg`);
    writeFileSync(poiFile, generatePoiSvg(tour, tour.pois[i], i));
    totalFiles++;
  }
  console.log(`  POIs: ${tour.pois.length} images in pois/${tour.slug}/`);
}

// City images for new cities (Monaco, Èze, Villefranche, Cap Ferrat)
const newCities = [
  { name: 'Monaco', gradient: ['#0f3460', '#16213e', '#e94560'] },
  { name: 'Èze', slug: 'eze', gradient: ['#2d6a4f', '#40916c', '#95d5b2'] },
  { name: 'Villefranche-sur-Mer', gradient: ['#023e8a', '#0077b6', '#48cae4'] },
  { name: 'Saint-Jean-Cap-Ferrat', gradient: ['#6a040f', '#9d0208', '#dc2f02'] },
];

for (const city of newCities) {
  const slug = city.slug || city.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cityFile = join(citiesDir, `${slug}.svg`);
  if (!existsSync(cityFile.replace('.svg', '.jpg'))) {
    writeFileSync(cityFile, generateCitySvg(city.name, city.gradient));
    console.log(`  City: ${slug}.svg`);
    totalFiles++;
  } else {
    console.log(`  City: ${slug}.jpg already exists, skipping`);
  }
}

console.log(`\n=== Done: ${totalFiles} images generated ===`);
console.log('NOTE: Replace SVG placeholders with real .jpg photos for production.');

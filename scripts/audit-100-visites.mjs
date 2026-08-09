import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOURS_DIR = path.join(ROOT, 'content', 'tours');
const PLAN_FILE = path.join(TOURS_DIR, 'PLAN-100-VISITES.md');
const SEED_FILE = path.join(ROOT, 'scripts', 'seed-100-visites.mjs');
const GPS_AUDIT_FILE = path.join(TOURS_DIR, 'GPS-AUDIT-100-VISITES.md');
const VERIFIED_DATE = '2026-08-09';
const MAX_SEGMENT_KM = 2;

const deprecatedSlugs = [
  'paris-ventre-de-paris', 'lyon-bouchons-et-halles', 'marseille-assiette-du-vieux-port',
  'bordeaux-canneles-et-marches', 'lille-estaminets-et-braderie', 'biarritz-table-basque',
  'toulouse-cassoulet-et-violette', 'nice-cuisine-nissarde', 'strasbourg-winstubs-et-bretzels',
  'nantes-beurre-lu-muscadet', 'montpellier-places-gourmandes', 'rennes-marche-des-lices',
  'dijon-moutarde-pain-depices', 'annecy-reblochon-et-lac', 'chamonix-table-des-alpages',
  'colmar-capitale-des-vins-dalsace', 'avignon-halles-et-provence', 'aix-calissons-et-marches',
  'carcassonne-cassoulet-et-corbieres', 'la-rochelle-huitres-et-pineau',
  'saint-malo-beurre-et-marees', 'bayonne-jambon-et-chocolat', 'tours-jardins-et-vins-de-loire',
  'versailles-potager-du-roi', 'sarlat-capitale-du-foie-gras',
  'mont-saint-michel-baie-et-omelette', 'bordeaux-capitale-du-vin', 'reims-caves-de-champagne',
  'beaune-capitale-des-climats', 'nimes-ferias-et-brandade', 'cassis-calanques-et-vignes',
];

const metadataForbidden = /(?:gastronom|gourmand|cuisine|\btable\b|assiette|cassoulet|cannel|bouchon|bouillabaisse|\bvin\b|\bvins\b|champagne|\bbi(?:è|e)re\b|cidre|chocolat|jambon|huître|moutarde|pain d’épices|pain d'epices|reblochon|fondue|génépi|winstub|bretzel|socca|pissaladière|calisson|foie.?gras|omelette|brandade|rillettes|fromage)/i;
const narrativeForbidden = /(?:gastronom|dégust|recette|dans l['’ ]assiette|à table|gourmand|bouillabaisse|cassoulet|reblochon|choucroute|bretzel|moutarde|calisson|foie.?gras|omelette|brandade|huître|jambon|boisson exotique|de café en café|tasses? de café|cafés? crème|terrasse de café|cafés? bondés|bars? s['’]allument|bar ouvert|boulangerie|restaurants?|hamburgers?|barbecues?|bières?|barques? chargées? de légumes|charg(?:é|eait) de (?:sucre|café|légumes)|ils buvaient|prends un café|sirot.*café|sucre, d['’]abord|plat régional|produit alimentaire|on y mange)/i;
const validGpsMarkers = new Set([
  `*(vérifié OpenStreetMap — ${VERIFIED_DATE})*`,
  `*(vérifié IGN — ${VERIFIED_DATE})*`,
]);
const blockedGpsMarker = '*(non vérifié — audit bloquant)*';

function fail(errors, message) {
  errors.push(message);
}

function wordCount(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function normalizeLabel(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function haversine(a, b) {
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(q));
}

function parseScript(md) {
  const title = (md.match(/^#\s+(.+)$/m) || [])[1]?.trim() || '';
  const city = (md.match(/\*\*Ville\s*:\*\*\s*(.+)/) || [])[1]?.trim() || '';
  const theme = (md.match(/\*\*Thème\s*:\*\*\s*(.+)/) || [])[1]?.trim() || '';
  const duration = Number((md.match(/\*\*Durée narration\s*:\*\*\s*~?(\d+)\s*min/) || [])[1]);
  const distance = Number(((md.match(/\*\*Distance\s*:\*\*\s*~?([\d,.]+)\s*km/) || [])[1] || '').replace(',', '.'));
  const declaredPois = Number((md.match(/\*\*POIs\s*:\*\*\s*(\d+)/) || [])[1]);
  const scenes = md.split(/^## Scène\s+/m).slice(1).map((block, index) => {
    const headingLine = block.split(/\r?\n/, 1)[0].trim();
    const headingMatch = headingLine.match(/^(\d+)\s+—\s+(.+)$/);
    const heading = headingMatch?.[2]?.trim() || '';
    const poi = heading.split(/\s+:\s+/, 1)[0].trim();
    const gps = block.match(/\*\*GPS\s*:\*\*\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*(.*)/);
    const gpsLineEnd = gps ? block.indexOf('\n', gps.index) : -1;
    const transcript = gpsLineEnd >= 0 ? block.slice(gpsLineEnd + 1).replace(/\n---\s*$/m, '').trim() : '';
    return {
      index: index + 1,
      declaredIndex: headingMatch ? Number(headingMatch[1]) : null,
      heading,
      poi,
      lat: gps ? Number(gps[1]) : null,
      lng: gps ? Number(gps[2]) : null,
      marker: gps?.[3]?.trim() || '',
      transcript,
      words: wordCount(transcript),
    };
  });
  return { title, city, theme, duration, distance, declaredPois, scenes };
}

function readSlugs(errors) {
  const source = fs.readFileSync(SEED_FILE, 'utf8');
  const raw = source.match(/export const SLUGS = (\[[\s\S]*?\n\]);/)?.[1];
  if (!raw) {
    fail(errors, 'seed: tableau SLUGS exporté introuvable');
    return [];
  }
  return Function(`return ${raw}`)();
}

function readPlanSlugs(errors) {
  if (!fs.existsSync(PLAN_FILE)) {
    fail(errors, 'plan: PLAN-100-VISITES.md absent');
    return [];
  }
  return fs.readFileSync(PLAN_FILE, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\|\s*\d+\s*\|\s*([a-z0-9-]+)\s*\|/)?.[1])
    .filter(Boolean);
}

function readGpsAudit(errors) {
  if (!fs.existsSync(GPS_AUDIT_FILE)) {
    fail(errors, 'GPS-AUDIT-100-VISITES.md absent');
    return new Map();
  }
  const md = fs.readFileSync(GPS_AUDIT_FILE, 'utf8');
  const entries = new Map();
  for (const line of md.split(/\r?\n/)) {
    if (!/^\| [a-z0-9-]+ \| \d+ \|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 9) continue;
    const [slug, scene, poi, lat, lng, source, date, offset, status] = cells;
    const key = `${slug}#${scene}`;
    if (entries.has(key)) {
      fail(errors, `audit GPS: entrée dupliquée ${key}`);
      continue;
    }
    entries.set(key, { poi, lat, lng, source, date, offset, status });
  }
  return entries;
}

export function auditHundredVisits({ quiet = false } = {}) {
  const errors = [];
  const warnings = [];
  const slugs = readSlugs(errors);
  const planSlugs = readPlanSlugs(errors);
  const gpsEntries = readGpsAudit(errors);
  const uniqueSlugs = new Set(slugs);
  if (slugs.length !== 100) fail(errors, `collection: ${slugs.length} slugs au lieu de 100`);
  if (uniqueSlugs.size !== slugs.length) fail(errors, 'collection: slug dupliqué');
  if (planSlugs.length !== slugs.length || planSlugs.some((slug, index) => slug !== slugs[index])) {
    fail(errors, 'collection: la matrice PLAN et le tableau SLUGS divergent');
  }
  for (const slug of deprecatedSlugs) {
    if (uniqueSlugs.has(slug) || fs.existsSync(path.join(TOURS_DIR, slug))) fail(errors, `ancien slug interdit encore présent: ${slug}`);
  }

  const themeByCity = new Map();
  let totalScenes = 0;
  let longSegments = 0;
  for (const slug of slugs) {
    const file = path.join(TOURS_DIR, slug, 'script-narration.md');
    if (!fs.existsSync(file)) {
      fail(errors, `${slug}: script absent`);
      continue;
    }
    const md = fs.readFileSync(file, 'utf8');
    const tour = parseScript(md);
    if (!tour.title || !tour.city || !tour.theme || !tour.duration || !tour.distance || !tour.declaredPois) fail(errors, `${slug}: métadonnées incomplètes`);
    if (metadataForbidden.test(`${slug} ${tour.title} ${tour.theme}`)) fail(errors, `${slug}: thème, titre ou slug alimentaire/boisson`);
    if (narrativeForbidden.test(md)) fail(errors, `${slug}: développement alimentaire interdit dans la narration`);
    if (/\*\(approx\.? à vérifier\)\*/i.test(md)) fail(errors, `${slug}: marqueur GPS approximatif`);
    if (tour.scenes.length < 6 || tour.scenes.length > 12) fail(errors, `${slug}: ${tour.scenes.length} scènes hors plage 6-12`);
    if (tour.declaredPois !== tour.scenes.length) fail(errors, `${slug}: POIs déclaré ${tour.declaredPois}, obtenu ${tour.scenes.length}`);
    totalScenes += tour.scenes.length;

    const themeKey = normalizeLabel(tour.theme);
    const cityKey = normalizeLabel(tour.city);
    const cityThemes = themeByCity.get(cityKey) || new Set();
    if (cityThemes.has(themeKey)) fail(errors, `${slug}: thème « ${themeKey} » dupliqué dans ${tour.city}`);
    cityThemes.add(themeKey);
    themeByCity.set(cityKey, cityThemes);

    let totalWords = 0;
    let directDistance = 0;
    for (const scene of tour.scenes) {
      totalWords += scene.words;
      const hero = scene.index === 1 || scene.index === tour.scenes.length;
      const maxWords = hero ? 300 : 225;
      if (scene.declaredIndex !== scene.index || !scene.heading || !scene.poi) fail(errors, `${slug} scène ${scene.index}: titre ou numérotation invalide`);
      if (scene.words < 150 || scene.words > maxWords) fail(errors, `${slug} scène ${scene.index}: ${scene.words} mots (attendu 150-${maxWords})`);
      if (!Number.isFinite(scene.lat) || !Number.isFinite(scene.lng)) fail(errors, `${slug} scène ${scene.index}: GPS absent`);
      else if (scene.lat < -90 || scene.lat > 90 || scene.lng < -180 || scene.lng > 180) fail(errors, `${slug} scène ${scene.index}: GPS hors limites`);
      const gpsEntry = gpsEntries.get(`${slug}#${scene.index}`);
      if (!gpsEntry) {
        fail(errors, `${slug} scène ${scene.index}: entrée d’audit GPS absente`);
      } else if (/non vérifié/i.test(gpsEntry.status)) {
        if (scene.marker !== blockedGpsMarker) fail(errors, `${slug} scène ${scene.index}: marqueur bloquant GPS absent`);
        fail(errors, `${slug} scène ${scene.index}: GPS non vérifié`);
      } else {
        if (!validGpsMarkers.has(scene.marker)) fail(errors, `${slug} scène ${scene.index}: marqueur de vérification GPS absent ou invalide`);
        if (!/^vérifié(?:\s|—|$)/i.test(gpsEntry.status)) fail(errors, `${slug} scène ${scene.index}: statut GPS invalide`);
        if (normalizeLabel(gpsEntry.poi) !== normalizeLabel(scene.poi)) fail(errors, `${slug} scène ${scene.index}: POI du registre différent du script`);
        const auditLat = Number(gpsEntry.lat);
        const auditLng = Number(gpsEntry.lng);
        if (!Number.isFinite(auditLat) || !Number.isFinite(auditLng) || Math.abs(auditLat - scene.lat) > 0.000002 || Math.abs(auditLng - scene.lng) > 0.000002) {
          fail(errors, `${slug} scène ${scene.index}: coordonnées du registre différentes du script`);
        }
        const osmSource = /https:\/\/www\.openstreetmap\.org\/(?:node|way|relation)\/\d+/.test(gpsEntry.source);
        const ignSource = /https:\/\/data\.geopf\.fr\/geocodage\/(?:search|reverse)\?/.test(gpsEntry.source) && /— IGN\s+[A-Z0-9_-]+/i.test(gpsEntry.source);
        if (!osmSource && !ignSource) fail(errors, `${slug} scène ${scene.index}: source cartographique non canonique`);
        const markerProvider = scene.marker.includes('OpenStreetMap') ? 'osm' : scene.marker.includes('IGN') ? 'ign' : null;
        const sourceProvider = osmSource ? 'osm' : ignSource ? 'ign' : null;
        if (markerProvider !== sourceProvider) fail(errors, `${slug} scène ${scene.index}: fournisseur du marqueur différent de la source`);
        if (gpsEntry.date !== VERIFIED_DATE) fail(errors, `${slug} scène ${scene.index}: date de vérification invalide`);
        if (!/^\d+ m$/.test(gpsEntry.offset)) fail(errors, `${slug} scène ${scene.index}: écart GPS absent`);
      }
      if (scene.index > 1) {
        const previous = tour.scenes[scene.index - 2];
        const segment = haversine(previous, scene);
        directDistance += segment;
        if (segment > MAX_SEGMENT_KM) fail(errors, `${slug} scènes ${scene.index - 1}-${scene.index}: saut de ${segment.toFixed(2)} km`);
        else if (segment > 1.2) {
          longSegments += 1;
          warnings.push(`${slug} scènes ${scene.index - 1}-${scene.index} (${previous.heading} → ${scene.heading}): segment long documenté (${segment.toFixed(2)} km)`);
        }
      }
    }
    const expectedDuration = Math.max(1, Math.round(totalWords / 150));
    if (Math.abs(tour.duration - expectedDuration) > 1) fail(errors, `${slug}: durée ${tour.duration} min incohérente (calcul ${expectedDuration})`);
    const expectedDistance = Math.max(0.5, Math.round(directDistance * 1.18 * 10) / 10);
    if (Math.abs(tour.distance - expectedDistance) > 0.11) fail(errors, `${slug}: distance ${tour.distance} km incohérente (calcul ${expectedDistance})`);
  }

  if (gpsEntries.size !== totalScenes) fail(errors, `audit GPS: ${gpsEntries.size} entrées pour ${totalScenes} scènes`);
  const summary = { tours: slugs.length, scenes: totalScenes, gpsSources: gpsEntries.size, longSegments, errors: errors.length, warnings: warnings.length };
  if (!quiet) {
    console.log('=== Audit des 100 visites ===');
    console.log(summary);
    for (const warning of warnings) console.warn(`AVERTISSEMENT: ${warning}`);
    for (const error of errors) console.error(`ERREUR: ${error}`);
  }
  if (errors.length) throw new Error(`Audit invalide: ${errors.length} erreur(s)`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    auditHundredVisits();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

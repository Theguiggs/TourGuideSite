// ══════════════════════════════════════════════════════════
// Résout les coordonnées des POIs contre OpenStreetMap
// ══════════════════════════════════════════════════════════
//
// Chaque visite porte un `pois.json` où les coordonnées sont d'abord `null`
// et où chaque POI déclare COMMENT le retrouver : une requête Nominatim, ou
// un couple clé/valeur Overpass dans une boîte. Ce script les résout et
// réécrit `pois.json` avec la coordonnée ET sa provenance — type et id de
// l'objet OSM, pour qu'on puisse rouvrir la fiche et vérifier.
//
// ── POURQUOI PAS DES COORDONNÉES ÉCRITES À LA MAIN ────────
//
// L'audit du lot Alpes-Maritimes a trouvé des décalages de 150 à 1 800 m,
// dont trois jeux franchement hors zone. Un pin mal placé ne lève aucune
// alerte : la visite part en base, elle s'affiche, et c'est le marcheur qui
// découvre l'erreur devant un mur. Une coordonnée sans provenance n'est pas
// une donnée, c'est un souvenir.
//
// ── PRÉCISION ─────────────────────────────────────────────
//
// OSM donne le centroïde d'un bâtiment, pas l'endroit où l'on se poste. Les
// deux ne se confondent pas : sur une cathédrale, le centroïde tombe au
// milieu de la nef, alors que la scène se joue sur le parvis. D'où deux
// champs distincts et complémentaires :
//
//   · `lat`/`lng`   — l'ancre vérifiable, résolue ici
//   · `position`    — l'endroit où se poster, en toutes lettres, écrit à la
//                     main dans la scène et jamais deviné par ce script
//
// Le champ `precision` dit ce que vaut l'ancre :
//   batiment  — centroïde du bâtiment ou de la place (OSM way/relation)
//   noeud     — point précis cartographié (OSM node : fontaine, portail…)
//   ville     — repli grossier, À NE PAS SEMER : il faut affiner à la main
//
// ── LANCEMENT ─────────────────────────────────────────────
//   node scripts/resout-gps-pois.mjs                      # tout, aperçu
//   node scripts/resout-gps-pois.mjs --ecris              # écrit les pois.json
//   node scripts/resout-gps-pois.mjs --tour=cagnes-renoir-collettes
//   node scripts/resout-gps-pois.mjs --force              # ignore le cache
//
// Nominatim impose une requête par seconde et un User-Agent identifiable :
// les deux sont respectés. Les réponses sont mises en cache sous
// `.cache/gps/` pour qu'une deuxième passe ne recharge rien.
// ══════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(__dirname, '..');
const TOURS = path.join(RACINE, 'content', 'tours');
const CACHE = path.join(RACINE, '.cache', 'gps');

const argv = process.argv.slice(2);
const aDrapeau = (d) => argv.includes(d);
const option = (nom, defaut) => {
  const hit = argv.find((a) => a.startsWith(`--${nom}=`));
  return hit ? hit.split('=').slice(1).join('=') : defaut;
};

const ECRIS = aDrapeau('--ecris');
const FORCE = aDrapeau('--force');
const SEUL = option('tour', null);

const UA = 'Murmure-TourGuide/1.0 (contenu de visites audio; steffen.guillaume@gmail.com)';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

// ── Utilitaires ────────────────────────────────────────────
const dors = (ms) => new Promise((r) => setTimeout(r, ms));
let dernierAppel = 0;

/** Nominatim veut au plus une requête par seconde. On la lui donne. */
async function cadence() {
  const attente = 1100 - (Date.now() - dernierAppel);
  if (attente > 0) await dors(attente);
  dernierAppel = Date.now();
}

function cle(texte) {
  return Buffer.from(texte).toString('base64url').slice(0, 120);
}

async function enCache(nom, produire) {
  mkdirSync(CACHE, { recursive: true });
  const fichier = path.join(CACHE, `${cle(nom)}.json`);
  if (!FORCE && existsSync(fichier)) {
    return JSON.parse(readFileSync(fichier, 'utf8'));
  }
  const valeur = await produire();
  writeFileSync(fichier, JSON.stringify(valeur, null, 1), 'utf8');
  return valeur;
}

/**
 * Distance en mètres entre deux points (équirectangulaire — largement assez
 * précis à l'échelle d'une ville, et sans trigonométrie sphérique inutile).
 */
function metres(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.round(Math.sqrt(x * x + y * y) * R);
}

// ── Nominatim ──────────────────────────────────────────────
async function cherche(requete, boite) {
  const params = new URLSearchParams({
    q: requete,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
    'accept-language': 'fr',
  });
  // viewbox = min_lng, min_lat, max_lng, max_lat — et `bounded` interdit
  // à Nominatim d'aller chercher un homonyme à l'autre bout du monde.
  if (boite) {
    params.set('viewbox', `${boite[1]},${boite[0]},${boite[3]},${boite[2]}`);
    params.set('bounded', '1');
  }
  const url = `${NOMINATIM}?${params}`;
  return enCache(`nominatim:${url}`, async () => {
    await cadence();
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`Nominatim ${r.status} sur « ${requete} »`);
    return r.json();
  });
}

// ── Overpass ───────────────────────────────────────────────
async function overpass(corps) {
  return enCache(`overpass:${corps}`, async () => {
    await cadence();
    const r = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: corps }),
    });
    if (!r.ok) throw new Error(`Overpass ${r.status}`);
    return r.json();
  });
}

/** Cherche par nom exact dans la boîte, puis par nom approché. */
async function chercheOverpass(nom, boite) {
  const [s, o, n, e] = boite;
  const echappe = nom.replace(/["\\]/g, '\\$&');
  const requetes = [
    `[out:json][timeout:25];nwr["name"="${echappe}"](${s},${o},${n},${e});out center 5;`,
    `[out:json][timeout:25];nwr["name"~"${echappe}",i](${s},${o},${n},${e});out center 5;`,
  ];
  for (const q of requetes) {
    const json = await overpass(q);
    if (json.elements?.length) return json.elements;
  }
  return [];
}

// ── Résolution d'un POI ────────────────────────────────────
async function resous(poi, boite, echos) {
  const essais = [];

  if (poi.osm?.nominatim) {
    for (const q of [].concat(poi.osm.nominatim)) {
      essais.push({ voie: 'nominatim', requete: q });
    }
  }
  if (poi.osm?.nom) {
    essais.push({ voie: 'overpass', requete: poi.osm.nom });
  }

  for (const essai of essais) {
    try {
      if (essai.voie === 'nominatim') {
        const res = await cherche(essai.requete, boite);
        if (res.length) {
          const meilleur = res[0];
          return {
            lat: Number(meilleur.lat),
            lng: Number(meilleur.lon),
            precision: meilleur.osm_type === 'node' ? 'noeud' : 'batiment',
            source: `osm:${meilleur.osm_type}/${meilleur.osm_id}`,
            libelle: meilleur.display_name,
            voie: `nominatim « ${essai.requete} »`,
          };
        }
      } else {
        const els = await chercheOverpass(essai.requete, boite);
        if (els.length) {
          const el = els[0];
          const c = el.center ?? el;
          return {
            lat: c.lat,
            lng: c.lon,
            precision: el.type === 'node' ? 'noeud' : 'batiment',
            source: `osm:${el.type}/${el.id}`,
            libelle: el.tags?.name ?? essai.requete,
            voie: `overpass « ${essai.requete} »`,
          };
        }
      }
    } catch (err) {
      echos.push(`      ⚠ ${essai.voie} : ${err.message}`);
    }
  }
  return null;
}

// ── Parcours des visites ───────────────────────────────────
function visites() {
  return readdirSync(TOURS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => existsSync(path.join(TOURS, slug, 'pois.json')))
    .filter((slug) => !SEUL || slug === SEUL)
    .sort();
}

/** Réécrit le tableau POIs de tour.md à partir des coordonnées résolues. */
function majTourMd(slug, fiche) {
  const chemin = path.join(TOURS, slug, 'tour.md');
  if (!existsSync(chemin)) return false;
  const md = readFileSync(chemin, 'utf8');

  const entete = '| # | Titre | Lat | Lng | Fichier | Précision | Desc (1 ligne) |';
  const separateur = '|---|-------|-----|-----|---------|-----------|----------------|';
  const lignes = fiche.pois.map((p) => {
    const lat = p.lat == null ? '—' : p.lat.toFixed(6);
    const lng = p.lng == null ? '—' : p.lng.toFixed(6);
    return `| ${p.n} | ${p.titre} | ${lat} | ${lng} | ${p.fichier} | ${p.precision ?? '—'} | ${p.desc} |`;
  });
  const tableau = [entete, separateur, ...lignes].join('\n');

  // Remplace le bloc entre « ## POIs » et le titre de niveau 2 suivant.
  const remplace = md.replace(
    /(^## POIs\s*\n)([\s\S]*?)(?=^## |\Z)/m,
    (_m, titre) => `${titre}\n${tableau}\n\n`,
  );
  if (remplace === md) return false;
  writeFileSync(chemin, remplace, 'utf8');
  return true;
}

// ── Programme ──────────────────────────────────────────────
const slugs = visites();
if (!slugs.length) {
  console.error(
    SEUL
      ? `Aucun pois.json pour « ${SEUL} ».`
      : 'Aucune visite ne porte de pois.json. Rien à résoudre.',
  );
  process.exit(1);
}

console.log(ECRIS ? '── Résolution GPS (écriture) ──' : '── Résolution GPS (aperçu, rien n\'est écrit) ──');
console.log(`${slugs.length} visite(s)\n`);

let totalOk = 0;
let totalKo = 0;
const echecs = [];

for (const slug of slugs) {
  const chemin = path.join(TOURS, slug, 'pois.json');
  const fiche = JSON.parse(readFileSync(chemin, 'utf8'));
  console.log(`▸ ${slug} — ${fiche.ville} (${fiche.pois.length} POIs)`);

  let modifie = false;
  for (const poi of fiche.pois) {
    const echos = [];
    const avant = poi.lat != null ? { lat: poi.lat, lng: poi.lng } : null;

    if (poi.lat != null && poi.source && !FORCE) {
      console.log(`   ${String(poi.n).padStart(2)}. ${poi.titre} — déjà résolu (${poi.source})`);
      totalOk += 1;
      continue;
    }

    const trouve = await resous(poi, fiche.boite, echos);
    echos.forEach((e) => console.log(e));

    if (!trouve) {
      console.log(`   ${String(poi.n).padStart(2)}. ${poi.titre} — ✗ NON RÉSOLU`);
      echecs.push(`${slug} #${poi.n} ${poi.titre}`);
      totalKo += 1;
      continue;
    }

    const ecart = avant ? metres(avant, trouve) : null;
    const note = ecart == null ? '' : `  (écart avec l'ancienne valeur : ${ecart} m)`;
    console.log(
      `   ${String(poi.n).padStart(2)}. ${poi.titre} — ${trouve.lat.toFixed(6)}, ` +
        `${trouve.lng.toFixed(6)} [${trouve.precision}] ${trouve.source}${note}`,
    );

    poi.lat = Number(trouve.lat.toFixed(6));
    poi.lng = Number(trouve.lng.toFixed(6));
    poi.precision = trouve.precision;
    poi.source = trouve.source;
    poi.resoluLe = new Date().toISOString().slice(0, 10);
    modifie = true;
    totalOk += 1;
  }

  if (ECRIS && modifie) {
    writeFileSync(chemin, `${JSON.stringify(fiche, null, 2)}\n`, 'utf8');
    const maj = majTourMd(slug, fiche);
    console.log(`   → pois.json écrit${maj ? ' · tableau de tour.md mis à jour' : ''}`);
  }
  console.log('');
}

console.log('── Bilan ──');
console.log(`résolus : ${totalOk}   ·   non résolus : ${totalKo}`);
if (echecs.length) {
  console.log('\nÀ reprendre à la main (affiner la clé `osm` dans pois.json) :');
  echecs.forEach((e) => console.log(`  · ${e}`));
}
if (!ECRIS) console.log('\nAperçu seulement. Relancer avec --ecris pour enregistrer.');
process.exit(totalKo ? 1 : 0);

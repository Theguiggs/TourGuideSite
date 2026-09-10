// ══════════════════════════════════════════════════════════
// Vérifie que les visites respectent le format Murmure
// ══════════════════════════════════════════════════════════
//
// Le prompt maître (`content/prompts/prompt-narration-visite.md`) pose des
// règles chiffrées. Une règle chiffrée qu'on ne mesure pas est un vœu : ce
// script la mesure.
//
// ── CE QU'IL CONTRÔLE ─────────────────────────────────────
//
//   budget     150 à 225 mots par scène, 300 pour un POI héros, deux héros
//              au maximum par visite
//   en-tête    chaque scène déclare durée, position d'écoute, ton, format
//   ssml       seul `<break time="Xs"/>` est admis, et jamais plus de 10 s
//   tutoiement le vouvoiement dans le corps d'une scène est une erreur
//   gps        chaque POI a une coordonnée résolue ET sa provenance OSM
//   cohérence  autant de scènes que de POIs, et les mêmes noms de fichier
//
// Le corps d'une scène est tout ce qui suit le séparateur `---` : c'est
// exactement ce que le TTS lira. Tout le reste est de l'en-tête.
//
// ── LANCEMENT ─────────────────────────────────────────────
//   node scripts/verifie-format-visites.mjs
//   node scripts/verifie-format-visites.mjs --tour=cagnes-renoir-collettes
//   node scripts/verifie-format-visites.mjs --strict   # le GPS manquant échoue
//
// Sort en code 1 dès qu'une erreur est trouvée, pour être branché en CI.
// ══════════════════════════════════════════════════════════

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOURS = path.join(path.resolve(__dirname, '..'), 'content', 'tours');

const argv = process.argv.slice(2);
const SEUL = (argv.find((a) => a.startsWith('--tour=')) ?? '').split('=')[1] || null;
const STRICT = argv.includes('--strict');

const BUDGET_STANDARD = 225;
const BUDGET_HEROS = 300;
const BUDGET_PLANCHER = 140;
const HEROS_MAX = 2;

// Le vouvoiement se traque sur des formes qui n'existent pas au tutoiement.
// « vous » seul suffirait presque, mais les impératifs sont le vrai signal.
const VOUVOIEMENT = [
  /\bvous\b/i,
  /\bvotre\b/i,
  /\bvos\b/i,
  /\b\w+ez-(?:vous|moi|le|la|les|y)\b/i,
];

// Faux positifs légitimes : citations rapportées, formules figées.
const TOLERE_VOUVOIEMENT = /«[^»]*»/g;

const rouge = (s) => `\x1b[31m${s}\x1b[0m`;
const jaune = (s) => `\x1b[33m${s}\x1b[0m`;
const vert = (s) => `\x1b[32m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

function compteMots(texte) {
  return (texte.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}

/** Sépare l'en-tête du corps : le corps commence après le premier `---` seul. */
function decoupe(brut) {
  const i = brut.indexOf('\n---\n');
  if (i === -1) return { entete: brut, corps: '' };
  return { entete: brut.slice(0, i), corps: brut.slice(i + 5).trim() };
}

function verifieScene(chemin, nomFichier) {
  const pbs = [];
  const brut = readFileSync(chemin, 'utf8');
  const { entete, corps } = decoupe(brut);

  if (!corps) {
    pbs.push(['erreur', 'aucun séparateur `---` : impossible de savoir ce que lira le TTS']);
    return { pbs, mots: 0 };
  }

  for (const champ of ['Durée estimée', 'Position', 'Ton', 'Format']) {
    if (!entete.includes(`**${champ} :**`)) {
      pbs.push(['erreur', `en-tête sans « ${champ} »`]);
    }
  }
  if (!/^#\s+Scène\s+\d+\s*[—-]/m.test(entete)) {
    pbs.push(['erreur', 'titre attendu : « # Scène N — Titre »']);
  }

  // ── SSML ──
  const balises = corps.match(/<[^>]+>/g) ?? [];
  for (const b of balises) {
    const m = b.match(/^<break time="([\d.]+)s"\/>$/);
    if (!m) {
      pbs.push(['erreur', `balise interdite : ${b} — seul <break time="Xs"/> est admis`]);
    } else if (Number(m[1]) > 10) {
      pbs.push(['erreur', `pause de ${m[1]} s : Azure tronque au-delà de 10 s`]);
    }
  }

  // ── Tutoiement ──
  const sansCitations = corps.replace(TOLERE_VOUVOIEMENT, '');
  for (const motif of VOUVOIEMENT) {
    const trouve = sansCitations.match(motif);
    if (trouve) {
      pbs.push(['erreur', `vouvoiement : « ${trouve[0]} » — le format Murmure tutoie`]);
      break;
    }
  }

  // ── Budget ──
  const mots = compteMots(corps.replace(/<[^>]+>/g, ' '));
  if (mots > BUDGET_HEROS) {
    pbs.push(['erreur', `${mots} mots : au-dessus du plafond héros (${BUDGET_HEROS})`]);
  }
  if (mots < BUDGET_PLANCHER) {
    pbs.push(['avert', `${mots} mots : court, la scène risque de ne rien payer`]);
  }

  return { pbs, mots, heros: mots > BUDGET_STANDARD, fichier: nomFichier };
}

function verifieVisite(slug) {
  const dossier = path.join(TOURS, slug);
  const pbs = [];
  let erreurs = 0;
  let averts = 0;

  const dire = (niveau, msg) => {
    pbs.push([niveau, msg]);
    if (niveau === 'erreur') erreurs += 1;
    else averts += 1;
  };

  // ── tour.md ──
  const tourMd = path.join(dossier, 'tour.md');
  if (!existsSync(tourMd)) {
    dire('erreur', 'pas de tour.md');
  } else {
    const md = readFileSync(tourMd, 'utf8');
    for (const section of ['## Description catalogue', '## Thèmes', '## POIs', '## Points à vérifier', '## Récapitulatif budgets']) {
      if (!md.includes(section)) dire('erreur', `tour.md sans section « ${section} »`);
    }
  }

  // ── pois.json ──
  const poisPath = path.join(dossier, 'pois.json');
  if (!existsSync(poisPath)) {
    dire('erreur', 'pas de pois.json — la visite n\'est pas géolocalisable');
    return { pbs, erreurs, averts, mots: 0, scenes: 0 };
  }
  const fiche = JSON.parse(readFileSync(poisPath, 'utf8'));
  if (!Array.isArray(fiche.boite) || fiche.boite.length !== 4) {
    dire('erreur', 'pois.json sans « boite » [lat_min, lng_min, lat_max, lng_max]');
  }

  const dossierScenes = path.join(dossier, 'scenes');
  if (!existsSync(dossierScenes)) {
    dire('erreur', 'pas de dossier scenes/');
    return { pbs, erreurs, averts, mots: 0, scenes: 0 };
  }
  const fichiers = readdirSync(dossierScenes).filter((f) => f.endsWith('.md')).sort();

  if (fichiers.length !== fiche.pois.length) {
    dire('erreur', `${fichiers.length} scènes pour ${fiche.pois.length} POIs`);
  }

  let total = 0;
  let heros = 0;
  const detail = [];

  for (const poi of fiche.pois) {
    if (!poi.position || poi.position.length < 12) {
      dire('erreur', `POI ${poi.n} « ${poi.titre} » sans position d'écoute utilisable`);
    }
    if (!poi.osm?.nominatim && !poi.osm?.nom) {
      dire('erreur', `POI ${poi.n} « ${poi.titre} » sans clé de résolution OSM`);
    }
    if (poi.lat == null || poi.lng == null) {
      dire(STRICT ? 'erreur' : 'avert', `POI ${poi.n} « ${poi.titre} » sans coordonnée résolue`);
    } else if (!poi.source) {
      dire('erreur', `POI ${poi.n} « ${poi.titre} » a une coordonnée sans provenance`);
    } else if (poi.precision === 'ville') {
      dire('erreur', `POI ${poi.n} « ${poi.titre} » résolu au niveau ville : trop grossier pour un pin`);
    }

    const chemin = path.join(dossierScenes, poi.fichier ?? '');
    if (!poi.fichier || !existsSync(chemin)) {
      dire('erreur', `POI ${poi.n} pointe un fichier absent : ${poi.fichier ?? '(vide)'}`);
      continue;
    }
    const r = verifieScene(chemin, poi.fichier);
    r.pbs.forEach(([n, m]) => dire(n, `${poi.fichier} — ${m}`));
    total += r.mots;
    if (r.heros) heros += 1;
    detail.push({ n: poi.n, fichier: poi.fichier, mots: r.mots, heros: r.heros });
  }

  const orphelines = fichiers.filter((f) => !fiche.pois.some((p) => p.fichier === f));
  orphelines.forEach((f) => dire('avert', `scène non référencée dans pois.json : ${f}`));

  if (heros > HEROS_MAX) {
    dire('erreur', `${heros} scènes au-dessus de ${BUDGET_STANDARD} mots — le maximum est ${HEROS_MAX}`);
  }

  return { pbs, erreurs, averts, mots: total, scenes: fiche.pois.length, detail, heros };
}

// ── Programme ──────────────────────────────────────────────
const slugs = readdirSync(TOURS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((s) => existsSync(path.join(TOURS, s, 'tour.md')) || existsSync(path.join(TOURS, s, 'pois.json')))
  .filter((s) => !SEUL || s === SEUL)
  .sort();

if (!slugs.length) {
  console.error(SEUL ? `Visite « ${SEUL} » introuvable ou pas encore convertie.` : 'Aucune visite convertie.');
  process.exit(1);
}

let erreursTotal = 0;
let avertsTotal = 0;

for (const slug of slugs) {
  const r = verifieVisite(slug);
  erreursTotal += r.erreurs;
  avertsTotal += r.averts;

  const etat = r.erreurs ? rouge('✗') : r.averts ? jaune('!') : vert('✓');
  const resume = r.scenes
    ? gris(`${r.scenes} scènes · ${r.mots} mots · ~${Math.round(r.mots / 150)} min · ${r.heros ?? 0} héros`)
    : '';
  console.log(`${etat} ${slug}  ${resume}`);

  for (const [niveau, msg] of r.pbs) {
    console.log(`    ${niveau === 'erreur' ? rouge('erreur') : jaune('avert ')}  ${msg}`);
  }
  if (r.detail?.length && !r.erreurs) {
    const hors = r.detail.filter((d) => d.mots > BUDGET_STANDARD);
    if (hors.length) {
      console.log(gris(`    héros : ${hors.map((d) => `#${d.n} (${d.mots})`).join(', ')}`));
    }
  }
}

console.log(`\n${slugs.length} visite(s) · ${erreursTotal} erreur(s) · ${avertsTotal} avertissement(s)`);
if (!STRICT && avertsTotal) {
  console.log(gris('Relancer avec --strict pour que le GPS non résolu échoue (à faire avant tout semis).'));
}
process.exit(erreursTotal ? 1 : 0);

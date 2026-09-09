// ══════════════════════════════════════════════════════════
// Seed — Cannes : « L'Île Sainte-Marguerite » en DRAFT
// ══════════════════════════════════════════════════════════
//
//   · « L'Île Sainte-Marguerite — Le prisonnier sans visage » — 8 Scènes, ~3,3 km
//
// Jumeau de `seed-barcelone-tours.mjs`, mêmes garde-fous. Ce qui change :
//
// 1. LA SOURCE DU TEXTE est dans CE dépôt — `TourGuideWeb/content/tours/` —
//    et non dans `.content-expansion/`, où vivent les visites de la vague 100.
//
// 2. LES COMPTES DE MOTS SONT RETIRÉS DU CORPS. Le script de narration porte
//    une ligne `*(183 mots)*` après chaque Scène, qui sert à la relecture
//    éditoriale. Laissée dans `transcriptText`, elle serait LUE À VOIX HAUTE
//    par le TTS. Le filtre ci-dessous l'ôte — et il est écrit pour ne rien
//    retirer d'autre.
//
// 3. CANNES N'EST PAS ENCORE DANS LE CATALOGUE VIVANT. Aucune visite cannoise
//    n'y figure, alors que `cannes-derriere-la-palme` existe en contenu depuis
//    juillet. Semer celle-ci fait donc APPARAÎTRE une ville nouvelle avec une
//    seule visite. Ce n'est pas un défaut du script, c'est un fait à connaître
//    avant de publier : `city-coords.ts` et `accent-map.ts` connaissent déjà
//    Cannes, rien à ajouter de ce côté.
//
// ── CE QU'IL N'ÉCRIT PAS ───────────────────────────────────
//
// Aucun audio, aucune clé S3, et rien de publié. Quand l'audio viendra, la
// convention du catalogue est `scene_{index}_{langue}.wav` — jamais la clé
// sans langue du Studio, qui a déjà fait passer de l'allemand pour du français.
//
// ── Sécurité ───────────────────────────────────────────────
//   • DRY-RUN par défaut : n'écrit rien tant que --confirm n'est pas passé.
//   • Refuse d'écraser une visite existante sans --clean.
//   • `owner` lu dans `GuideProfile`, jamais codé en dur : le `sub` a déjà
//     changé une fois à la migration, et une visite mal possédée est invisible
//     dans le Studio sans qu'aucune erreur ne le signale.
//   • Vérifie le nombre de Scènes lues contre le nombre attendu.
//
// ── Lancement ──────────────────────────────────────────────
//   node scripts/seed-cannes-sainte-marguerite.mjs            # aperçu
//   node scripts/seed-cannes-sainte-marguerite.mjs --confirm  # écrit
//   node scripts/seed-cannes-sainte-marguerite.mjs --confirm --clean
// ══════════════════════════════════════════════════════════

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── Options ────────────────────────────────────────────────
const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const getOpt = (name, def) => {
  const p = args.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split('=').slice(1).join('=') : def;
};

const APP_ID  = getOpt('app-id', process.env.APP_ID || 'yvupc5stqzaxrgz6wv2wz7he5y');
const ENV     = getOpt('env', process.env.AMPLIFY_ENV || 'NONE');
const REGION  = getOpt('region', process.env.AWS_REGION || 'us-east-1');
const CONFIRM = hasFlag('--confirm');
const CLEAN   = hasFlag('--clean');
const DRY_RUN = !CONFIRM;
const WPM     = 150;

/** Le profil de guide de Guillaume. Son `id` a survécu à la migration ; son `owner`, non. */
const GUIDE_ID = getOpt('guide-id', '159473d2-8509-4d01-aa14-180d87772225');

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const table = (name) => `${name}-${APP_ID}-${ENV}`;
const now = new Date().toISOString();

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(__dirname, '..', 'content', 'tours');

// ── La visite ──────────────────────────────────────────────
const VISITE = {
  id: 'cannes-ile-sainte-marguerite',
  titre: "Cannes — L'Île Sainte-Marguerite : le prisonnier sans visage",
  scenesAttendues: 8,
  distanceKm: 3.3,
  themes: ['histoire', 'patrimoine', 'nature'],
  description:
    "Quinze minutes de bateau depuis la Croisette, et trois siècles de captivité. Une forteresse bâtie contre les Espagnols et retournée contre des prisonniers, la cellule d'un homme qu'on a voulu effacer de son vivant, un cimetière de la guerre de Crimée que personne ne vient voir, et six visages immergés au large. Une île qui n'a jamais fait qu'une chose : décider qui a droit à un visage.",
  // Une ligne par Scène — ce que le visiteur voit, pas ce qu'il apprendra.
  pois: [
    "Le débarcadère, la Croisette à un mille nautique, et la forêt de pins qui commence là où le bruit s'arrête.",
    "L'enceinte du Fort Royal : des murs élevés contre une flotte, réaffectés à la surveillance de quelques hommes.",
    "La cellule voûtée à triple grille où l'on situe la détention du prisonnier masqué, de 1687 à 1698.",
    "Le petit cimetière des soldats morts pendant la guerre de Crimée, à l'ombre, à trois cents mètres du fort.",
    "Le rivage sud, face au large, et les sculptures immergées de l'écomusée sous-marin.",
    "L'étang du Batéguier, eau saumâtre séparée de la mer par une bande de terre, refuge d'oiseaux.",
    "La pointe ouest, point le plus proche du continent : Cannes nette et lisible, hors d'atteinte.",
    "Le retour au débarcadère, et la Croisette qu'on ne regarde plus pareil.",
  ],
};

// ── Lecture du script de narration ─────────────────────────
/**
 * Découpe `script-narration.md` en Scènes.
 *
 * Attendu par Scène :
 *   ## Scène N — Titre du lieu : Sous-titre
 *   **GPS :** 43.5223644, 7.0394850
 *   <corps>
 *   *(183 mots)*
 *
 * Le `title` de la Scène est la partie AVANT « : » — c'est le nom du lieu, ce
 * qui s'affiche dans le Studio et sur la carte. Le sous-titre est une accroche
 * éditoriale, il n'a rien à faire dans un libellé de POI.
 *
 * La ligne de comptage est retirée du corps : le motif est ancré aux deux bouts
 * (`^\*\(` … `\)\*$`) et exige le mot « mots », pour ne pas emporter une
 * incise de narration qui commencerait par une parenthèse.
 */
function lireScenes(dossier) {
  const chemin = join(CONTENT, dossier, 'script-narration.md');
  const brut = readFileSync(chemin, 'utf8');
  const blocs = brut.split(/\r?\n---\r?\n/);
  const scenes = [];

  for (const bloc of blocs) {
    const entete = bloc.match(/^##\s+Scène\s+(\d+)\s*[—-]\s*(.+)$/m);
    if (!entete) continue;

    const gps = bloc.match(/^\*\*GPS\s*:\*\*\s*([-\d.]+)\s*,\s*([-\d.]+)\s*$/m);
    if (!gps) throw new Error(`Scène ${entete[1]} de ${dossier} : ligne GPS absente ou illisible`);

    const libelle = entete[2].trim();
    const titre = libelle.includes(' : ') ? libelle.split(' : ')[0].trim() : libelle;

    const corps = bloc
      .split(/\r?\n/)
      .filter((l) => !/^##\s+Scène/.test(l))
      .filter((l) => !/^\*\*GPS\s*:\*\*/.test(l))
      .filter((l) => !/^\*\(\s*\d+\s*mots.*\)\*\s*$/.test(l))
      .join('\n')
      .trim();

    if (!corps) throw new Error(`Scène ${entete[1]} de ${dossier} : corps vide`);
    if (/\d+\s*mots/.test(corps)) {
      throw new Error(`Scène ${entete[1]} : un comptage de mots subsiste dans le corps — il serait lu à voix haute`);
    }

    scenes.push({
      numero: Number(entete[1]),
      titre,
      latitude: Number(gps[1]),
      longitude: Number(gps[2]),
      texte: corps,
    });
  }

  scenes.sort((a, b) => a.numero - b.numero);
  return scenes;
}

/**
 * L'`owner` vient du vivant, jamais d'une constante.
 *
 * La migration hors bac à sable a déjà changé ce `sub` une fois sans que rien
 * ne le signale : une visite semée avec l'ancien n'appartient à personne et
 * n'apparaît nulle part. On préfère un arrêt bruyant à une écriture muette.
 */
async function lireOwnerDuGuide() {
  const r = await dynamo.send(new GetCommand({
    TableName: table('GuideProfile'), Key: { id: GUIDE_ID },
  }));
  if (!r.Item) throw new Error(`GuideProfile ${GUIDE_ID} introuvable sur ${APP_ID} — mauvaise pile ?`);
  if (!r.Item.owner) throw new Error(`GuideProfile ${GUIDE_ID} sans champ owner — refus d'écrire`);
  return { owner: r.Item.owner, nom: r.Item.displayName };
}

// ── Construction ───────────────────────────────────────────
function batir(visite, scenes, owner) {
  const SESSION_ID = `${visite.id}-session`;
  const mots = scenes.reduce((s, sc) => s + sc.texte.split(/\s+/).length, 0);
  const durationMinutes = Math.round(mots / WPM);
  const computedPath = scenes.map((s) => ({ lat: s.latitude, lng: s.longitude }));

  const routePathJson = JSON.stringify({
    manualMode: true,
    waypoints: computedPath,
    pathOverride: false,
    computedPath,
    distanceMeters: Math.round(visite.distanceKm * 1000),
    durationSeconds: durationMinutes * 60,
  });

  const guideTour = {
    id: visite.id, guideId: GUIDE_ID, owner,
    title: visite.titre, city: 'Cannes',
    status: 'draft', description: visite.description, version: 1,
    duration: durationMinutes, distance: visite.distanceKm, poiCount: scenes.length,
    sessionId: SESSION_ID, availableLanguages: ['fr'],
    createdAt: now, updatedAt: now, __typename: 'GuideTour',
  };

  const studioSession = {
    id: SESSION_ID, guideId: GUIDE_ID, owner, tourId: visite.id,
    title: visite.titre, status: 'draft',
    language: 'fr', availableLanguages: ['fr'],
    captureMode: 'scene_builder', consentRGPD: true, version: 1,
    description: visite.description, themes: visite.themes,
    durationMinutes, routePathJson,
    createdAt: now, updatedAt: now, __typename: 'StudioSession',
  };

  const studioScenes = scenes.map((sc, i) => {
    const motsScene = sc.texte.split(/\s+/).length;
    return {
      id: `${visite.id}-scene-${i}`, sessionId: SESSION_ID, owner,
      sceneIndex: i, title: sc.titre, status: 'transcribed',
      transcriptText: sc.texte, poiDescription: visite.pois[i],
      latitude: sc.latitude, longitude: sc.longitude,
      durationSeconds: Math.round((motsScene / WPM) * 60), archived: false,
      createdAt: now, updatedAt: now, __typename: 'StudioScene',
    };
  });

  return { guideTour, studioSession, studioScenes, durationMinutes, mots };
}

// ── Nettoyage ciblé ────────────────────────────────────────
async function nettoyer(visite, nbScenes) {
  const ids = {
    GuideTour: [visite.id],
    StudioSession: [`${visite.id}-session`],
    StudioScene: Array.from({ length: nbScenes }, (_, i) => `${visite.id}-scene-${i}`),
  };
  for (const [t, liste] of Object.entries(ids)) {
    for (let i = 0; i < liste.length; i += 25) {
      await dynamo.send(new BatchWriteCommand({
        RequestItems: {
          [table(t)]: liste.slice(i, i + 25).map((id) => ({ DeleteRequest: { Key: { id } } })),
        },
      }));
    }
    console.log(`    nettoye ${t} : ${liste.length}`);
  }
}

/** Les Scènes orphelines d'un semis précédent au compte différent. */
async function scenesResiduelles(sessionId, gardees) {
  const out = [];
  let k;
  do {
    const r = await dynamo.send(new ScanCommand({
      TableName: table('StudioScene'),
      FilterExpression: 'sessionId = :s',
      ExpressionAttributeValues: { ':s': sessionId },
      ProjectionExpression: 'id',
      ExclusiveStartKey: k,
    }));
    out.push(...(r.Items ?? []).map((x) => x.id));
    k = r.LastEvaluatedKey;
  } while (k);
  return out.filter((id) => !gardees.includes(id));
}

// ── Exécution ──────────────────────────────────────────────
async function run() {
  console.log('\n═══ Seed Cannes — Île Sainte-Marguerite (DRAFT) ═══');
  console.log(`  Pile   : ${APP_ID}-${ENV}  (${REGION})`);

  const { owner, nom } = await lireOwnerDuGuide();
  console.log(`  Guide  : ${nom}  [${GUIDE_ID}]`);
  console.log(`  Owner  : ${owner.split('::')[0]}   (lu dans GuideProfile, pas code en dur)`);

  const scenes = lireScenes(VISITE.id);
  if (scenes.length !== VISITE.scenesAttendues) {
    throw new Error(`${VISITE.id} : ${scenes.length} Scenes lues, ${VISITE.scenesAttendues} attendues — arret`);
  }

  const { guideTour, studioSession, studioScenes, durationMinutes, mots } = batir(VISITE, scenes, owner);

  console.log(`\n  ${VISITE.titre}`);
  console.log(`    id=${VISITE.id}  status=draft  ${studioScenes.length} Scenes  ${mots} mots  ~${durationMinutes} min  ${VISITE.distanceKm} km`);
  for (const s of studioScenes) {
    console.log(`      ${String(s.sceneIndex).padStart(2)}  ${s.title.padEnd(32)} (${s.latitude}, ${s.longitude})  ${Math.round(s.durationSeconds)} s`);
  }

  if (DRY_RUN) {
    console.log("\n  ⚠ APERCU — rien n'a ete ecrit. Ajoute --confirm pour ecrire.\n");
    return;
  }

  console.log(`\n  ── ${VISITE.id} ──`);
  const existe = await dynamo.send(new GetCommand({
    TableName: table('GuideTour'), Key: { id: VISITE.id },
  }));
  if (existe.Item && !CLEAN) {
    throw new Error(`${VISITE.id} existe deja (status=${existe.Item.status}). Relance avec --clean pour remplacer.`);
  }
  if (CLEAN) {
    const orphelines = await scenesResiduelles(studioSession.id, studioScenes.map((s) => s.id));
    await nettoyer(VISITE, studioScenes.length);
    if (orphelines.length) {
      for (let i = 0; i < orphelines.length; i += 25) {
        await dynamo.send(new BatchWriteCommand({
          RequestItems: {
            [table('StudioScene')]: orphelines.slice(i, i + 25).map((id) => ({ DeleteRequest: { Key: { id } } })),
          },
        }));
      }
      console.log(`    nettoye StudioScene orphelines : ${orphelines.length}`);
    }
  }

  const put = (t, item) => dynamo.send(new PutCommand({ TableName: table(t), Item: item }));
  await put('GuideTour', guideTour);
  console.log('    GuideTour (draft) ecrit');
  await put('StudioSession', studioSession);
  console.log('    StudioSession (draft) ecrit');
  for (const s of studioScenes) await put('StudioScene', s);
  console.log(`    StudioScene x${studioScenes.length} ecrites (transcribed)`);

  console.log('\n  Termine. La visite apparait dans le Studio, prete pour audio + photos.');
  console.log('  Rappel : quand tu generes l\'audio, la convention du catalogue est scene_{index}_{langue}.wav.\n');
}

run().catch((e) => { console.error('\n  ECHEC :', e.message, '\n'); process.exit(1); });

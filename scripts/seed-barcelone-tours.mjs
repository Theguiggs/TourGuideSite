// ══════════════════════════════════════════════════════════
// Seed — Barcelone : deux visites en DRAFT
// ══════════════════════════════════════════════════════════
//
//   · « De la Rambla à la Mer »   — 10 Scènes, ~2,5 km
//   · « L'Îlot de la Discorde »   —  9 Scènes, ~1,4 km
//
// Les Scènes sont posées en état « transcribed » : texte + GPS présents,
// audio et photos à faire ensuite dans le Studio. Rien n'est publié.
//
// ── CE QUI DIFFÈRE DE seed-biarritz-tour.mjs, ET POURQUOI ──
//
// 1. LA PILE. Le script Biarritz vise `t5nxxao3orh6za2bjj6uegulru`, qui est
//    MORT. La pile vivante est `yvupc5stqzaxrgz6wv2wz7he5y` (app dieqe5vfmuc69,
//    branche main).
//
// 2. L'OWNER N'EST PLUS CODÉ EN DUR — c'est la correction importante. La
//    migration hors bac à sable a changé le `sub` Cognito : Biarritz porte
//    encore `84a88428-…`, alors que le vivant est `4418d408-…`. Semer avec
//    l'ancien créerait deux visites appartenant à PERSONNE, invisibles dans le
//    Studio et impossibles à rattraper depuis l'interface. Ce script lit donc
//    l'`owner` dans `GuideProfile` et s'arrête s'il ne le trouve pas.
//
//    C'est aussi ce que dit le trou d'autorisation du 2026-09-01 : `owner` est
//    le seul champ digne de confiance ; `userId` est librement inscriptible.
//
// 3. LA SOURCE DU TEXTE. Biarritz lit un dossier `scenes/` d'un fichier par
//    Scène. Barcelone n'a qu'un `script-narration.md` par visite, découpé en
//    sections `## Scène N — Titre : Sous-titre` suivies d'une ligne `**GPS :**`.
//    Le corps de la Scène est tout ce qui suit, la ligne GPS retirée.
//
// ── CE QU'IL N'ÉCRIT PAS ───────────────────────────────────
//
// Aucun audio, aucune clé S3. C'est délibéré : le Studio écrit ses clés en
// `{idScène}_{horodatage}.wav`, SANS la langue — c'est ce qui a fait passer de
// l'allemand pour du français à Grasse. Quand l'audio viendra, il devra suivre
// la convention du catalogue, `scene_{index}_{langue}.wav`.
//
// ── Sécurité ───────────────────────────────────────────────
//   • DRY-RUN par défaut : n'écrit rien tant que --confirm n'est pas passé.
//   • Refuse d'écraser une visite existante sans --clean.
//   • Vérifie le nombre de Scènes lues contre le nombre attendu, et s'arrête
//     si le compte ne tombe pas juste.
//
// ── Lancement ──────────────────────────────────────────────
//   node scripts/seed-barcelone-tours.mjs                    # aperçu
//   node scripts/seed-barcelone-tours.mjs --confirm          # écrit
//   node scripts/seed-barcelone-tours.mjs --confirm --clean  # remplace
//   node scripts/seed-barcelone-tours.mjs --tour=rambla      # une seule
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
const ONLY    = getOpt('tour', null);
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
const CONTENT = join(__dirname, '..', '..', '.content-expansion', 'content', 'tours');

// ── Les deux visites ───────────────────────────────────────
const VISITES = [
  {
    cle: 'rambla',
    id: 'barcelone-rambla-a-la-mer',
    titre: 'Barcelone — De la Rambla à la Mer',
    scenesAttendues: 10,
    distanceKm: 2.5,
    themes: ['histoire', 'patrimoine', 'secrets'],
    description:
      "La Rambla n'a pas été tracée : elle a été creusée par l'eau. Descendre l'ancienne bordure de la ville, du lit de sable qui lui a donné son nom jusqu'à l'embouchure, en passant par une façade de cathédrale qui a l'âge de la tour Eiffel, treize oies qui comptent les années d'une adolescente, et le premier travail d'un Gaudí de vingt-sept ans.",
    // Une ligne par Scène — ce que le visiteur voit, pas ce qu'il apprendra.
    pois: [
      "Le haut de la Rambla, où la ville médiévale bute sur la grille de 1860 : la trace d'une muraille disparue.",
      "La fontaine et le panneau de céramique de la Portaferrissa, plan d'une porte de ville qui s'ouvrait à quelques mètres.",
      "La façade néogothique de Santa Eulàlia, plaquée en 1887, et les treize oies du cloître.",
      "La cour fermée des rois d'Aragon, et les quatre mille mètres carrés de Barcino sous le pavé.",
      "Les deux pouvoirs qui se font face à l'emplacement du forum romain : mairie et Generalitat.",
      "Le gothique catalan qui va vers la largeur, une rose refaite en 1943, et un pin replanté depuis 1568.",
      "Le marché né dehors, au pied de l'ancien mur : six siècles de tables avant le toit de fer de 1914.",
      "La façade sobre du Liceu, la bombe de 1893 et l'incendie de 1994.",
      "Une place à arcades derrière une voûte, et les deux lampadaires du premier Gaudí de Barcelone.",
      "L'embouchure : la colonne de Colomb, les chantiers navals royaux, et la mer que la ville avait tourné le dos.",
    ],
  },
  {
    cle: 'ilot',
    id: 'barcelone-ilot-de-la-discorde',
    titre: "Barcelone — L'Îlot de la Discorde",
    scenesAttendues: 9,
    distanceKm: 1.4,
    themes: ['architecture', 'modernisme', 'pouvoir'],
    description:
      "Trois familles, trois architectes rivaux, trois maisons qui se touchent : la guerre des façades du Passeig de Gràcia. Un concours municipal qui a fait un perdant célèbre, une carrière hors la loi qui a dépassé de quatre mille mètres cubes, et des industriels qui payaient pour s'inventer un visage.",
    pois: [
      "Le bas du Passeig de Gràcia et le concours du meilleur bâtiment de l'année, arbitre officiel de la rivalité.",
      "La maison du bout de l'îlot, dont les sculptures ont fini dispersées.",
      "Le pignon en escalier du chocolatier, et le saint Georges entre les portes.",
      "La façade d'os et d'écailles de Gaudí — celle qui a perdu.",
      "Un angle coupé de l'Eixample : la règle de Cerdà, et ce qu'il en reste.",
      "La carrière de pierre ondulée qui a valu à son propriétaire un procès et une amende.",
      "Le carrefour des Cinc d'Oros et son obélisque, témoin d'une couronne qui a changé plusieurs fois.",
      "Un palais qui n'est un palais que sur une face : l'arrière est un immeuble de rapport.",
      "Le château de brique aux six tours, et le panneau de céramique qui dit tout haut ce que l'îlot disait tout bas.",
    ],
  },
];

// ── Lecture du script de narration ─────────────────────────
/**
 * Découpe `script-narration.md` en Scènes.
 *
 * Attendu par Scène :
 *   ## Scène N — Titre du lieu : Sous-titre
 *   **GPS :** 41.3858, 2.1701
 *   <corps>
 *
 * Le `title` de la Scène est la partie AVANT « : » — c'est le nom du lieu, ce
 * qui doit s'afficher dans le Studio et sur la carte. Le sous-titre est une
 * accroche éditoriale, il n'a rien à faire dans un libellé de POI.
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
      .filter((l) => !/^##\s+Scène/.test(l) && !/^\*\*GPS\s*:\*\*/.test(l))
      .join('\n')
      .trim();

    if (!corps) throw new Error(`Scène ${entete[1]} de ${dossier} : corps vide`);

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
    title: visite.titre, city: 'Barcelone',
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
    const mots = sc.texte.split(/\s+/).length;
    return {
      id: `${visite.id}-scene-${i}`, sessionId: SESSION_ID, owner,
      sceneIndex: i, title: sc.titre, status: 'transcribed',
      transcriptText: sc.texte, poiDescription: visite.pois[i],
      latitude: sc.latitude, longitude: sc.longitude,
      durationSeconds: Math.round((mots / WPM) * 60), archived: false,
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
  const aFaire = ONLY ? VISITES.filter((v) => v.cle === ONLY) : VISITES;
  if (!aFaire.length) throw new Error(`--tour=${ONLY} inconnu (rambla | ilot)`);

  console.log('\n═══ Seed Barcelone — deux visites (DRAFT) ═══');
  console.log(`  Pile   : ${APP_ID}-${ENV}  (${REGION})`);

  const { owner, nom } = await lireOwnerDuGuide();
  console.log(`  Guide  : ${nom}  [${GUIDE_ID}]`);
  console.log(`  Owner  : ${owner.split('::')[0]}   (lu dans GuideProfile, pas code en dur)`);

  const prets = [];
  for (const v of aFaire) {
    const scenes = lireScenes(v.id);
    if (scenes.length !== v.scenesAttendues) {
      throw new Error(`${v.id} : ${scenes.length} Scenes lues, ${v.scenesAttendues} attendues — arret`);
    }
    prets.push({ v, ...batir(v, scenes, owner) });
  }

  for (const { v, studioScenes, durationMinutes, mots } of prets) {
    console.log(`\n  ${v.titre}`);
    console.log(`    id=${v.id}  status=draft  ${studioScenes.length} Scenes  ${mots} mots  ~${durationMinutes} min  ${v.distanceKm} km`);
    for (const s of studioScenes) {
      console.log(`      ${String(s.sceneIndex).padStart(2)}  ${s.title.padEnd(30)} (${s.latitude}, ${s.longitude})  ${Math.round(s.durationSeconds)} s`);
    }
  }

  if (DRY_RUN) {
    console.log("\n  ⚠ APERCU — rien n'a ete ecrit. Ajoute --confirm pour ecrire.\n");
    return;
  }

  for (const { v, guideTour, studioSession, studioScenes } of prets) {
    console.log(`\n  ── ${v.id} ──`);
    const existe = await dynamo.send(new GetCommand({
      TableName: table('GuideTour'), Key: { id: v.id },
    }));
    if (existe.Item && !CLEAN) {
      throw new Error(`${v.id} existe deja (status=${existe.Item.status}). Relance avec --clean pour remplacer.`);
    }
    if (CLEAN) {
      const orphelines = await scenesResiduelles(studioSession.id, studioScenes.map((s) => s.id));
      await nettoyer(v, studioScenes.length);
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
  }

  console.log('\n  Termine. Les deux visites apparaissent dans le Studio, pretes pour audio + photos.');
  console.log('  Rappel : quand tu generes l\'audio, la convention du catalogue est scene_{index}_{langue}.wav.\n');
}

run().catch((e) => { console.error('\n  ECHEC :', e.message, '\n'); process.exit(1); });

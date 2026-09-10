// ══════════════════════════════════════════════════════════
// Sème les visites Riviera — en DRAFT, et jamais sans coordonnées
// ══════════════════════════════════════════════════════════
//
// Lit le gabarit Murmure (`content/tours/{slug}/` : tour.md, pois.json,
// scenes/) et écrit GuideTour + StudioSession + StudioScene sur la pile
// vivante. Rien n'est publié : tout part en DRAFT, la publication se fait
// depuis le Studio.
//
// ── CE QUI A MOTIVÉ CE SCRIPT ─────────────────────────────
//
// `seed-am-tours.mjs`, son prédécesseur, porte en défaut deux valeurs mortes :
// l'owner `84a88428-…` et la pile `t5nxxao3orh6za2bjj6uegulru`, tous deux
// périmés depuis la migration hors bac à sable. Le relancer ne lèverait
// AUCUNE erreur — DynamoDB accepte n'importe quel `owner`, et le Studio filtre
// dessus. Les visites seraient simplement invisibles, sans rien pour le
// signaler. C'est le même piège que le commit Barcelone a documenté.
//
// Il lit aussi `script-narration.md`, la version longue, dont les scènes font
// 520 à 1 378 mots — jusqu'à neuf minutes d'audio pour un seul POI, debout
// dans la rue. Ce script-ci lit `scenes/`, la version au gabarit.
//
// ── LES GARDES ────────────────────────────────────────────
//
//   owner       lu dans GuideProfile au moment d'écrire, arrêt s'il est vide
//   coordonnées arrêt si un POI n'a pas de lat/lng ET de provenance OSM
//   précision   arrêt si un POI n'est résolu qu'au niveau « ville »
//   cohérence   arrêt si le nombre de scènes ne correspond pas aux POIs
//   écrasement  refus d'écraser une visite existante sans --clean
//   aperçu      DRY-RUN par défaut : rien n'est écrit sans --confirm, et
//               l'aperçu ne touche pas au réseau — il se lance sans AWS
//
// La garde sur les coordonnées est la raison d'être du script. L'audit du lot
// avait trouvé des décalages de 150 à 1 800 m et trois jeux hors zone. Un pin
// mal placé ne casse rien côté serveur : il casse la visite devant un mur,
// pour quelqu'un qui a payé.
//
// ── CE QU'IL N'ÉCRIT PAS ──────────────────────────────────
//
// Aucun audio, aucune clé S3. Délibéré : le Studio écrit ses clés en
// `{idScène}_{horodatage}.wav`, SANS la langue — c'est ce qui a fait passer de
// l'allemand pour du français à Grasse. La convention du catalogue est
// `scene_{index}_{langue}.wav`.
//
// ── LANCEMENT ─────────────────────────────────────────────
//   node scripts/seme-riviera.mjs                          # aperçu, tout
//   node scripts/seme-riviera.mjs --tour=cagnes-mains-de-renoir
//   node scripts/seme-riviera.mjs --confirm                # écrit
//   node scripts/seme-riviera.mjs --confirm --clean        # remplace
// ══════════════════════════════════════════════════════════

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(__dirname, '..');
const TOURS = path.join(RACINE, 'content', 'tours');

// ── Options ────────────────────────────────────────────────
const argv = process.argv.slice(2);
const aDrapeau = (d) => argv.includes(d);
const option = (nom, defaut) => {
  const hit = argv.find((a) => a.startsWith(`--${nom}=`));
  return hit ? hit.split('=').slice(1).join('=') : defaut;
};

const APP_ID = option('app-id', process.env.APP_ID || 'yvupc5stqzaxrgz6wv2wz7he5y');
const ENV = option('env', process.env.AMPLIFY_ENV || 'NONE');
const REGION = option('region', process.env.AWS_REGION || 'us-east-1');
const CONFIRM = aDrapeau('--confirm');
const CLEAN = aDrapeau('--clean');
const SEUL = option('tour', null);
const APERCU = !CONFIRM;
const MOTS_PAR_MINUTE = 150;

/** Le profil de guide de Guillaume. Son `id` a survécu à la migration ; son `owner`, non. */
const GUIDE_ID = option('guide-id', '159473d2-8509-4d01-aa14-180d87772225');

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const table = (nom) => `${nom}-${APP_ID}-${ENV}`;
const maintenant = new Date().toISOString();

// ── Lecture du gabarit ─────────────────────────────────────

/** Le corps d'une scène est tout ce qui suit le premier `---` : c'est ce que lira le TTS. */
function corpsDeScene(chemin) {
  const brut = readFileSync(chemin, 'utf8');
  const i = brut.indexOf('\n---\n');
  if (i === -1) throw new Error(`${path.basename(chemin)} : pas de séparateur --- , impossible de savoir ce que lira le TTS`);
  const corps = brut.slice(i + 5).trim();
  if (!corps) throw new Error(`${path.basename(chemin)} : corps vide`);
  return corps;
}

function compteMots(texte) {
  return (texte.replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}

/** Extrait du tour.md ce qui va en base : titre, description catalogue, thèmes, distance. */
function lireTourMd(slug) {
  const chemin = path.join(TOURS, slug, 'tour.md');
  if (!existsSync(chemin)) throw new Error('pas de tour.md');
  const md = readFileSync(chemin, 'utf8');

  const titre = md.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!titre) throw new Error('tour.md sans titre de niveau 1');

  const bloc = md.match(/^## Description catalogue[^\n]*\n+([\s\S]*?)(?=\n## )/m);
  if (!bloc) throw new Error('tour.md sans « ## Description catalogue »');
  const description = bloc[1].trim().replace(/\s*\n\s*/g, ' ').replace(/<[^>]+>/g, '');
  if (description.length < 120) throw new Error(`description catalogue trop courte (${description.length} car.)`);

  const themesBrut = md.match(/^## Thèmes\s*\n+\[([^\]]+)\]/m)?.[1];
  const themes = themesBrut
    ? themesBrut.split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    : [];
  if (!themes.length) throw new Error('tour.md sans liste de thèmes');

  // « **Distance / durée :** ~2,5 km / ~1 h 45 » — on ne retient que les km.
  const km = md.match(/\*\*Distance \/ durée\s*:\*\*\s*~?\s*([\d.,]+)\s*km/i)?.[1];
  if (!km) throw new Error('distance introuvable dans tour.md');

  return { titre, description, themes, distanceKm: Number(km.replace(',', '.')) };
}

function lireVisite(slug) {
  const dossier = path.join(TOURS, slug);
  const fiche = JSON.parse(readFileSync(path.join(dossier, 'pois.json'), 'utf8'));
  const meta = lireTourMd(slug);

  const manquants = fiche.pois.filter((p) => p.lat == null || p.lng == null || !p.source);
  if (manquants.length) {
    const err = new Error(
      `${manquants.length}/${fiche.pois.length} POI(s) sans coordonnée résolue ou sans provenance`,
    );
    err.remede = `node scripts/resout-gps-pois.mjs --tour=${slug} --ecris`;
    throw err;
  }
  const grossiers = fiche.pois.filter((p) => p.precision === 'ville');
  if (grossiers.length) {
    throw new Error(
      `${grossiers.length} POI(s) résolu(s) au niveau ville — trop grossier pour un pin : ` +
      grossiers.map((p) => `#${p.n} ${p.titre}`).join(', '),
    );
  }

  const dossierScenes = path.join(dossier, 'scenes');
  const fichiers = readdirSync(dossierScenes).filter((f) => f.endsWith('.md'));
  if (fichiers.length !== fiche.pois.length) {
    throw new Error(`${fichiers.length} scènes pour ${fiche.pois.length} POIs`);
  }

  const scenes = fiche.pois
    .slice()
    .sort((a, b) => a.n - b.n)
    .map((poi) => {
      const chemin = path.join(dossierScenes, poi.fichier);
      if (!existsSync(chemin)) throw new Error(`scène absente pour le POI ${poi.n} (${poi.fichier})`);
      const texte = corpsDeScene(chemin);
      return {
        poi,
        titre: poi.titre,
        texte,
        mots: compteMots(texte),
        latitude: poi.lat,
        longitude: poi.lng,
      };
    });

  return { slug, ville: fiche.ville, ...meta, scenes };
}

// ── L'owner vient du vivant, jamais d'une constante ─────────
async function lireOwnerDuGuide() {
  const r = await dynamo.send(new GetCommand({
    TableName: table('GuideProfile'), Key: { id: GUIDE_ID },
  }));
  if (!r.Item) throw new Error(`GuideProfile ${GUIDE_ID} introuvable sur ${APP_ID} — mauvaise pile ?`);
  if (!r.Item.owner) throw new Error(`GuideProfile ${GUIDE_ID} sans champ owner — refus d'écrire`);
  return { owner: r.Item.owner, nom: r.Item.displayName };
}

// ── Construction ───────────────────────────────────────────
function batir(visite, owner) {
  const idSession = `${visite.slug}-session`;
  const mots = visite.scenes.reduce((s, sc) => s + sc.mots, 0);
  const dureeMinutes = Math.max(1, Math.round(mots / MOTS_PAR_MINUTE));
  const trace = visite.scenes.map((s) => ({ lat: s.latitude, lng: s.longitude }));

  const routePathJson = JSON.stringify({
    manualMode: true,
    waypoints: trace,
    pathOverride: false,
    computedPath: trace,
    distanceMeters: Math.round(visite.distanceKm * 1000),
    durationSeconds: dureeMinutes * 60,
  });

  const guideTour = {
    id: visite.slug, guideId: GUIDE_ID, owner,
    title: visite.titre, city: visite.ville,
    status: 'draft', description: visite.description, version: 1,
    duration: dureeMinutes, distance: visite.distanceKm, poiCount: visite.scenes.length,
    sessionId: idSession, availableLanguages: ['fr'],
    createdAt: maintenant, updatedAt: maintenant, __typename: 'GuideTour',
  };

  const studioSession = {
    id: idSession, guideId: GUIDE_ID, owner, tourId: visite.slug,
    title: visite.titre, status: 'draft',
    language: 'fr', availableLanguages: ['fr'],
    captureMode: 'scene_builder', consentRGPD: true, version: 1,
    description: visite.description, themes: visite.themes,
    durationMinutes: dureeMinutes, routePathJson,
    createdAt: maintenant, updatedAt: maintenant, __typename: 'StudioSession',
  };

  const studioScenes = visite.scenes.map((sc, i) => ({
    id: `${visite.slug}-scene-${i}`, sessionId: idSession, owner,
    sceneIndex: i, title: sc.titre, status: 'transcribed',
    transcriptText: sc.texte, poiDescription: sc.poi.desc,
    latitude: sc.latitude, longitude: sc.longitude,
    durationSeconds: Math.round((sc.mots / MOTS_PAR_MINUTE) * 60), archived: false,
    createdAt: maintenant, updatedAt: maintenant, __typename: 'StudioScene',
  }));

  return { guideTour, studioSession, studioScenes, dureeMinutes, mots };
}

// ── Nettoyage ciblé ────────────────────────────────────────
async function nettoyer(slug, nbScenes) {
  const ids = {
    GuideTour: [slug],
    StudioSession: [`${slug}-session`],
    StudioScene: Array.from({ length: nbScenes }, (_, i) => `${slug}-scene-${i}`),
  };
  for (const [t, liste] of Object.entries(ids)) {
    for (let i = 0; i < liste.length; i += 25) {
      await dynamo.send(new BatchWriteCommand({
        RequestItems: { [table(t)]: liste.slice(i, i + 25).map((id) => ({ DeleteRequest: { Key: { id } } })) },
      }));
    }
    console.log(`    nettoyé ${t} : ${liste.length}`);
  }
}

/** Les scènes orphelines d'un semis précédent au compte différent. */
async function scenesResiduelles(idSession, gardees) {
  const out = [];
  let k;
  do {
    const r = await dynamo.send(new ScanCommand({
      TableName: table('StudioScene'),
      FilterExpression: 'sessionId = :s',
      ExpressionAttributeValues: { ':s': idSession },
      ProjectionExpression: 'id',
      ExclusiveStartKey: k,
    }));
    out.push(...(r.Items ?? []).map((x) => x.id));
    k = r.LastEvaluatedKey;
  } while (k);
  return out.filter((id) => !gardees.includes(id));
}

// ── Exécution ──────────────────────────────────────────────
function visitesDisponibles() {
  return readdirSync(TOURS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive')
    .map((d) => d.name)
    .filter((s) => existsSync(path.join(TOURS, s, 'pois.json')) && existsSync(path.join(TOURS, s, 'tour.md')))
    .filter((s) => !SEUL || s === SEUL)
    .sort();
}

async function run() {
  const slugs = visitesDisponibles();
  if (!slugs.length) throw new Error(SEUL ? `Visite « ${SEUL} » introuvable ou pas au gabarit.` : 'Aucune visite au gabarit.');

  console.log('\n═══ Semis Riviera — DRAFT ═══');
  console.log(`  Pile   : ${APP_ID}-${ENV}  (${REGION})`);

  // Le contenu se lit et se contrôle AVANT de toucher au réseau : un auteur
  // doit pouvoir vérifier ses fiches sans identifiants AWS. L'owner n'est lu
  // que si l'on écrit vraiment.
  let owner = '(non lu — aperçu hors ligne)';
  if (!APERCU) {
    const profil = await lireOwnerDuGuide();
    owner = profil.owner;
    console.log(`  Guide  : ${profil.nom}  [${GUIDE_ID}]`);
    console.log(`  Owner  : ${owner.split('::')[0]}   (lu dans GuideProfile, pas codé en dur)`);
  } else {
    console.log('  Owner  : sera lu dans GuideProfile au moment d\'écrire');
  }

  const prets = [];
  const refuses = [];
  for (const slug of slugs) {
    try {
      const visite = lireVisite(slug);
      prets.push({ visite, ...batir(visite, owner) });
    } catch (e) {
      refuses.push([slug, e.message, e.remede]);
    }
  }

  for (const { visite, studioScenes, dureeMinutes, mots } of prets) {
    console.log(`\n  ${visite.titre}`);
    console.log(`    id=${visite.slug}  draft  ${studioScenes.length} scènes  ${mots} mots  ~${dureeMinutes} min  ${visite.distanceKm} km`);
    for (const s of studioScenes) {
      console.log(`      ${String(s.sceneIndex).padStart(2)}  ${s.title.slice(0, 42).padEnd(44)} (${s.latitude}, ${s.longitude})  ${s.durationSeconds} s`);
    }
  }

  if (refuses.length) {
    console.log(`\n  ── ${refuses.length} visite(s) refusée(s) ──`);
    for (const [slug, message] of refuses) console.log(`    ✗ ${slug.padEnd(28)} ${message}`);
    const remedes = [...new Set(refuses.map(([, , r]) => r).filter(Boolean))];
    if (remedes.length) {
      console.log('\n    Pour résoudre les coordonnées :');
      console.log(refuses.length === slugs.length
        ? '      node scripts/resout-gps-pois.mjs --ecris        (toutes les visites)'
        : remedes.map((r) => `      ${r}`).join('\n'));
    }
  }

  if (!prets.length) {
    console.log('\n  Rien de semable en l\'état.\n');
    process.exit(1);
  }

  if (APERCU) {
    console.log("\n  ⚠ APERÇU — rien n'a été écrit. Ajoute --confirm pour écrire.\n");
    return;
  }

  for (const { visite, guideTour, studioSession, studioScenes } of prets) {
    console.log(`\n  ── ${visite.slug} ──`);
    const existe = await dynamo.send(new GetCommand({ TableName: table('GuideTour'), Key: { id: visite.slug } }));
    if (existe.Item && !CLEAN) {
      throw new Error(`${visite.slug} existe déjà (status=${existe.Item.status}). Relance avec --clean pour remplacer.`);
    }
    if (CLEAN) {
      const orphelines = await scenesResiduelles(studioSession.id, studioScenes.map((s) => s.id));
      await nettoyer(visite.slug, studioScenes.length);
      if (orphelines.length) {
        for (let i = 0; i < orphelines.length; i += 25) {
          await dynamo.send(new BatchWriteCommand({
            RequestItems: {
              [table('StudioScene')]: orphelines.slice(i, i + 25).map((id) => ({ DeleteRequest: { Key: { id } } })),
            },
          }));
        }
        console.log(`    nettoyé StudioScene orphelines : ${orphelines.length}`);
      }
    }

    const ecris = (t, item) => dynamo.send(new PutCommand({ TableName: table(t), Item: item }));
    await ecris('GuideTour', guideTour);
    console.log('    GuideTour (draft) écrit');
    await ecris('StudioSession', studioSession);
    console.log('    StudioSession (draft) écrit');
    for (const s of studioScenes) await ecris('StudioScene', s);
    console.log(`    StudioScene x${studioScenes.length} écrites (transcribed)`);
  }

  console.log(`\n  Terminé. ${prets.length} visite(s) dans le Studio, prêtes pour audio et photos.`);
  console.log('  Rappel : la convention de clé audio du catalogue est scene_{index}_{langue}.wav.\n');
}

run().catch((e) => { console.error('\n  ÉCHEC :', e.message, '\n'); process.exit(1); });

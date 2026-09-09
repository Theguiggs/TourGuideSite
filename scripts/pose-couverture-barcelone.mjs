// ══════════════════════════════════════════════════════════
// Pose des couvertures — les deux visites de Barcelone
// ══════════════════════════════════════════════════════════
//
// Lit les PNG déposés dans `output/cover-proposals/selected/`, les recadre au
// format du catalogue, les téléverse et renseigne `coverPhotoKey` sur la Visite.
//
// ── POURQUOI UN SCRIPT DE PLUS ─────────────────────────────
//
// `upload-selected-tour-covers.mjs` et `sync-selected-tour-cover-keys.mjs` font
// déjà ce travail — mais tous deux visent la pile `t5nxxao3orh6za2bjj6uegulru`
// et le compartiment `amplify-tourguideapp-stef-…-nwmcsixu8au1`, qui sont ceux
// d'AVANT la migration. Les relancer tels quels écrirait dans un backend mort,
// sans la moindre erreur : les écritures réussiraient, et les couvertures
// n'apparaîtraient nulle part.
//
// Ce script vise le vivant, et il le VÉRIFIE au lieu de le supposer : il relit
// la Visite dans DynamoDB avant d'écrire, et refuse d'agir si elle est absente.
//
// ── Sécurité ───────────────────────────────────────────────
//   • DRY-RUN par défaut. Rien n'est téléversé ni écrit sans --confirm.
//   • Refuse une source sous 1200 × 700.
//   • Refuse d'écraser une couverture déjà posée sans --clean.
//   • Relit l'objet S3 après écriture (type MIME et taille) avant de toucher
//     à la base : une clé pointant vers un objet absent est pire que pas de clé.
//
// ── Lancement ──────────────────────────────────────────────
//   node scripts/pose-couverture-barcelone.mjs            # aperçu
//   node scripts/pose-couverture-barcelone.mjs --confirm  # pose
//   node scripts/pose-couverture-barcelone.mjs --confirm --clean
// ══════════════════════════════════════════════════════════

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const getOpt = (name, def) => {
  const p = args.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split('=').slice(1).join('=') : def;
};

const REGION  = getOpt('region', 'us-east-1');
const APP_ID  = getOpt('app-id', 'yvupc5stqzaxrgz6wv2wz7he5y');
const ENV     = getOpt('env', 'NONE');
/** Le compartiment de l'app VIVANTE (dieqe5vfmuc69), pas celui d'avant migration. */
const BUCKET  = getOpt('bucket', 'amplify-dieqe5vfmuc69-mai-tourguideassetsbucket8b8-qyql7idkrnkr');
const CONFIRM = hasFlag('--confirm');
const CLEAN   = hasFlag('--clean');
const DRY_RUN = !CONFIRM;

const TABLE = `GuideTour-${APP_ID}-${ENV}`;
const LARGEUR = 1536;
const HAUTEUR = 1024;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const SOURCES = path.resolve(scriptDir, '..', 'output', 'cover-proposals', 'selected');

const VISITES = [
  { id: 'barcelone-rambla-a-la-mer',    titre: 'Barcelone — De la Rambla à la Mer' },
  { id: 'barcelone-ilot-de-la-discorde', titre: "Barcelone — L'Îlot de la Discorde" },
];

/** La convention du catalogue, relevée sur les 100 visites déjà posées. */
const cleDe = (tourId) => `guide-photos/${tourId}/cover.jpg`;

async function preparer(visite) {
  const source = path.join(SOURCES, `${visite.id}-cover.png`);
  if (!existsSync(source)) {
    throw new Error(`Source absente : ${source}\n     Génère l'image et dépose-la sous ce nom exact.`);
  }

  const brut = await readFile(source);
  const meta = await sharp(brut).metadata();
  if (!meta.width || !meta.height || meta.width < 1200 || meta.height < 700) {
    throw new Error(`${visite.id} : source ${meta.width}×${meta.height}, minimum 1200×700`);
  }

  // `position: 'attention'` recadre sur la zone la plus saillante plutôt qu'au
  // centre — c'est ce que faisait déjà `upload-selected-tour-covers.mjs`, et ça
  // évite de couper un sujet décentré.
  const corps = await sharp(brut)
    .resize(LARGEUR, HAUTEUR, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();

  return { ...visite, source, largeurSource: meta.width, hauteurSource: meta.height, corps };
}

/** La Visite doit exister sur le vivant : on ne pose pas une clé sur un fantôme. */
async function lireVisite(id) {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  if (!r.Item) throw new Error(`${id} introuvable dans ${TABLE} — mauvaise pile ?`);
  return r.Item;
}

async function run() {
  console.log('\n═══ Pose des couvertures — Barcelone ═══');
  console.log(`  Pile         : ${APP_ID}-${ENV}  (${REGION})`);
  console.log(`  Compartiment : ${BUCKET}`);
  console.log(`  Sources      : ${SOURCES}`);

  const prets = [];
  for (const v of VISITES) {
    const existante = await lireVisite(v.id);
    const dejaPosee = existante.coverPhotoKey;
    if (dejaPosee && !CLEAN) {
      throw new Error(`${v.id} porte deja une couverture (${dejaPosee}). Relance avec --clean.`);
    }
    prets.push({ ...(await preparer(v)), dejaPosee, statut: existante.status });
  }

  for (const p of prets) {
    console.log(`\n  ${p.titre}`);
    console.log(`    source  : ${path.basename(p.source)}  ${p.largeurSource}×${p.hauteurSource}`);
    console.log(`    sortie  : ${LARGEUR}×${HAUTEUR} JPEG  ${(p.corps.length / 1024).toFixed(0)} Ko`);
    console.log(`    cle     : ${cleDe(p.id)}`);
    console.log(`    visite  : status=${p.statut}${p.dejaPosee ? `  (remplace ${p.dejaPosee})` : ''}`);
  }

  if (DRY_RUN) {
    console.log("\n  ⚠ APERCU — rien n'a ete televerse ni ecrit. Ajoute --confirm.\n");
    return;
  }

  for (const p of prets) {
    const Key = cleDe(p.id);
    console.log(`\n  ── ${p.id} ──`);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key, Body: p.corps, ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    console.log('    objet S3 televerse');

    // RELECTURE AVANT LA BASE. Une clé qui pointe vers un objet absent ou d'un
    // autre type produit une carte cassée dans le catalogue, sans erreur nulle
    // part. On préfère échouer ici, avant d'avoir touché la Visite.
    const tete = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
    if (tete.ContentType !== 'image/jpeg' || Number(tete.ContentLength ?? 0) !== p.corps.length) {
      throw new Error(`${Key} relu incoherent (${tete.ContentType}, ${tete.ContentLength} o) — base non touchee`);
    }
    console.log(`    relu : ${tete.ContentType}, ${tete.ContentLength} o`);

    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key: { id: p.id },
      UpdateExpression: 'SET coverPhotoKey = :k, updatedAt = :t',
      ExpressionAttributeValues: { ':k': Key, ':t': new Date().toISOString() },
    }));
    console.log('    coverPhotoKey ecrit');
  }

  console.log('\n  Termine. Les deux visites ont leur couverture.\n');
}

run().catch((e) => { console.error('\n  ECHEC :', e.message, '\n'); process.exit(1); });

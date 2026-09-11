/**
 * regenere-grasse-fr.mjs — refait l'audio FRANÇAIS de « Grasse — Les Routes du Parfum ».
 *
 * ─── POURQUOI CE SCRIPT EXISTE ───
 *
 * Grasse est la seule Visite publiée du catalogue SANS audio français. Établi le
 * 2026-09-02 : le stockage porte 755 fichiers `scene_N_fr.wav` — l'audio français
 * de tout le catalogue — et Grasse n'en a AUCUN. Ce que sa base désignait était
 * une traduction de l'époque MarianMT ; son dossier `audio/fr/`, qui n'existe que
 * pour elle, contient de l'allemand.
 *
 * La cause est que `localize-seed-100-public.mjs` ne traite que les identifiants
 * commençant par `seed-100-` (`EXPECTED_SCENES = 755`). Grasse est antérieure
 * (19 mai) et porte un UUID : elle n'a jamais été incluse.
 *
 * ─── POURQUOI PAS LE STUDIO ───
 *
 * Le Studio écrit ses clés en `{idScène}_{horodatage}.wav` — SANS la langue.
 * C'est ce format qui a permis à un fichier allemand de se faire passer pour du
 * français, et AD-3 l'interdit : « toute clé d'objet porte le triplet (Visite,
 * Langue, Version) ». Ce script écrit `scene_{index}_fr.wav`, la convention des
 * 100 autres Visites.
 *
 * ─── CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS ───
 *
 * Il lit le texte français des 7 Scènes, appelle la synthèse, dépose l'objet, et
 * met à jour `studioAudioKey`. Il ne touche à AUCUNE autre Visite : le garde sur
 * `SESSION_ID` est en dur et vérifié.
 *
 * Il n'écrit RIEN au grand livre de la dépense — un script qui appelle le
 * fournisseur hors du portail est exactement le contournement qu'AD-16 §1 nomme.
 * Il imprime donc le total de caractères en fin de course, à porter à l'enveloppe
 * interne par `debitInternalSpend`. C'est une dette assumée, pas un oubli.
 *
 * ─── USAGE (PowerShell) ───
 *
 *   (rien a exporter : l'URL et la cle sont lues dans SSM)
 *   node scripts/regenere-grasse-fr.mjs              # simulation, n'ecrit rien
 *   node scripts/regenere-grasse-fr.mjs --confirm    # execute
 */

import { requireBackend } from './_backend.mjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const REGION = 'us-east-1';
const SUFFIXE = (() => { const b = requireBackend(); return `${b.appId}-${b.env}`; })();
const BUCKET = 'amplify-dieqe5vfmuc69-mai-tourguideassetsbucket8b8-qyql7idkrnkr';
const IDENTITY_ID = 'us-east-1:0ebd3fdc-511f-c6b4-c885-c1694d6baac3';
const SESSION_ID = 'dfb6a1f3-d583-4d6f-b651-5c21fb1b5103';
const TOUR_ID = '78e3f3cc-7c1d-4a88-a274-8690e9411fc2';
const LANGUE = 'fr';
const SCENES_ATTENDUES = 7;

const CONFIRME = process.argv.includes('--confirm');

/**
 * ÉCOUTE COMPARATIVE (le SPEC la veut « sur une visite réelle, pas avant »).
 *
 * `--voix <nom>` force une voix par requête — l'API du microservice accepte
 * `voice_id`. `--essai` dépose sous `essai/` et NE TOUCHE PAS la base : on
 * compare avant de décider, on ne décide pas avant de comparer.
 *
 * Palier standard (actuel) : fr-FR-HenriNeural
 * Palier haute definition  : fr-FR-VivienneMultilingualNeural
 */
const iVoix = process.argv.indexOf('--voix');
const VOIX = iVoix >= 0 ? process.argv[iVoix + 1] : null;
const ESSAI = process.argv.includes('--essai');
const iScene = process.argv.indexOf('--scene');
const SCENE_UNIQUE = iScene >= 0 ? Number(process.argv[iScene + 1]) : null;

/**
 * L'URL et la CLÉ viennent de SSM — la MÊME source que les Lambdas.
 *
 * Volontairement PAS de variable d'environnement à recopier à la main : la clé
 * `tourguide-tts-2026` qui traîne dans le README, trois scripts et un carnet
 * Colab n'est PAS celle de production, et s'en servir rend `401 Invalid API key`.
 * Un secret qu'on recopie est un secret qu'on se trompe, et qu'on divulgue.
 */
const CHEMIN_SSM = '/amplify/dieqe5vfmuc69/main-branch-347ea276f6';

/**
 * Lit par l'outil AWS deja configure, plutot que par le SDK : `@aws-sdk/client-ssm`
 * n'est pas une dependance du portail, et en ajouter une pour un script d'un soir
 * ferait porter au produit le poids d'un depannage.
 */
async function lireSecret(nom) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const { stdout } = await run('aws', [
    'ssm', 'get-parameter',
    '--region', REGION,
    '--name', `${CHEMIN_SSM}/${nom}`,
    '--with-decryption',
    '--query', 'Parameter.Value',
    '--output', 'text',
  ], { shell: process.platform === 'win32', maxBuffer: 1 << 20 });
  const v = stdout.trim();
  if (!v || v === 'None') throw new Error(`${nom} absent de SSM`);
  return v;
}

let URL_SERVICE = '';
let CLE = '';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });

const cleAudio = (i) =>
  ESSAI
    ? `guide-studio/${IDENTITY_ID}/${SESSION_ID}/audio/essai/scene_${i}_${LANGUE}_${(VOIX || 'defaut').replace(/[^A-Za-z0-9-]/g, '')}.wav`
    : `guide-studio/${IDENTITY_ID}/${SESSION_ID}/audio/scene_${i}_${LANGUE}.wav`;

async function lireScenes() {
  const out = [];
  let token;
  do {
    const r = await dynamo.send(
      new ScanCommand({
        TableName: `StudioScene-${SUFFIXE}`,
        FilterExpression: 'sessionId = :s',
        ExpressionAttributeValues: { ':s': SESSION_ID },
        ExclusiveStartKey: token,
      }),
    );
    out.push(...(r.Items ?? []));
    token = r.LastEvaluatedKey;
  } while (token);
  return out.sort((a, b) => Number(a.sceneIndex) - Number(b.sceneIndex));
}

/** Dépose le travail, puis relève jusqu'à obtenir l'audio. */
async function synthetiser(texte) {
  const depot = await fetch(`${URL_SERVICE}/v1/tts/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': CLE },
    body: JSON.stringify({ text: texte, language: LANGUE, ...(VOIX ? { voice_id: VOIX } : {}) }),
  });
  if (!depot.ok) throw new Error(`depot ${depot.status} : ${(await depot.text()).slice(0, 200)}`);
  const corps = await depot.json();

  // Réponse directe (audio en base64) ou travail asynchrone à relever.
  if (corps.audio_base64) return Buffer.from(corps.audio_base64, 'base64');
  const jobId = corps.job_id ?? corps.jobId;
  if (!jobId) throw new Error(`reponse inattendue : ${JSON.stringify(corps).slice(0, 200)}`);

  const echeance = Date.now() + 300_000;
  while (Date.now() < echeance) {
    await new Promise((r) => setTimeout(r, 3000));
    const releve = await fetch(`${URL_SERVICE}/v1/jobs/${jobId}`, { headers: { 'x-api-key': CLE } });
    if (!releve.ok) continue;
    const etat = await releve.json();
    if (etat.status === 'completed' || etat.status === 'done') {
      const b64 = etat.audio_base64 ?? etat.result?.audio_base64;
      if (!b64) throw new Error('travail termine sans audio');
      return Buffer.from(b64, 'base64');
    }
    if (etat.status === 'failed' || etat.status === 'error') {
      throw new Error(`synthese echouee : ${etat.error ?? '(sans motif)'}`);
    }
  }
  throw new Error('delai depasse');
}

async function main() {
  URL_SERVICE = (await lireSecret('MICROSERVICE_URL')).replace(/\/+$/, '');
  CLE = await lireSecret('MICROSERVICE_API_KEY');
  console.log(`Service : ${URL_SERVICE}  (cle lue dans SSM, ${CLE.length} caracteres)`);

  const scenes = await lireScenes();
  if (scenes.length !== SCENES_ATTENDUES) {
    console.error(`GARDE : ${scenes.length} Scenes trouvees, ${SCENES_ATTENDUES} attendues. Arret.`);
    process.exit(1);
  }

  let total = 0;
  for (const s of scenes) total += (s.transcriptText || '').length;
  console.log(`Visite  : ${TOUR_ID}`);
  console.log(`Scenes  : ${scenes.length}`);
  console.log(`Texte   : ${total} caracteres  (~${((total * 16) / 1e6).toFixed(2)} $ chez Azure)`);
  console.log('');

  if (!CONFIRME) {
    for (const s of scenes) {
      console.log(`  #${s.sceneIndex}  ${String(s.title).slice(0, 40).padEnd(42)} ${String(s.transcriptText || '').length} car -> ${cleAudio(s.sceneIndex)}`);
    }
    console.log('\nSIMULATION. Relancer avec --confirm pour executer.');
    return;
  }

  const aTraiter = SCENE_UNIQUE === null ? scenes : scenes.filter((x) => Number(x.sceneIndex) === SCENE_UNIQUE);
  for (const s of aTraiter) {
    const texte = s.transcriptText || '';
    if (!texte.trim()) {
      console.log(`  #${s.sceneIndex}  SANS TEXTE, ignoree`);
      continue;
    }
    const cle = cleAudio(s.sceneIndex);
    process.stdout.write(`  #${s.sceneIndex}  ${texte.length} car ... `);
    const audio = await synthetiser(texte);
    await s3.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: cle, Body: audio, ContentType: 'audio/wav' }),
    );
    if (ESSAI) {
      console.log(`${(audio.length / 1e6).toFixed(1)} Mo -> ${cle.split('/audio/')[1]}  (ESSAI : base NON modifiee)`);
      continue;
    }
    await dynamo.send(
      new UpdateCommand({
        TableName: `StudioScene-${SUFFIXE}`,
        Key: { id: s.id },
        UpdateExpression: 'SET studioAudioKey = :k, baseAudioSource = :src, updatedAt = :t',
        ExpressionAttributeValues: {
          ':k': cle,
          ':src': 'tts',
          ':t': new Date().toISOString(),
        },
      }),
    );
    console.log(`${(audio.length / 1e6).toFixed(1)} Mo -> ${cle.split('/audio/')[1]}`);
  }

  console.log('');
  console.log(`TERMINE. ${total} caracteres synthetises.`);
  console.log('A PORTER AU GRAND LIVRE : debitInternalSpend avec characters =', total);
}

main().catch((e) => {
  console.error('ECHEC :', e.message);
  process.exit(1);
});

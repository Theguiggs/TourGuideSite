/**
 * fabrique-audio-barcelone.mjs — synthétise la narration FRANÇAISE des deux
 * visites de Barcelone, pour qu'elles soient publiables.
 *
 * ─── POURQUOI ───
 *
 * Les deux visites ont été semées en draft le 2026-09-03 avec leur texte, leur
 * GPS et leurs sous-titres, mais SANS audio — délibérément, l'audio devant
 * venir du Studio. L'exploitant les veut au catalogue : publier une visite
 * muette n'a pas de sens, on fabrique donc d'abord la voix.
 *
 * ─── LE MÊME CHEMIN QUE GRASSE ───
 *
 * Microservice de synthèse (Azure sous contrat), URL et clé lues dans SSM — la
 * même source que les Lambdas, jamais une clé recopiée. Convention de clé S3
 * identique aux 101 visites publiées : `.../audio/scene_{i}_fr.wav`, avec la
 * LANGUE dans le nom (voir la mémoire projet : le Studio l'omettait, et un
 * fichier allemand s'est fait passer pour du français à Grasse).
 *
 * `baseAudioSource: 'tts'` est posé : la fiche doit pouvoir DIRE « voix de
 * synthèse » plutôt que laisser croire à la voix d'un guide.
 *
 * ─── CE QU'IL NE FAIT PAS ───
 *
 * Il ne publie pas — c'est un geste séparé, après écoute. Il ne débite pas le
 * grand livre lui-même (AD-16 §1) : il imprime le compte de caractères à porter
 * à l'enveloppe interne.
 *
 * ─── USAGE (PowerShell) ───
 *
 *   npx tsx scripts/fabrique-audio-barcelone.mjs             # simulation
 *   npx tsx scripts/fabrique-audio-barcelone.mjs --confirm   # execute
 */

import path from 'node:path';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, ScanCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';

const REGION = 'us-east-1';
const SUF = 'yvupc5stqzaxrgz6wv2wz7he5y-NONE';
const BUCKET = 'amplify-dieqe5vfmuc69-mai-tourguideassetsbucket8b8-qyql7idkrnkr';
const IDENTITY_ID = 'us-east-1:0ebd3fdc-511f-c6b4-c885-c1694d6baac3';
const CHEMIN_SSM = '/amplify/dieqe5vfmuc69/main-branch-347ea276f6';
const LANGUE = 'fr';
const SESSIONS = ['barcelone-rambla-a-la-mer-session', 'barcelone-ilot-de-la-discorde-session'];
const SCENES_ATTENDUES = 19;

const CONFIRME = process.argv.includes('--confirm');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({region: REGION}));
const s3 = new S3Client({region: REGION});

let URL_SERVICE = '';
let CLE = '';

async function lireSecret(nom) {
  const {execFile} = await import('node:child_process');
  const {promisify} = await import('node:util');
  const run = promisify(execFile);
  const {stdout} = await run(
    'aws',
    ['ssm', 'get-parameter', '--region', REGION, '--name', `${CHEMIN_SSM}/${nom}`, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text'],
    {shell: process.platform === 'win32', maxBuffer: 1 << 20},
  );
  const v = stdout.trim();
  if (!v || v === 'None') throw new Error(`${nom} absent de SSM`);
  return v;
}

async function scanAll(table, extra = {}) {
  const out = [];
  let k;
  do {
    const r = await dynamo.send(new ScanCommand({TableName: `${table}-${SUF}`, ExclusiveStartKey: k, ...extra}));
    out.push(...(r.Items ?? []));
    k = r.LastEvaluatedKey;
  } while (k);
  return out;
}

const cleAudio = (sessionId, i) =>
  `guide-studio/${IDENTITY_ID}/${sessionId}/audio/scene_${i}_${LANGUE}.wav`;

/** Dépose le travail, puis relève jusqu'à obtenir l'audio. */
async function synthetiser(texte) {
  const depot = await fetch(`${URL_SERVICE}/v1/tts/generate`, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-api-key': CLE},
    body: JSON.stringify({text: texte, language: LANGUE}),
  });
  if (!depot.ok) throw new Error(`depot ${depot.status} : ${(await depot.text()).slice(0, 200)}`);
  const corps = await depot.json();
  if (corps.audio_base64) return Buffer.from(corps.audio_base64, 'base64');
  const jobId = corps.job_id ?? corps.jobId;
  if (!jobId) throw new Error(`reponse inattendue : ${JSON.stringify(corps).slice(0, 200)}`);

  const echeance = Date.now() + 300_000;
  for (;;) {
    if (Date.now() > echeance) throw new Error('delai depasse');
    await new Promise(r => setTimeout(r, 3000));
    const releve = await fetch(`${URL_SERVICE}/v1/jobs/${jobId}`, {headers: {'x-api-key': CLE}});
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
}

async function main() {
  const toutes = await scanAll('StudioScene');
  const scenes = toutes
    .filter(s => SESSIONS.includes(s.sessionId) && !s.archived)
    .sort((a, b) =>
      a.sessionId === b.sessionId
        ? Number(a.sceneIndex) - Number(b.sceneIndex)
        : a.sessionId.localeCompare(b.sessionId),
    );

  // GARDE : le compte exact, sinon on ne touche à rien. Une Scène manquante
  // signifierait un semis incomplet, et publier une visite trouée est pire que
  // ne rien publier.
  if (scenes.length !== SCENES_ATTENDUES) {
    console.error(`GARDE : ${scenes.length} Scenes trouvees, ${SCENES_ATTENDUES} attendues. Arret.`);
    process.exit(1);
  }

  const total = scenes.reduce((a, s) => a + (s.transcriptText || '').length, 0);
  console.log(`Scenes : ${scenes.length}`);
  console.log(`Texte  : ${total} caracteres  (~${((total * 16) / 1e6).toFixed(2)} USD chez Azure)`);
  console.log('');

  if (!CONFIRME) {
    for (const s of scenes) {
      console.log(
        `  ${s.sessionId.replace('barcelone-', '').replace('-session', '').padEnd(20)} #${String(s.sceneIndex).padStart(2)}  ` +
          `${String(s.title).slice(0, 34).padEnd(36)} ${String(s.transcriptText || '').length} car` +
          `${s.studioAudioKey ? '  (audio DEJA present, saute)' : ''}`,
      );
    }
    console.log('\nSIMULATION. Relancer avec --confirm pour executer.');
    return;
  }

  URL_SERVICE = (await lireSecret('MICROSERVICE_URL')).replace(/\/+$/, '');
  CLE = await lireSecret('MICROSERVICE_API_KEY');
  console.log(`Service : ${URL_SERVICE}  (cle lue dans SSM, ${CLE.length} caracteres)\n`);

  let faits = 0;
  let caracteres = 0;
  for (const s of scenes) {
    const texte = (s.transcriptText || '').trim();
    if (!texte) {
      console.log(`  #${s.sceneIndex}  SANS TEXTE, ignoree`);
      continue;
    }
    if (s.studioAudioKey) {
      console.log(`  #${s.sceneIndex}  audio deja present, saute`);
      continue;
    }
    const cle = cleAudio(s.sessionId, s.sceneIndex);
    process.stdout.write(`  ${s.sessionId.slice(10, 26).padEnd(17)} #${String(s.sceneIndex).padStart(2)}  ${texte.length} car ... `);
    const audio = await synthetiser(texte);
    await s3.send(new PutObjectCommand({Bucket: BUCKET, Key: cle, Body: audio, ContentType: 'audio/wav'}));
    await dynamo.send(
      new UpdateCommand({
        TableName: `StudioScene-${SUF}`,
        Key: {id: s.id},
        UpdateExpression: 'SET studioAudioKey = :k, baseAudioSource = :src, updatedAt = :t',
        ExpressionAttributeValues: {':k': cle, ':src': 'tts', ':t': new Date().toISOString()},
      }),
    );
    faits += 1;
    caracteres += texte.length;
    console.log(`${(audio.length / 1e6).toFixed(1)} Mo`);
  }

  console.log('');
  console.log(`TERMINE. ${faits} Scenes synthetisees, ${caracteres} caracteres.`);
  console.log('A PORTER AU GRAND LIVRE : debitInternalSpend avec characters =', caracteres);
}

main().catch(e => {
  console.error('ECHEC :', e?.stack ?? String(e));
  process.exit(1);
});

/**
 * retrad-lib.mjs — socle commun des scripts de retraduction (retrad-1/2/3).
 *
 * Contexte : les 101 visites publiées ont été traduites par MarianMT (module
 * gratuit, italien obtenu par pivot anglais). On refait la traduction avec un
 * modèle de langue, on supprime l'audio TTS de l'ancienne, et on garde intacts
 * le texte ET l'audio français.
 *
 * ⚠️ Le backend n'est JAMAIS deviné : il est résolu depuis amplify_outputs.json
 * puis apparié à l'API AppSync réelle. Trois jeux de tables coexistent sur le
 * compte et deux sont morts — un scan sur le mauvais stack rend des chiffres
 * plausibles sans rien signaler.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

export const REGION = 'us-east-1';
export const LANGS = ['en', 'es', 'de', 'it', 'nl'];
export const BASE_LANG = 'fr';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = path.resolve(HERE, '..');
export const OUTPUTS_PATH = path.resolve(WEB_ROOT, '..', 'TourGuideApp', 'amplify_outputs.json');
export const TRANS_DIR = path.join(WEB_ROOT, 'content', 'translations');
export const SOURCE_DIR = path.join(TRANS_DIR, 'source');
export const OUT_DIR = path.join(TRANS_DIR, 'out');
export const BACKUP_DIR = path.join(TRANS_DIR, '_backup');

/** Préfixe S3 où l'audio MarianMT est archivé avant suppression. */
export const ARCHIVE_PREFIX = 'archive-tts-marianmt/';

let _cache = null;

/**
 * Résout {apiId, bucket} depuis amplify_outputs.json + l'API AppSync réelle.
 * Le suffixe des tables Gen2 est l'apiId AppSync, PAS l'hôte de l'URL.
 */
export function resolveBackend() {
  if (_cache) return _cache;
  const outputs = JSON.parse(fs.readFileSync(OUTPUTS_PATH, 'utf8'));
  const url = outputs?.data?.url;
  const bucket = outputs?.storage?.bucket_name;
  if (!url) throw new Error(`data.url absent de ${OUTPUTS_PATH}`);
  if (!bucket) throw new Error(`storage.bucket_name absent de ${OUTPUTS_PATH}`);
  const host = new URL(url).host;

  const override = process.env.RETRAD_API_ID;
  if (override) {
    _cache = { apiId: override, bucket, host, resolvedBy: 'RETRAD_API_ID' };
    return _cache;
  }

  const raw = execSync(
    'aws appsync list-graphql-apis --query "graphqlApis[].{apiId:apiId,uri:uris.GRAPHQL}" --output json',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const apis = JSON.parse(raw);
  const match = apis.find((a) => a.uri && new URL(a.uri).host === host);
  if (!match) {
    throw new Error(
      `Aucune API AppSync ne correspond à l'hôte ${host}. APIs vues : ${apis.map((a) => a.apiId).join(', ')}`,
    );
  }
  _cache = { apiId: match.apiId, bucket, host, resolvedBy: 'appsync' };
  return _cache;
}

export function table(model) {
  return `${model}-${resolveBackend().apiId}-NONE`;
}

export const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

export async function scanAll(model) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const r = await doc.send(new ScanCommand({ TableName: table(model), ExclusiveStartKey }));
    items.push(...(r.Items || []));
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/**
 * Hash de fraîcheur du texte source, réexporté depuis `source-hash.cjs`.
 *
 * Il y avait ici une copie annoncée « EXACTE » de `hashSourceText`
 * (src/types/studio.ts) qui ne l'était pas : elle joignait le texte et le titre
 * par une ESPACE, là où l'application les concatène sans séparateur. Les 3 810
 * segments semés le 2026-08-23 ont donc reçu une empreinte qu'aucune lecture
 * applicative ne retrouve, et le Studio a affiché les 101 Visites comme
 * périmées dans les cinq langues — précisément l'accident que le commentaire
 * d'origine disait vouloir éviter.
 *
 * Une seule implémentation désormais, épinglée à celle de l'application par une
 * épreuve Jest. Ne pas la recopier ici.
 */
export { hashSourceText } from './source-hash.cjs';

/** AppSync renvoie les champs a.json() comme CHAÎNE ; DynamoDB direct comme Map. */
export function asMap(value) {
  if (value == null) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return typeof value === 'object' ? value : {};
}

export function ensureDirs() {
  for (const d of [TRANS_DIR, SOURCE_DIR, OUT_DIR, BACKUP_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

export function banner(scriptName) {
  const b = resolveBackend();
  console.log(`\n${scriptName}`);
  console.log(`  backend  : ${b.apiId}  (résolu par ${b.resolvedBy}, hôte ${b.host})`);
  console.log(`  bucket   : ${b.bucket}`);
  console.log(`  langues  : ${LANGS.join(', ')}  (base ${BASE_LANG}, jamais touchée)\n`);
}

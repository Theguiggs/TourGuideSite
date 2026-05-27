/**
 * One-shot data fix: the Grasse tour's base-language (FR) audio was generated
 * via TTS in the studio, but legacy scenes predate the StudioScene.baseAudioSource
 * marker — so the filename heuristic wrongly classified them as "recording"
 * (voix du guide). The guide confirmed FR is TTS. This stamps the reliable
 * marker on the session's non-archived scenes, after which the backfill recomputes
 * languageAudioTypes.fr = 'tts'.
 *
 *   node scripts/mark-grasse-base-tts.mjs
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const API = 't5nxxao3orh6za2bjj6uegulru';
const REGION = 'us-east-1';
const T = m => `${m}-${API}-NONE`;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const TOUR_ID = '78e3f3cc-7c1d-4a88-a274-8690e9411fc2';
const SOURCE = 'tts'; // confirmed by the guide for Grasse

async function scanAll(table, filter) {
  let items = [], ExclusiveStartKey;
  do {
    const r = await ddb.send(new ScanCommand({ TableName: table, ExclusiveStartKey }));
    items = items.concat(r.Items ?? []);
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return filter ? items.filter(filter) : items;
}

const tour = (await ddb.send(new GetCommand({ TableName: T('GuideTour'), Key: { id: TOUR_ID } }))).Item;
const sessionId = tour?.sessionId;
if (!sessionId) { console.error('No sessionId on tour'); process.exit(1); }

const scenes = await scanAll(T('StudioScene'), s => s.sessionId === sessionId && !s.archived);
console.log(`Marking ${scenes.length} scenes baseAudioSource='${SOURCE}' (session ${sessionId})`);
for (const sc of scenes) {
  await ddb.send(new UpdateCommand({
    TableName: T('StudioScene'),
    Key: { id: sc.id },
    UpdateExpression: 'SET baseAudioSource = :s',
    ExpressionAttributeValues: { ':s': SOURCE },
  }));
  console.log(`  #${sc.sceneIndex} ${sc.id} -> ${SOURCE}`);
}
console.log('Done.');

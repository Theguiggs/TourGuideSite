// Creates one Studio draft atomically. Default: preview; --confirm: insert; --verify: read back.
import { requireBackend } from './_backend.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { isDeepStrictEqual } from 'node:util';

const folder = new URL('../content/tours/mennetou-sur-cher-vie-derriere-les-remparts/', import.meta.url);
const content = JSON.parse(readFileSync(new URL('tour.json', folder), 'utf8'));
const suffix = (() => { const b = requireBackend(); return `${b.appId}-${b.env}`; })();
const table = name => `${name}-${suffix}`;
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const guideId = '159473d2-8509-4d01-aa14-180d87772225';
const get = async (name,id) => (await db.send(new GetCommand({TableName:table(name),Key:{id},ConsistentRead:true}))).Item;
const guide = await get('GuideProfile',guideId);
if (!guide?.owner) throw new Error('Guide profile missing owner');
const now = new Date().toISOString();
const common = {owner:guide.owner,createdAt:now,updatedAt:now};
const sessionId = `${content.id}-session`;
const records = [
  ['GuideTour', {
    ...common,id:content.id,guideId,title:content.title,city:content.city,status:'draft',
    description:content.description,version:1,duration:content.durationMinutes,
    distance:content.route.distanceMeters/1000,poiCount:8,sessionId,availableLanguages:['fr'],
    developedByAI:true,__typename:'GuideTour',
  }],
  ['StudioSession', {
    ...common,id:sessionId,guideId,tourId:content.id,title:content.title,status:'draft',
    language:'fr',availableLanguages:['fr'],captureMode:'scene_builder',version:1,
    description:content.description,themes:content.themes,durationMinutes:content.durationMinutes,
    routePathJson:JSON.stringify(content.route),__typename:'StudioSession',
  }],
  ...content.scenes.map(scene => ['StudioScene',{
    ...common,...scene,id:`${content.id}-scene-${scene.sceneIndex}`,sessionId,
    status:'transcribed',archived:false,__typename:'StudioScene',
  }]),
];
if (content.scenes.length !== 8 || new Set(records.map(([,r])=>r.id)).size !== 10) throw new Error('Invalid record count');
for (const scene of content.scenes) {
  if (!scene.transcriptText || !scene.poiDescription || !Number.isFinite(scene.latitude) || !Number.isFinite(scene.longitude)) throw new Error('Invalid scene');
}
const summary = {tourId:content.id,title:content.title,guide:guide.displayName,status:'draft',records:records.length,pois:8,durationMinutes:content.durationMinutes,distanceMeters:content.route.distanceMeters,tableSuffix:suffix};
console.log(JSON.stringify(summary,null,2));
if (process.argv.includes('--confirm')) {
  await db.send(new TransactWriteCommand({
    TransactItems:records.map(([name,Item])=>({Put:{TableName:table(name),Item,ConditionExpression:'attribute_not_exists(id)'}})),
  }));
}
if (process.argv.includes('--confirm') || process.argv.includes('--verify')) {
  for (const [name,expected] of records) {
    const actual = await get(name,expected.id);
    if (!actual) throw new Error(`Missing ${name}/${expected.id}`);
    for (const [key,value] of Object.entries(expected)) {
      if (['createdAt','updatedAt'].includes(key)) continue;
      if (!isDeepStrictEqual(actual[key],value)) throw new Error(`Mismatch ${name}/${expected.id}/${key}`);
    }
  }
  const receipt = {...summary,verifiedAt:new Date().toISOString(),verification:'All 10 records read back consistently and compared field by field.'};
  writeFileSync(new URL('import-receipt.json',folder),JSON.stringify(receipt,null,2)+'\n');
  console.log('VERIFIED: 1 GuideTour + 1 StudioSession + 8 StudioScene.');
} else {
  for (const [name,item] of records) if (await get(name,item.id)) throw new Error(`Already exists: ${name}/${item.id}`);
  console.log('Preview OK: all target IDs absent. Use --confirm to insert atomically.');
}

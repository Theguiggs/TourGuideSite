/**
 * publie-barcelone.mjs — fait passer les deux visites de Barcelone en
 * `published`, avec les champs qu'une visite publiée doit porter.
 *
 * ─── CE QU'IL POSE, ET POURQUOI CHAQUE CHAMP ───
 *
 *  · `status: 'published'` — le geste demandé.
 *  · `purchaseType: 'subscription_only'` — ALIGNÉ sur les 61 autres visites
 *    payantes du catalogue. Sans ce champ, `requiresEntitlement` rend `false`
 *    et la visite serait servie GRATUITEMENT et INTÉGRALEMENT à quiconque, y
 *    compris anonyme : publier en laissant le champ vide donnerait Barcelone
 *    alors que Albi ou Rouen se paient. Le choix conservateur est d'aligner.
 *  · `languageAudioTypes: {fr: 'tts'}` — FACTUEL : la narration vient d'être
 *    synthétisée (`fabrique-audio-barcelone.mjs`). Sans lui, la fiche ne peut
 *    pas afficher « voix de synthèse » et laisse croire à la voix d'un guide.
 *  · `developedByAI: true` — factuel aussi, comme les 101 autres seeds.
 *
 * ─── CE QU'IL NE POSE PAS ───
 *
 *  · pas de `coverPhotoKey` : aucune photo n'existe. Le catalogue retombera sur
 *    la vignette de ville (Barcelone est dans les cartes en dur depuis le
 *    2026-09-02) ;
 *  · pas de `translatedTitles`/`translatedDescriptions` de VISITE, et aucune
 *    ligne `SceneSegment` n'existe pour ces 19 Scènes : Barcelone sera donc
 *    servie en FRANÇAIS, titres et sous-titres d'étapes compris, là où les 101
 *    autres sont désormais traduites. C'est un chantier séparé, pas un oubli.
 *
 * ─── USAGE (PowerShell) ───
 *
 *   npx tsx scripts/publie-barcelone.mjs             # simulation
 *   npx tsx scripts/publie-barcelone.mjs --confirm   # execute
 *   npx tsx scripts/publie-barcelone.mjs --depublier --confirm   # retour arriere
 */

import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const SUF = 'yvupc5stqzaxrgz6wv2wz7he5y-NONE';
const TOURS = ['barcelone-rambla-a-la-mer', 'barcelone-ilot-de-la-discorde'];

const CONFIRME = process.argv.includes('--confirm');
const DEPUBLIER = process.argv.includes('--depublier');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({region: REGION}));

async function main() {
  for (const tourId of TOURS) {
    const t = (await dynamo.send(new GetCommand({TableName: `GuideTour-${SUF}`, Key: {id: tourId}}))).Item;
    if (!t) {
      console.error(`GARDE : ${tourId} introuvable. Arret.`);
      process.exit(1);
    }

    // GARDE : on ne publie pas une visite muette. Chaque Scène doit porter son
    // audio — publier un itinéraire troué est pire que ne rien publier.
    const scenes = [];
    let k;
    do {
      const r = await dynamo.send(
        new ScanCommand({
          TableName: `StudioScene-${SUF}`,
          FilterExpression: 'sessionId = :s',
          ExpressionAttributeValues: {':s': t.sessionId},
          ExclusiveStartKey: k,
        }),
      );
      scenes.push(...(r.Items ?? []));
      k = r.LastEvaluatedKey;
    } while (k);
    const vivantes = scenes.filter(s => !s.archived);
    const muettes = vivantes.filter(s => !s.studioAudioKey && !s.originalAudioKey);

    console.log(`\n${tourId}`);
    console.log(`  titre   : ${t.title}`);
    console.log(`  statut  : ${t.status} -> ${DEPUBLIER ? 'draft' : 'published'}`);
    console.log(`  scenes  : ${vivantes.length}  | sans audio : ${muettes.length}`);
    console.log(`  achat   : ${t.purchaseType ?? '(aucun => GRATUIT)'} -> subscription_only`);
    const sess = (
      await dynamo.send(new GetCommand({TableName: `StudioSession-${SUF}`, Key: {id: t.sessionId}}))
    ).Item;
    console.log(`  session : ${sess?.status ?? '(introuvable)'} -> ${DEPUBLIER ? 'draft' : 'published'}`);

    if (!DEPUBLIER && muettes.length > 0) {
      console.error(`  GARDE : ${muettes.length} Scene(s) sans audio. Publication refusee.`);
      process.exit(1);
    }

    if (!CONFIRME) continue;

    await dynamo.send(
      new UpdateCommand({
        TableName: `GuideTour-${SUF}`,
        Key: {id: tourId},
        UpdateExpression: DEPUBLIER
          ? 'SET #s = :st, updatedAt = :u'
          : 'SET #s = :st, purchaseType = :pt, languageAudioTypes = :lat, developedByAI = :ia, updatedAt = :u',
        ExpressionAttributeNames: {'#s': 'status'},
        ExpressionAttributeValues: DEPUBLIER
          ? {':st': 'draft', ':u': new Date().toISOString()}
          : {
              ':st': 'published',
              ':pt': 'subscription_only',
              ':lat': {fr: 'tts'},
              ':ia': true,
              ':u': new Date().toISOString(),
            },
      }),
    );
    // LA SESSION AUSSI, ET C'EST INDISPENSABLE : le resolveur public exige
    // `session.status === 'published'` EN PLUS du statut de la Visite (voir
    // `loadPublishedTourContent`). Publier le seul `GuideTour` laisse la fiche
    // introuvable — constate sur le vivant le 2026-09-04, fiche rendue vide
    // alors que les 19 Scenes et leur audio etaient en place.
    await dynamo.send(
      new UpdateCommand({
        TableName: `StudioSession-${SUF}`,
        Key: {id: t.sessionId},
        UpdateExpression: 'SET #s = :st, updatedAt = :u',
        ExpressionAttributeNames: {'#s': 'status'},
        ExpressionAttributeValues: {
          ':st': DEPUBLIER ? 'draft' : 'published',
          ':u': new Date().toISOString(),
        },
      }),
    );
    console.log(`  ECRIT (Visite + Session).`);
  }

  if (!CONFIRME) {
    console.log('\nSIMULATION. Relancer avec --confirm pour executer.');
  }
}

main().catch(e => {
  console.error('ECHEC :', e?.stack ?? String(e));
  process.exit(1);
});

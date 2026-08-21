/**
 * migrate-monetisation.mjs — Aligne le catalogue publié sur la stratégie de revenus v2
 * (`docs/business/murmure-strategie-revenus-2026-08.md`).
 *
 * Constat de l'audit du 2026-08-21 sur le backend live : 101 visites publiées / 40 villes,
 * mais 90 en `purchaseType='subscription_only'`, 0 en `paid`, `priceCents` vide partout,
 * 11 villes seulement avec une visite gratuite, et `duration` renseigné avec la durée
 * AUDIO (médiane 10 min) au lieu de la durée de BALADE (~35-45 min pour 2,2 km).
 *
 * TROIS PHASES, activables séparément — l'ordre compte :
 *
 *   --phase=duration   Recalcule `duration` = marche + écoute.  SANS RISQUE, à faire en premier.
 *   --phase=freemium   Porte la découverte gratuite de 11 à 40 villes (1 `free` par ville).
 *                      SANS RISQUE : `free` n'active aucun gating.
 *   --phase=paid       Bascule le reste en `paid` + `priceCents`.
 *                      ⚠️ DANGEREUX tant que le paywall client n'est pas activé : le résolveur
 *                      `get-published-tour-content` tronque les visites `paid` à 2 scènes
 *                      (isPaidTour = purchaseType==='paid' && priceCents>0), alors que l'app
 *                      n'affiche ni paywall ni bouton d'achat tant que
 *                      PER_TOUR_PURCHASE_ENABLED=false ET que isTourFree() renvoie true en dur.
 *                      → refusé sans --paywall-ready.
 *
 * USAGE
 *   node scripts/migrate-monetisation.mjs --phase=duration                      # dry-run
 *   node scripts/migrate-monetisation.mjs --phase=duration --app-id=<ID> --confirm
 *   node scripts/migrate-monetisation.mjs --phase=freemium --app-id=<ID> --confirm
 *   node scripts/migrate-monetisation.mjs --phase=paid --app-id=<ID> --confirm --paywall-ready
 *
 * OPTIONS
 *   --price=299            Prix de base en centimes (2,99 €).
 *   --tiered               Tarif par durée d'audio (voir PRICE_TIERS) — pour le futur batch
 *                          de visites longues.
 *   --only-city=Bordeaux   Restreint à une ville (test).
 *   --free-overrides=f.json  { "<ville>": "<tourId>" } pour choisir la visite offerte.
 *
 * Le dry-run écrit un aperçu ET une sauvegarde de l'état avant migration.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const getOpt = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};

const APP_ID = getOpt('app-id', process.env.APP_ID || '');
const ENV = getOpt('env', process.env.AMPLIFY_ENV || 'NONE');
const REGION = getOpt('region', process.env.AWS_REGION || 'us-east-1');
const CONFIRM = hasFlag('--confirm');
const PAYWALL_READY = hasFlag('--paywall-ready');
const TIERED = hasFlag('--tiered');
const PHASE = getOpt('phase', '');
const BASE_PRICE = parseInt(getOpt('price', '299'), 10);
const ONLY_CITY = getOpt('only-city', '');
// Restreint l'ÉCRITURE à une seule visite. Le choix de la visite offerte reste
// calculé sur la ville entière : sinon la cible, seule de sa « ville », serait
// élue vitrine gratuite et la bascule ne ferait rien.
const ONLY_TOUR = getOpt('only-tour', '');
const FREE_OVERRIDES_FILE = getOpt('free-overrides', '');
const DRY_RUN = !APP_ID || !CONFIRM;

const VALID_PHASES = ['duration', 'freemium', 'paid'];
const PHASES = PHASE === 'all' ? VALID_PHASES : PHASE.split(',').filter(Boolean);

/** Vitesse de marche touristique (km/h) — plus lente qu'un trajet utilitaire. */
const WALKING_KMH = 3.5;
/** Marge d'arrêt/observation par POI, en minutes. */
const STOP_MINUTES_PER_POI = 1;

/**
 * Paliers de prix par minutes d'audio (--tiered). Pensé pour le futur batch de
 * visites longues : une visite de 30 min d'audio ne se vend pas au prix d'une de 10 min.
 */
const PRICE_TIERS = [
  { minAudioMinutes: 0, priceCents: 299 },
  { minAudioMinutes: 20, priceCents: 499 },
  { minAudioMinutes: 35, priceCents: 699 },
];

function priceForTour({ audioMinutes }) {
  if (!TIERED) return BASE_PRICE;
  let price = PRICE_TIERS[0].priceCents;
  for (const tier of PRICE_TIERS) {
    if (audioMinutes >= tier.minAudioMinutes) price = tier.priceCents;
  }
  return price;
}

/** duration = temps de marche + temps d'écoute + arrêts, arrondi à 5 min. */
function computeDuration({ distanceKm, audioMinutes, poiCount }) {
  const walk = (distanceKm / WALKING_KMH) * 60;
  const stops = poiCount * STOP_MINUTES_PER_POI;
  const total = walk + audioMinutes + stops;
  return Math.max(5, Math.round(total / 5) * 5);
}

function fail(message) {
  console.error(`\n  ERREUR : ${message}\n`);
  process.exitCode = 1;
  return null;
}

async function scanAll(dynamo, ScanCommand, TableName, ProjectionExpression) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await dynamo.send(new ScanCommand({ TableName, ProjectionExpression, ExclusiveStartKey }));
    items.push(...(res.Items ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function run() {
  if (!PHASES.length || PHASES.some((p) => !VALID_PHASES.includes(p))) {
    return fail(`--phase requis : ${VALID_PHASES.join(' | ')} | all  (reçu : "${PHASE}")`);
  }
  if (PHASES.includes('paid') && !PAYWALL_READY) {
    return fail(
      'La phase "paid" tronque les visites à 2 scènes côté serveur alors que le client\n' +
      '  n\'affiche aucun paywall. Active d\'abord PER_TOUR_PURCHASE_ENABLED=true ET corrige\n' +
      '  isTourFree() (content-access-service.ts), puis relance avec --paywall-ready.',
    );
  }
  if (!APP_ID) {
    console.log('  (pas d\'--app-id : impossible de lire le backend — rien à faire)');
    return fail('--app-id=<ID> est requis, même en dry-run (lecture du catalogue live).');
  }

  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  const table = (name) => `${name}-${APP_ID}-${ENV}`;

  console.log(`\n=== Migration monétisation — backend ${APP_ID}-${ENV} (${REGION})`);
  console.log(`    phases : ${PHASES.join(', ')}${DRY_RUN ? '   [DRY-RUN]' : '   [ÉCRITURE]'}`);

  // ── Lecture du catalogue publié
  const allTours = await scanAll(dynamo, ScanCommand, table('GuideTour'));
  let published = allTours.filter((t) => t.status === 'published');
  if (ONLY_CITY) published = published.filter((t) => t.city === ONLY_CITY);
  if (!published.length) return fail('aucune visite publiée trouvée (vérifie --app-id / --only-city).');

  // ── Durées audio réelles, par session
  const scenes = await scanAll(dynamo, ScanCommand, table('StudioScene'), 'sessionId, durationSeconds');
  const audioSecondsBySession = new Map();
  for (const scene of scenes) {
    const seconds = Number(scene.durationSeconds ?? 0);
    if (!scene.sessionId || !Number.isFinite(seconds)) continue;
    audioSecondsBySession.set(scene.sessionId, (audioSecondsBySession.get(scene.sessionId) ?? 0) + seconds);
  }

  const enriched = published.map((tour) => {
    const audioMinutes = Math.round((audioSecondsBySession.get(tour.sessionId) ?? 0) / 60);
    return {
      tour,
      audioMinutes,
      distanceKm: Number(tour.distance ?? 0),
      poiCount: Number(tour.poiCount ?? 0),
    };
  });

  // ── Choix de la visite offerte par ville
  const overrides = FREE_OVERRIDES_FILE
    ? JSON.parse(fs.readFileSync(path.resolve(FREE_OVERRIDES_FILE), 'utf8'))
    : {};
  const byCity = new Map();
  for (const item of enriched) {
    const city = item.tour.city ?? '(sans ville)';
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city).push(item);
  }

  const freeTourIds = new Set();
  for (const [city, items] of byCity) {
    if (overrides[city]) {
      freeTourIds.add(overrides[city]);
      continue;
    }
    // Idempotence : si la ville a déjà une visite gratuite, on la conserve.
    const already = items.filter((i) => i.tour.purchaseType === 'free');
    if (already.length) {
      already.forEach((i) => freeTourIds.add(i.tour.id));
      continue;
    }
    // Sinon : la plus riche fait la meilleure vitrine (POIs, puis audio, puis id pour déterminisme).
    const best = [...items].sort(
      (a, b) =>
        b.poiCount - a.poiCount ||
        b.audioMinutes - a.audioMinutes ||
        String(a.tour.id).localeCompare(String(b.tour.id)),
    )[0];
    freeTourIds.add(best.tour.id);
  }

  // ── Calcul des changements
  const changes = [];
  for (const { tour, audioMinutes, distanceKm, poiCount } of enriched) {
    if (ONLY_TOUR && tour.id !== ONLY_TOUR) continue;
    const updates = {};

    if (PHASES.includes('duration')) {
      const next = computeDuration({ distanceKm, audioMinutes, poiCount });
      if (next !== Number(tour.duration)) updates.duration = next;
    }

    const shouldBeFree = freeTourIds.has(tour.id);
    if (PHASES.includes('freemium') && shouldBeFree) {
      if (tour.purchaseType !== 'free') updates.purchaseType = 'free';
      if (Number(tour.priceCents ?? 0) !== 0) updates.priceCents = 0;
    }
    if (PHASES.includes('paid') && !shouldBeFree) {
      const price = priceForTour({ audioMinutes });
      if (tour.purchaseType !== 'paid') updates.purchaseType = 'paid';
      if (Number(tour.priceCents ?? -1) !== price) updates.priceCents = price;
    }

    if (Object.keys(updates).length) {
      changes.push({
        id: tour.id,
        city: tour.city,
        title: tour.title,
        before: {
          duration: tour.duration ?? null,
          purchaseType: tour.purchaseType ?? null,
          priceCents: tour.priceCents ?? null,
        },
        after: updates,
        audioMinutes,
        distanceKm,
        poiCount,
      });
    }
  }

  // ── Rapport
  console.log(`\n  Visites publiées examinées : ${published.length}  (${byCity.size} villes)`);
  console.log(`  Visites offertes retenues   : ${freeTourIds.size}`);
  console.log(`  Visites à modifier          : ${changes.length}`);

  const tally = (field) =>
    changes.reduce((acc, c) => (c.after[field] !== undefined ? acc + 1 : acc), 0);
  console.log(`     dont duration     : ${tally('duration')}`);
  console.log(`     dont purchaseType : ${tally('purchaseType')}`);
  console.log(`     dont priceCents   : ${tally('priceCents')}`);

  if (PHASES.includes('duration')) {
    const durations = changes.filter((c) => c.after.duration !== undefined);
    if (durations.length) {
      const values = durations.map((c) => c.after.duration).sort((a, b) => a - b);
      console.log(
        `\n  Nouvelle durée : min ${values[0]} | médiane ${values[Math.floor(values.length / 2)]} | max ${values[values.length - 1]} min`,
      );
      for (const c of durations.slice(0, 5)) {
        console.log(
          `     ${String(c.city).padEnd(20)} ${String(c.before.duration).padStart(3)} → ${String(c.after.duration).padStart(3)} min` +
          `   (${c.distanceKm} km, ${c.audioMinutes} min audio, ${c.poiCount} POIs)`,
        );
      }
    }
  }

  const citiesWithoutFree = [...byCity.keys()].filter(
    (city) => !byCity.get(city).some((i) => freeTourIds.has(i.tour.id)),
  );
  if (citiesWithoutFree.length) {
    console.log(`\n  ⚠️  Villes sans visite offerte : ${citiesWithoutFree.join(', ')}`);
  }

  // ── Sauvegarde + aperçu
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(__dirname, `migrate-monetisation.backup-${stamp}.json`);
  const previewFile = path.join(__dirname, 'migrate-monetisation.preview.json');
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      published.map((t) => ({
        id: t.id, city: t.city, duration: t.duration ?? null,
        purchaseType: t.purchaseType ?? null, priceCents: t.priceCents ?? null,
      })),
      null,
      2,
    ),
  );
  fs.writeFileSync(previewFile, JSON.stringify(changes, null, 2));
  console.log(`\n  Sauvegarde avant migration → ${backupFile}`);
  console.log(`  Détail des changements     → ${previewFile}`);

  if (DRY_RUN) {
    console.log('\n  DRY-RUN : rien écrit. Ajoute --confirm pour appliquer.\n');
    return;
  }
  if (!changes.length) {
    console.log('\n  Rien à modifier — le catalogue est déjà conforme.\n');
    return;
  }

  console.log(`\n  Écriture de ${changes.length} mises à jour…`);
  let written = 0;
  for (const change of changes) {
    const fields = { ...change.after, updatedAt: new Date().toISOString() };
    const names = {};
    const values = {};
    const sets = [];
    for (const [key, value] of Object.entries(fields)) {
      names[`#${key}`] = key;
      values[`:${key}`] = value;
      sets.push(`#${key} = :${key}`);
    }
    await dynamo.send(
      new UpdateCommand({
        TableName: table('GuideTour'),
        Key: { id: change.id },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(id)',
      }),
    );
    written += 1;
  }
  console.log(`\n=== Terminé : ${written} visites mises à jour ===\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

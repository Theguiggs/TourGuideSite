/**
 * certifie-retraduction.mjs — établit, en lecture seule, que la narration en
 * base EST la retraduction relue.
 *
 * Contexte : les 101 Visites du catalogue ont été retraduites et leur audio
 * MarianMT purgé sur le backend vivant le 2026-08-23, mais l'opération n'a
 * laissé aucune trace — `retrad-3-seed.mjs` n'écrit que sur la sortie standard.
 * Ce contrôleur reconstitue la preuve à volonté, et la dépose par écrit.
 *
 * Il vaut aussi comme contrôle AVANT toute fabrication d'audio : la synthèse
 * coûte de l'argent, et une divergence non détectée se paie en secondes de voix.
 *
 * Ce qu'il contrôle, sur les Visites du CATALOGUE :
 *   1. le texte de chaque segment est identique au corpus relu, et n'est pas
 *      resté en français ;
 *   2. chaque langue porte autant de segments que la source a de scènes, et
 *      reprend les mêmes `sceneId`, sans doublon ;
 *   3. le balisage de pause `<break …/>` est identique à celui de la source ;
 *   4. aucun segment traduit ne porte encore d'`audioKey` ni le statut
 *      `tts_generated` ;
 *   5. aucun segment ne porte encore le marqueur d'origine `marianmt` ;
 *   6. `sourceTextHash` correspond à la source — sans quoi le Studio afficherait
 *      la traduction comme périmée ;
 *   7. le français est intact — texte conforme à la source, audio présent ;
 *   8. toute Visite publiée du catalogue est couverte par un corpus.
 *
 * Ce qu'il NE PEUT PAS contrôler : l'absence de pivot par une langue
 * intermédiaire est une propriété du procédé, pas des données. Aucun contrôle
 * ne la lit dans un texte. Le journal le dit plutôt que de le laisser croire.
 *
 * Lecture seule : la seule écriture est le journal, sur disque.
 *
 * Codes de sortie : 0 conforme · 1 non conforme · 2 panne · 3 conforme mais
 * preuve non écrite.
 *
 *   node scripts/certifie-retraduction.mjs
 *   node scripts/certifie-retraduction.mjs --tour <id>
 *   node scripts/certifie-retraduction.mjs --sans-journal
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  scanAll, banner, hasFlag, LANGS, BASE_LANG, SOURCE_DIR, OUT_DIR, TRANS_DIR,
  resolveBackend, hashSourceText,
} from './retrad-lib.mjs';
// La règle vit à part, en CommonJS, pour que Jest puisse l'éprouver sans
// transformateur : ce script n'est plus qu'entrées, sorties et rapport.
import regles from './certification-rules.cjs';

const { estDuCatalogue, controleVisite, verdictGlobal } = regles;

const SANS_JOURNAL = hasFlag('sans-journal');
const onlyIdx = process.argv.indexOf('--tour');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

// Même garde que le rattrapage : un drapeau mal formé s'arrête, il ne s'élargit
// pas en « toutes les Visites ».
if (onlyIdx >= 0 && (!ONLY || ONLY.startsWith('--'))) {
  console.error('  --tour attend un identifiant de Visite. Reçu : ' + (ONLY ?? '(rien)'));
  process.exit(2);
}

const CERTIF_DIR = path.join(TRANS_DIR, 'certifications');

banner('certification de la retraduction  [LECTURE SEULE]');

// ── Corpus disque ──────────────────────────────────────────────────────────
// Ne rien avoir à comparer ne prouve rien : l'absence de corpus est une panne,
// jamais un verdict « conforme ».
const outFiles = fs.existsSync(OUT_DIR)
  ? fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'))
  : [];
if (outFiles.length === 0) {
  console.error(`  ARRÊT — aucun corpus relu dans ${OUT_DIR}.`);
  console.error('  Sans corpus de référence, rien ne peut être certifié.');
  process.exit(2);
}

const corpus = new Map();
// Un fichier abîmé ne doit pas empêcher de certifier les cent autres Visites :
// les défauts de corpus s'accumulent comme les griefs, ils ne coupent pas le run.
const corpusEnDefaut = [];
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
for (const f of outFiles) {
  const tourId = f.replace(/\.json$/, '');
  if (ONLY && tourId !== ONLY) continue;
  const srcPath = path.join(SOURCE_DIR, `${tourId}.json`);
  if (!fs.existsSync(srcPath)) {
    corpusEnDefaut.push({ tourId, raison: 'source française absente' });
    continue;
  }
  try {
    const out = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
    const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    if (!estObjet(out) || !estObjet(src)) {
      corpusEnDefaut.push({ tourId, raison: 'corpus malformé — un objet est attendu' });
      continue;
    }
    corpus.set(tourId, { out, src });
  } catch (e) {
    corpusEnDefaut.push({ tourId, raison: `illisible : ${e?.message ?? String(e)}` });
  }
}
if (corpus.size === 0 && corpusEnDefaut.length === 0) {
  console.error(`  ARRÊT — aucun corpus ne correspond à « ${ONLY} ».`);
  process.exit(2);
}

// ── Base ───────────────────────────────────────────────────────────────────
let segments;
let scenes;
let tours;
try {
  [segments, scenes, tours] = await Promise.all([
    scanAll('SceneSegment'), scanAll('StudioScene'), scanAll('GuideTour'),
  ]);
} catch (e) {
  // Identifiants expirés, limitation de débit, réseau : une panne de LECTURE
  // n'est pas un verdict. Sans ce filet, la sortie était une pile d'appels.
  console.error(`  ARRÊT — lecture du backend impossible : ${e?.message ?? String(e)}`);
  process.exit(2);
}

const tourById = new Map(tours.map((t) => [t.id, t]));
const sceneById = new Map(scenes.map((s) => [s.id, s]));
const segByKey = new Map();
const segmentsDupliques = [];
for (const seg of segments) {
  const cle = `${seg.sceneId}|${seg.language}`;
  // `new Map(...)` gardait le DERNIER en silence : un jumeau périmé portant
  // encore un audioKey passait alors le contrôle sans un mot.
  if (segByKey.has(cle)) segmentsDupliques.push(cle);
  else segByKey.set(cle, seg);
}

// ── Contrôle ───────────────────────────────────────────────────────────────
const rapport = [];
let segmentsControles = 0;
let segmentsConcordants = 0;

for (const [tourId, { out, src }] of corpus) {
  const tour = tourById.get(tourId);
  const { griefs, parLangue, controles, concordants } = controleVisite({
    src, out, langs: LANGS, segments: segByKey, scenes: sceneById, hashSourceText,
  });
  // Une Visite absente de `GuideTour`, ou dans un autre état, ne peut pas entrer
  // au verdict comme si de rien n'était.
  if (!tour) griefs.push('visite absente de GuideTour');
  else if (tour.status !== 'published') {
    griefs.push(`visite au statut « ${tour.status} », pas « published »`);
  }
  segmentsControles += controles;
  segmentsConcordants += concordants;
  rapport.push({
    tourId,
    // Le journal porte le titre ENTIER : c'est une preuve, la troncature
    // appartient à l'affichage.
    titre: tour?.title ?? src.title ?? '',
    catalogue: tour ? estDuCatalogue(tour) : true,
    statut: tour?.status ?? '(absente de GuideTour)',
    scenes: Array.isArray(src.scenes) ? src.scenes.length : 0,
    parLangue,
    griefs,
  });
}

// ── Couverture du catalogue ────────────────────────────────────────────────
// Le contrôleur itère le CORPUS. Sans ce rapprochement, une Visite publiée sans
// fichier de corpus n'est jamais certifiée — et le verdict la passe sous
// silence. Aujourd'hui 101 = 101, mais c'est un état, pas une garantie.
const catalogueNonCouvert = ONLY
  ? []
  : tours
    .filter((t) => t.status === 'published' && estDuCatalogue(t) && !corpus.has(t.id))
    .map((t) => t.id);

// ── Hors périmètre : compté, jamais mêlé au verdict ─────────────────────────
const sceneIdsDuCorpus = new Set();
for (const [, { src }] of corpus) {
  for (const s of Array.isArray(src.scenes) ? src.scenes : []) sceneIdsDuCorpus.add(s.sceneId);
}
const horsPerimetre = segments.filter((s) => !sceneIdsDuCorpus.has(s.sceneId));
const residus = {
  segments: horsPerimetre.length,
  marianmt: horsPerimetre.filter((s) => s.translationProvider === 'marianmt').length,
  ttsGenerated: horsPerimetre.filter((s) => s.status === 'tts_generated').length,
  avecAudio: horsPerimetre.filter((s) => s.audioKey).length,
};

/**
 * Empreinte du corpus. Sans elle, le journal affirme « le texte en base est le
 * corpus relu » sans que personne ne puisse dire DE QUEL corpus il parlait : un
 * fichier modifié après coup rendrait toute preuve antérieure invérifiable.
 */
function empreinteCorpus() {
  const h = createHash('sha256');
  for (const tourId of [...corpus.keys()].sort()) {
    h.update(tourId);
    h.update(JSON.stringify(corpus.get(tourId).out));
    h.update(JSON.stringify(corpus.get(tourId).src));
  }
  return h.digest('hex').slice(0, 32);
}

// ── Verdict ────────────────────────────────────────────────────────────────
const duCatalogue = rapport.filter((r) => r.catalogue);
const verdictRapport = verdictGlobal(rapport, {
  controles: segmentsControles,
  catalogueNonCouvert,
});
const nonConformes = verdictRapport.enDefaut;
const motifsAnnexes = [];
if (corpusEnDefaut.length) motifsAnnexes.push(`${corpusEnDefaut.length} corpus illisible(s)`);
if (segmentsDupliques.length) motifsAnnexes.push(`${segmentsDupliques.length} segment(s) en double`);
const conforme = verdictRapport.conforme && motifsAnnexes.length === 0;
const motif = [verdictRapport.motif, ...motifsAnnexes].filter(Boolean).join(' ; ') || null;

const backend = resolveBackend();
console.log(`  Visites certifiées        : ${rapport.length}  (catalogue : ${duCatalogue.length})`);
console.log(`  Segments contrôlés        : ${segmentsControles}`);
console.log(`  Segments concordants      : ${segmentsConcordants}`);
console.log(`  Langues                   : ${LANGS.join(', ')}  (base ${BASE_LANG}, contrôlée)`);
// En mode `--tour`, tout le reste du catalogue tombe hors corpus : l'appeler
// « fixtures » serait faux, et le décompte marianmt, alarmiste sans raison.
console.log(
  ONLY
    ? '  Hors périmètre            : non calculable avec --tour'
    : `  Hors périmètre (fixtures) : ${residus.segments} segments — ${residus.marianmt} marianmt, ${residus.ttsGenerated} tts_generated, ${residus.avecAudio} avec audio`,
);

if (catalogueNonCouvert.length) {
  console.log(`\n  Visites publiées SANS corpus (${catalogueNonCouvert.length}) :`);
  for (const id of catalogueNonCouvert.slice(0, 10)) console.log(`    ${id}`);
}
if (corpusEnDefaut.length) {
  console.log(`\n  Corpus en défaut (${corpusEnDefaut.length}) :`);
  for (const c of corpusEnDefaut.slice(0, 10)) console.log(`    ${c.tourId} — ${c.raison}`);
}
if (segmentsDupliques.length) {
  console.log(`\n  Segments en double (${segmentsDupliques.length}) — un seul est contrôlé :`);
  for (const cle of segmentsDupliques.slice(0, 10)) console.log(`    ${cle}`);
}

if (!conforme) {
  // `motif` plutôt qu'un décompte : un rapport VIDE est non conforme sans
  // qu'aucune Visite soit « en défaut », et « 0 Visite en défaut » mentirait.
  console.log(`\n  NON CONFORME — ${motif} :`);
  for (const r of nonConformes) {
    console.log(`\n    ${r.tourId}  — ${r.titre.slice(0, 46)}`);
    for (const g of r.griefs.slice(0, 10)) console.log(`        ${g}`);
    if (r.griefs.length > 10) console.log(`        … et ${r.griefs.length - 10} autre(s)`);
  }
}

const horsCatalogueEnDefaut = rapport.filter((r) => !r.catalogue && r.griefs.length);
if (horsCatalogueEnDefaut.length) {
  console.log(`\n  Hors catalogue, sans effet sur le verdict : ${horsCatalogueEnDefaut.length} Visite(s) en défaut.`);
}

// ── Journal ────────────────────────────────────────────────────────────────
let journalEcrit = true;
if (!SANS_JOURNAL) {
  const horodatage = new Date().toISOString();
  const journal = {
    certifieLe: horodatage,
    // La provenance du backend est décisive : deux jeux de tables morts
    // coexistent sur le compte, et un balayage du mauvais rend des chiffres
    // plausibles sans rien signaler.
    backend: {
      apiId: backend.apiId,
      hote: backend.host,
      bucket: backend.bucket,
      resolutionPar: backend.resolvedBy,
    },
    // Un journal d'UNE Visite doit rester indiscernable de ce qu'il est. Il sera
    // commité comme preuve.
    perimetre: ONLY ? { partiel: true, visite: ONLY } : { partiel: false },
    // Le verdict dépend de ce drapeau : non consigné, le journal n'est pas
    // reproductible.
    environnement: { E2E_ALLOW_TEST_TOURS: process.env.E2E_ALLOW_TEST_TOURS ?? null },
    corpus: {
      source: path.relative(process.cwd(), SOURCE_DIR),
      traductions: path.relative(process.cwd(), OUT_DIR),
      visites: corpus.size,
      empreinteSha256: empreinteCorpus(),
    },
    langues: LANGS,
    verdict: conforme ? 'conforme' : 'non conforme',
    motif,
    totaux: {
      visitesCertifiees: rapport.length,
      visitesDuCatalogue: duCatalogue.length,
      visitesEnDefaut: nonConformes.length,
      segmentsControles,
      segmentsConcordants,
    },
    catalogueNonCouvert,
    corpusEnDefaut,
    segmentsDupliques,
    horsPerimetre: ONLY ? null : residus,
    // Dire ce que ce journal N'ATTESTE PAS vaut autant que dire ce qu'il atteste.
    nonAtteste: [
      "L'absence de pivot par une langue intermédiaire est une propriété du procédé, pas des données : aucun contrôle ne la lit dans un texte. Ce qui est établi ici, c'est qu'aucun segment de catalogue ne porte plus le marqueur marianmt et que le texte en base est bien le corpus relu sous CONSIGNES.md, qui interdit le pivot.",
      "La qualité de la traduction — registre, tutoiement, toponymes laissés en français — n'est pas contrôlable par programme. Elle relève de la relecture humaine consignée dans CONSIGNES.md.",
      "L'ARCHIVAGE de l'ancien audio n'est pas vérifié : le contrôle constate qu'aucun segment ne RÉFÉRENCE plus d'audio traduit, pas que les objets S3 ont été copiés sous archive-tts-marianmt/.",
    ],
    visites: rapport.map((r) => ({
      tourId: r.tourId,
      titre: r.titre,
      catalogue: r.catalogue,
      statut: r.statut,
      scenes: r.scenes,
      parLangue: r.parLangue,
      griefs: r.griefs,
    })),
  };
  try {
    fs.mkdirSync(CERTIF_DIR, { recursive: true });
    const cible = path.join(CERTIF_DIR, `certification-${horodatage.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(cible, JSON.stringify(journal, null, 2), 'utf8');
    console.log(`\n  Journal : ${path.relative(process.cwd(), cible)}`);
  } catch (e) {
    journalEcrit = false;
    console.error(`\n  Journal NON écrit : ${e?.message ?? String(e)}`);
  }
}

console.log(`\n  VERDICT : ${conforme ? 'CONFORME' : 'NON CONFORME'}`);
if (!journalEcrit) {
  console.error("  ...mais la preuve n'a pas pu être écrite : ce verdict n'est pas opposable.");
}

// Codes de sortie distincts, documentés dans certifications/README.md.
// Une chaîne de commandes doit pouvoir séparer « catalogue en défaut » de
// « preuve manquante » : les suites à donner ne sont pas les mêmes.
if (!conforme) process.exitCode = 1;
else if (!journalEcrit) process.exitCode = 3;

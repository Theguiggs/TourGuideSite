/**
 * eprouve-traduction-claude.mjs — confronte UNE Visite du corpus doré à la
 * sortie réelle du pipeline de traduction par modèle de langue.
 *
 * Le corpus doré, c'est `content/translations/out/` : les 101 Visites
 * retraduites hors pipeline le 2026-08-23 et certifiées conformes le 26/08 —
 * 3 810 segments concordants, zéro `marianmt`. Ce n'est pas la charge de
 * travail de la story 4, c'est son JEU D'ÉPREUVE.
 *
 * Le juge n'est pas écrit ici : c'est `certification-rules.cjs`, celui-là même
 * qui a prononcé la conformité du catalogue. Ce script ne fait que lui
 * présenter la sortie du pipeline dans la forme qu'il sait lire — et il
 * DÉMONTRE que le juge peut refuser, en lui soumettant une sortie corrompue
 * avant de rendre son verdict.
 *
 * ── Ce que ce script NE FAIT PAS ────────────────────────────────────────────
 *  · il n'écrit RIEN dans `content/translations/out/` — le corpus est le jeu
 *    d'épreuve, il ne se corrige pas pour faire passer un contrôle ;
 *  · il ne traite QU'UNE Visite par exécution. Un appel au fournisseur sur
 *    plus d'une Visite se facture, et cette décision n'est pas la sienne ;
 *  · il ne touche à aucune base : rien n'est semé, rien n'est mis à jour.
 *
 * ── Emploi ──────────────────────────────────────────────────────────────────
 *   # Sans un centime : le corpus certifié repassé au juge ET aux contrôles de
 *   # sortie de la Lambda. Prouve que les deux acceptent du bon.
 *   npx tsx scripts/eprouve-traduction-claude.mjs --tour <id> --sans-appel
 *
 *   # Avec appels au fournisseur, UNE Visite, UNE langue.
 *   ANTHROPIC_API_KEY=… npx tsx scripts/eprouve-traduction-claude.mjs \
 *       --tour <id> --langue de [--scenes 2] [--journal]
 *
 * `tsx` est nécessaire : le pipeline vit en TypeScript dans le dépôt voisin
 * (`TourGuideApp/amplify/functions/translate-claude/`), et on l'appelle LUI —
 * réécrire le prompt ici en produirait une seconde version, ce que la story
 * interdit explicitement.
 *
 * Codes de sortie : 0 conforme · 1 non conforme · 2 panne / emploi incorrect.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import regles from './certification-rules.cjs';
import sourceHash from './source-hash.cjs';

const { controleVisite, pauses } = regles;
const { hashSourceText } = sourceHash;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, '..');
const TRANS_DIR = path.join(WEB_ROOT, 'content', 'translations');
const SOURCE_DIR = path.join(TRANS_DIR, 'source');
const OUT_DIR = path.join(TRANS_DIR, 'out');
const CERTIF_DIR = path.join(TRANS_DIR, 'certifications');

const LAMBDA_DIR = path.resolve(
  WEB_ROOT,
  '..',
  'TourGuideApp',
  'amplify',
  'functions',
  'translate-claude',
);

// ── Panne ≠ non-conformité ──────────────────────────────────────────────────
// Une exception non rattrapée sortait en 1, code que la table documente comme
// « non conforme » : une panne de script se serait lue comme un défaut du
// pipeline. Elles sortent désormais en 2, comme toute autre panne.
function panne(message, err) {
  console.error(`\n  PANNE — ${message}`);
  if (err) console.error(`  ${err?.stack ?? String(err)}`);
  process.exit(2);
}
process.on('uncaughtException', (err) => panne('exception non rattrapée', err));
process.on('unhandledRejection', (err) => panne('rejet non traité', err));

// ── Arguments ───────────────────────────────────────────────────────────────

function arg(nom) {
  const i = process.argv.indexOf(`--${nom}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (!v || v.startsWith('--')) {
    console.error(`  --${nom} attend une valeur. Reçu : ${v ?? '(rien)'}`);
    process.exit(2);
  }
  return v;
}
const drapeau = (nom) => process.argv.includes(`--${nom}`);

const TOUR = arg('tour');
const LANGUE = arg('langue');
const SANS_APPEL = drapeau('sans-appel');
const JOURNAL = drapeau('journal');

let SCENES_MAX = null;
if (arg('scenes') != null) {
  const brut = arg('scenes');
  SCENES_MAX = Number(brut);
  // `--scenes 0`, négatif ou non numérique traduisait zéro scène puis
  // annonçait CONFORME : un contrôle qui ne contrôle rien.
  if (!Number.isInteger(SCENES_MAX) || SCENES_MAX < 1) {
    console.error(`  --scenes attend un entier ≥ 1. Reçu : ${brut}`);
    process.exit(2);
  }
}

// La garde tient AVANT tout le reste : c'est elle qui empêche une facture
// décidée par un script.
if (drapeau('tout') || drapeau('all')) {
  console.error(
    "  REFUS — cette épreuve ne traite qu'une Visite à la fois.\n" +
      '  Un appel au fournisseur sur plus d’une Visite se facture : c’est une\n' +
      '  décision, pas un drapeau. Relancer avec --tour <id>.',
  );
  process.exit(2);
}
if (!TOUR) {
  console.error(
    '  Emploi : eprouve-traduction-claude.mjs --tour <id> (--langue <xx> | --sans-appel)',
  );
  process.exit(2);
}
if (!SANS_APPEL && !LANGUE) {
  console.error('  --langue est requis (ou --sans-appel pour une épreuve hors facture).');
  process.exit(2);
}

// ── Corpus ──────────────────────────────────────────────────────────────────

function lisJson(chemin) {
  if (!fs.existsSync(chemin)) {
    console.error(`  ARRÊT — fichier absent : ${chemin}`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(chemin, 'utf8'));
}

const src = lisJson(path.join(SOURCE_DIR, `${TOUR}.json`));
const dore = lisJson(path.join(OUT_DIR, `${TOUR}.json`));

const scenesSource = Array.isArray(src.scenes) ? src.scenes : [];
if (scenesSource.length === 0) {
  console.error('  ARRÊT — la source ne porte aucune scène.');
  process.exit(2);
}

const LANGUES_DOREES = Object.keys(dore).filter((k) => k !== 'tourId');
if (!SANS_APPEL && !LANGUES_DOREES.includes(LANGUE)) {
  console.error(
    `  ARRÊT — la langue « ${LANGUE} » est absente du corpus doré de cette Visite.\n` +
      `  Langues présentes : ${LANGUES_DOREES.join(', ') || '(aucune)'}.\n` +
      "  Sans référence, un grief ne dirait rien du pipeline : il dirait seulement\n" +
      '  que la comparaison n’avait pas lieu d’être.',
  );
  process.exit(2);
}

const NB_PAUSES = scenesSource.reduce(
  (n, s) => n + ((s.text ?? '').match(/<break\b[^>]*>/g) ?? []).length,
  0,
);

console.log('');
console.log('  ┌────────────────────────────────────────────────────────────────');
console.log(`  │ épreuve du pipeline « claude » — ${TOUR}`);
console.log(`  │ ${scenesSource.length} scène(s) · ville ${src.city ?? '(inconnue)'}`);
console.log(`  │ ${NB_PAUSES} balise(s) de pause à la source`);
console.log('  └────────────────────────────────────────────────────────────────');
console.log('');

if (NB_PAUSES === 0) {
  // Sur 101 Visites du corpus, UNE SEULE porte des balises. Partout ailleurs,
  // le contrôle de balisage compare du vide à du vide et imprime CONFORME sans
  // avoir rien éprouvé. Le dire, plutôt que de laisser croire.
  console.log(
    '  AVERTISSEMENT — cette Visite ne porte AUCUNE balise de pause.\n' +
      '  Le contrôle de balisage comparera donc du vide à du vide : son verdict\n' +
      '  ne dira rien de la capacité du pipeline à reporter les pauses.\n' +
      "  Une seule Visite du corpus en porte : 78e3f3cc-7c1d-4a88-a274-8690e9411fc2\n" +
      '  (Grasse, 90 balises). C’est celle-là qu’il faut éprouver pour le balisage.',
  );
  console.log('');
}

// ── Le pipeline, tel qu'il est déployé ──────────────────────────────────────

const {
  MOTEUR,
  MODELE,
  traduireScene,
  coutCentimes,
  creerClient,
} = await import(pathToFileURL(path.join(LAMBDA_DIR, 'handler.ts')).href);
const { verifierTraduction } = await import(
  pathToFileURL(path.join(LAMBDA_DIR, 'verification.ts')).href
);

/**
 * Le juge, tel que `certifie-retraduction.mjs` l'emploie.
 *
 * `scenes` et `segments` sont reconstitués comme un semis les écrirait : le
 * texte français vient de la SOURCE, le texte traduit de ce qu'on lui soumet.
 * Les titres viennent du corpus doré — le pipeline n'en produit pas encore
 * (voir le rapport), et les lui prêter serait mentir sur ce qu'il fait.
 */
function juge(traduites, lang) {
  const titresDores = new Map((dore[lang]?.scenes ?? []).map((s) => [s.sceneId, s.title]));

  const scenes = new Map(
    scenesSource.map((s) => [
      s.sceneId,
      {
        transcriptText: s.text,
        title: s.title,
        studioAudioKey: `eprouve/${s.sceneId}.m4a`,
        archived: false,
      },
    ]),
  );

  const segments = new Map(
    traduites.map((s) => [
      `${s.sceneId}|${lang}`,
      {
        transcriptText: s.text,
        translatedTitle: titresDores.get(s.sceneId) ?? s.title,
        audioKey: null,
        translationProvider: MOTEUR,
        status: 'translated',
        sourceTextHash: hashSourceText(s.sourceText, s.sourceTitle),
      },
    ]),
  );

  const out = {
    [lang]: {
      title: dore[lang]?.title ?? '',
      description: dore[lang]?.description ?? '',
      scenes: traduites.map((s) => ({
        sceneId: s.sceneId,
        title: titresDores.get(s.sceneId) ?? s.title,
        text: s.text,
      })),
    },
  };

  return controleVisite({ src: { scenes: scenesSource }, out, langs: [lang], segments, scenes });
}

/**
 * Le juge a-t-il des dents ?
 *
 * Une partie des règles de `controleVisite` porte sur des champs que ce script
 * fabrique lui-même : elles ne peuvent pas tomber ici, et un verdict CONFORME
 * qui reposerait sur elles ne prouverait rien. Celles qui MORDENT sur une
 * exécution réelle sont le balisage, le passe-plat, le texte vide et la parité
 * de Scènes — on le DÉMONTRE plutôt que de l'affirmer, en soumettant au juge
 * une sortie délibérément corrompue.
 */
function jugeMordant(traduites, lang) {
  // Sans corruption possible, l objet rendu n avait pas de `sourds` : l appelant
  // levait un TypeError, qui masquait les vrais échecs.
  if (traduites.length === 0) {
    return { ok: false, sourds: ['aucune sortie à corrompre'], essais: [] };
  }
  const essais = [];

  // 1. balisage retiré (n'a de sens que si la Visite en porte)
  if (NB_PAUSES > 0) {
    const corrompu = traduites.map((s, i) =>
      i === 0 ? { ...s, text: s.text.replace(/<break\b[^>]*>/, '') } : s,
    );
    essais.push(['balisage amputé', juge(corrompu, lang).griefs.length > 0]);
  }
  // 2. passe-plat : la source rendue telle quelle
  const passePlat = traduites.map((s, i) => (i === 0 ? { ...s, text: s.sourceText } : s));
  essais.push(['passe-plat', juge(passePlat, lang).griefs.length > 0]);
  // 3. scène manquante : parité rompue
  essais.push(['scène manquante', juge(traduites.slice(1), lang).griefs.length > 0]);

  const sourds = essais.filter(([, mord]) => !mord).map(([nom]) => nom);
  return { ok: sourds.length === 0, sourds, essais };
}

/**
 * Mode hors facture : le corpus doré passé AU JUGE et aux contrôles de sortie
 * de la Lambda. Un contrôle qui rejetterait du bon rejetterait tout.
 */
function epreuveSansAppel() {
  const griefs = [];
  const dentsParLangue = [];
  let controles = 0;

  for (const lang of LANGUES_DOREES) {
    const parId = new Map((dore[lang]?.scenes ?? []).map((s) => [s.sceneId, s]));
    const traduites = [];
    for (const scene of scenesSource) {
      const traduite = parId.get(scene.sceneId);
      if (!traduite) {
        griefs.push(`${lang}/${scene.sceneId} : absente du corpus doré`);
        continue;
      }
      controles++;
      const verdict = verifierTraduction({
        source: scene.text,
        traduction: traduite.text,
        stopReason: 'end_turn',
      });
      if (!verdict.ok) {
        griefs.push(`${lang}/${scene.sceneId} : ${verdict.motif} — ${verdict.detail}`);
      }
      traduites.push({
        sceneId: scene.sceneId,
        title: traduite.title,
        text: traduite.text,
        sourceText: scene.text,
        sourceTitle: scene.title,
      });
    }

    // Le juge du catalogue, sur les mêmes données. C'est lui qui a prononcé la
    // conformité des 3 810 segments : il doit les accepter encore.
    const verdictJuge = juge(traduites, lang);
    griefs.push(...verdictJuge.griefs);

    const dents = jugeMordant(traduites, lang);
    if (!dents.ok) {
      griefs.push(
        `${lang} : le juge n'a PAS refusé une sortie corrompue (${dents.sourds.join(', ')})`,
      );
    }
    dentsParLangue.push([lang, dents]);
  }

  console.log(`  ${controles} segment(s) du corpus doré soumis au juge et aux contrôles.`);
  console.log('');
  console.log('  ── le juge a-t-il des dents ? ───────────────────────────────────');
  for (const [lang, dents] of dentsParLangue) {
    for (const [nom, mord] of dents.essais ?? []) {
      console.log(`  ${mord ? 'refusé' : 'ACCEPTÉ (!)'}  ${lang} · ${nom}`);
    }
  }
  return { griefs, controles, usages: [], appels: 0 };
}

/**
 * Mode réel : UNE Visite, UNE langue, un appel par Scène.
 */
async function epreuveAvecAppels() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('  ARRÊT — ANTHROPIC_API_KEY absent. Aucun appel n’est tenté.');
    process.exit(2);
  }
  // Le client vient du pipeline, pas d'ici : le SDK n'est installé que dans le
  // dépôt voisin, et ses réglages (reprise désarmée, délai d'appel) sont une
  // décision du pipeline, pas de l'épreuve.
  const client = creerClient(process.env.ANTHROPIC_API_KEY);

  const aTraduire = SCENES_MAX ? scenesSource.slice(0, SCENES_MAX) : scenesSource;
  const usages = [];
  const traduites = [];
  const griefs = [];
  let appels = 0;

  for (const [i, scene] of aTraduire.entries()) {
    process.stdout.write(`  scène ${i + 1}/${aTraduire.length} → ${LANGUE} … `);
    const issue = await traduireScene({
      client,
      texte: scene.text,
      sourceLang: src.baseLanguage ?? 'fr',
      targetLang: LANGUE,
      kind: 'scene',
      contexte: {
        tourTitle: src.title ?? null,
        city: src.city ?? null,
        sceneTitle: scene.title ?? null,
        sceneIndex: i + 1,
        sceneCount: scenesSource.length,
      },
    });
    appels += issue.appels;

    if (!issue.ok) {
      console.log(`ÉCHEC (${issue.code})`);
      griefs.push(`${LANGUE}/${scene.sceneId} : ${issue.message}`);
      continue;
    }
    usages.push(issue.usage);
    traduites.push({
      sceneId: scene.sceneId,
      title: scene.title,
      text: issue.texte,
      sourceText: scene.text,
      sourceTitle: scene.title,
    });
    console.log(
      `ok · ${issue.usage.input_tokens} jetons d'entrée, ${issue.usage.output_tokens} de sortie, ` +
        `cache lu ${issue.usage.cache_read_input_tokens}`,
    );
  }

  const verdict = juge(traduites, LANGUE);

  // Une exécution partielle (--scenes N) fait forcément échouer la parité :
  // le dire, plutôt que de laisser croire à un défaut du pipeline.
  const partielle = aTraduire.length !== scenesSource.length;
  const griefsJuge = partielle
    ? verdict.griefs.filter((g) => !/scènes au corpus pour|segments en base pour/.test(g))
    : verdict.griefs;
  if (partielle) {
    console.log('');
    console.log(
      `  NB — exécution partielle (${aTraduire.length}/${scenesSource.length} scènes) : ` +
        'la parité de Scènes n’est PAS évaluée.',
    );
  }

  const dents = jugeMordant(traduites, LANGUE);
  if (!dents.ok) {
    griefs.push(`le juge n'a PAS refusé une sortie corrompue (${dents.sourds.join(', ')})`);
  }
  console.log('');
  console.log('  ── le juge a-t-il des dents ? ───────────────────────────────────');
  for (const [nom, mord] of dents.essais ?? []) {
    console.log(`  ${mord ? 'refusé' : 'ACCEPTÉ (!)'}  ${nom}`);
  }

  return {
    griefs: [...griefs, ...griefsJuge],
    controles: verdict.controles,
    usages,
    appels,
  };
}

const bilan = SANS_APPEL ? epreuveSansAppel() : await epreuveAvecAppels();

// ── Rapport ─────────────────────────────────────────────────────────────────

console.log('');
console.log('  ── balisage ─────────────────────────────────────────────────────');
const signature = scenesSource.map((s) => pauses(s.text)).filter(Boolean).length;
console.log(
  `  ${NB_PAUSES} balise(s) à la source, réparties sur ${signature} scène(s) sur ${scenesSource.length}.`,
);

if (bilan.usages.length) {
  const somme = bilan.usages.reduce(
    (a, u) => ({
      input_tokens: a.input_tokens + u.input_tokens,
      output_tokens: a.output_tokens + u.output_tokens,
      cache_creation_input_tokens: a.cache_creation_input_tokens + u.cache_creation_input_tokens,
      cache_read_input_tokens: a.cache_read_input_tokens + u.cache_read_input_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  );

  console.log('');
  console.log('  ── jetons et coût, tels que rendus par l’API ────────────────────');
  console.log(`  modèle              ${MODELE}`);
  console.log(`  appels fournisseur  ${bilan.appels} pour ${bilan.usages.length} scène(s) abouties`);
  console.log(`  entrée              ${somme.input_tokens}`);
  console.log(`  sortie              ${somme.output_tokens}`);
  console.log(`  écriture de cache   ${somme.cache_creation_input_tokens}`);
  console.log(`  lecture de cache    ${somme.cache_read_input_tokens}`);
  console.log(`  coût fournisseur    ${coutCentimes(somme)} centime(s) de dollar`);
  console.log('');
  // Rapporté tel quel, zéro compris. Le préfixe système tombe près du minimum
  // cacheable ; aucune conclusion n'est tirée dans un sens ni dans l'autre.
  if (somme.cache_read_input_tokens === 0) {
    console.log(
      '  cache_read_input_tokens = 0 sur toute l’exécution : le préfixe système\n' +
        '  n’a jamais été servi depuis le cache. Constat, pas conclusion.',
    );
  } else {
    console.log(
      `  cache_read_input_tokens = ${somme.cache_read_input_tokens} : le préfixe système a été\n` +
        '  servi depuis le cache. Valeur observée, rapportée telle quelle.',
    );
  }
}

console.log('');
console.log('  ── verdict ──────────────────────────────────────────────────────');
if (bilan.controles === 0) {
  // Aucun segment comparé : ne rien avoir contrôlé n est pas un succès. Mais si
  // des griefs existent déjà (toutes les scènes ont échoué à la traduction),
  // c est une NON-CONFORMITÉ, pas une panne du script — et la table des codes
  // de sortie doit rester vraie.
  if (bilan.griefs.length === 0) {
    console.log("  PANNE - aucun segment compare, et aucun grief : rien n a ete controle.");
    process.exit(2);
  }
  console.log(`  NON CONFORME - aucun segment n a abouti (${bilan.griefs.length} grief(s)) :`);
  for (const g of bilan.griefs.slice(0, 40)) console.log(`    . ${g}`);
  process.exit(1);
}

if (bilan.griefs.length === 0) {
  console.log(`  CONFORME — ${bilan.controles} segment(s) contrôlé(s), aucun grief.`);
} else {
  console.log(`  NON CONFORME — ${bilan.griefs.length} grief(s) sur ${bilan.controles} contrôle(s) :`);
  for (const g of bilan.griefs.slice(0, 40)) console.log(`    · ${g}`);
  if (bilan.griefs.length > 40) console.log(`    … et ${bilan.griefs.length - 40} de plus.`);
}
console.log('');

if (JOURNAL) {
  fs.mkdirSync(CERTIF_DIR, { recursive: true });
  const nom = `eprouve-claude-${TOUR}-${LANGUE ?? 'sans-appel'}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(
    path.join(CERTIF_DIR, nom),
    JSON.stringify(
      {
        tourId: TOUR,
        langue: LANGUE,
        moteur: MOTEUR,
        modele: MODELE,
        sansAppel: SANS_APPEL,
        balisesSource: NB_PAUSES,
        controles: bilan.controles,
        appels: bilan.appels,
        usages: bilan.usages,
        griefs: bilan.griefs,
        conforme: bilan.griefs.length === 0,
        horodatage: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`  journal écrit : ${path.join(CERTIF_DIR, nom)}`);
  console.log('');
}

process.exit(bilan.griefs.length === 0 ? 0 : 1);

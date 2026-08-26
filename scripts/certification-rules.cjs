/**
 * certification-rules.cjs — la règle de certification, pure et sans entrées/sorties.
 *
 * Écrit en CommonJS À DESSEIN : `certifie-retraduction.mjs` l'importe comme
 * module ESM (Node l'autorise) et Jest le charge nativement, sans transformateur.
 * C'est le seul format que les deux consomment sans configuration — et le
 * contrôle qui décide de la conformité du catalogue ne doit pas être la seule
 * pièce du chantier que rien n'éprouve.
 *
 * Sans entrées/sorties : ni AWS, ni système de fichiers. La seule dépendance est
 * `source-hash.cjs`, qui porte l'empreinte de fraîcheur — elle vit à part parce
 * qu'elle est partagée avec le semis, et parce qu'une copie manuelle de plus est
 * exactement ce qui a produit le défaut que ce contrôle révèle.
 */

const { hashSourceText: hashParDefaut } = require('./source-hash.cjs');

/**
 * Élague les bords ET normalise les fins de ligne.
 *
 * Le CRLF n'est pas un détail cosmétique ici : `core.autocrlf` vaut `true` sur
 * les postes Windows du projet et aucun `.gitattributes` ne fige le corpus. Sur
 * une copie de travail fraîche, `content/translations/out` arrive donc en CRLF
 * pendant que DynamoDB rend du LF — sans cette normalisation, la certification
 * déclarerait les 3 810 segments divergents sur des données parfaitement saines.
 *
 * Tolérant au non-texte : une valeur inattendue vaut chaîne vide, jamais une
 * exception au milieu d'un balayage de catalogue.
 */
const norm = (texte) =>
  (typeof texte === 'string' ? texte : '').replace(/\r\n?/g, '\n').trim();

/**
 * Balisage de pause, trié — même règle que `retrad-parse.mjs:136`, qui contrôle
 * le corpus AVANT semis. Ici on contrôle ce qui a atterri, ce qui n'est pas la
 * même affirmation.
 */
const pauses = (texte) =>
  ((typeof texte === 'string' ? texte : '').match(/<break\b[^>]*>/g) ?? []).sort().join('|');

/** Jumeau de `isPublicCatalogueTour` (src/lib/api/public-tour-policy.ts). */
function estDuCatalogue(tour, env = process.env) {
  if (env.E2E_ALLOW_TEST_TOURS === 'true') return true;
  const titre = (tour?.title ?? '').trimStart().toLowerCase();
  return !titre.startsWith('e2e-') && !titre.startsWith('persistence test ');
}

/**
 * Contrôle d'UNE Visite. Rend les griefs dans l'ordre où ils se présentent :
 * la langue et la scène sont toujours nommées, parce qu'un rapport qui dit
 * seulement « non conforme » n'aide personne à réparer.
 *
 * @param src        source française : { scenes: [{sceneId, text, title}] }
 * @param out        corpus relu : { [lang]: { title, description, scenes[] } }
 * @param langs      langues à certifier
 * @param segments   Map `${sceneId}|${lang}` -> SceneSegment
 * @param scenes     Map sceneId -> StudioScene
 */
function controleVisite({ src, out, langs, segments, scenes, hashSourceText = hashParDefaut }) {
  const griefs = [];
  const parLangue = {};
  let controles = 0;
  let concordants = 0;

  const srcScenes = Array.isArray(src?.scenes) ? src.scenes : [];
  const srcById = new Map(srcScenes.map((s) => [s.sceneId, s]));
  const nbScenes = srcById.size;
  if (nbScenes === 0) griefs.push('fr : source sans aucune scène');
  // Une Map dédoublonne en silence : sans ce contrôle, `nbScenes` sous-compte et
  // les griefs de parité qui en découlent deviennent faux plutôt qu'absents.
  if (srcById.size !== srcScenes.length) {
    griefs.push(`fr : ${srcScenes.length - srcById.size} sceneId dupliqué(s) à la source`);
  }

  // Le français est un objet de CONTRÔLE : altéré, il invalide tout le reste,
  // puisque c'est lui que les traductions sont censées rendre.
  for (const s of srcScenes) {
    const scene = scenes.get(s.sceneId);
    if (!scene) { griefs.push(`fr/${s.sceneId} : scène absente en base`); continue; }
    if (scene.archived) griefs.push(`fr/${s.sceneId} : scène archivée`);
    if (norm(scene.transcriptText) !== norm(s.text)) {
      griefs.push(`fr/${s.sceneId} : texte source divergent`);
    }
    if (!scene.studioAudioKey) griefs.push(`fr/${s.sceneId} : audio français absent`);
  }

  for (const lang of langs) {
    const bloc = out?.[lang];
    if (!bloc) {
      griefs.push(`${lang} : absent du corpus relu`);
      // Une entrée quand même : sans elle, le journal ne distingue pas « langue
      // absente » de « langue non contrôlée ».
      parLangue[lang] = { attendus: nbScenes, presents: 0, concordants: 0 };
      continue;
    }
    if (!norm(bloc.title)) griefs.push(`${lang} : titre de Visite vide`);
    if (!norm(bloc.description)) griefs.push(`${lang} : description de Visite vide`);

    const blocScenes = Array.isArray(bloc.scenes) ? bloc.scenes : [];
    if (!Array.isArray(bloc.scenes)) griefs.push(`${lang} : liste de scènes malformée`);

    const vus = new Set();
    let presents = 0;
    let concordantsLangue = 0;
    for (const sc of blocScenes) {
      controles++;
      // Un `sceneId` répété passerait les DEUX contrôles de parité tout en
      // laissant une scène jamais contrôlée.
      if (vus.has(sc.sceneId)) {
        griefs.push(`${lang}/${sc.sceneId} : scène en double dans le corpus`);
        continue;
      }
      vus.add(sc.sceneId);

      if (!srcById.has(sc.sceneId)) {
        griefs.push(`${lang}/${sc.sceneId} : scène inconnue de la source`);
        continue;
      }
      const seg = segments.get(`${sc.sceneId}|${lang}`);
      if (!seg) { griefs.push(`${lang}/${sc.sceneId} : segment absent en base`); continue; }
      presents++;

      // Tous les griefs d'un segment sont relevés ENSEMBLE. En s'arrêtant au
      // premier, réparer puis recontrôler devenait une boucle à N passes.
      const dus = [];
      const srcScene = srcById.get(sc.sceneId);

      if (!norm(sc.text)) dus.push('texte de scène vide au corpus');
      else if (norm(seg.transcriptText) !== norm(sc.text)) dus.push('texte divergent du corpus relu');
      // Passe-plat : une scène laissée en français est traduite en apparence
      // seulement, et l'étape suivante paierait pour la synthétiser telle quelle.
      else if (norm(sc.text) === norm(srcScene.text)) dus.push('texte identique au français — scène non traduite');

      if (pauses(srcScene.text) !== pauses(seg.transcriptText)) {
        dus.push('balisage de pause divergent de la source');
      }
      // `retrad-3-seed.mjs` sème AUSSI `translatedTitle` depuis le même corpus, et
      // 34 fichiers le lisent. Hors comparaison, un titre anglais survivant sur un
      // segment allemand passerait certifié — le README promet pourtant que le
      // texte en base est celui du corpus.
      if (norm(seg.translatedTitle) !== norm(sc.title)) {
        dus.push('titre de scène divergent du corpus relu');
      }
      if (seg.audioKey) dus.push(`audio traduit résiduel (${seg.audioKey})`);
      if (String(seg.translationProvider ?? '').toLowerCase() === 'marianmt') {
        dus.push("marqueur d'origine « marianmt » résiduel");
      }
      // Le marqueur le plus parlant d'un TTS périmé ne comptait que HORS
      // périmètre — c'est-à-dire nulle part où il importe.
      if (seg.status === 'tts_generated') dus.push('statut « tts_generated » résiduel');
      // `sourceTextHash` pilote la péremption affichée par le Studio
      // (`staleness-detector.ts`). Sans ce contrôle, le catalogue peut être
      // certifié conforme tout en s'affichant entièrement périmé au guide.
      if (typeof hashSourceText === 'function') {
        const scene = scenes.get(sc.sceneId);
        if (scene) {
          const attendu = hashSourceText(scene.transcriptText, scene.title);
          if (seg.sourceTextHash == null) dus.push('empreinte de source absente — péremption indécidable');
          else if (seg.sourceTextHash !== attendu) dus.push('empreinte de source périmée — le Studio affichera « à retraduire »');
        }
      }

      if (dus.length) {
        for (const d of dus) griefs.push(`${lang}/${sc.sceneId} : ${d}`);
        continue;
      }
      concordantsLangue++;
      concordants++;
    }

    // Parité dans les deux sens : le corpus contre la source, la base contre la source.
    if (blocScenes.length !== nbScenes) {
      griefs.push(`${lang} : ${blocScenes.length} scènes au corpus pour ${nbScenes} à la source`);
    }
    if (presents !== nbScenes) {
      griefs.push(`${lang} : ${presents} segments en base pour ${nbScenes} scènes`);
    }
    parLangue[lang] = { attendus: nbScenes, presents, concordants: concordantsLangue };
  }

  return { griefs, parLangue, controles, concordants };
}

/**
 * Verdict global.
 *
 * Trois façons pour un contrôle de mentir par construction, toutes fermées ici :
 *  - un rapport VIDE — ne rien avoir contrôlé n'est pas n'avoir rien trouvé ;
 *  - zéro segment réellement comparé, même avec des Visites au rapport ;
 *  - un corpus qui ne couvre qu'une partie du catalogue publié. Le contrôleur
 *    itère le CORPUS : sans ce rapprochement, une Visite publiée sans fichier de
 *    corpus n'est jamais certifiée et le verdict la passe sous silence.
 */
function verdictGlobal(rapport, { controles = null, catalogueNonCouvert = [] } = {}) {
  const duCatalogue = rapport.filter((r) => r.catalogue);
  const enDefaut = duCatalogue.filter((r) => r.griefs.length > 0);
  const motifs = [];
  if (duCatalogue.length === 0) motifs.push('aucune Visite de catalogue contrôlée');
  if (controles === 0) motifs.push('aucun segment comparé');
  if (catalogueNonCouvert.length) {
    motifs.push(`${catalogueNonCouvert.length} Visite(s) publiée(s) sans corpus : ${catalogueNonCouvert.slice(0, 5).join(', ')}${catalogueNonCouvert.length > 5 ? '…' : ''}`);
  }
  if (enDefaut.length) motifs.push(`${enDefaut.length} Visite(s) en défaut`);
  return {
    conforme: motifs.length === 0,
    motif: motifs.length ? motifs.join(' ; ') : null,
    enDefaut,
  };
}

module.exports = { norm, pauses, estDuCatalogue, controleVisite, verdictGlobal };

/**
 * debite-campagne-descriptions.mjs — porte au grand livre (enveloppe interne)
 * la dépense fournisseur de la campagne de traduction des sous-titres du
 * 2026-09-04, via le MÊME crochet comptable que le pipeline (AD-16 §1 : un
 * script qui appelle le fournisseur hors du portail doit déclarer sa dépense).
 *
 * Usage total déclaré = campagne (4 694 176 / 43 116) + essai --limite 5
 * (6 141 / 45) + 2 appels rejetés par le garde de balisage (estimés 2 456 / 80,
 * le relevé d'échec ne rend pas l'usage). Arrondi AU SUPÉRIEUR par le tarif.
 */
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

process.env.SPENDLEDGER_TABLE =
  'amplify-dieqe5vfmuc69-main-branch-347ea276f6-SpendLedgerFB9B56F3-7CMUMOVFE4J5-SpendLedgerTableAAB323F7-1HY05X44F77GA';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, '..', '..', 'TourGuideApp', 'amplify', 'shared');
const egress = await import(pathToFileURL(path.join(SHARED, 'spend-egress.ts')).href);
const ledger = await import(pathToFileURL(path.join(SHARED, 'spend-ledger.ts')).href);

const USAGE = {
  input_tokens: 4_922_218 + 3_700,
  output_tokens: 41_060 + 40,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};
console.log('micros à débiter :', ledger.microsDeTraduction(USAGE));

const crochet = egress.crochetDeTraduction({
  enveloppe: 'interne',
  rattachement: ledger.rattachementInterne('campagne-titres-poi-v2', 'multi'),
  decouvert: false,
  texte: 'x'.repeat(75_000),
});
await crochet.avantAppel();
await crochet.conclure(USAGE);
console.log('DÉBIT ÉCRIT ET RÉCONCILIÉ (émissions :', crochet.emissions(), ')');

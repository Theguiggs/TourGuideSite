/**
 * Porte au grand livre (enveloppe interne) la synthèse des 19 Scènes de
 * Barcelone — 36 414 caractères, tarif de synthèse. AD-16 §1.
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

const CARACTERES = 36_414;
console.log('micros a debiter :', ledger.microsDeSynthese(CARACTERES));

const crochet = egress.facturationDeSynthese({
  enveloppe: 'interne',
  rattachement: ledger.rattachementInterne('barcelone-audio-fr', 'fr'),
  decouvert: false,
});
await crochet.debiter(CARACTERES);
console.log('DEBIT ECRIT ET RECONCILIE');

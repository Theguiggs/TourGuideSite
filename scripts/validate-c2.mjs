/**
 * Validation C2 — auto-publication guide bloquée.
 *
 * Vérifie que, connecté en tant que GUIDE (non-admin) :
 *   [A] updateGuideTour({status:'published'}) en direct          → REFUSÉ (field-level auth)
 *   [B] setTourWorkflowStatus({status:'published'}) (mutation)   → REFUSÉ (whitelist Lambda)
 *   [C] setTourWorkflowStatus({status: <statut courant>})        → ACCEPTÉ (transition guide légitime, no-op)
 *
 * Usage (depuis C:\Projects\Bmad\TourGuideWeb) :
 *   node scripts/validate-c2.mjs <email-guide> <mot-de-passe> <tourId-possédé>
 *
 * Prérequis : compte GUIDE NON-ADMIN, et tourId appartenant à ce guide.
 * (Un compte admin PEUT écrire status — le test serait faussé ; le script prévient.)
 */
import { readFileSync } from 'node:fs';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { generateClient } from 'aws-amplify/api';

// --- Amplify en Node : storage tokens en mémoire (pas de localStorage) --------
const mem = new Map();
cognitoUserPoolsTokenProvider.setKeyValueStorage({
  setItem: async (k, v) => { mem.set(k, v); },
  getItem: async (k) => (mem.has(k) ? mem.get(k) : null),
  removeItem: async (k) => { mem.delete(k); },
  clear: async () => { mem.clear(); },
});

const outputs = JSON.parse(readFileSync(new URL('../amplify_outputs.json', import.meta.url)));
Amplify.configure(outputs);

const [, , email, password, tourId] = process.argv;
if (!email || !password || !tourId) {
  console.error('Usage: node scripts/validate-c2.mjs <email-guide> <mot-de-passe> <tourId>');
  process.exit(1);
}

const GUIDE_ALLOWED = ['draft', 'synced', 'editing', 'review', 'pending_moderation', 'archived'];
const client = generateClient();

/** Une écriture modèle est refusée si Amplify renvoie des errors et/ou data null. */
const modelRejected = (res) => !!(res?.errors?.length) || res?.data == null;

async function main() {
  await signIn({ username: email, password });
  const session = await fetchAuthSession();
  const groups = session.tokens?.idToken?.payload?.['cognito:groups'] ?? [];
  console.log(`Connecté : ${email}  | groupes : ${JSON.stringify(groups)}`);
  const isAdmin = Array.isArray(groups) && groups.includes('admin');
  if (isAdmin) {
    console.warn('\n⚠️  CE COMPTE EST ADMIN → il PEUT écrire status légitimement.');
    console.warn('   Le test n’est concluant qu’avec un compte GUIDE NON-ADMIN.\n');
  }

  const cur = await client.models.GuideTour.get({ id: tourId }, { authMode: 'userPool' });
  const currentStatus = cur?.data?.status;
  console.log(`Tour ${tourId} — status courant : ${currentStatus ?? '(introuvable/illisible)'}\n`);

  // [A] écriture directe interdite
  const a = await client.models.GuideTour.update(
    { id: tourId, status: 'published' },
    { authMode: 'userPool' },
  );
  const aOk = modelRejected(a);
  console.log(`[A] updateGuideTour(status:'published') direct  → ${aOk ? 'REFUSÉ ✅' : 'ACCEPTÉ ❌ (FAILLE)'}`);
  if (a?.errors?.length) console.log(`    raison : ${a.errors.map((e) => e.message).join('; ')}`);

  // [B] mutation avec statut interdit
  const b = await client.mutations.setTourWorkflowStatus(
    { tourId, status: 'published' },
    { authMode: 'userPool' },
  );
  const bRejected = b?.data && b.data.ok === false;
  console.log(`[B] setTourWorkflowStatus(status:'published')   → ${bRejected ? 'REFUSÉ ✅' : 'ACCEPTÉ ❌ (FAILLE)'}`);
  if (b?.data?.error) console.log(`    raison : ${b.data.error}`);
  if (b?.errors?.length) console.log(`    graphql : ${b.errors.map((e) => e.message).join('; ')}`);

  // [C] transition guide légitime (no-op : remet le statut courant s'il est autorisé)
  if (currentStatus && GUIDE_ALLOWED.includes(currentStatus)) {
    const c = await client.mutations.setTourWorkflowStatus(
      { tourId, status: currentStatus },
      { authMode: 'userPool' },
    );
    const cOk = c?.data?.ok === true;
    console.log(`[C] setTourWorkflowStatus(status:'${currentStatus}') → ${cOk ? 'ACCEPTÉ ✅' : 'REFUSÉ ❌'}${c?.data?.error ? ` (${c.data.error})` : ''}`);
  } else {
    console.log(`[C] sauté (status courant '${currentStatus}' non guide-allowed — éviterait un changement d’état involontaire)`);
  }

  console.log('\n— Verdict —');
  if (isAdmin) {
    console.log('Compte admin : test non concluant. Relance avec un compte guide non-admin.');
  } else if (aOk && bRejected) {
    console.log('C2 OK ✅  — un guide ne peut pas s’auto-publier (écriture directe ET mutation refusées).');
  } else {
    console.log('C2 ÉCHEC ❌ — une voie d’auto-publication reste ouverte (voir [A]/[B] ci-dessus).');
  }

  await signOut();
}

main().catch((e) => {
  console.error('Erreur :', e?.message ?? e);
  process.exit(1);
});

/**
 * AppSync GraphQL client for the web portal.
 *
 * Server-side: uses runWithAmplifyServerContext for SSR/SSG pages.
 * Client-side: uses generateClient() with auth tokens.
 *
 * All functions return typed data or null on error (graceful degradation).
 */

import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import type { Schema } from '@amplify-schema';
import { configureAmplify } from '@/lib/amplify/config';
import { logger } from '@/lib/logger';
import { isPublicCatalogueTour } from './public-tour-policy';
import { isPublicCatalogueGuide } from './public-guide-policy';
import { disclosureWriteViolation } from './audio-source-policy';
import {
  BORNE_LECTURE_PROFILS,
  profilAppartientAuSub,
  statutDisqualifie,
  type LigneProfilGuide,
} from '@/lib/auth/guide-qualification';

const SERVICE_NAME = 'AppSyncClient';

// Browser singleton — reused across navigations on the client
let _browserClient: ReturnType<typeof generateClient<Schema>> | null = null;

export function getClient() {
  const isServer = typeof window === 'undefined';
  if (!isServer && _browserClient) return _browserClient;

  // Auto-configure if not yet done (covers server-side calls before AmplifyProvider runs)
  const config = Amplify.getConfig();
  if (!config?.API?.GraphQL?.endpoint) {
    configureAmplify();
  }

  const client = generateClient<Schema>();
  if (!isServer) _browserClient = client;
  return client;
}

// --- Public Queries (Tours, Cities, Guides) ---

export async function listGuideTours(filters?: { city?: string; status?: string }) {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.list({
      filter: {
        ...(filters?.city ? { city: { eq: filters.city } } : {}),
        ...(filters?.status ? { status: { eq: filters.status as 'published' } } : {}),
      },
    });
    return (result.data ?? []).filter(isPublicCatalogueTour);
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideTours failed', { error: String(error) });
    return [];
  }
}

/** Admin-only: list all tours regardless of status, using userPool auth. */
export async function listAllGuideTours() {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.list({ authMode: 'userPool' });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listAllGuideTours failed', { error: String(error) });
    return [];
  }
}

/**
 * Lecture d'une Visite qui distingue « absente » de « lecture en echec ».
 * `getGuideTourById` confond les deux en `null` : tout appelant qui doit decider
 * s'il vaut la peine de reessayer — ou refuser une publication — passe par ici.
 */
export async function getGuideTourResult(id: string) {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.get({ id }, { authMode: 'userPool' });
    const errs = (result as unknown as { errors?: Array<{ message: string }> }).errors;
    if (errs && errs.length > 0) {
      const msg = errs.map((e) => e.message).join('; ');
      logger.error(SERVICE_NAME, 'getGuideTour returned errors', { id, errors: msg });
      return { ok: false as const, error: msg };
    }
    const data = Array.isArray(result.data) ? (result.data[0] ?? null) : (result.data ?? null);
    return { ok: true as const, data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideTourById failed', { error: String(error) });
    return { ok: false as const, error: String(error) };
  }
}

export async function getGuideTourById(id: string) {
  const result = await getGuideTourResult(id);
  return result.ok ? result.data : null;
}

export async function listGuideProfiles(filters?: { city?: string }) {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.list({
      filter: {
        ...(filters?.city ? { city: { eq: filters.city } } : {}),
        profileStatus: { eq: 'active' },
      },
    });
    return (result.data ?? []).filter(isPublicCatalogueGuide);
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideProfiles failed', { error: String(error) });
    return [];
  }
}

/** Admin-only: list all guide profiles regardless of profileStatus. */
export async function listAllGuideProfilesAdmin() {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.list({ authMode: 'userPool' });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listAllGuideProfilesAdmin failed', { error: String(error) });
    return [];
  }
}

export async function getGuideProfileById(id: string, authMode?: 'userPool' | 'iam') {
  try {
    const client = getClient();
    // get() takes input as 1st arg, options (incl. authMode) as 2nd arg
    const result = await client.models.GuideProfile.get(
      { id },
      authMode ? { authMode } : {},
    );
    return Array.isArray(result.data) ? (result.data[0] ?? null) : (result.data ?? null);
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideProfileById failed', { error: String(error) });
    return null;
  }
}

/**
 * Lecture d'AUTORISATION : toutes les lignes `GuideProfile` de ce `sub`, lues
 * par l'INDEX `guideProfilesByUserId` (champ de requête `listGuideProfileByUserId`).
 *
 * POURQUOI PAS UN `list({filter:{userId}})` — le lecteur par balayage qui
 * tenait ici, `getGuideProfileByUserId`, est SUPPRIMÉ : ne le réintroduisez pas,
 * sous aucun nom. Un `list({filter})` est un BALAYAGE de table, et il ment dans
 * les DEUX sens. Il rend `null` pour un guide parfaitement légitime dont la ligne
 * tombe dans une page non lue, car DynamoDB filtre APRÈS avoir lu sa page de
 * 1 Mo. Et son `data?.[0]` ne PROUVE pas la propriété : il la délègue au filtre
 * serveur, qui n'est pas la règle de propriété mais lui ressemble tant que le
 * schéma dit `ownerDefinedIn('userId')` — le jour où les deux s'écartent, il rend
 * une ligne que le juge refuse. Son `nextToken`, enfin, est non nul dès
 * que la TABLE dépasse une page, sans aucun rapport avec les doublons — il ne
 * peut donc pas nourrir la règle de vue tronquée. L'index, lui, est une REQUÊTE
 * sur clé de partition : sa page ne contient que les lignes de ce `sub`, et son
 * `nextToken` signifie exactement « il reste des lignes À CE SUB ».
 *
 * LE JEU DE SÉLECTION — CE QUI A CHANGÉ, ET CE QU'IL FAUT EN FAIRE
 * ----------------------------------------------------------------
 * DEUX rédactions successives se sont trompées ici, en sens inverse. La première
 * disait « ne jamais retirer `owner` du jeu de sélection » ; la seconde, « `owner`
 * n'y est plus DU TOUT ». Les deux étaient fausses. L'état réel :
 * `resolveOwnerFields` tire les champs de propriété des règles d'auth, le modèle
 * en porte DEUX — l'autorité `ownerDefinedIn('userId').identityClaim('sub')` et
 * une TRANSITION `allow.owner().to(['read'])` — et il rend donc
 * `['userId', 'owner']`.
 *
 * `owner` est ainsi MORT SANS ÊTRE ABSENT : toujours dans le type, toujours
 * sélectionné, plus jamais écrit. Il vaut son composite `"<sub>::<sub>"` sur les
 * lignes antérieures à la bascule et `null` sur toutes les suivantes. Un tri
 * resté sur `ligne.owner` compilerait, passerait les contrôles négatifs du parc
 * vivant, et verrouillerait chaque NOUVEAU guide. Ne le lisez pas.
 *
 * Ce sur quoi on trie désormais, `userId`, est un champ EXPLICITE du modèle
 * (`model_introspection.models.GuideProfile.fields`) : il est sélectionné par
 * défaut quelles que soient les règles d'auth, avant comme après le déploiement
 * du schéma. LA RÈGLE QUI RESTE : ne JAMAIS passer ici de `selectionSet`
 * explicite qui omette `userId` ou `profileStatus` — la comparaison porterait sur
 * `undefined` et le juge refuserait tout le monde en silence. Deux épreuves
 * tiennent ce piège : `guide-profile-authz-read.test.ts` interdit le
 * `selectionSet` amputé, et `guide-qualification-jeu-de-selection.test.ts`
 * DÉRIVE le jeu de sélection des règles d'auth réelles pour que tout changement
 * du modèle de propriété fasse tomber quelque chose.
 *
 * Le chemin IAM du portail lit TOUT : `allow.authenticated().to(['read'])` et le
 * rôle IAM du portail voient la table entière. C'est pourquoi le tri par `userId`
 * se fait ici, dans le code du portail (`qualifieGuide`), et ne se délègue pas au
 * backend — même si, depuis la bascule, aucune ligne étrangère ne peut plus
 * apparaître dans la page d'un `sub` donné.
 *
 * `ok: false` = lecture RATÉE. À ne surtout pas confondre avec « aucun profil » :
 * l'appelant doit refuser SANS mémoriser le refus.
 */
/**
 * La ligne telle que le client la rend.
 *
 * ATTENTION — `Schema['GuideProfile']['type']` PORTE ENCORE `owner` : la règle de
 * transition `allow.owner().to(['read'])` l'y maintient, le temps que les
 * binaires distribués cessent de le réclamer. Cette intersection le porte donc,
 * et `ligne.owner` COMPILE. Le compilateur ne dira rien.
 *
 * `LigneProfilGuide` n'en déclare pas, et il ne faut pas l'y remettre « au cas
 * où » — mais ne comptez plus là-dessus : ce qui interdit la lecture est
 * `src/lib/auth/__tests__/owner-champ-mort.test.ts`, qui relit les sources.
 */
export type LigneProfilLue = Schema['GuideProfile']['type'] & LigneProfilGuide;

export async function listGuideProfilePageByUserId(
  userId: string,
  authMode?: 'userPool' | 'iam',
): Promise<
  { ok: true; lignes: LigneProfilLue[]; tronquee: boolean } | { ok: false; erreur: string }
> {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.listGuideProfileByUserId(
      { userId },
      { limit: BORNE_LECTURE_PROFILS, ...(authMode ? { authMode } : {}) },
    );
    const errs = result.errors;
    if (errs && errs.length > 0) {
      const msg = errs.map((e) => e.message).join('; ');
      logger.error(SERVICE_NAME, 'listGuideProfilePageByUserId returned errors', {
        userId,
        errors: msg,
      });
      return { ok: false, erreur: msg };
    }
    return {
      ok: true,
      lignes: (result.data ?? []) as LigneProfilLue[],
      tronquee: result.nextToken != null,
    };
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideProfilePageByUserId failed', { error: String(error) });
    return { ok: false, erreur: String(error) };
  }
}

/**
 * Le profil de CE compte, et de lui seul — pour les écrans, et pour le test
 * d'idempotence du signup. Jamais pour juger le rôle : ça, c'est `qualifieGuide`.
 *
 * Même défaut que le juge, autre conséquence : quand `userId` était un champ
 * LIBRE, une ligne plantée par un tiers sous le `userId` d'un guide pouvait
 * SORTIR à la place de la sienne. Le guide voyait alors le profil de l'attaquant
 * sur ses propres écrans, et toute écriture visait l'`id` de l'attaquant —
 * refusée par le backend, donc profil définitivement inéditable. Le filtre reste
 * en place après la bascule : il ne coûte rien, il couvre les lignes héritées
 * d'avant, et il garde ce chemin juste si le schéma reculait.
 *
 * CE QUE `null` VEUT DIRE, ET CE QUE L'APPELANT DOIT EN FAIRE. Une lecture ratée
 * rend `null`, indistinctement d'« aucun profil » : c'est voulu pour les
 * appelants qui dégradent gracieusement, et ils ne décident d'AUCUNE
 * autorisation — le rôle se juge par `qualifieGuide`, qui reçoit `ok:false` et
 * refuse SANS mémoriser le refus.
 *
 * Le signup (`/guide/signup`) s'en sert aussi, pour un autre usage : décider s'il
 * doit créer le profil. Là, `null` fait CRÉER, et c'est le bon sens d'erreur — au
 * pire un doublon, jamais un compte sans profil. Tout appelant qui, lui, doit
 * distinguer « rien lu » de « rien à lire » passe par
 * `listGuideProfilePageByUserId` et lit son `ok`.
 */
export async function getOwnGuideProfile(sub: string, authMode?: 'userPool' | 'iam') {
  const lecture = await listGuideProfilePageByUserId(sub, authMode);
  if (!lecture.ok) return null;

  const miennes = lecture.lignes.filter((ligne) => profilAppartientAuSub(ligne.userId, sub));
  if (miennes.length === 0) return null;
  if (lecture.tronquee) {
    logger.warn(SERVICE_NAME, 'Page de profils tronquée — doublons possibles', { sub });
  }
  // Une ligne disqualifiante prime : le guide doit VOIR sa suspension plutôt
  // qu'un doublon actif qui la masquerait.
  return miennes.find((ligne) => statutDisqualifie(ligne.profileStatus)) ?? miennes[0];
}

export async function listTourReviews(tourId: string) {
  try {
    const client = getClient();
    // Try userPool first (guides viewing their own tour's reviews), fall back to default
    let result = await client.models.TourReview.list({
      filter: {
        tourId: { eq: tourId },
        status: { eq: 'visible' },
      },
      authMode: 'userPool',
    });
    if ((result.data?.length ?? 0) === 0 && !result.errors) {
      // Retry with default auth (e.g. guest/identity pool)
      result = await client.models.TourReview.list({
        filter: {
          tourId: { eq: tourId },
          status: { eq: 'visible' },
        },
      });
    }
    logger.info(SERVICE_NAME, 'listTourReviews', {
      tourId,
      count: result.data?.length ?? 0,
      hasErrors: !!result.errors,
    });
    return (result.data ?? []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    logger.error(SERVICE_NAME, 'listTourReviews failed', { error: String(error) });
    return [];
  }
}

/**
 * List a tour's guide-replies (one per review). Degrades to [] if the ReviewReply
 * model isn't deployed yet, so the Avis page works before/after the schema ships.
 */
export async function listReviewRepliesByTour(tourId: string) {
  try {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (client.models as any).ReviewReply;
    if (!model) {
      logger.warn(SERVICE_NAME, 'ReviewReply model not available — skipping');
      return [] as Array<{ id: string; reviewId: string; tourId: string; guideId: string; message: string }>;
    }
    const result = await model.list({ filter: { tourId: { eq: tourId } }, authMode: 'userPool' });
    return (result.data ?? []) as Array<{ id: string; reviewId: string; tourId: string; guideId: string; message: string }>;
  } catch (error) {
    logger.error(SERVICE_NAME, 'listReviewRepliesByTour failed', { error: String(error) });
    return [];
  }
}

/** Create (or update if one already exists) the guide's reply to a review. */
export async function upsertReviewReply(params: {
  reviewId: string;
  tourId: string;
  guideId: string;
  message: string;
  existingId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (client.models as any).ReviewReply;
    if (!model) {
      return { ok: false, error: 'Les réponses ne sont pas encore disponibles (backend à déployer).' };
    }
    const { reviewId, tourId, guideId, message, existingId } = params;
    const result = existingId
      ? await model.update({ id: existingId, message }, { authMode: 'userPool' })
      : await model.create({ reviewId, tourId, guideId, message }, { authMode: 'userPool' });
    const id = (result?.data as { id?: string } | null)?.id;
    if (!id) return { ok: false, error: 'Réponse non enregistrée.' };
    logger.info(SERVICE_NAME, 'upsertReviewReply ok', { reviewId, updated: !!existingId });
    return { ok: true, id };
  } catch (error) {
    logger.error(SERVICE_NAME, 'upsertReviewReply failed', { error: String(error) });
    return { ok: false, error: String(error) };
  }
}

export async function getTourStats(tourId: string) {
  try {
    const client = getClient();
    const result = await client.models.TourStats.list({
      filter: { tourId: { eq: tourId } },
    });
    return result.data?.[0] ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getTourStats failed', { error: String(error) });
    return null;
  }
}

// --- Moderation Item Creation ---

export async function createModerationItemMutation(data: {
  tourId: string;
  guideId: string;
  guideName: string;
  tourTitle: string;
  city: string;
  submissionDate: number;
  sessionId?: string;
  poiCount?: number;
  duration?: number;
  distance?: number;
}) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.create(
      { ...data, status: 'pending' },
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createModerationItem failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création de la modération' };
  }
}

// --- Guide Mutations ---

export async function createGuideProfileMutation(data: {
  userId: string;
  displayName: string;
  city: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
}) {
  try {
    const client = getClient();
    // `userPool` est OBLIGATOIRE : en IAM le bloc de propriété du résolveur est
    // court-circuité, et `input.userId == claims.sub` ne serait pas vérifié.
    const result = await client.models.GuideProfile.create(
      {
        ...data,
        // SÉCURITÉ (modération) — `profileStatus` est envoyé, `verified` NE L'EST
        // PLUS. Les deux gardent `create` au schéma, mais pas pour les mêmes
        // raisons :
        //  - `profileStatus: 'pending_moderation'` est le sens même de
        //    l'inscription : elle est ouverte par conception, et c'est la
        //    modération qui la borne. Le poser ici est ce qui l'empêche de
        //    s'auto-approuver ;
        //  - `verified: false` n'apportait RIEN — le champ est nullable et tous
        //    ses lecteurs font `?? false`, donc l'absence et le `false` se lisent
        //    pareil. Il n'était là que par habitude, et c'est lui qui OBLIGEAIT
        //    le backend à laisser `create` ouvert sur un signal de confiance
        //    public. Cesser de l'envoyer est la condition, explicitement posée
        //    dans `amplify/data/guide-profile-model.ts`, pour retirer ce `create`
        //    et ne laisser `verified` qu'à l'admin, à la création comme à la
        //    modification. NE PAS LE REMETTRE.
        profileStatus: 'pending_moderation',
        rating: 0,
        tourCount: 0,
      },
      { authMode: 'userPool' },
    );
    logger.info(SERVICE_NAME, 'createGuideProfile result', { hasData: !!result.data, hasErrors: !!result.errors });
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      logger.error(SERVICE_NAME, 'createGuideProfile returned no data', { error: errMsg });
      return { ok: false as const, error: `Erreur profil: ${errMsg}` };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createGuideProfile failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la creation du profil guide' };
  }
}

export async function adminUpdateGuideProfileStatus(id: string, profileStatus: 'active' | 'suspended' | 'rejected') {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.update({ id, profileStatus }, { authMode: 'userPool' });
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'adminUpdateGuideProfileStatus failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise à jour du statut' };
  }
}

/**
 * Les champs qu'un PROPRIÉTAIRE ne peut plus modifier — le backend les a sortis
 * de `$ownerAllowedFields0` de l'update, chacun pour sa raison :
 *
 *  - `userId` PORTE la propriété. Laissé modifiable, son titulaire le
 *    RÉASSIGNAIT au `sub` d'un tiers après coup, ce qui reconstruisait
 *    l'inondation de l'index en deux mutations au lieu d'une ;
 *  - `profileStatus` est LE champ dont dépend `STATUTS_DISQUALIFIANTS` : un
 *    guide suspendu se remettait `active` en une mutation sur SA PROPRE ligne.
 *    « Un suspendu reste suspendu » n'était donc pas une garde, mais une
 *    convention que le suspendu contournait seul ;
 *  - `verified` est le signal de confiance PUBLIC : n'importe quel guide se
 *    décernait le badge en une mutation.
 *
 * Les envoyer fait répondre `Unauthorized on [...]` — MÊME avec la bonne valeur,
 * et la mutation entière échoue. On refuse donc ICI, franchement, plutôt que de
 * laisser un écran casser sur une erreur backend illisible. Le passage admin
 * (`adminUpdateGuideProfileStatus`) n'emprunte PAS cette fonction : le groupe
 * `admin` garde l'écriture, et c'est le seul chemin de modération.
 *
 * La barrière est double À DESSEIN : le TYPE ci-dessous exclut ces champs (c'est
 * ce qui protège les appelants typés, cf. les `@ts-expect-error` de
 * `guide-profile-ecritures.test.ts`), et ce filtre-ci protège le chemin non typé
 * — `guide.ts:updateGuideProfile` reconstruit son entrée par
 * `Object.fromEntries`, qui efface le type.
 */
const CHAMPS_INTERDITS_EN_MODIFICATION = ['userId', 'profileStatus', 'verified'] as const;

export async function updateGuideProfileMutation(
  id: string,
  updates: Partial<{
    displayName: string;
    bio: string;
    city: string;
    specialties: string[];
    languages: string[];
    yearsExperience: number | null;
    photoUrl: string | null;
  }>,
) {
  const interdits = CHAMPS_INTERDITS_EN_MODIFICATION.filter(
    (champ) => champ in (updates as Record<string, unknown>),
  );
  if (interdits.length > 0) {
    logger.error(SERVICE_NAME, 'updateGuideProfile refuse un champ non modifiable', {
      id,
      champs: interdits.join(', '),
    });
    return {
      ok: false as const,
      error: `Champs non modifiables : ${interdits.join(', ')}`,
    };
  }
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.update(
      { id, ...updates },
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateGuideProfile failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise a jour du profil' };
  }
}

/**
 * Champs `a.json()` de GuideTour sérialisés avant envoi (voir serializeJsonFields).
 *
 * `translatedAudioKeys` (également AWSJSON) en est délibérément absent. Son
 * unique écrivain, `language-purchase.ts` (~:810), l'envoie dans la même mutation
 * qu'un `languageAudioTypes` qui REMPLACE la carte entière au lieu de la
 * fusionner. Tant que ce champ reste non sérialisé, AppSync refuse cette mutation
 * dans son ensemble — la débloquer ici ferait aboutir une écriture destructrice.
 * À corriger en même temps que la fusion dans `language-purchase.ts`.
 */
// `translatedAudioKeys` manquait ici alors que le schema le declare `a.json()`.
// Il partait donc en OBJET, et AppSync rejette la mutation entiere dans ce cas
// (meme incident que `languageAudioTypes`) : l'approbation d'une langue
// n'ecrivait alors NI les cles audio NI `availableLanguages`. L'echec restait
// invisible tant que l'appelant ignorait le retour et se repliait sur DynamoDB.
// `translatedAudioKeys` est DÉLIBÉRÉMENT absent. Le champ est de l'AWSJSON, donc
// tant qu'il n'est pas sérialisé AppSync rejette la mutation entière — ce qui
// bloque l'écriture d'approbation de `language-purchase.ts`. Or cette écriture
// reconstruit les trois cartes de zéro et les remplace en bloc, sans fusion :
// l'activer ferait passer « rien ne s'écrit » à « tout est écrasé ». À réactiver
// en même temps que la fusion, pas avant. Voir deferred-work.md.
//
// MISE À JOUR : l'outil de fusion existe désormais (`translated-metadata.ts`),
// mais ce qui manque n'est pas l'outil — c'est son adoption SUR LE SITE d'appel
// de `language-purchase.ts`, qui reconstruit encore ses cartes de zéro. Tant
// que ce site n'a pas basculé, la ligne reste telle quelle.
export const GUIDE_TOUR_JSON_FIELDS = ['translatedTitles', 'translatedDescriptions', 'languageAudioTypes'];

/**
 * Champs AWSJSON de `GuideTour` volontairement HORS de la liste ci-dessus.
 * Exporté pour que l'épreuve de cohérence schéma ↔ liste distingue un oubli
 * d'une exclusion assumée, au lieu de traiter les deux pareil.
 */
export const GUIDE_TOUR_JSON_FIELDS_EXCLUS = ['translatedAudioKeys'];

/** @param updates Unvalidated — callers must ensure keys match schema fields */
export async function updateGuideTourMutation(
  id: string,
  updates: Record<string, unknown>,
) {
  try {
    // CAP-8 — point de passage unique de l'écriture applicative. L'invariant est
    // posé ET maintenu : aucune écriture portant `status: 'published'` ne part
    // sans mention de source audio, et aucune écriture ne vide une mention déjà
    // portée. Le contrôle par langue source, lui, appartient aux appelants métier
    // (moderation.ts) : ici la langue source de la Visite n'est pas connue.
    const violation = disclosureWriteViolation(updates);
    if (violation) {
      logger.error(SERVICE_NAME, 'updateGuideTour refused: audio-source disclosure invariant', { id, violation });
      return { ok: false as const, error: violation };
    }
    const client = getClient();
    // Cast to allow enriched fields (descriptionLongue, themes, etc.) that will be
    // added to the Amplify schema in a future deployment. In stub mode this is unused.
    // translatedDescriptions/languageAudioTypes are AWSJSON → must be JSON strings
    // on the wire; passed as objects, AppSync rejects the whole mutation.
    const safeUpdates = serializeJsonFields(updates, GUIDE_TOUR_JSON_FIELDS);
    const result = await client.models.GuideTour.update(
      { id, ...safeUpdates } as Parameters<typeof client.models.GuideTour.update>[0],
      { authMode: 'userPool' },
    );
    // Amplify does NOT throw on authorization/validation failures — it returns them
    // in result.errors and leaves result.data null. Without this check a rejected
    // update (e.g. owner mismatch, expired session) is reported as success and the
    // UI shows "Enregistré ✓" while nothing was persisted.
    if (result.errors?.length || !result.data) {
      const msg = result.errors?.map((e) => e.message).join('; ')
        || 'aucune donnée retournée (autorisation refusée ou session expirée ?)';
      logger.error(SERVICE_NAME, 'updateGuideTour rejected', { id, errors: msg });
      return { ok: false as const, error: `Mise à jour refusée : ${msg}` };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateGuideTour failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise a jour du parcours' };
  }
}

/**
 * SÉCURITÉ (C2) — transition d'état GuideTour côté guide.
 * `GuideTour.status` n'est plus modifiable en direct par le guide (field-level
 * auth admin-only). Cette mutation custom (Lambda) vérifie la propriété du tour
 * et n'autorise que les statuts « guide » (draft/synced/editing/review/
 * pending_moderation/archived) — jamais published/rejected/revision_requested.
 */
export async function setTourWorkflowStatusMutation(
  tourId: string,
  status: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.setTourWorkflowStatus(
      { tourId, status },
      { authMode: 'userPool' },
    );
    if (result?.errors?.length) {
      const msg = result.errors.map((e: { message: string }) => e.message).join('; ');
      logger.error(SERVICE_NAME, 'setTourWorkflowStatus GraphQL error', { tourId, status, msg });
      return { ok: false as const, error: `Transition refusée : ${msg}` };
    }
    const env = result?.data as { ok?: boolean; error?: string } | null;
    if (!env?.ok) {
      const msg = env?.error ?? 'transition refusée (autorisation ou statut invalide ?)';
      logger.error(SERVICE_NAME, 'setTourWorkflowStatus rejected', { tourId, status, msg });
      return { ok: false as const, error: msg };
    }
    return { ok: true as const };
  } catch (error) {
    logger.error(SERVICE_NAME, 'setTourWorkflowStatus failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du changement de statut' };
  }
}

// --- Moderation Queries & Mutations ---

export async function listModerationItems(filters?: { status?: string }) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.list({
      filter: filters?.status ? { status: { eq: filters.status as 'pending' } } : undefined,
      authMode: 'userPool',
    });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listModerationItems failed', { error: String(error) });
    return [];
  }
}

export async function getModerationItemById(id: string) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.get({ id }, { authMode: 'userPool' });
    return result.data ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getModerationItemById failed', { error: String(error) });
    return null;
  }
}

export async function updateModerationItemMutation(
  id: string,
  updates: { status: 'pending' | 'resubmitted' | 'in_review' | 'approved' | 'rejected'; reviewerId?: string; reviewDate?: number; feedbackJson?: string; checklistJson?: string; submissionDate?: number; isResubmission?: boolean; sessionId?: string; poiCount?: number; duration?: number; distance?: number },
) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.update({ id, ...updates }, { authMode: 'userPool' });
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateModerationItem failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise a jour de la moderation' };
  }
}

// --- Dashboard Stats ---

export async function getGuideDashboardStatsById(guideId: string) {
  try {
    const client = getClient();
    const result = await client.models.GuideDashboardStats.list({
      filter: { guideId: { eq: guideId } },
      authMode: 'userPool',
    });
    return result.data?.[0] ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideDashboardStats failed', { error: String(error) });
    return null;
  }
}

export async function createGuideTourMutation(data: {
  guideId: string;
  title: string;
  city: string;
  description?: string;
  duration?: number;
  distance?: number;
}) {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.create(
      { ...data, status: 'draft' },
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createGuideTour failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création du parcours' };
  }
}

// --- Studio Session Queries & Mutations ---

export async function listStudioSessionsByGuide(guideId: string) {
  try {
    const client = getClient();
    const result = await client.models.StudioSession.listStudioSessionByGuideId(
      { guideId },
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data ?? [] };
  } catch (error) {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : JSON.stringify(error);
    logger.error(SERVICE_NAME, 'listStudioSessionsByGuide failed', { error: msg, guideId });
    // Fallback: try list with filter instead of GSI
    try {
      const client = getClient();
      const result = await client.models.StudioSession.list(
        { filter: { guideId: { eq: guideId } }, authMode: 'userPool' } as Parameters<typeof client.models.StudioSession.list>[0],
      );
      logger.info(SERVICE_NAME, 'listStudioSessionsByGuide fallback succeeded', { count: result.data?.length });
      return { ok: true as const, data: result.data ?? [] };
    } catch (fallbackError) {
      logger.error(SERVICE_NAME, 'listStudioSessionsByGuide fallback also failed', { error: String(fallbackError) });
      return { ok: false as const, error: 'Erreur lors du chargement des sessions' };
    }
  }
}

/** Admin-only: list all StudioSession items (paginated). */
export async function listAllStudioSessions() {
  try {
    const client = getClient();
    const result = await client.models.StudioSession.list({ authMode: 'userPool' });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listAllStudioSessions failed', { error: String(error) });
    return [];
  }
}

/** Admin-only: list all StudioScene items (paginated). */
export async function listAllStudioScenes() {
  try {
    const client = getClient();
    const result = await client.models.StudioScene.list({ authMode: 'userPool' });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listAllStudioScenes failed', { error: String(error) });
    return [];
  }
}

export async function getStudioSessionById(id: string) {
  try {
    const client = getClient();
    const result = await client.models.StudioSession.get({ id }, { authMode: 'userPool' });
    return { ok: true as const, data: result.data ?? null };
  } catch (error) {
    logger.error(SERVICE_NAME, 'getStudioSessionById failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement de la session' };
  }
}

export async function listStudioScenesBySession(sessionId: string) {
  try {
    const client = getClient();
    const result = await client.models.StudioScene.listStudioSceneBySessionId(
      { sessionId },
      { authMode: 'userPool' },
    );
    const sorted = (result.data ?? []).sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
    return { ok: true as const, data: sorted };
  } catch (error) {
    logger.error(SERVICE_NAME, 'listStudioScenesBySession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement des scènes' };
  }
}

export async function createStudioSessionMutation(data: {
  guideId: string;
  sourceSessionId?: string;
  tourId?: string;
  title?: string;
  status?: string;
  language?: string;
  version?: number;
  consentRGPD?: boolean;
}) {
  try {
    const client = getClient();
    // 'version' is not yet deployed on AppSync — omit it to avoid
    // "field not defined for input object type" GraphQL errors.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version: _version, ...safeData } = data;
    const result = await client.models.StudioSession.create(
      { ...safeData, status: (safeData.status ?? 'draft') as 'draft', consentRGPD: true } as Parameters<typeof client.models.StudioSession.create>[0],
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createStudioSession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création de la session' };
  }
}

/** AWSJSON (a.json()) fields must be sent as a JSON *string* on the wire — the
 *  Amplify client does not auto-serialize nested objects, and AppSync rejects
 *  them with "Variable has an invalid value". Stringify defensively if a caller
 *  passed an object. Idempotent: strings/null pass through untouched. */
const STUDIO_SESSION_JSON_FIELDS = ['translatedTitles', 'translatedDescriptions', 'routePathJson'];
function serializeJsonFields(updates: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out = { ...updates };
  for (const f of fields) {
    if (f in out && out[f] != null && typeof out[f] !== 'string') {
      out[f] = JSON.stringify(out[f]);
    }
  }
  return out;
}

/** @param updates Unvalidated — callers must ensure keys match schema fields */
export async function updateStudioSessionMutation(id: string, updates: Record<string, unknown>) {
  try {
    const client = getClient();
    const safeUpdates = serializeJsonFields(updates, STUDIO_SESSION_JSON_FIELDS);
    const result = await client.models.StudioSession.update(
      { id, ...safeUpdates } as Parameters<typeof client.models.StudioSession.update>[0],
      { authMode: 'userPool' },
    );
    // Amplify returns ok=true but populates result.errors when the server
    // rejected the mutation (e.g. unknown field, auth failure). Surface them.
    const errs = (result as unknown as { errors?: Array<{ message: string }> }).errors;
    if (errs && errs.length > 0) {
      const msg = errs.map((e) => e.message).join('; ');
      logger.error(SERVICE_NAME, 'updateStudioSession returned errors', { id, fields: Object.keys(updates), errors: msg });
      return { ok: false as const, error: msg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    logger.error(SERVICE_NAME, 'updateStudioSession threw', { id, fields: Object.keys(updates), error: msg });
    return { ok: false as const, error: msg };
  }
}

export async function createStudioSceneMutation(data: {
  sessionId: string;
  sceneIndex: number;
  title?: string;
  status?: string;
  studioAudioKey?: string;
  originalAudioKey?: string;
  transcriptText?: string;
  poiDescription?: string;
  photosRefs?: string[];
  latitude?: number;
  longitude?: number;
  archived?: boolean;
}) {
  try {
    const client = getClient();
    const result = await client.models.StudioScene.create(
      { ...data, status: (data.status ?? 'empty') as 'empty', archived: false, photosRefs: [] } as Parameters<typeof client.models.StudioScene.create>[0],
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createStudioScene failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création de la scène' };
  }
}

/** @param updates Unvalidated — callers must ensure keys match schema fields */
export async function updateStudioSceneMutation(id: string, updates: Record<string, unknown>) {
  try {
    const client = getClient();
    const result = await client.models.StudioScene.update(
      { id, ...updates } as Parameters<typeof client.models.StudioScene.update>[0],
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateStudioScene failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise à jour de la scène' };
  }
}

export async function deleteStudioSessionMutation(id: string) {
  try {
    const client = getClient();
    await client.models.StudioSession.delete({ id }, { authMode: 'userPool' });
    return { ok: true as const };
  } catch (error) {
    logger.error(SERVICE_NAME, 'deleteStudioSession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la suppression de la session' };
  }
}

// --- WalkSegment Queries & Mutations ---

export async function listWalkSegmentsBySession(sessionId: string) {
  try {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyModels = client.models as any;
    // Prefer GSI (index on sessionId). Fallback to filter when GSI method not generated yet.
    let result: { data?: unknown[] };
    try {
      result = await anyModels.WalkSegment.listWalkSegmentBySessionId(
        { sessionId },
        { authMode: 'userPool' },
      );
    } catch {
      result = await anyModels.WalkSegment.list(
        { filter: { sessionId: { eq: sessionId } } },
        { authMode: 'userPool' },
      );
    }
    const sorted = ((result?.data as Array<Record<string, unknown>>) ?? []).sort(
      (a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0),
    );
    return { ok: true as const, data: sorted };
  } catch (error) {
    logger.error(SERVICE_NAME, 'listWalkSegmentsBySession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement des segments de marche' };
  }
}

/** @param updates Unvalidated — callers must ensure keys match schema fields */
export async function updateWalkSegmentMutation(id: string, updates: Record<string, unknown>) {
  try {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyModels = client.models as any;
    const result = await anyModels.WalkSegment.update(
      { id, ...updates },
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result?.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateWalkSegment failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise à jour du segment de marche' };
  }
}

/**
 * Qui demande le contenu publié ?
 *
 * Le serveur reste seul juge de ce qu'il renvoie, mais il ne peut juger que s'il
 * sait qui demande : seuls les appels `userPool` portent un `sub` Cognito jusqu'au
 * Lambda (`allow.authenticated('userPools')` est déjà déclaré sur la requête).
 *
 * Les jetons vivent dans `localStorage` : cette résolution n'a de sens que dans
 * le navigateur. Côté serveur — et dès que la session est absente, illisible ou
 * expirée — on retombe sur `identityPool`, c'est-à-dire exactement le rendu
 * public d'aujourd'hui.
 */
async function resolvePublishedContentAuthMode(): Promise<
  import('./published-tour-content').PublishedTourContentAuthMode
> {
  if (typeof window === 'undefined') return 'identityPool';
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    return session?.tokens?.accessToken ? 'userPool' : 'identityPool';
  } catch (error) {
    // Une session illisible n'est pas une panne : on redevient un anonyme.
    logger.warn(SERVICE_NAME, 'published content auth mode fell back to guest', {
      error: String(error),
    });
    return 'identityPool';
  }
}

/** Public allowlisted Studio projection. The server derives the private session. */
export async function getPublishedTourContent(tourId: string) {
  try {
    const client = getClient() as unknown as import('./published-tour-content').PublishedTourContentQueryClient;
    const { queryPublishedTourContent } = await import('./published-tour-content');
    const authMode = await resolvePublishedContentAuthMode();
    const content = await queryPublishedTourContent(client, tourId, authMode);
    return { ok: true as const, data: content };
  } catch (error) {
    logger.error(SERVICE_NAME, 'getPublishedTourContent failed', { error: String(error), tourId });
    return { ok: false as const, error: 'Contenu public indisponible' };
  }
}

// --- TourLanguagePurchase Queries & Mutations ---

export async function createLanguagePurchaseMutation(data: {
  guideId: string;
  sessionId: string;
  language: string;
  qualityTier: 'standard' | 'pro';
  provider?: 'marianmt' | 'deepl';
  purchaseType: 'single' | 'pack_3' | 'pack_all' | 'free_first';
  amountCents: number;
  stripePaymentIntentId?: string;
}) {
  try {
    const client = getClient();
    // SÉCURITÉ — `moderationStatus` n'est PAS envoyé : le propriétaire n'a pas
    // le droit `create` dessus, sinon il naîtrait des lignes déjà « approved ».
    // Le champ reste nul, ce qui est sûr : le balayage de publication exige
    // `moderationStatus = 'approved'` et ne matche jamais un nul.
    // `status` est envoyé — le propriétaire garde `create`, et une valeur par
    // défaut de schéma serait comptée comme fournie par le client, donc refusée
    // (éprouvé sur bac à sable : « Unauthorized on [moderationStatus, status] »
    // alors que le client n'envoyait rien).
    const result = await client.models.TourLanguagePurchase.create(
      { ...data, status: 'active' } as Parameters<
        typeof client.models.TourLanguagePurchase.create
      >[0],
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createLanguagePurchase failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création de l\'achat de langue' };
  }
}

/**
 * Direct update of a TourLanguagePurchase row.
 *
 * SÉCURITÉ — `moderationStatus` et `status` sont désormais admin-only en écriture
 * (field-level auth). Un guide qui tente de les écrire par ici SE FAIT REFUSER :
 * ce refus arrive dans `result.errors` avec `ok` apparent, pas en exception. On
 * le remonte donc explicitement — sans cela « Dépublier » afficherait un succès
 * alors que rien n'a bougé. Les transitions guide légitimes passent par
 * `setLanguageModerationStatusMutation`.
 *
 * @param updates Unvalidated — callers must ensure keys match schema fields
 */
export async function updateLanguagePurchaseMutation(
  id: string,
  updates: Record<string, unknown>,
) {
  try {
    const client = getClient();
    const result = await client.models.TourLanguagePurchase.update(
      { id, ...updates } as Parameters<typeof client.models.TourLanguagePurchase.update>[0],
      { authMode: 'userPool' },
    );
    // Amplify resolves successfully but populates result.errors when the server
    // rejected the mutation (field-level auth, unknown field, validation).
    const errs = (result as unknown as { errors?: Array<{ message: string }> }).errors;
    if (errs && errs.length > 0) {
      const msg = errs.map((e) => e.message).join('; ');
      logger.error(SERVICE_NAME, 'updateLanguagePurchase returned errors', {
        id,
        fields: Object.keys(updates),
        errors: msg,
      });
      return { ok: false as const, error: msg };
    }
    if (!result.data) {
      logger.error(SERVICE_NAME, 'updateLanguagePurchase returned no data', {
        id,
        fields: Object.keys(updates),
      });
      return { ok: false as const, error: 'Mise à jour refusée par le backend (données nulles)' };
    }
    // La documentation Amplify décrit un champ refusé RENVOYÉ À `null` plutôt
    // qu'une mutation rejetée ; des rapports de terrain décrivent l'inverse. On
    // couvre les deux : si l'appelant a demandé un des champs resserrés et que la
    // ligne relue ne le porte pas, c'est un refus — pas un succès silencieux.
    const row = result.data as unknown as Record<string, unknown>;
    for (const field of ['moderationStatus', 'status'] as const) {
      if (field in updates && row[field] !== updates[field]) {
        logger.error(SERVICE_NAME, 'updateLanguagePurchase silently dropped a guarded field', {
          id, field, wanted: updates[field], got: row[field],
        });
        return {
          ok: false as const,
          error: `Écriture de « ${field} » refusée par le backend (champ réservé à la modération)`,
        };
      }
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateLanguagePurchase failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise à jour de l\'achat de langue' };
  }
}

/**
 * SÉCURITÉ — seule voie GUIDE pour changer `TourLanguagePurchase.moderationStatus`.
 * Le champ n'est plus modifiable en direct par le guide (field-level auth
 * admin-only). Cette mutation custom (Lambda) vérifie la propriété de la ligne
 * d'achat et n'autorise que les deux transitions guide : `submitted`
 * (soumission) et `draft` (retrait / dépublication). `approved`, `rejected`,
 * `revision_requested` restent au chemin admin.
 */
export async function setLanguageModerationStatusMutation(
  sessionId: string,
  language: string,
  moderationStatus: 'submitted' | 'draft',
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.setLanguageModerationStatus(
      { sessionId, language, moderationStatus },
      { authMode: 'userPool' },
    );
    if (result?.errors?.length) {
      const msg = result.errors.map((e: { message: string }) => e.message).join('; ');
      logger.error(SERVICE_NAME, 'setLanguageModerationStatus GraphQL error', {
        sessionId, language, moderationStatus, msg,
      });
      return { ok: false as const, error: `Transition refusée : ${msg}` };
    }
    const env = result?.data as { ok?: boolean; error?: string } | null;
    if (!env?.ok) {
      const msg = env?.error ?? 'transition refusée (autorisation ou statut invalide ?)';
      logger.error(SERVICE_NAME, 'setLanguageModerationStatus rejected', {
        sessionId, language, moderationStatus, msg,
      });
      return { ok: false as const, error: msg };
    }
    return { ok: true as const };
  } catch (error) {
    logger.error(SERVICE_NAME, 'setLanguageModerationStatus failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du changement de statut de la langue' };
  }
}

export async function listLanguagePurchasesBySession(sessionId: string) {
  try {
    const client = getClient();
    const result = await client.models.TourLanguagePurchase.listTourLanguagePurchaseBySessionId(
      { sessionId },
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data ?? [] };
  } catch (error) {
    logger.error(SERVICE_NAME, 'listLanguagePurchasesBySession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement des achats de langue' };
  }
}

export async function getLanguagePurchase(sessionId: string, language: string) {
  try {
    const client = getClient();
    const result = await client.models.TourLanguagePurchase.listTourLanguagePurchaseBySessionId(
      { sessionId },
      { authMode: 'userPool' },
    );
    const match = (result.data ?? []).find((p) => p.language === language);
    return { ok: true as const, data: match ?? null };
  } catch (error) {
    logger.error(SERVICE_NAME, 'getLanguagePurchase failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement de l\'achat de langue' };
  }
}

export async function deleteStudioSceneMutation(id: string) {
  try {
    const client = getClient();
    await client.models.StudioScene.delete({ id }, { authMode: 'userPool' });
    return { ok: true as const };
  } catch (error) {
    logger.error(SERVICE_NAME, 'deleteStudioScene failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la suppression de la scène' };
  }
}

// --- ModerationItem delete (not in original CRUD) ---

export async function deleteModerationItemMutation(id: string) {
  try {
    const client = getClient();
    await client.models.ModerationItem.delete({ id }, { authMode: 'userPool' });
    return { ok: true as const };
  } catch (error) {
    logger.error(SERVICE_NAME, 'deleteModerationItem failed', { error: String(error) });
    return { ok: false as const, error: String(error) };
  }
}

/**
 * Generic delete for any model by name and ID. Admin auth.
 */
export async function deleteItem(
  modelName: 'GuideTour' | 'StudioSession' | 'StudioScene' | 'SceneSegment' | 'TourLanguagePurchase' | 'ModerationItem',
  id: string,
): Promise<void> {
  try {
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.models as any)[modelName].delete({ id }, { authMode: 'userPool' });
  } catch (error) {
    logger.error(SERVICE_NAME, `deleteItem(${modelName}) failed`, { id, error: String(error) });
    throw error;
  }
}

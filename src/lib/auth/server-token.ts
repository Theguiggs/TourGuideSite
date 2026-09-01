import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import outputs from '../../../amplify_outputs.json';
import { listGuideProfilePageByUserId } from '@/lib/api/appsync-client';
import { qualifieGuide, roleGuide, type Qualification } from './guide-qualification';

const authConfig = (outputs as {
  auth: { user_pool_id: string; user_pool_client_id: string };
}).auth;

const verifier = CognitoJwtVerifier.create({
  userPoolId: authConfig.user_pool_id,
  tokenUse: 'access',
  clientId: authConfig.user_pool_client_id,
});

const GUIDE_ROLE_CACHE_TTL_MS = 60_000;
const GUIDE_ROLE_CACHE_MAX_ENTRIES = 1_000;
const guideRoleCache = new Map<string, { roles: ServerRole[]; expiresAt: number }>();

export type ServerRole = 'guide' | 'admin';

export interface VerifiedServerToken {
  payload: CognitoAccessTokenPayload;
  roles: ServerRole[];
}

export class ServerAuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = 'ServerAuthError';
  }
}

function extractBearerToken(request: Request): string {
  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) {
    throw new ServerAuthError(401, 'Unauthorized');
  }
  return match[1];
}

function tokenGroups(payload: CognitoAccessTokenPayload): string[] {
  const groups = payload['cognito:groups'];
  return Array.isArray(groups) ? groups.filter((group): group is string => typeof group === 'string') : [];
}

/**
 * Le NON-VERDICT : ce que le juge reçoit quand la lecture n'a rien prouvé.
 *
 * Une lecture RATÉE (réseau, `$util.unauthorized()`, panne) et une vue TRONQUÉE
 * sont la même chose du point de vue du juge : aucune ligne ne l'a convaincu, et
 * aucune ne l'a détrompé. On le lui dit avec la MÊME valeur, pour qu'il n'y ait
 * qu'une seule règle — `roleGuide` laisse alors le groupe se suffire à lui-même
 * (`admin` et `guide` gardent leur rôle) et refuse à qui n'a rien d'autre.
 *
 * Ni l'un ni l'autre n'est mémorisé : figer 60 s un incident de lecture
 * transformerait une panne en perte de rôle.
 */
const NON_VERDICT: Qualification = { role: null, refus: 'vue-tronquee' };

/**
 * Le rôle d'un porteur de jeton.
 *
 * SÉCURITÉ — `GuideProfile.userId` A ÉTÉ un champ LIBRE : n'importe quel compte
 * connecté pouvait planter une ligne sous le `sub` d'un tiers, donc la seule
 * présence d'une ligne ne prouvait RIEN, ni pour accorder le rôle (élévation),
 * ni pour le retirer (révocation croisée). Le schéma le CONTRAINT désormais
 * (`ownerDefinedIn('userId').identityClaim('sub')` + verrou de champ sans
 * `update`), mais le portail juge quand même : le chemin IAM lit toute la table,
 * les lignes héritées d'avant la bascule sont encore là, et un portail qui
 * partirait avant le schéma n'aurait rien fermé.
 *
 * Le juge est `./guide-qualification.ts` : il exige un `userId` STRICTEMENT égal
 * au `sub` du jeton, disqualifie dès qu'UNE ligne à soi est suspendue même noyée
 * dans des doublons actifs, et refuse sur vue tronquée.
 *
 * `admin` NE COURT-CIRCUITE PLUS LE JUGE. Un `if (groups.includes('admin'))
 * return ['admin','guide']` tenait ici, AVANT toute lecture : le rôle `guide`
 * s'y prononçait donc à un autre endroit que sur mobile, et les deux surfaces
 * ont divergé sans que personne ne le voie (chacune avait une épreuve qui
 * épinglait SA version). La règle a déménagé DANS le juge — `GROUPE_PERSONNEL`,
 * appliqué avant la disqualification. Le résultat pour un admin est identique
 * (`['admin','guide']`, profil ou pas, suspendu ou pas) ; ce qui change, c'est
 * qu'il n'y a plus qu'un seul endroit qui le dit. Le prix est une lecture de
 * profil de plus pour les admins — bornée par le même cache de 60 s.
 */
function composeRoles(
  groupes: readonly string[],
  qualification: Qualification,
): ServerRole[] {
  return [
    ...(groupes.includes('admin') ? (['admin'] as const) : []),
    ...(roleGuide({ qualification, groupes }) ? (['guide'] as const) : []),
  ];
}

async function resolveRoles(payload: CognitoAccessTokenPayload): Promise<ServerRole[]> {
  const groups = tokenGroups(payload);

  const cached = guideRoleCache.get(payload.sub);
  if (cached && cached.expiresAt > Date.now()) return cached.roles;
  guideRoleCache.delete(payload.sub);

  // `payload.sub` sort du jeton VÉRIFIÉ — jamais d'une entrée de requête.
  const lecture = await listGuideProfilePageByUserId(payload.sub, 'iam');

  // Une lecture RATÉE n'est pas un verdict : elle refuse ce qu'elle n'a pas pu
  // prouver, mais elle n'est JAMAIS mémorisée. La figer 60 s transformerait un
  // incident de lecture en perte de rôle d'une minute pour un guide légitime.
  if (!lecture.ok) {
    return composeRoles(groups, NON_VERDICT);
  }

  const qualification = qualifieGuide({
    sub: payload.sub,
    lignes: lecture.lignes,
    tronquee: lecture.tronquee,
  });
  const roles: ServerRole[] = composeRoles(groups, qualification);

  // Même règle pour la vue tronquée : lecture incomplète, donc rien à mémoriser.
  // Seuls les vrais verdicts (`guide`, `aucun-profil`, `disqualifie`) sont mis
  // en cache.
  if (qualification.role === null && qualification.refus === 'vue-tronquee') {
    return roles;
  }

  if (guideRoleCache.size >= GUIDE_ROLE_CACHE_MAX_ENTRIES) {
    const oldestSub = guideRoleCache.keys().next().value;
    if (oldestSub) guideRoleCache.delete(oldestSub);
  }
  guideRoleCache.set(payload.sub, {
    roles,
    expiresAt: Date.now() + GUIDE_ROLE_CACHE_TTL_MS,
  });
  return roles;
}

export async function verifyServerToken(request: Request): Promise<VerifiedServerToken> {
  const rawToken = extractBearerToken(request);
  let payload: CognitoAccessTokenPayload;
  try {
    payload = await verifier.verify(rawToken);
  } catch {
    throw new ServerAuthError(401, 'Unauthorized');
  }

  return { payload, roles: await resolveRoles(payload) };
}

export async function requireServerRole(
  request: Request,
  allowedRoles: readonly ServerRole[],
): Promise<VerifiedServerToken> {
  const verified = await verifyServerToken(request);
  if (!allowedRoles.some((role) => verified.roles.includes(role))) {
    throw new ServerAuthError(403, 'Forbidden');
  }
  return verified;
}

export function __resetServerRoleCacheForTests(): void {
  guideRoleCache.clear();
}

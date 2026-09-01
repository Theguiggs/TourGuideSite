import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import outputs from '../../../amplify_outputs.json';
import { listGuideProfilePageByUserId } from '@/lib/api/appsync-client';
import { qualifieGuide, roleGuide } from './guide-qualification';

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
 */
async function resolveRoles(payload: CognitoAccessTokenPayload): Promise<ServerRole[]> {
  const groups = tokenGroups(payload);
  if (groups.includes('admin')) return ['admin', 'guide'];

  const cached = guideRoleCache.get(payload.sub);
  if (cached && cached.expiresAt > Date.now()) return cached.roles;
  guideRoleCache.delete(payload.sub);

  // `payload.sub` sort du jeton VÉRIFIÉ — jamais d'une entrée de requête.
  const lecture = await listGuideProfilePageByUserId(payload.sub, 'iam');

  // Une lecture RATÉE n'est pas un verdict : elle refuse ce qu'elle n'a pas pu
  // prouver, mais elle n'est JAMAIS mémorisée. La figer 60 s transformerait un
  // incident de lecture en perte de rôle d'une minute pour un guide légitime.
  if (!lecture.ok) {
    return groups.includes('guide') ? ['guide'] : [];
  }

  const qualification = qualifieGuide({
    sub: payload.sub,
    lignes: lecture.lignes,
    tronquee: lecture.tronquee,
  });
  const roles: ServerRole[] = roleGuide({ qualification, groupes: groups }) ? ['guide'] : [];

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

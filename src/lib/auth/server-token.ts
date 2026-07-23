import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import outputs from '../../../amplify_outputs.json';
import { getGuideProfileByUserId } from '@/lib/api/appsync-client';

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

async function resolveRoles(payload: CognitoAccessTokenPayload): Promise<ServerRole[]> {
  const groups = tokenGroups(payload);
  if (groups.includes('admin')) return ['admin', 'guide'];

  const cached = guideRoleCache.get(payload.sub);
  if (cached && cached.expiresAt > Date.now()) return cached.roles;
  guideRoleCache.delete(payload.sub);

  // Existing guide accounts are identified by their GuideProfile rather than a
  // Cognito group. Bind the verified token sub to that profile so tourists
  // cannot use privileged Studio endpoints.
  const profile = await getGuideProfileByUserId(payload.sub, 'iam');
  const disabled = profile?.profileStatus === 'suspended' || profile?.profileStatus === 'rejected';
  const roles: ServerRole[] = disabled
    ? []
    : groups.includes('guide') || profile
      ? ['guide']
      : [];
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

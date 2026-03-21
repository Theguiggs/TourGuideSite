import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import * as fs from 'fs';
import * as path from 'path';
import {
  E2E_GUIDE_EMAIL,
  E2E_GUIDE_PASSWORD,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  COGNITO_CLIENT_ID,
  COGNITO_REGION,
} from './test-data';

const AUTH_DIR = path.join(__dirname, '..', '.auth');

interface CognitoTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export async function authenticateCognito(
  email: string,
  password: string,
): Promise<CognitoTokens> {
  if (!password) {
    throw new Error(
      `Authentication failed — check E2E credentials. Password is empty for ${email}`,
    );
  }

  const client = new CognitoIdentityProviderClient({ region: COGNITO_REGION });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: COGNITO_CLIENT_ID,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      );

      const auth = result.AuthenticationResult;
      if (!auth?.AccessToken || !auth.IdToken || !auth.RefreshToken) {
        throw new Error(
          `Authentication failed — incomplete tokens for ${email}`,
        );
      }

      return {
        accessToken: auth.AccessToken,
        idToken: auth.IdToken,
        refreshToken: auth.RefreshToken,
      };
    } catch (err: unknown) {
      lastError = err;
      const errorName = (err as { name?: string }).name;
      const retryableErrors = [
        'TooManyRequestsException',
        'ServiceUnavailableException',
        'TimeoutError',
        'NetworkingError',
        'ECONNRESET',
      ];
      if (errorName && retryableErrors.includes(errorName)) {
        const delay = 2000 * (attempt + 1);
        console.log(
          `[auth.fixture] Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/3)`,
        );
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw new Error(
        `Authentication failed — check E2E credentials for ${email}: ${(err as Error).message}`,
      );
    }
  }

  throw new Error(
    `Authentication failed after 3 retries for ${email}: ${(lastError as Error).message}`,
  );
}

/**
 * Discovers Amplify v6 localStorage key format by inspecting an actual login.
 * The key format varies between Amplify versions — we must match exactly.
 *
 * Amplify v6 key pattern (discovered):
 *   CognitoIdentityServiceProvider.{clientId}.{username}.{tokenType}
 *   CognitoIdentityServiceProvider.{clientId}.LastAuthUser
 */
export function createStorageState(
  tokens: CognitoTokens,
  email: string,
  outputPath: string,
): void {
  const clientId = COGNITO_CLIENT_ID;
  const keyPrefix = `CognitoIdentityServiceProvider.${clientId}`;

  const localStorage = [
    { name: `${keyPrefix}.${email}.accessToken`, value: tokens.accessToken },
    { name: `${keyPrefix}.${email}.idToken`, value: tokens.idToken },
    { name: `${keyPrefix}.${email}.refreshToken`, value: tokens.refreshToken },
    { name: `${keyPrefix}.${email}.clockDrift`, value: '0' },
    { name: `${keyPrefix}.LastAuthUser`, value: email },
  ];

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage,
      },
    ],
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(storageState, null, 2));
}

export function isTokenValid(storageStatePath: string): boolean {
  try {
    if (!fs.existsSync(storageStatePath)) return false;

    const data = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    const origin = data.origins?.[0];
    if (!origin?.localStorage) return false;

    const accessTokenEntry = origin.localStorage.find(
      (e: { name: string }) => e.name.endsWith('.accessToken'),
    );
    if (!accessTokenEntry?.value) return false;

    const parts = accessTokenEntry.value.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    );
    // F4 fix: 5-minute margin to avoid race conditions with near-expiry tokens
    const MARGIN_SECONDS = 300;
    return payload.exp > (Date.now() / 1000) + MARGIN_SECONDS;
  } catch {
    return false;
  }
}

export async function setupAuthStates(): Promise<void> {
  const guidePath = path.join(AUTH_DIR, 'guide.json');
  const adminPath = path.join(AUTH_DIR, 'admin.json');

  // Re-use existing storageState if tokens are still valid
  if (isTokenValid(guidePath) && isTokenValid(adminPath)) {
    console.log('[auth.fixture] Existing tokens are valid, skipping re-auth');
    return;
  }

  console.log('[auth.fixture] Authenticating guide + admin...');

  const [guideTokens, adminTokens] = await Promise.all([
    authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD),
    authenticateCognito(E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD),
  ]);

  createStorageState(guideTokens, E2E_GUIDE_EMAIL, guidePath);
  createStorageState(adminTokens, E2E_ADMIN_EMAIL, adminPath);

  console.log('[auth.fixture] Auth states created');
}

export function getGuideStorageStatePath(): string {
  return path.join(AUTH_DIR, 'guide.json');
}

export function getAdminStorageStatePath(): string {
  return path.join(AUTH_DIR, 'admin.json');
}

export function getAccessTokenFromStorageState(
  storageStatePath: string,
): string {
  const data = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
  const origin = data.origins?.[0];
  const entry = origin?.localStorage?.find((e: { name: string }) =>
    e.name.endsWith('.accessToken'),
  );
  if (!entry?.value) {
    throw new Error(
      `No accessToken found in storageState: ${storageStatePath}`,
    );
  }
  return entry.value;
}

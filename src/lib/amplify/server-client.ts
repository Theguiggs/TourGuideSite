/**
 * Server-side AppSync client using Next.js cookies for auth.
 *
 * Used by Server Components / Server Actions to call AppSync with proper
 * Amplify configuration. Supports both:
 *  - Guest queries (no auth cookies → identity pool / guest credentials)
 *  - Authenticated queries (cookies present → Cognito user tokens)
 *
 * Without this, server-side AppSync calls fail with
 * "Amplify has not been configured" + "NoValidAuthTokens: No federated jwt".
 */

import 'server-only';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { cookies } from 'next/headers';
import type { Schema } from '@amplify-schema';
import outputs from '../../../amplify_outputs.json';

let _serverClient: ReturnType<typeof generateServerClientUsingCookies<Schema>> | null = null;

export function getServerClient() {
  if (!_serverClient) {
    _serverClient = generateServerClientUsingCookies<Schema>({
      config: outputs as Parameters<typeof generateServerClientUsingCookies>[0]['config'],
      cookies,
    });
  }
  return _serverClient;
}

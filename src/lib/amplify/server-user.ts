/**
 * Server-side current-user lookup via Next.js cookies.
 *
 * Lets Server Components tell "guest" apart from "authenticated, no data" before
 * issuing owner-scoped (userPool) AppSync queries. Returns the Cognito sub or null.
 */

import 'server-only';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from './amplify-server-utils';

export async function getServerUserId(): Promise<string | null> {
  try {
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });
    return user?.userId ?? null;
  } catch {
    // No valid session cookies → guest.
    return null;
  }
}

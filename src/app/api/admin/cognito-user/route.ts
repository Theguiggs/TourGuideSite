import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify/amplify-server-utils';
import outputs from '../../../../../amplify_outputs.json';

const USER_POOL_ID = (outputs as { auth: { user_pool_id: string } }).auth.user_pool_id;
const REGION = (outputs as { auth: { aws_region: string } }).auth.aws_region;

/**
 * GET /api/admin/cognito-user?userId=xxx
 *
 * Returns the Cognito email for a given userId (sub).
 * Requires admin group membership — returns 403 otherwise.
 */
export async function GET(request: NextRequest) {
  // Verify caller is an authenticated admin
  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (ctx) => fetchAuthSession(ctx),
    });

    if (!session.tokens) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups =
      (session.tokens.accessToken?.payload['cognito:groups'] as string[] | undefined) ?? [];
    if (!groups.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const client = new CognitoIdentityProviderClient({ region: REGION });
    const result = await client.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      }),
    );

    const email = result.UserAttributes?.find(a => a.Name === 'email')?.Value ?? null;

    return NextResponse.json({ email });
  } catch (error) {
    const errName = (error as { name?: string }).name;
    if (errName === 'UserNotFoundException') {
      return NextResponse.json({ email: null, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}

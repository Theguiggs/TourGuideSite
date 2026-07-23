import { NextRequest, NextResponse } from 'next/server';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { requireServerRole, ServerAuthError } from '@/lib/auth/server-token';
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
  try {
    await requireServerRole(request, ['admin']);
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 });
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

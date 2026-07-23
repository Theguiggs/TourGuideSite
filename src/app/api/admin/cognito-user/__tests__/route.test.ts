/** @jest-environment node */

import { NextRequest } from 'next/server';

const mockRequireServerRole = jest.fn();
const mockSend = jest.fn();

jest.mock('@/lib/auth/server-token', () => {
  class MockServerAuthError extends Error {
    constructor(
      readonly status: 401 | 403,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    requireServerRole: (...args: unknown[]) => mockRequireServerRole(...args),
    ServerAuthError: MockServerAuthError,
  };
});

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  AdminGetUserCommand: jest.fn().mockImplementation((input) => input),
}));

import { ServerAuthError } from '@/lib/auth/server-token';
import { GET } from '../route';

describe('/api/admin/cognito-user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireServerRole.mockResolvedValue({
      payload: { sub: 'admin-1' },
      roles: ['admin', 'guide'],
    });
    mockSend.mockResolvedValue({
      UserAttributes: [{ Name: 'email', Value: 'guide@example.com' }],
    });
  });

  it.each([
    [401, 'missing or invalid token'],
    [403, 'non-admin token'],
  ])('returns %i without querying Cognito for a %s', async (status) => {
    mockRequireServerRole.mockRejectedValue(
      new ServerAuthError(status as 401 | 403, status === 401 ? 'Unauthorized' : 'Forbidden'),
    );

    const response = await GET(
      new NextRequest('http://localhost/api/admin/cognito-user?userId=guide-1'),
    );

    expect(response.status).toBe(status);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns the Cognito email to a verified admin', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/cognito-user?userId=guide-1', {
        headers: { Authorization: 'Bearer admin-token' },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ email: 'guide@example.com' });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('distinguishes a Cognito failure from authentication errors', async () => {
    mockSend.mockRejectedValue(new Error('Cognito unavailable'));
    const response = await GET(
      new NextRequest('http://localhost/api/admin/cognito-user?userId=guide-1', {
        headers: { Authorization: 'Bearer admin-token' },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch user' });
  });
});

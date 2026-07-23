/** @jest-environment node */

import { NextRequest } from 'next/server';

const mockVerifyJwt = jest.fn();
const mockGetGuideProfileByUserId = jest.fn();

jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({ verify: mockVerifyJwt })),
  },
}));
jest.mock('@/lib/api/appsync-client', () => ({
  getGuideProfileByUserId: (...args: unknown[]) => mockGetGuideProfileByUserId(...args),
}));

import {
  __resetServerRoleCacheForTests,
  requireServerRole,
  ServerAuthError,
  verifyServerToken,
} from '../server-token';

describe('server Cognito token verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetServerRoleCacheForTests();
    mockGetGuideProfileByUserId.mockResolvedValue(null);
  });

  it('rejects a missing bearer token', async () => {
    await expect(
      verifyServerToken(new NextRequest('http://localhost/protected')),
    ).rejects.toMatchObject<Partial<ServerAuthError>>({ status: 401 });
    expect(mockVerifyJwt).not.toHaveBeenCalled();
  });

  it('rejects a token that fails signature or claim verification', async () => {
    mockVerifyJwt.mockRejectedValue(new Error('invalid signature'));
    await expect(
      verifyServerToken(
        new NextRequest('http://localhost/protected', {
          headers: { Authorization: 'Bearer forged' },
        }),
      ),
    ).rejects.toMatchObject<Partial<ServerAuthError>>({ status: 401 });
  });

  it('rejects a verified tourist from a guide route', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'tourist-1', 'cognito:groups': [] });
    await expect(
      requireServerRole(
        new NextRequest('http://localhost/protected', {
          headers: { Authorization: 'Bearer valid-tourist' },
        }),
        ['guide', 'admin'],
      ),
    ).rejects.toMatchObject<Partial<ServerAuthError>>({ status: 403 });
    expect(mockGetGuideProfileByUserId).toHaveBeenCalledWith('tourist-1', 'iam');
  });

  it('recognizes an existing GuideProfile bound to the verified token sub', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'guide-1', 'cognito:groups': [] });
    mockGetGuideProfileByUserId.mockResolvedValue({ id: 'profile-1' });
    const verified = await requireServerRole(
      new NextRequest('http://localhost/protected', {
        headers: { Authorization: 'Bearer valid-guide' },
      }),
      ['guide', 'admin'],
    );

    expect(verified.roles).toEqual(['guide']);
  });

  it.each(['suspended', 'rejected'])('rejects a %s guide profile', async (profileStatus) => {
    mockVerifyJwt.mockResolvedValue({ sub: 'guide-1', 'cognito:groups': [] });
    mockGetGuideProfileByUserId.mockResolvedValue({ id: 'profile-1', profileStatus });

    await expect(
      requireServerRole(
        new NextRequest('http://localhost/protected', {
          headers: { Authorization: 'Bearer disabled-guide' },
        }),
        ['guide', 'admin'],
      ),
    ).rejects.toMatchObject<Partial<ServerAuthError>>({ status: 403 });
  });

  it('recognizes an admin group without a profile lookup', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'admin-1', 'cognito:groups': ['admin'] });
    const verified = await requireServerRole(
      new NextRequest('http://localhost/protected', {
        headers: { Authorization: 'Bearer valid-admin' },
      }),
      ['admin'],
    );

    expect(verified.roles).toEqual(['admin', 'guide']);
    expect(mockGetGuideProfileByUserId).not.toHaveBeenCalled();
  });

  it('caches a guide role across job polling requests', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'guide-cached', 'cognito:groups': [] });
    mockGetGuideProfileByUserId.mockResolvedValue({ id: 'profile-cached' });
    const request = () =>
      new NextRequest('http://localhost/protected', {
        headers: { Authorization: 'Bearer valid-guide' },
      });

    await requireServerRole(request(), ['guide']);
    await requireServerRole(request(), ['guide']);

    expect(mockVerifyJwt).toHaveBeenCalledTimes(2);
    expect(mockGetGuideProfileByUserId).toHaveBeenCalledTimes(1);
  });
});

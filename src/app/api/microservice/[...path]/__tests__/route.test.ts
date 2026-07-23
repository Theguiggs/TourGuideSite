/** @jest-environment node */

import { NextRequest } from 'next/server';

const mockRequireServerRole = jest.fn();

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

import { ServerAuthError } from '@/lib/auth/server-token';
import { GET, POST } from '../route';

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('/api/microservice proxy', () => {
  const originalApiKey = process.env.MICROSERVICE_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MICROSERVICE_API_KEY = 'server-secret';
    mockRequireServerRole.mockResolvedValue({
      payload: { sub: 'guide-1' },
      roles: ['guide'],
    });
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, job_id: 'tts-abc' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.MICROSERVICE_API_KEY;
    else process.env.MICROSERVICE_API_KEY = originalApiKey;
  });

  it('rejects a missing token before calling upstream', async () => {
    mockRequireServerRole.mockRejectedValue(new ServerAuthError(401, 'Unauthorized'));
    const response = await GET(
      new NextRequest('http://localhost/api/microservice/health'),
      context(['health']),
    );

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a forged token before calling upstream', async () => {
    mockRequireServerRole.mockRejectedValue(new ServerAuthError(401, 'Unauthorized'));
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: { Authorization: 'Bearer forged', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Bonjour', language: 'fr' }),
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an authenticated tourist before calling upstream', async () => {
    mockRequireServerRole.mockRejectedValue(new ServerAuthError(403, 'Forbidden'));
    const response = await GET(
      new NextRequest('http://localhost/api/microservice/health', {
        headers: { Authorization: 'Bearer tourist-token' },
      }),
      context(['health']),
    );

    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses an exact allowlist', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate-evil', {
        method: 'POST',
        body: '{}',
      }),
      context(['v1', 'tts', 'generate-evil']),
    );

    expect(response.status).toBe(403);
    expect(mockRequireServerRole).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a declared oversized body before reading or forwarding it', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid',
          'Content-Type': 'application/json',
          'Content-Length': '1000001',
        },
        body: '{}',
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('stops reading an oversized streamed body without Content-Length', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid',
          'Content-Type': 'application/json',
        },
        body: 'x'.repeat(1_000_001),
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards an authorized request with only the server API key upstream', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/microservice/v1/tts/generate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Bonjour', language: 'fr' }),
      }),
      context(['v1', 'tts', 'generate']),
    );

    expect(response.status).toBe(202);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/tts/generate',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'server-secret',
        },
      }),
    );
    const upstreamInit = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(upstreamInit.headers).not.toHaveProperty('Authorization');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('fails closed when the server API key contains only whitespace', async () => {
    process.env.MICROSERVICE_API_KEY = '   ';

    const response = await GET(
      new NextRequest('http://localhost/api/microservice/health', {
        headers: { Authorization: 'Bearer valid-user-token' },
      }),
      context(['health']),
    );

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

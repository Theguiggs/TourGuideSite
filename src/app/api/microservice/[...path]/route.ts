import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole, ServerAuthError } from '@/lib/auth/server-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 30_000;
const MAX_REQUEST_BODY_BYTES = 1_000_000;
const JOB_PATH = /^v1\/jobs\/[a-z0-9-]{1,100}$/i;

function isAllowedRequest(method: string, path: string): boolean {
  if (method === 'GET') {
    return path === 'health' || JOB_PATH.test(path);
  }
  if (method === 'POST') {
    return new Set([
      'v1/tts/generate',
      'v1/translate/marianmt',
      'v1/translate/batch',
      'v1/silence-detect',
    ]).has(path);
  }
  return false;
}

function getBaseUrl(): string {
  const raw = process.env.MICROSERVICE_URL ?? 'http://localhost:8000';
  return raw.replace(/\/+$/, '');
}

async function readBoundedBody(req: NextRequest): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD' || !req.body) return undefined;

  const contentLength = req.headers.get('content-length');
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (!Number.isFinite(declaredBytes) || declaredBytes < 0) {
      throw new TypeError('Invalid Content-Length');
    }
    if (declaredBytes > MAX_REQUEST_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

class PayloadTooLargeError extends Error {}

async function proxy(req: NextRequest, segments: string[]) {
  const requestedPath = segments.join('/');
  if (!isAllowedRequest(req.method, requestedPath)) {
    return NextResponse.json({ ok: false, error: 'Path not allowed' }, { status: 403 });
  }

  try {
    await requireServerRole(req, ['guide', 'admin']);
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'Authentication unavailable' }, { status: 503 });
  }

  const apiKey = process.env.MICROSERVICE_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ ok: false, error: 'Microservice unavailable' }, { status: 503 });
  }

  let body: Uint8Array | undefined;
  try {
    body = await readBoundedBody(req);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ ok: false, error: 'Payload too large' }, { status: 413 });
    }
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const target = `${getBaseUrl()}/${requestedPath}`;
  const headers: Record<string, string> = { 'X-API-Key': apiKey };
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: body ? Buffer.from(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    responseHeaders.set('cache-control', 'no-store');
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('retry-after', retryAfter);

    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      { ok: false, error: isAbort ? 'Microservice timeout' : 'Microservice unreachable' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

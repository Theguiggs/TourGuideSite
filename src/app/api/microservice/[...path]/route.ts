import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy to the Python microservice.
// The browser never sees the real API key — only same-origin /api/microservice/* requests.
// Env vars (server-only, no NEXT_PUBLIC_ prefix):
//   MICROSERVICE_URL      e.g. https://xxxxx.awsapprunner.com  (no trailing slash)
//   MICROSERVICE_API_KEY  shared secret matching the microservice's env

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The heavy endpoints are now async (submit → job_id → poll), so every proxied
// call — a submit or a single poll — is sub-second. A short timeout is enough and
// fails fast instead of holding a connection open for minutes.
const TIMEOUT_MS = 30_000;

function getBaseUrl(): string {
  const raw = process.env.MICROSERVICE_URL ?? 'http://localhost:8000';
  return raw.replace(/\/+$/, '');
}

function buildTargetUrl(req: NextRequest, segments: string[]): string {
  const path = segments.join('/');
  const search = req.nextUrl.search ?? '';
  return `${getBaseUrl()}/${path}${search}`;
}

async function proxy(req: NextRequest, segments: string[]) {
  const target = buildTargetUrl(req, segments);
  const apiKey = process.env.MICROSERVICE_API_KEY ?? '';

  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
  };
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  // Only methods that carry a body
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

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
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    // Forward backpressure hint so the client can back off on 429.
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('retry-after', retryAfter);

    const payload = await upstream.arrayBuffer();
    return new NextResponse(payload, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
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

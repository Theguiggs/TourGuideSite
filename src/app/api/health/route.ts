import { NextResponse } from 'next/server';
import { listGuideProfilePageByUserId } from '@/lib/api/appsync-client';
import { iamReadHealthSnapshot } from '@/lib/auth/server-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sonde de santé du portail — à brancher sur le `healthcheck` Docker / Caddy.
 *
 * Elle exerce LA lecture qui échouait en silence : le profil de guide lu avec
 * les identifiants IAM du conteneur (`server-token.ts`). Quand cette lecture
 * tombe, tous les guides reçoivent 403 sur le proxy du microservice et le
 * Studio perd synthèse, traduction et détection de silence, tandis que la
 * page d'accueil reste servie normalement. Un `curl` sur `/` ne voyait rien ;
 * celui-ci rend 503.
 *
 * Le `sub` sondé est fictif : la lecture doit RÉUSSIR avec zéro ligne. Ce qui
 * est éprouvé, c'est le droit d'interroger, pas l'existence d'un profil.
 */
const PROBE_SUB = 'health-probe-00000000-0000-0000-0000-000000000000';

export async function GET() {
  const startedAt = Date.now();
  const lecture = await listGuideProfilePageByUserId(PROBE_SUB, 'iam');
  const iam = iamReadHealthSnapshot();
  const body = {
    ok: lecture.ok,
    checks: {
      iamProfileRead: lecture.ok ? 'ok' : 'failed',
    },
    iamReadFailures: iam.failures,
    lastIamFailureAt: iam.lastFailureAt ? new Date(iam.lastFailureAt).toISOString() : null,
    latencyMs: Date.now() - startedAt,
    build: process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev',
  };
  return NextResponse.json(body, {
    status: lecture.ok ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}

/**
 * Client-side "Mes achats" — the tours the current user owns, resolved with the
 * BROWSER AppSync client (authMode userPool reads the localStorage session).
 *
 * The server equivalent (purchases-server.ts) reads cookies, which this app does
 * NOT populate (Amplify is configured with localStorage token storage — see
 * lib/amplify/config.ts). So owner-scoped "Mes achats" must resolve client-side,
 * exactly like the catalogue "Acheté" badges (useOwnedTourIds / listOwnedTourIds).
 */

import type { Tour } from '@/types/tour';
import type { PurchasedTour, MyPurchasesResult } from '@/types/purchase';
import { shouldUseStubs } from '@/config/api-mode';
import { getAllTours, generateSlug } from './tours';
import { getGuideTourById } from './appsync-client';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'PurchasesClient';

interface PurchaseRow {
  tourId: string;
  amountCents?: number | null;
  source?: string | null;
  createdAt?: string;
}

/** Light GuideTour → Tour map for owned tours absent from the published catalogue. */
function mapRawTourLight(raw: Record<string, unknown>): Tour {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    slug: generateSlug(String(raw.title ?? '')),
    city: String(raw.city ?? ''),
    citySlug: generateSlug(String(raw.city ?? '')),
    guideId: String(raw.guideId ?? ''),
    guideName: '',
    description: String(raw.description ?? ''),
    shortDescription: String(raw.description ?? '').substring(0, 100),
    duration: (raw.duration as number) ?? 0,
    distance: (raw.distance as number) ?? 0,
    poiCount: (raw.poiCount as number) ?? 0,
    isFree: false,
    priceCents: (raw.priceCents as number | undefined) ?? undefined,
    purchaseType: (raw.purchaseType as Tour['purchaseType']) ?? undefined,
    status: (String(raw.status ?? 'draft')) as Tour['status'],
    imageUrl: (raw.coverPhotoKey as string) ?? (raw.heroImageUrl as string) ?? undefined,
    availableLanguages: Array.isArray(raw.availableLanguages)
      ? (raw.availableLanguages as string[])
      : ['fr'],
    createdAt: (raw.createdAt as string) ?? '',
  };
}

export async function getMyPurchasesClient(): Promise<MyPurchasesResult> {
  if (shouldUseStubs()) return { authenticated: false, purchases: [] };

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // Paginate: DynamoDB filters AFTER each scanned page — a single .list() can
    // silently truncate the user's purchases.
    const rows: PurchaseRow[] = [];
    let nextToken: string | null | undefined;
    do {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).models.TourPurchase.list({
        filter: { status: { eq: 'active' } },
        authMode: 'userPool',
        nextToken: nextToken ?? undefined,
      });
      rows.push(...((result.data ?? []) as PurchaseRow[]));
      nextToken = result.nextToken;
    } while (nextToken);

    if (rows.length === 0) return { authenticated: true, purchases: [] };

    // One card per tour — keep the most recent active purchase if duplicated.
    const byTour = new Map<string, PurchaseRow>();
    for (const r of rows) {
      if (!r.tourId) continue;
      const prev = byTour.get(r.tourId);
      if (!prev || (r.createdAt ?? '') > (prev.createdAt ?? '')) byTour.set(r.tourId, r);
    }

    // Join with the published catalogue (rich images); fall back to a direct
    // GuideTour.get for owned-but-unpublished tours so a paid tour never vanishes.
    const allTours = await getAllTours();
    const toursById = new Map(allTours.map((t) => [t.id, t]));

    const purchases = await Promise.all(
      Array.from(byTour.values()).map(async (r): Promise<PurchasedTour | null> => {
        let tour = toursById.get(r.tourId);
        if (!tour) {
          const raw = await getGuideTourById(r.tourId);
          if (raw) tour = mapRawTourLight(raw as unknown as Record<string, unknown>);
        }
        if (!tour) return null;
        return {
          tour,
          purchasedAt: r.createdAt ?? '',
          amountCents: r.amountCents ?? undefined,
          source: r.source ?? undefined,
        };
      }),
    );

    return {
      authenticated: true,
      purchases: purchases
        .filter((p): p is PurchasedTour => p !== null)
        .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)),
    };
  } catch (error) {
    logger.error(SERVICE_NAME, 'getMyPurchasesClient failed', { error: String(error) });
    // We know the user is authenticated (called only when isAuthenticated); flag
    // the failure so the UI shows an error state instead of "no purchases yet".
    return { authenticated: true, purchases: [], error: true };
  }
}

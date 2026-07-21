/**
 * Server-side "Mes achats" API — the tours the current user owns, with purchase
 * metadata (date, amount). Owner-scoped TourPurchase rows are read via the
 * cookie-authenticated server client (authMode userPool).
 *
 * Distinguishes guest (authenticated:false) from "logged in, no purchases yet"
 * (authenticated:true, purchases:[]) so the UI can branch correctly.
 */

import 'server-only';
import type { Tour } from '@/types/tour';
import { shouldUseStubs } from '@/config/api-mode';
import { getServerUserId } from '@/lib/amplify/server-user';
import { getServerClient } from '@/lib/amplify/server-client';
import { getAllTours } from './tours-server';
import { getGuideTourByIdServer } from './appsync-server-public';
import { generateSlug } from './tours';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'PurchasesServer';

export interface PurchasedTour {
  tour: Tour;
  /** ISO timestamp of the purchase (TourPurchase.createdAt). */
  purchasedAt: string;
  amountCents?: number;
  source?: string;
}

export interface MyPurchasesResult {
  authenticated: boolean;
  purchases: PurchasedTour[];
  /** True when the purchase list could not be loaded (backend error) — the UI
   *  must NOT present this as "no purchases yet". */
  error?: boolean;
}

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

export async function getMyPurchases(): Promise<MyPurchasesResult> {
  if (shouldUseStubs()) return { authenticated: false, purchases: [] };

  const userId = await getServerUserId();
  if (!userId) return { authenticated: false, purchases: [] };

  try {
    const client = getServerClient();
    // Paginate: DynamoDB filters AFTER each scanned page — a single .list() can
    // silently truncate the user's purchases.
    const rows: PurchaseRow[] = [];
    let nextToken: string | null | undefined;
    do {
      const result = await client.models.TourPurchase.list({
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
          const raw = await getGuideTourByIdServer(r.tourId);
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
    logger.error(SERVICE_NAME, 'getMyPurchases failed', { error: String(error) });
    // We know the user is authenticated; flag the failure so the UI shows an
    // error state instead of lying with "no purchases yet".
    return { authenticated: true, purchases: [], error: true };
  }
}

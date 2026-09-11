/**
 * Langues déjà FABRIQUÉES d'une visite, lues depuis les Paires de la narration
 * à la demande (`Pair`, identifiée par `{tourId, language}`).
 *
 * C'est la seule source légitime côté Guide : le Studio ne génère plus rien
 * lui-même (garde `no-studio-tts-generation`), et l'ancien registre d'achats
 * de langue (`LanguagePurchase`) ne décrit plus ce qui existe réellement.
 *
 * Une langue est « créée » dès qu'au moins une scène est prête
 * (`partially_ready`) ou que la Paire est complète (`ready`). Les états
 * `queued`/`fabricating`/`failed`/`absent` ne comptent pas : rien n'est
 * écoutable. `Pair` est lisible par tout utilisateur authentifié.
 */

import { getClient } from './appsync-client';
import { paginateAll } from './paginate';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TourLanguages';

const CREATED_STATES = new Set(['ready', 'partially_ready']);

type PairRow = { tourId: string; language: string; state?: string | null };

/**
 * Langues fabriquées, groupées par `tourId`, en une seule lecture paginée.
 * Codes en minuscules, dédupliqués. Un échec rend une carte vide : l'info est
 * un confort, elle ne doit pas casser la liste des visites.
 */
export async function listCreatedLanguagesByTour(): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (shouldUseStubs()) return result;

  try {
    const client = getClient();
    const pairs = await paginateAll<PairRow>((nextToken) =>
      client.models.Pair.list({ nextToken: nextToken ?? undefined }) as unknown as Promise<{
        data: PairRow[];
        nextToken?: string | null;
      }>,
    );
    for (const pair of pairs) {
      if (!pair?.tourId || !pair.language) continue;
      if (!CREATED_STATES.has(pair.state ?? '')) continue;
      const code = pair.language.toLowerCase();
      const current = result.get(pair.tourId) ?? [];
      if (!current.includes(code)) result.set(pair.tourId, [...current, code]);
    }
  } catch (error) {
    logger.warn(SERVICE_NAME, 'listCreatedLanguagesByTour failed', { error: String(error) });
  }
  return result;
}

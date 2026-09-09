import { getClient } from './appsync-client';
import { getAllAdminTours } from './moderation';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'NarrationRequests';

/**
 * Lecture ADMIN du registre des demandes de fabrication (« narration à la
 * demande »), jointe à l'État de Paire et au titre de la Visite.
 *
 * ─── CE QUE CETTE VUE PEUT DIRE, ET CE QU'ELLE NE PEUT PAS ───
 *
 * `FabricationRequest` est identifiée par le TRIPLET `{tourId}#{lang}#v{n}`
 * (`fabricationRequestId`, amplify/shared/narration.ts) : deux visiteurs qui
 * ouvrent la même Paire produisent DEUX événements d'admission et UNE SEULE
 * ligne — la seconde est absorbée par la condition d'écriture. La table répond
 * donc à « QUOI est demandé », jamais à « COMBIEN de gens l'ont demandé ».
 *
 * Le seul demandeur qu'elle conserve est celui qui a fait NAÎTRE la ligne, dans
 * `admissionEventId` = `{sub}#{tourId}#{lang}#v{n}`. Il est exposé ici sous le
 * nom `premierDemandeurSub` — et non `demandeurSub` — pour que le nom refuse de
 * lui-même la lecture « c'est le demandeur ».
 *
 * Le décompte par utilisateur vit ailleurs : dans le journal CloudWatch de
 * `openNarrationPair`, qui journalise les DEUX chemins (création ET absorption)
 * avec l'`admissionEventId` complet. Rien ici ne peut le remplacer.
 */
export type DemandeNarration = {
  requestId: string;
  tourId: string;
  /** Titre de la Visite si elle existe encore ; null sur une Visite supprimée. */
  tourTitle: string | null;
  tourCity: string | null;
  language: string;
  sourceVersion: number;
  requestedAt: string;
  admittedAt: string | null;
  /** Vrai tant que le worker n'a pas tiré la demande. */
  enAttente: boolean;
  /** Voir le commentaire de type : le PREMIER, jamais « le » demandeur. */
  premierDemandeurSub: string | null;
  /** État de la Paire correspondante ; `absent` si aucune ligne `Pair`. */
  pairState: string;
  sceneCount: number | null;
  readySceneCount: number | null;
  failureMessage: string | null;
};

/**
 * Le sub porté par `admissionEventId`, ou null.
 *
 * Découpe sur le PREMIER séparateur seulement : un `tourId` ne contient pas de
 * `#` (`requireComponent` le refuse), mais découper sur tous les `#` et prendre
 * le premier champ resterait juste sans dire pourquoi. Une ligne semée à la main
 * peut n'avoir aucun `admissionEventId` — le champ est facultatif au schéma.
 */
export function premierDemandeurDepuisEvenement(
  admissionEventId: string | null | undefined,
): string | null {
  if (!admissionEventId) return null;
  const separateur = admissionEventId.indexOf('#');
  if (separateur <= 0) return null;
  return admissionEventId.slice(0, separateur);
}

/** Pagine une liste AppSync jusqu'au bout — le registre croît sans borne. */
async function toutesLesPages<T>(
  fetcher: (
    nextToken: string | null | undefined,
  ) => Promise<{ data: T[]; nextToken?: string | null }>,
): Promise<T[]> {
  const lignes: T[] = [];
  let nextToken: string | null | undefined = null;
  let pages = 0;
  do {
    const page = await fetcher(nextToken);
    lignes.push(...(page.data ?? []));
    const suivant = page.nextToken;
    nextToken = suivant && suivant !== nextToken ? suivant : null;
    pages += 1;
  } while (nextToken && pages < 50);
  return lignes;
}

const STUB: DemandeNarration[] = [
  {
    requestId: 'grasse-ame-parfumeurs#en#v1',
    tourId: 'grasse-ame-parfumeurs',
    tourTitle: 'L’Âme des Parfumeurs',
    tourCity: 'Grasse',
    language: 'en',
    sourceVersion: 1,
    requestedAt: '2026-09-03T16:31:14.852Z',
    admittedAt: '2026-09-03T16:31:15.903Z',
    enAttente: false,
    premierDemandeurSub: '4418d408-8091-7086-42d5-ff563a43379c',
    pairState: 'ready',
    sceneCount: 9,
    readySceneCount: 9,
    failureMessage: null,
  },
  {
    requestId: 'nice-promenade-anglais#de#v1',
    tourId: 'nice-promenade-anglais',
    tourTitle: 'La Promenade des Anglais',
    tourCity: 'Nice',
    language: 'de',
    sourceVersion: 1,
    requestedAt: '2026-09-04T12:34:19.255Z',
    admittedAt: null,
    enAttente: true,
    premierDemandeurSub: '9b2ba516-ae96-4c83-98cf-53864117ae96',
    pairState: 'queued',
    sceneCount: 7,
    readySceneCount: 0,
    failureMessage: null,
  },
];

/**
 * Le registre entier, joint aux Paires et aux Visites, du plus récent au plus
 * ancien. Les trois lectures sont admin (`allow.group('admin').to(['read'])`).
 */
export async function listerDemandesNarration(): Promise<DemandeNarration[]> {
  if (shouldUseStubs()) return STUB;

  try {
    const client = getClient();

    const [demandes, paires, visites] = await Promise.all([
      toutesLesPages((nextToken) =>
        client.models.FabricationRequest.list({ nextToken: nextToken ?? undefined }),
      ),
      toutesLesPages((nextToken) => client.models.Pair.list({ nextToken: nextToken ?? undefined })),
      getAllAdminTours().catch((error) => {
        // Le titre est un CONFORT : une jointure absente ne doit pas faire
        // disparaître la demande, qui est le fait. On dégrade sur le tourId.
        logger.warn(SERVICE_NAME, 'titres de Visite indisponibles', { error: String(error) });
        return [] as Awaited<ReturnType<typeof getAllAdminTours>>;
      }),
    ]);

    const parPaire = new Map(paires.map((p) => [`${p.tourId}#${p.language}`, p]));
    const parVisite = new Map(visites.map((t) => [t.id, t]));

    return demandes
      .map((demande): DemandeNarration => {
        const brut = demande as unknown as Record<string, unknown>;
        const paire = parPaire.get(`${demande.tourId}#${demande.language}`);
        const visite = parVisite.get(demande.tourId);
        return {
          requestId: demande.requestId,
          tourId: demande.tourId,
          tourTitle: visite?.title ?? null,
          tourCity: visite?.city ?? null,
          language: demande.language,
          // Version absente ⇒ lue comme 1 (AD-13, règle de compatibilité).
          sourceVersion: demande.sourceVersion ?? 1,
          requestedAt: demande.requestedAt,
          admittedAt: demande.admittedAt ?? null,
          // L'attribut est RETIRÉ à l'admission, jamais réécrit : sa seule
          // présence est le fait « pas encore tirée ». On ne le compare donc pas
          // à 'pending', et on ne déduit pas l'attente d'un `admittedAt` nul —
          // c'est l'attribut épars, et lui seul, que l'ouvrier interroge.
          enAttente: brut.pendingAdmission != null,
          premierDemandeurSub: premierDemandeurDepuisEvenement(
            brut.admissionEventId as string | null | undefined,
          ),
          pairState: paire?.state ?? 'absent',
          sceneCount: paire?.sceneCount ?? null,
          readySceneCount: paire?.readySceneCount ?? null,
          failureMessage: paire?.failureMessage ?? null,
        };
      })
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  } catch (error) {
    logger.error(SERVICE_NAME, 'listerDemandesNarration failed', { error: String(error) });
    return [];
  }
}

/** Les e-mails des premiers demandeurs, par sub. Un sub introuvable est omis. */
export async function resoudreEmails(subs: string[]): Promise<Record<string, string>> {
  if (shouldUseStubs()) {
    return Object.fromEntries(subs.map((sub) => [sub, `${sub.slice(0, 8)}@exemple.test`]));
  }
  const resultats = await Promise.all(
    subs.map(async (sub) => {
      try {
        const reponse = await fetch(`/api/admin/cognito-user?userId=${encodeURIComponent(sub)}`);
        if (!reponse.ok) return null;
        const { email } = (await reponse.json()) as { email: string | null };
        return email ? ([sub, email] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(resultats.filter((r): r is readonly [string, string] => r != null));
}

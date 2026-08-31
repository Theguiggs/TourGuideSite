'use client';

import { useEffect, useState } from 'react';
import { getStudioAnalytics, type StudioAnalyticsSummary } from '@/lib/api/studio-analytics';
import {
  formaterDollars,
  lireGrandLivre,
  type RapportDeDepense,
} from '@/lib/api/spend-ledger-report';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AdminAnalyticsPage';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  editing: 'En cours d\u2019\u00e9dition',
  recording: 'Enregistrement',
  ready: 'Pr\u00eat',
  submitted: 'Soumis',
  published: 'Publi\u00e9',
  revision_requested: 'R\u00e9vision demand\u00e9e',
  rejected: 'Rejet\u00e9',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-paper-deep',
  editing: 'bg-mer',
  recording: 'bg-mer',
  ready: 'bg-olive',
  submitted: 'bg-ocre',
  published: 'bg-olive',
  revision_requested: 'bg-ocre',
  rejected: 'bg-grenadine',
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<StudioAnalyticsSummary | null>(null);
  const [depense, setDepense] = useState<RapportDeDepense | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await getStudioAnalytics();
        setData(result);
        logger.info(SERVICE_NAME, 'Analytics loaded');
      } catch (e) {
        logger.error(SERVICE_NAME, 'Failed to load analytics', { error: String(e) });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // LE COUT SE LIT, IL NE SE DEDUIT PAS (AD-16 6). Charge a part : le grand
  // livre peut etre indisponible sans emporter le reste de la page, et son
  // indisponibilite se DIT au lieu de retomber sur une estimation.
  useEffect(() => {
    async function lireDepense() {
      try {
        setDepense(await lireGrandLivre());
      } catch (e) {
        logger.error(SERVICE_NAME, 'Failed to read spend ledger', { error: String(e) });
        setDepense({
          ok: false,
          motif: 'panne',
          message: "Le grand livre n'a pas pu etre lu.",
        });
      }
    }
    lireDepense();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-6" aria-busy="true">
        <h1 className="text-2xl font-bold text-ink mb-6">Analytics Studio</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-paper-deep rounded-lg h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { funnel, statusDistribution, tourProduction } = data;
  const isEmpty =
    funnel.fieldSessions === 0 && statusDistribution.length === 0 && tourProduction.length === 0;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-ink mb-6">Analytics Studio</h1>

      {isEmpty && (
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 mb-6 text-sm text-ocre" role="status">
          Aucune donnée disponible. Cette vue se remplira au fur et à mesure que des guides publieront des tours.
        </div>
      )}

      {/* Funnel */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3">Funnel de production</h2>
        <div className="bg-card border border-line rounded-lg p-4">
          {Object.entries(funnel).map(([key, value]) => {
            const labels: Record<string, string> = {
              fieldSessions: 'Sessions terrain',
              studioCreated: 'Studios créés',
              transcribed: 'Transcrits',
              recorded: 'Enregistrés',
              submitted: 'Soumis',
              published: 'Publiés',
            };
            const maxVal = funnel.fieldSessions;
            const pct = maxVal > 0 ? Math.round((value / maxVal) * 100) : 0;

            return (
              <div key={key} className="flex items-center gap-3 mb-2" data-testid={`funnel-${key}`}>
                <span className="w-32 text-sm text-ink-60 text-right">{labels[key] || key}</span>
                <div className="flex-1 bg-paper-deep rounded-full h-6 relative">
                  <div
                    className="bg-grenadine h-6 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${pct}%` }}
                  >
                    <span className="text-xs text-white font-medium">{value}</span>
                  </div>
                </div>
                <span className="w-10 text-xs text-ink-40 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status distribution */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3">Distribution des statuts</h2>
        <div className="bg-card border border-line rounded-lg p-4">
          <div className="flex h-8 rounded-full overflow-hidden mb-3">
            {statusDistribution.map((item) => (
              <div
                key={item.status}
                className={`${STATUS_COLORS[item.status] ?? 'bg-paper-deep'} transition-all`}
                style={{ width: `${item.percentage}%` }}
                title={`${STATUS_LABELS[item.status] ?? item.status}: ${item.count} (${item.percentage}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {statusDistribution.map((item) => (
              <div key={item.status} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${STATUS_COLORS[item.status] ?? 'bg-paper-deep'}`} />
                <span className="text-ink-60">{STATUS_LABELS[item.status] ?? item.status}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dépense mesurée — le grand livre, ou rien */}
      <section className="mb-8" data-testid="depense-mesuree">
        <h2 className="text-lg font-semibold text-ink mb-3">Dépense mesurée (grand livre)</h2>
        <div className="bg-card border border-line rounded-lg p-4">
          <SectionDepense rapport={depense} />
        </div>
      </section>

      {/* Production par Visite — des faits comptés, aucun coût déduit */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3">Production par Visite</h2>
        <div className="bg-card border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft">
              <tr>
                <th className="text-left px-4 py-2 text-ink-60 font-medium">Tour</th>
                <th className="text-right px-4 py-2 text-ink-60 font-medium">Scènes avec audio</th>
              </tr>
            </thead>
            <tbody>
              {tourProduction.map((tour) => (
                <tr
                  key={tour.tourId}
                  className="border-t border-line"
                  data-testid={`production-${tour.tourId}`}
                >
                  <td className="px-4 py-2 text-ink">{tour.tourTitle}</td>
                  <td className="px-4 py-2 text-right text-ink-60">{tour.scenesWithAudio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-40 mt-2">
          Ce tableau ne porte plus de coût : il était calculé sur quatre constantes en dur, jamais
          mesurées sur ce système. Le coût réel est au grand livre, ci-dessus.
        </p>
      </section>

    </div>
  );
}

/**
 * LE GRAND LIVRE, OU UN « — » HONNÊTE — AD-16 §6.
 *
 * Trois grandeurs, JAMAIS additionnées : mesuré (débit conclu), provisionné
 * (débit encore en vol), relâché (appel mort avant d'émettre — le gaspillage).
 * Les sommer rendrait un total supérieur au compteur opposable de l'enveloppe,
 * et le lecteur conclurait à un défaut là où il n'y en a pas.
 *
 * Aucune branche de ce composant n'affiche un coût qui n'a pas été ÉCRIT par un
 * point de sortie après avoir appelé un fournisseur. Là où le grand livre ne
 * dit rien, la page dit qu'elle ne sait pas.
 */
function SectionDepense({ rapport }: { rapport: RapportDeDepense | null }) {
  if (rapport === null) {
    return (
      <p className="text-sm text-ink-60" aria-busy="true">
        Lecture du grand livre…
      </p>
    );
  }

  if (!rapport.ok) {
    return (
      <div role="status" data-testid="depense-indisponible">
        <p className="text-2xl font-bold text-ink-40">&mdash;</p>
        <p className="text-sm text-ink-60 mt-1">{rapport.message}</p>
        <p className="text-xs text-ink-40 mt-2">
          Aucun coût n&rsquo;est estimé à la place : un «&nbsp;&mdash;&nbsp;» honnête vaut mieux
          qu&rsquo;un chiffre faux.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4">
        {rapport.enveloppes.map((env) => (
          <div key={env.enveloppe} className="text-sm" data-testid={`enveloppe-${env.enveloppe}`}>
            <span className="text-ink-60">Enveloppe {env.enveloppe} : </span>
            <span className="font-medium text-ink">{formaterDollars(env.engageMicros)} engagés</span>
            {env.armee && env.capMicros !== null ? (
              <span className="text-ink-60">
                {' '}
                sur {formaterDollars(env.capMicros)}
                {env.remplissagePourCent !== null
                  ? ` (${env.remplissagePourCent.toFixed(1)} %)`
                  : ''}
              </span>
            ) : (
              <span className="text-ink-40"> &mdash; non armée ({env.motif ?? 'sans plafond'})</span>
            )}
          </div>
        ))}
      </div>

      {rapport.vide ? (
        <div role="status" data-testid="grand-livre-vide">
          <p className="text-2xl font-bold text-ink-40">&mdash;</p>
          <p className="text-sm text-ink-60 mt-1">
            Le grand livre ne porte encore aucun débit. Il part de zéro : toute la dépense
            antérieure a été journalisée avant qu&rsquo;il existe, et n&rsquo;est pas récupérable
            ici.
          </p>
          <p className="text-xs text-ink-40 mt-2">
            Ce n&rsquo;est pas «&nbsp;0&nbsp;$ dépensé&nbsp;» &mdash; c&rsquo;est «&nbsp;rien de
            mesuré à ce jour&nbsp;».
          </p>
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="bg-paper-soft">
              <tr>
                <th className="text-left px-2 py-2 text-ink-60 font-medium">Visite / producteur</th>
                <th className="text-right px-2 py-2 text-ink-60 font-medium">Mesuré</th>
                <th className="text-right px-2 py-2 text-ink-60 font-medium">Provisionné</th>
                <th className="text-right px-2 py-2 text-ink-60 font-medium">Relâché</th>
              </tr>
            </thead>
            <tbody>
              {rapport.parVisite.map((axe) => (
                <tr
                  key={`${axe.enveloppe}#${axe.cle}`}
                  className="border-t border-line"
                  data-testid={`depense-${axe.enveloppe}-${axe.cle}`}
                >
                  <td className="px-2 py-2 text-ink">
                    {axe.cle}
                    <span className="text-ink-40 text-xs"> ({axe.enveloppe})</span>
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-ink">
                    {formaterDollars(axe.mesureMicros)}
                  </td>
                  <td className="px-2 py-2 text-right text-ink-60">
                    {formaterDollars(axe.provisionOuverteMicros)}
                  </td>
                  <td className="px-2 py-2 text-right text-ocre">
                    {formaterDollars(axe.relacheMicros)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-40 mt-2">
            Trois grandeurs distinctes, jamais additionnées&nbsp;: <strong>mesuré</strong> (débit
            conclu), <strong>provisionné</strong> (appel encore en vol), <strong>relâché</strong>{' '}
            (appel mort avant d&rsquo;émettre &mdash; le gaspillage). Périodes lues&nbsp;:{' '}
            {rapport.periodes.join(', ') || 'aucune'}.
          </p>
        </>
      )}
    </div>
  );
}

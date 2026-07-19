'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { CreditCard, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import {
  getGuideRevenueSummary,
  getGuideRevenueMonths,
  getGuideRevenueTours,
} from '@/lib/api/guide';
import {
  formatEuros,
  monthLabel,
  computeDelta,
  nextPaymentDate,
  cityFromTourTitle,
} from '@/lib/studio/revenues-helpers';
import {
  RevenueHeroCard,
  RevenueKpiCard,
  RevenueChart,
  RevenueTourRow,
  BreakdownCard,
  NextPaymentCard,
} from '@/components/studio/revenues';
import type {
  GuideRevenueSummary,
  GuideRevenueMonth,
  GuideRevenueTour,
} from '@/types/guide';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'StudioRevenusPage';
const GUIDE_SHARE_PCT = 70;

interface RevenueData {
  summary: GuideRevenueSummary;
  months: GuideRevenueMonth[];
  tours: GuideRevenueTour[];
}

export default function StudioRevenusPage() {
  const { user } = useAuth();
  const { locale } = useStudioLocale();
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const copy = useMemo(() => locale === 'en' ? {
    loadError: 'Unable to load revenue.', guideOnly: 'The Studio is for guides. Create a guide profile to get started.', unexpected: 'Unexpected error.', retry: 'Try again',
    emptyTitle: 'No paid plays yet', emptyText: 'Your first earnings arrive as soon as a traveller listens to one of your paid tours.', viewTours: 'View my tours',
    eyebrow: 'Revenue · last 12 months', titleStart: 'Your', titleEmphasis: 'earnings', intro: `You receive ${GUIDE_SHARE_PCT}% of every paid play. Payments are made monthly on the 5th of the following month.`,
    soon: 'Coming soon', csv: 'CSV statement', bank: 'Bank details', expected: 'To be received on', ytd: 'Year to date', months: 'months', average: 'average',
    total: 'Total earned', since: 'Since registration', activity: 'months active', plays: 'plays', detail: 'By tour · this month', noRevenue: 'No tour generated revenue this month.',
    totalMonth: 'Total', footer: `Murmure retains ${100 - GUIDE_SHARE_PCT}% per paid play (hosting, payments, app and marketing). 0% on free plays. Average revenue / play:`,
  } : {
    loadError: 'Impossible de charger les revenus.', guideOnly: 'Le Studio est réservé aux guides. Créez un profil guide pour commencer.', unexpected: 'Erreur inattendue.', retry: 'Réessayer',
    emptyTitle: 'Aucune écoute payante encore', emptyText: 'Vos premiers euros arrivent dès qu’un voyageur écoute une de vos visites payantes.', viewTours: 'Voir mes visites',
    eyebrow: 'Revenus · les 12 derniers mois', titleStart: 'Vos', titleEmphasis: 'recettes', intro: `Vous touchez ${GUIDE_SHARE_PCT} % de chaque écoute payante. Les versements sont mensuels, le 5 du mois suivant.`,
    soon: 'Bientôt disponible', csv: 'Relevé CSV', bank: 'Coordonnées bancaires', expected: 'À recevoir le', ytd: 'Cumul', months: 'mois', average: 'moyenne',
    total: 'Total cumulé', since: "Depuis l'inscription", activity: "mois d'activité", plays: 'écoutes', detail: 'Détail par visite · ce mois', noRevenue: 'Aucune visite ne génère de revenus ce mois.',
    totalMonth: 'Total', footer: `Murmure prélève ${100 - GUIDE_SHARE_PCT} % par écoute payante (hébergement, paiements, app et marketing). 0 % sur les écoutes gratuites. Revenu moyen / écoute :`,
  }, [locale]);

  const load = useCallback(async (guideId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [summary, months, tours] = await Promise.all([
        getGuideRevenueSummary(guideId),
        getGuideRevenueMonths(guideId),
        getGuideRevenueTours(guideId),
      ]);
      setData({ summary, months, tours });
      logger.info(SERVICE_NAME, 'Revenue loaded', {
        thisMonth: summary.thisMonth,
        months: months.length,
        tours: tours.length,
      });
    } catch (e) {
      setError(copy.loadError);
      logger.error(SERVICE_NAME, 'Failed to load revenue', { error: String(e) });
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;
    if (!guideId) {
      setIsLoading(false);
      return;
    }
    load(guideId);
  }, [user, load]);

  const chartData = useMemo(() => {
    if (!data) return [];
    // Sort ascending (oldest → newest), take the most recent 12.
    const asc = [...data.months].sort((a, b) => a.month.localeCompare(b.month));
    const last12 = asc.slice(-12);
    return last12.map((m) => {
      if (locale === 'fr') return { label: monthLabel(m.month), value: m.guideShare };
      const [year, month] = m.month.split('-').map(Number);
      const label = year && month ? new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : m.month;
      return { label, value: m.guideShare };
    });
  }, [data, locale]);

  const delta = useMemo(() => {
    if (!data || data.months.length < 2) return null;
    const sorted = [...data.months].sort((a, b) => a.month.localeCompare(b.month));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    return computeDelta(last.guideShare, prev.guideShare);
  }, [data]);

  const payment = useMemo(() => nextPaymentDate(), []);

  const breakdown = useMemo(() => {
    if (!data) return null;
    // Use most recent month for breakdown
    const sorted = [...data.months].sort((a, b) => a.month.localeCompare(b.month));
    const recent = sorted[sorted.length - 1];
    if (!recent) return null;
    const grossPerListen =
      recent.listens > 0 ? recent.grossRevenue / recent.listens : 0;
    return {
      listens: recent.listens,
      grossPerListen,
      grossTotal: recent.grossRevenue,
      sharePct: GUIDE_SHARE_PCT,
      netAmount: recent.guideShare,
    };
  }, [data]);

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <div className="h-12 w-48 bg-paper-deep rounded-md animate-pulse mb-3" />
        <div className="h-20 w-96 bg-paper-deep rounded-md animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4 mb-6">
          <div className="h-44 bg-olive rounded-xl animate-pulse" />
          <div className="h-44 bg-card border border-line rounded-lg animate-pulse" />
          <div className="h-44 bg-card border border-line rounded-lg animate-pulse" />
        </div>
        <div className="h-72 bg-card border border-line rounded-lg animate-pulse" />
      </div>
    );
  }

  // ─── No guide profile ───
  if (!user?.guideId && !shouldUseStubs()) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 text-ocre" role="alert">
          {copy.guideOnly}
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-grenadine-soft border border-grenadine rounded-lg p-4" role="alert">
          <p className="text-danger">{error ?? copy.unexpected}</p>
          <button
            type="button"
            onClick={() => load(user?.guideId || 'guide-1')}
            className="mt-2 text-caption font-medium text-danger underline hover:opacity-80"
          >
            {copy.retry}
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty (no revenue yet) ───
  if (data.summary.thisMonth === 0 && data.months.every((m) => m.guideShare === 0)) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div
          className="bg-card border border-line rounded-xl p-12 text-center"
          data-testid="revenues-empty"
        >
          <div className="font-display text-h5 text-ink mb-2">
            {copy.emptyTitle}
          </div>
          <p className="text-caption text-ink-60 max-w-md mx-auto mb-6">
            {copy.emptyText}
          </p>
          <Link
            href="/guide/studio/tours"
            className="inline-flex items-center gap-2 bg-olive text-paper px-6 py-3 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition"
          >
            {copy.viewTours}
          </Link>
        </div>
      </div>
    );
  }

  const { summary, months, tours } = data;

  // Cumul yearly (current calendar year only)
  const currentYear = new Date().getFullYear();
  const ytdMonths = months.filter((m) => m.month.startsWith(`${currentYear}-`));
  const ytdSum = ytdMonths.reduce((acc, m) => acc + m.guideShare, 0);
  const ytdAvg = ytdMonths.length ? ytdSum / ytdMonths.length : 0;

  // Total since inception
  const totalListens = months.reduce((acc, m) => acc + m.listens, 0);
  const avgPerListen = totalListens > 0 ? summary.total / totalListens : 0;
  const paymentLabel = payment.date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ───── Header ───── */}
      <div className="flex items-start justify-between gap-6 flex-wrap mb-7">
        <div>
          <div className="tg-eyebrow text-olive">{copy.eyebrow}</div>
          <h1 className="font-display text-h3 text-ink mt-1 leading-none">
            {copy.titleStart} <em className="font-editorial italic">{copy.titleEmphasis}</em>.
          </h1>
          <p className="font-editorial italic text-body text-ink-60 max-w-xl mt-2">
            {copy.intro}
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button
            type="button"
            disabled
            title={copy.soon}
            className="bg-transparent text-ink border border-line px-4 py-3 rounded-pill text-caption font-semibold cursor-not-allowed opacity-60"
          >
            <span className="inline-flex items-center gap-2"><Download size={16} aria-hidden="true" />{copy.csv}</span>
          </button>
          <button
            type="button"
            disabled
            title={copy.soon}
            className="bg-ink text-paper border-none px-5 py-3 rounded-pill text-caption font-bold cursor-not-allowed opacity-60"
          >
            <span className="inline-flex items-center gap-2"><CreditCard size={16} aria-hidden="true" />{copy.bank}</span>
          </button>
        </div>
      </div>

      {/* ───── Big numbers row ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4 mb-7">
        <RevenueHeroCard
          amount={summary.thisMonth}
          currency={summary.currency}
          listens={ytdMonths.length > 0 ? ytdMonths[ytdMonths.length - 1].listens : 0}
          sharePct={GUIDE_SHARE_PCT}
          delta={delta ?? undefined}
          expectedLabel={`${copy.expected} ${paymentLabel}`}
        />
        <RevenueKpiCard
          eyebrow={`${copy.ytd} ${currentYear}`}
          value={formatEuros(ytdSum, { withCents: false })}
          footer={ytdMonths.length > 0 ? `${ytdMonths.length} ${copy.months} · ${copy.average} ${formatEuros(ytdAvg, { withCents: false })}` : undefined}
        />
        <RevenueKpiCard
          eyebrow={copy.total}
          value={formatEuros(summary.total, { withCents: false })}
          footer={copy.since}
          italicNote={`${months.length} ${copy.activity} · ${totalListens.toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')} ${copy.plays}`}
        />
      </div>

      {/* ───── Chart 12 mois ───── */}
      {chartData.length > 0 && (
        <div className="mb-7">
          <RevenueChart data={chartData} />
        </div>
      )}

      {/* ───── 2-col : tours / breakdown ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="bg-card border border-line rounded-lg p-7">
          <div className="tg-eyebrow text-mer">{copy.detail}</div>
          {tours.length === 0 ? (
            <p className="text-caption text-ink-60 mt-4">
              {copy.noRevenue}
            </p>
          ) : (
            <div className="mt-3.5">
              {tours.map((t, i) => (
                <RevenueTourRow
                  key={t.tourId}
                  city={cityFromTourTitle(t.tourTitle)}
                  title={t.tourTitle}
                  listens={t.listens}
                  revenue={t.revenue}
                  percentage={t.percentage}
                  isLast={i === tours.length - 1}
                />
              ))}
              <div className="mt-4 px-4 py-3 bg-olive-soft rounded-md flex justify-between items-center">
                <span className="text-caption font-semibold text-ink-80">{copy.totalMonth} {chartData.at(-1)?.label ?? ''}</span>
                <span className="font-display text-h6 text-olive font-semibold">
                  {formatEuros(summary.thisMonth)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {breakdown && (
            <BreakdownCard
              listens={breakdown.listens}
              grossPerListen={breakdown.grossPerListen}
              grossTotal={breakdown.grossTotal}
              sharePct={breakdown.sharePct}
              netAmount={breakdown.netAmount}
            />
          )}
          <NextPaymentCard dateLabel={paymentLabel} daysUntil={payment.daysUntil} />
        </div>
      </div>

      {/* ───── Footer note ───── */}
      <div className="mt-7 px-5 py-4 bg-paper-deep rounded-md text-meta text-ink-60 text-center italic">
        {copy.footer}{' '}
        <strong className="text-ink font-mono not-italic">
          {formatEuros(avgPerListen)}
        </strong>
      </div>
    </div>
  );
}

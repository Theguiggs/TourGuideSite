'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listerDemandesNarration,
  resoudreEmails,
  type DemandeNarration,
} from '@/lib/api/narration-requests';
import { logger } from '@/lib/logger';
import { PageTitle } from '@murmure/design-system/web';
import { PAIR_STATUS_BADGES, badgeFor } from '@/lib/admin/status-badges';
import { LANGUAGES, languageFlag, languageLabel } from '@/lib/i18n/languages';
import { StatusBadge } from '@/components/admin/StatusBadge';

const SERVICE_NAME = 'AdminNarrationPage';

function langue(code: string) {
  return { drapeau: languageFlag(code) ?? '🏳️', nom: languageLabel(code) };
}

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Le délai d'admission — la seule mesure de latence que la table permette. */
function formaterDelai(demandeeA: string, admiseA: string | null): string {
  if (!admiseA) return '—';
  const ms = new Date(admiseA).getTime() - new Date(demandeeA).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

function moisDe(iso: string): string {
  return iso.slice(0, 7);
}

function Tuile({ valeur, libelle }: { valeur: number | string; libelle: string }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-paper-deep">
      <p className="text-h5 font-semibold text-ink">{valeur}</p>
      <p className="text-meta text-ink-60 mt-1">{libelle}</p>
    </div>
  );
}

/** Un décompte trié, rendu en barres proportionnelles au maximum observé. */
function Repartition({
  titre,
  lignes,
}: {
  titre: string;
  lignes: Array<{ cle: string; etiquette: string; total: number }>;
}) {
  const max = Math.max(1, ...lignes.map((l) => l.total));
  return (
    <div className="bg-card rounded-xl p-4 border border-paper-deep">
      <h2 className="text-body font-semibold text-ink mb-3">{titre}</h2>
      {lignes.length === 0 ? (
        <p className="text-meta text-ink-60">Aucune demande.</p>
      ) : (
        <ul className="space-y-2">
          {lignes.map((ligne) => (
            <li key={ligne.cle} className="flex items-center gap-3">
              <span className="text-meta text-ink-80 w-40 truncate" title={ligne.etiquette}>
                {ligne.etiquette}
              </span>
              <span className="flex-1 h-2 bg-paper-deep rounded-pill overflow-hidden">
                <span
                  className="block h-full bg-ocre rounded-pill"
                  style={{ width: `${(ligne.total / max) * 100}%` }}
                />
              </span>
              <span className="text-meta text-ink-60 w-8 text-right tabular-nums">{ligne.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminNarrationPage() {
  const [demandes, setDemandes] = useState<DemandeNarration[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtreLangue, setFiltreLangue] = useState('');
  const [filtreEtat, setFiltreEtat] = useState('');

  useEffect(() => {
    let vivant = true;
    listerDemandesNarration()
      .then(async (lignes) => {
        if (!vivant) return;
        setDemandes(lignes);
        setChargement(false);
        // Les e-mails arrivent APRÈS le tableau : une résolution Cognito lente ou
        // refusée ne doit pas retenir le registre, qui se lit très bien avec des
        // subs. Un sub introuvable reste affiché tel quel.
        const subs = [...new Set(lignes.map((l) => l.premierDemandeurSub).filter(Boolean))];
        if (subs.length === 0) return;
        const resolus = await resoudreEmails(subs as string[]);
        if (vivant) setEmails(resolus);
      })
      .catch((error: unknown) => {
        logger.error(SERVICE_NAME, 'chargement des demandes impossible', { error: String(error) });
        if (!vivant) return;
        setErreur('Registre des demandes illisible.');
        setChargement(false);
      });
    return () => {
      vivant = false;
    };
  }, []);

  const visibles = useMemo(
    () =>
      demandes.filter(
        (d) =>
          (!filtreLangue || d.language === filtreLangue) &&
          (!filtreEtat ||
            (filtreEtat === 'pending' ? d.enAttente : d.pairState === filtreEtat)),
      ),
    [demandes, filtreLangue, filtreEtat],
  );

  const parLangue = useMemo(() => {
    const compte = new Map<string, number>();
    for (const d of demandes) compte.set(d.language, (compte.get(d.language) ?? 0) + 1);
    return [...compte.entries()]
      .map(([cle, total]) => ({
        cle,
        etiquette: `${langue(cle).drapeau} ${langue(cle).nom}`,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [demandes]);

  const parVisite = useMemo(() => {
    const compte = new Map<string, { etiquette: string; total: number }>();
    for (const d of demandes) {
      const courant = compte.get(d.tourId);
      compte.set(d.tourId, {
        etiquette: d.tourTitle ?? d.tourId,
        total: (courant?.total ?? 0) + 1,
      });
    }
    return [...compte.entries()]
      .map(([cle, v]) => ({ cle, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [demandes]);

  const parMois = useMemo(() => {
    const compte = new Map<string, number>();
    for (const d of demandes) {
      const mois = moisDe(d.requestedAt);
      compte.set(mois, (compte.get(mois) ?? 0) + 1);
    }
    return [...compte.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cle, total]) => ({ cle, etiquette: cle, total }));
  }, [demandes]);

  const enAttente = demandes.filter((d) => d.enAttente).length;
  const enEchec = demandes.filter((d) => d.pairState === 'failed').length;
  const languesConnues = Object.keys(LANGUAGES);
  const languesPresentes = [...new Set(demandes.map((d) => d.language))].sort(
    (a, b) => languesConnues.indexOf(a) - languesConnues.indexOf(b),
  );

  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <PageTitle size="h4">Narrations à la demande</PageTitle>
        <p className="text-body text-ink-60 mt-1">
          Le registre des demandes de fabrication, joint à l’état de chaque Paire (Visite × langue).
        </p>
      </header>

      {/* LE PIÈGE DE LECTURE, ÉCRIT SUR LA PAGE — pas seulement dans le code.
          Sans cet avertissement, « 17 demandes » se lit spontanément comme
          « 17 visiteurs », et la déduplication sur le triplet rend cette lecture
          fausse d’un facteur inconnu. */}
      <div className="mb-6 rounded-xl border border-ocre bg-ocre-soft p-4 text-body text-ink-80">
        <p className="font-medium text-ocre-ink mb-1">Une demande n’est pas un visiteur.</p>
        <p>
          Une ligne existe par triplet <strong>(Visite, langue, version)</strong> : le deuxième
          visiteur qui ouvre la même langue est <em>absorbé</em> et n’écrit rien. La colonne
          « Premier demandeur » nomme donc celui qui a fait naître la ligne, pas l’ensemble de ceux
          qui l’ont réclamée. Le décompte par utilisateur se lit dans le journal CloudWatch
          d’<code>openNarrationPair</code>, qui trace aussi les ouvertures absorbées.
        </p>
      </div>

      {erreur && (
        <div className="mb-6 rounded-xl border border-danger bg-grenadine-soft p-4 text-body text-danger">
          {erreur}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Tuile valeur={demandes.length} libelle="Demandes enregistrées" />
        <Tuile valeur={enAttente} libelle="En attente d’admission" />
        <Tuile valeur={new Set(demandes.map((d) => d.tourId)).size} libelle="Visites concernées" />
        <Tuile valeur={enEchec} libelle="Paires en échec" />
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mb-6">
        <Repartition titre="Par langue" lignes={parLangue} />
        <Repartition titre="Par visite (top 10)" lignes={parVisite} />
        <Repartition titre="Par mois" lignes={parMois} />
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        <select
          value={filtreLangue}
          onChange={(e) => setFiltreLangue(e.target.value)}
          className="px-3 py-2 rounded-lg border border-paper-deep text-body bg-card"
        >
          <option value="">Toutes les langues</option>
          {languesPresentes.map((code) => (
            <option key={code} value={code}>
              {langue(code).drapeau} {langue(code).nom}
            </option>
          ))}
        </select>
        <select
          value={filtreEtat}
          onChange={(e) => setFiltreEtat(e.target.value)}
          className="px-3 py-2 rounded-lg border border-paper-deep text-body bg-card"
        >
          <option value="">Tous les états</option>
          <option value="pending">En attente d’admission</option>
          {Object.entries(PAIR_STATUS_BADGES).map(([cle, badge]) => (
            <option key={cle} value={cle}>
              {badge.label}
            </option>
          ))}
        </select>
        <span className="text-body text-ink-60 self-center">
          {visibles.length} / {demandes.length}
        </span>
      </div>

      <div className="bg-card rounded-xl border border-paper-deep overflow-x-auto">
        <table className="w-full text-body">
          <thead className="bg-paper-soft text-ink-60 text-meta uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Demandée le</th>
              <th className="text-left px-4 py-3 font-medium">Visite</th>
              <th className="text-left px-4 py-3 font-medium">Langue</th>
              <th className="text-left px-4 py-3 font-medium">Ver.</th>
              <th className="text-left px-4 py-3 font-medium">État de la Paire</th>
              <th className="text-left px-4 py-3 font-medium">Admission</th>
              <th className="text-left px-4 py-3 font-medium">Premier demandeur</th>
            </tr>
          </thead>
          <tbody>
            {chargement && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-60">
                  Chargement…
                </td>
              </tr>
            )}
            {!chargement && visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-60">
                  Aucune demande.
                </td>
              </tr>
            )}
            {visibles.map((demande) => {
              const badge = badgeFor(PAIR_STATUS_BADGES, demande.pairState, 'absent');
              const sub = demande.premierDemandeurSub;
              return (
                <tr key={demande.requestId} className="border-t border-paper-deep align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-80">
                    {formaterDate(demande.requestedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {demande.tourTitle ? (
                      <Link
                        href={`/admin/tours/${demande.tourId}`}
                        className="text-mer hover:underline"
                      >
                        {demande.tourTitle}
                      </Link>
                    ) : (
                      // Une Visite supprimée laisse ses demandes orphelines : le
                      // schéma n'accorde `delete` à personne et rien ne cascade.
                      <span className="text-ink-60 font-mono text-meta">{demande.tourId}</span>
                    )}
                    {demande.tourCity && (
                      <span className="block text-meta text-ink-60">{demande.tourCity}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {langue(demande.language).drapeau} {langue(demande.language).nom}
                  </td>
                  <td className="px-4 py-3 text-ink-60">v{demande.sourceVersion}</td>
                  <td className="px-4 py-3">
                    <StatusBadge badge={badge} />
                    {demande.sceneCount != null && (
                      <span className="block text-meta text-ink-60 mt-1 tabular-nums">
                        {demande.readySceneCount ?? 0}/{demande.sceneCount} scènes
                      </span>
                    )}
                    {demande.failureMessage && (
                      <span className="block text-meta text-danger mt-1">
                        {demande.failureMessage}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {demande.enAttente ? (
                      <span className="inline-block px-2 py-1 rounded-pill text-meta font-medium bg-ocre-soft text-ocre-ink">
                        En attente
                      </span>
                    ) : (
                      <span className="text-ink-60 text-meta">
                        {formaterDelai(demande.requestedAt, demande.admittedAt)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub ? (
                      <span className="text-ink-80 text-meta" title={sub}>
                        {emails[sub] ?? `${sub.slice(0, 8)}…`}
                      </span>
                    ) : (
                      // Ligne semée à la main : le champ est facultatif au schéma.
                      <span className="text-ink-60 text-meta">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

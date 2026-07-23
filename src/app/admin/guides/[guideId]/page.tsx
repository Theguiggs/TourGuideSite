'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getGuideProfileById, listAllGuideTours, adminUpdateGuideProfileStatus } from '@/lib/api/appsync-client';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending_moderation: { label: 'En attente',  className: 'bg-ocre-soft text-ocre' },
  active:             { label: 'Actif',        className: 'bg-olive-soft text-olive' },
  suspended:          { label: 'Suspendu',     className: 'bg-ocre-soft text-ocre' },
  rejected:           { label: 'Rejeté',       className: 'bg-grenadine-soft text-danger' },
};

const TOUR_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft:              { label: 'Brouillon',           className: 'bg-paper-deep text-ink-80' },
  editing:            { label: 'En cours d\u2019\u00e9dition', className: 'bg-mer-soft text-mer' },
  recording:          { label: 'Enregistrement',     className: 'bg-mer-soft text-mer' },
  ready:              { label: 'Pr\u00eat',                className: 'bg-olive-soft text-olive' },
  submitted:          { label: 'Soumis',             className: 'bg-ocre-soft text-ocre' },
  pending_moderation: { label: 'En mod\u00e9ration',      className: 'bg-ocre-soft text-ocre' },
  published:          { label: 'Publi\u00e9',             className: 'bg-olive-soft text-olive' },
  revision_requested: { label: 'R\u00e9vision demand\u00e9e',  className: 'bg-ocre-soft text-ocre' },
  rejected:           { label: 'Rejet\u00e9',             className: 'bg-grenadine-soft text-danger' },
  archived:           { label: 'Archiv\u00e9',            className: 'bg-paper-deep text-ink-60' },
};

type GuideProfile = {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  city: string;
  parcoursSignature: string | null;
  yearsExperience: number | null;
  specialties: string[] | null;
  languages: string[] | null;
  rating: number | null;
  tourCount: number | null;
  verified: boolean | null;
  profileStatus: string;
};

type GuideTour = { id: string; title: string; city: string; status: string };

export default function AdminGuideDetailPage({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = use(params);
  const router = useRouter();

  const [profile, setProfile]   = useState<GuideProfile | null>(null);
  const [tours, setTours]       = useState<GuideTour[]>([]);
  const [guideEmail, setGuideEmail] = useState<string | null>(null);
  const [guideEmailUserId, setGuideEmailUserId] = useState<string | null>(null);
  const [emailLookupError, setEmailLookupError] = useState<string | null>(null);
  const [emailLookupUserId, setEmailLookupUserId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    Promise.all([
      getGuideProfileById(guideId, 'userPool'),
      listAllGuideTours(),
    ])
      .then(([p, allTours]) => {
        if (!p) { setError('Profil introuvable'); return; }
        setProfile({
          id: p.id,
          userId: p.userId,
          displayName: p.displayName,
          bio: p.bio ?? null,
          photoUrl: p.photoUrl ?? null,
          city: p.city,
          parcoursSignature: p.parcoursSignature ?? null,
          yearsExperience: p.yearsExperience ?? null,
          specialties: (p.specialties as string[]) ?? [],
          languages: (p.languages as string[]) ?? [],
          rating: p.rating ?? null,
          tourCount: p.tourCount ?? null,
          verified: p.verified ?? false,
          profileStatus: p.profileStatus ?? 'pending_moderation',
        });
        setTours(allTours.filter((t: Record<string, unknown>) => t.guideId === guideId).map((t: Record<string, unknown>) => ({
          id: String(t.id ?? ''),
          title: String(t.title ?? ''),
          city: String(t.city ?? ''),
          status: String(t.status ?? 'draft'),
        })));
      })
      .catch(() => setError('Erreur lors du chargement'))
      .finally(() => setLoading(false));

  }, [guideId]);

  // Fetch guide email from Cognito once profile is loaded
  useEffect(() => {
    const userId = profile?.userId;
    if (!userId) return;
    const targetUserId = userId;
    let cancelled = false;

    async function loadGuideEmail() {
      try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString();
        if (!accessToken) {
          if (!cancelled) {
            setEmailLookupUserId(targetUserId);
            setEmailLookupError('Session expirée — reconnectez-vous.');
          }
          router.replace('/guide/login');
          return;
        }

        const response = await fetch(`/api/admin/cognito-user?userId=${targetUserId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = (await response.json()) as { email?: string | null; error?: string };
        if (cancelled) return;

        if (response.status === 401) {
          setEmailLookupUserId(targetUserId);
          setEmailLookupError('Session expirée — reconnectez-vous.');
          router.replace('/guide/login');
        } else if (response.status === 403) {
          setEmailLookupUserId(targetUserId);
          setEmailLookupError('Accès administrateur requis.');
        } else if (!response.ok) {
          setEmailLookupUserId(targetUserId);
          setEmailLookupError(data.error ?? 'Lecture Cognito indisponible.');
        } else {
          setGuideEmail(data.email ?? null);
          setGuideEmailUserId(targetUserId);
          setEmailLookupUserId(targetUserId);
          setEmailLookupError(data.email ? null : 'Aucune adresse email Cognito trouvée.');
        }
      } catch {
        if (!cancelled) {
          setEmailLookupUserId(targetUserId);
          setEmailLookupError('Lecture Cognito indisponible.');
        }
      }
    }

    void loadGuideEmail();
    return () => {
      cancelled = true;
    };
  }, [profile?.userId, router]);

  const setStatus = async (status: 'active' | 'suspended' | 'rejected') => {
    if (!profile) return;
    setSaving(true);
    const result = await adminUpdateGuideProfileStatus(profile.id, status);
    setSaving(false);
    if (result.ok) {
      setProfile((p) => p ? { ...p, profileStatus: status } : p);
      setFeedback({ ok: true, msg: 'Statut mis à jour.' });
    } else {
      setFeedback({ ok: false, msg: result.error ?? 'Erreur' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  if (loading) return <p className="text-ink-60 text-sm p-6">Chargement...</p>;
  if (error || !profile) return (
    <div className="p-6">
      <p className="text-danger text-sm mb-4">{error ?? 'Profil introuvable'}</p>
      <Link href="/admin/guides" className="text-grenadine text-sm hover:underline">← Retour</Link>
    </div>
  );

  const statusBadge = STATUS_BADGES[profile.profileStatus] ?? STATUS_BADGES.pending_moderation;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/guides" className="text-ink-40 hover:text-ink-60 text-sm">
          ← Tous les guides
        </Link>
      </div>

      {feedback && (
        <div className={`rounded-lg p-3 mb-4 text-sm ${feedback.ok ? 'bg-olive-soft text-olive' : 'bg-grenadine-soft text-danger'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-card rounded-md border border-line p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-grenadine-soft rounded-full flex items-center justify-center text-grenadine font-bold text-2xl">
              {profile.displayName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">{profile.displayName}</h1>
              <p className="text-sm text-ink-60">{profile.city}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {/* View as user — opens guide's published tours in catalogue */}
            <Link
              href={`/catalogue/${profile.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
              target="_blank"
              className="border border-grenadine text-grenadine text-sm font-medium px-4 py-2 rounded-lg hover:bg-grenadine-soft flex items-center gap-1"
            >
              Voir catalogue {profile.city}
            </Link>
            {profile.profileStatus !== 'active' && (
              <button
                onClick={() => setStatus('active')}
                disabled={saving}
                className="bg-olive text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-olive disabled:opacity-50"
              >
                Activer le compte
              </button>
            )}
            {profile.profileStatus === 'active' && (
              <button
                onClick={() => setStatus('suspended')}
                disabled={saving}
                className="bg-ocre text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-ocre disabled:opacity-50"
              >
                Suspendre
              </button>
            )}
            {profile.profileStatus !== 'rejected' && profile.profileStatus !== 'active' && (
              <button
                onClick={() => setStatus('rejected')}
                disabled={saving}
                className="bg-grenadine text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-grenadine disabled:opacity-50"
              >
                Rejeter
              </button>
            )}
          </div>
        </div>

        {/* Email */}
        {guideEmail && guideEmailUserId === profile.userId && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-mer-soft rounded-lg">
            <span className="text-sm text-mer font-medium">Email :</span>
            <a href={`mailto:${guideEmail}`} className="text-sm text-mer font-mono hover:underline">{guideEmail}</a>
          </div>
        )}
        {emailLookupError && emailLookupUserId === profile.userId && (
          <p className="mb-4 text-sm text-danger" role="alert">
            {emailLookupError}
          </p>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="ID profil"      value={profile.id} mono />
          <InfoRow label="ID utilisateur" value={profile.userId} mono />
          <InfoRow label="Ville"          value={profile.city} />
          <InfoRow label="Vérifié"        value={profile.verified ? 'Oui' : 'Non'} />
          {profile.yearsExperience != null && (
            <InfoRow label="Expérience" value={`${profile.yearsExperience} ans`} />
          )}
          {profile.rating != null && (
            <InfoRow label="Note" value={`${profile.rating.toFixed(1)} / 5`} />
          )}
          {profile.tourCount != null && (
            <InfoRow label="Parcours" value={String(profile.tourCount)} />
          )}
          {profile.parcoursSignature && (
            <InfoRow label="Parcours signature" value={profile.parcoursSignature} />
          )}
        </div>

        {profile.bio && (
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-xs font-medium text-ink-60 mb-1">Bio</p>
            <p className="text-sm text-ink-80 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {profile.specialties && profile.specialties.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-xs font-medium text-ink-60 mb-2">Spécialités</p>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((s) => (
                <span key={s} className="text-xs bg-grenadine-soft text-grenadine px-2 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {profile.languages && profile.languages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-xs font-medium text-ink-60 mb-2">Langues</p>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((l) => (
                <span key={l} className="text-xs bg-mer-soft text-mer px-2 py-1 rounded-full">{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tours */}
      <div className="bg-card rounded-md border border-line p-6">
        <h2 className="text-base font-semibold text-ink mb-4">
          Parcours ({tours.length})
        </h2>
        {tours.length === 0 ? (
          <p className="text-sm text-ink-40">Aucun parcours créé.</p>
        ) : (
          <div className="divide-y divide-line">
            {tours.map((tour) => {
              const badge = TOUR_STATUS_BADGES[tour.status] ?? TOUR_STATUS_BADGES.draft;
              return (
                <div key={tour.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{tour.title || <em className="text-ink-40">Sans titre</em>}</p>
                    <p className="text-xs text-ink-40 font-mono mt-0.5">{tour.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    {tour.status === 'published' && (
                      <Link
                        href={`/catalogue/${profile.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/${tour.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                        target="_blank"
                        className="text-xs text-grenadine hover:underline"
                      >
                        Voir
                      </Link>
                    )}
                    <Link
                      href={`/admin/tours/${tour.id}`}
                      className="text-xs text-ink-60 hover:underline"
                    >
                      Admin
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-60 mb-0.5">{label}</p>
      <p className={`text-sm text-ink ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
    </div>
  );
}

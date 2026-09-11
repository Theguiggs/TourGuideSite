'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getGuideProfileById, listAllGuideTours, adminUpdateGuideProfileStatus } from '@/lib/api/appsync-client';
import { PageTitle } from '@murmure/design-system/web';
import { GUIDE_PROFILE_STATUS_BADGES, TOUR_STATUS_BADGES, badgeFor } from '@/lib/admin/status-badges';
import { StatusBadge } from '@/components/admin/StatusBadge';

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

  if (loading) return <p className="text-ink-60 text-body p-6">Chargement...</p>;
  if (error || !profile) return (
    <div className="p-6">
      <p className="text-danger text-body mb-4">{error ?? 'Profil introuvable'}</p>
      <Link href="/admin/guides" className="text-grenadine text-body hover:underline">← Retour</Link>
    </div>
  );

  const statusBadge = badgeFor(GUIDE_PROFILE_STATUS_BADGES, profile.profileStatus, 'pending_moderation');

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/guides" className="text-ink-40 hover:text-ink-60 text-body">
          ← Tous les guides
        </Link>
      </div>

      {feedback && (
        <div className={`rounded-lg p-3 mb-4 text-body ${feedback.ok ? 'bg-olive-soft text-olive' : 'bg-grenadine-soft text-danger'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-card rounded-md border border-line p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-grenadine-soft rounded-pill flex items-center justify-center text-grenadine font-bold text-h5">
              {profile.displayName.charAt(0)}
            </div>
            <div>
              <PageTitle size="h5">{profile.displayName}</PageTitle>
              <p className="text-body text-ink-60">{profile.city}</p>
              <StatusBadge badge={statusBadge} className="mt-1" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {/* View as user — opens guide's published tours in catalogue */}
            <Link
              href={`/catalogue/${profile.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
              target="_blank"
              className="border border-grenadine text-grenadine text-body font-medium px-4 py-2 rounded-lg hover:bg-grenadine-soft flex items-center gap-1"
            >
              Voir catalogue {profile.city}
            </Link>
            {profile.profileStatus !== 'active' && (
              <button
                onClick={() => setStatus('active')}
                disabled={saving}
                className="bg-olive text-white text-body font-medium px-4 py-2 rounded-lg hover:bg-olive disabled:opacity-50"
              >
                Activer le compte
              </button>
            )}
            {profile.profileStatus === 'active' && (
              <button
                onClick={() => setStatus('suspended')}
                disabled={saving}
                className="bg-ocre text-ink text-body font-medium px-4 py-2 rounded-lg hover:bg-ocre disabled:opacity-50"
              >
                Suspendre
              </button>
            )}
            {profile.profileStatus !== 'rejected' && profile.profileStatus !== 'active' && (
              <button
                onClick={() => setStatus('rejected')}
                disabled={saving}
                className="bg-grenadine text-white text-body font-medium px-4 py-2 rounded-lg hover:bg-grenadine disabled:opacity-50"
              >
                Rejeter
              </button>
            )}
          </div>
        </div>

        {/* Email */}
        {guideEmail && guideEmailUserId === profile.userId && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-mer-soft rounded-lg">
            <span className="text-body text-mer font-medium">Email :</span>
            <a href={`mailto:${guideEmail}`} className="text-body text-mer font-mono hover:underline">{guideEmail}</a>
          </div>
        )}
        {emailLookupError && emailLookupUserId === profile.userId && (
          <p className="mb-4 text-body text-danger" role="alert">
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
            <p className="text-meta font-medium text-ink-60 mb-1">Bio</p>
            <p className="text-body text-ink-80 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {profile.specialties && profile.specialties.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-meta font-medium text-ink-60 mb-2">Spécialités</p>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((s) => (
                <span key={s} className="text-meta bg-grenadine-soft text-grenadine px-2 py-1 rounded-pill">{s}</span>
              ))}
            </div>
          </div>
        )}

        {profile.languages && profile.languages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-meta font-medium text-ink-60 mb-2">Langues</p>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((l) => (
                <span key={l} className="text-meta bg-mer-soft text-mer px-2 py-1 rounded-pill">{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tours */}
      <div className="bg-card rounded-md border border-line p-6">
        <h2 className="text-body-lg font-semibold text-ink mb-4">
          Parcours ({tours.length})
        </h2>
        {tours.length === 0 ? (
          <p className="text-body text-ink-40">Aucun parcours créé.</p>
        ) : (
          <div className="divide-y divide-line">
            {tours.map((tour) => {
              const badge = badgeFor(TOUR_STATUS_BADGES, tour.status, 'draft');
              return (
                <div key={tour.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-body font-medium text-ink">{tour.title || <em className="text-ink-40">Sans titre</em>}</p>
                    <p className="text-meta text-ink-40 font-mono mt-0.5">{tour.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge badge={badge} />
                    {tour.status === 'published' && (
                      <Link
                        href={`/catalogue/${profile.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/${tour.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                        target="_blank"
                        className="text-meta text-grenadine hover:underline"
                      >
                        Voir
                      </Link>
                    )}
                    <Link
                      href={`/admin/tours/${tour.id}`}
                      className="text-meta text-ink-60 hover:underline"
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
      <p className="text-meta font-medium text-ink-60 mb-0.5">{label}</p>
      <p className={`text-body text-ink ${mono ? 'font-mono text-meta break-all' : ''}`}>{value}</p>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { getGuideProfile, updateGuideProfile } from '@/lib/api/guide';
import { listStudioSessions } from '@/lib/api/studio';
import {
  validateDraft,
  hasUnsavedChanges,
  type GuideProfileDraft,
} from '@/lib/studio/profile-helpers';
import { ProfileForm, LivePreview } from '@/components/studio/profile';
import type { StudioSession } from '@/types/studio';

const SERVICE_NAME = 'StudioProfilPage';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function StudioProfilPage() {
  const { user } = useAuth();
  const [initial, setInitial] = useState<GuideProfileDraft | null>(null);
  const [draft, setDraft] = useState<GuideProfileDraft | null>(null);
  const [tours, setTours] = useState<StudioSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async (guideId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [profile, sessions] = await Promise.all([
        getGuideProfile(guideId),
        listStudioSessions(guideId),
      ]);
      if (!profile) {
        setError('Profil introuvable. Contactez l’équipe.');
        return;
      }
      const baseDraft: GuideProfileDraft = {
        displayName: profile.displayName,
        bio: profile.bio,
        photoUrl: profile.photoUrl,
        city: profile.city,
        yearsExperience: profile.yearsExperience,
        specialties: profile.specialties ?? [],
        languages: profile.languages ?? [],
      };
      setInitial(baseDraft);
      setDraft(baseDraft);
      setTours(sessions);
      logger.info(SERVICE_NAME, 'Profile loaded', { guideId });
    } catch (e) {
      setError('Impossible de charger votre profil.');
      logger.error(SERVICE_NAME, 'Failed to load profile', { error: String(e) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;
    if (!guideId) {
      setIsLoading(false);
      return;
    }
    load(guideId);
  }, [user, load]);

  // Auto-hide saved banner after 3s
  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 3000);
    return () => clearTimeout(t);
  }, [saveState]);

  // Confirm before leaving with unsaved changes
  useEffect(() => {
    if (!initial || !draft) return;
    const dirty = hasUnsavedChanges(initial, draft);
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [initial, draft]);

  const validation = useMemo(
    () => (draft ? validateDraft(draft) : { ok: false, errors: {} }),
    [draft],
  );
  const dirty = useMemo(
    () => (initial && draft ? hasUnsavedChanges(initial, draft) : false),
    [initial, draft],
  );

  const handleSave = async () => {
    if (!draft || !validation.ok) return;
    const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId;
    if (!guideId) return;

    setSaveState('saving');
    setSaveError(null);
    const result = await updateGuideProfile(guideId, {
      displayName: draft.displayName,
      bio: draft.bio ?? '',
      city: draft.city,
      yearsExperience: draft.yearsExperience,
      specialties: draft.specialties,
      languages: draft.languages,
      photoUrl: draft.photoUrl,
    });
    if (result.ok) {
      setInitial(draft);
      setSaveState('saved');
    } else {
      setSaveError(result.error ?? 'Erreur lors de la sauvegarde.');
      setSaveState('error');
    }
  };

  const sampleTours = useMemo(
    () =>
      tours.slice(0, 2).map((s) => {
        const city = (s.title ?? '').split(/[—\-,]/)[0]?.trim() || 'Tour';
        return { city, title: s.title ?? 'Tour sans titre' };
      }),
    [tours],
  );

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <div className="h-12 w-48 bg-paper-deep rounded-md animate-pulse mb-3" />
        <div className="h-20 w-96 bg-paper-deep rounded-md animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
          <div className="h-[600px] bg-card border border-line rounded-lg animate-pulse" />
          <div className="h-[600px] bg-paper-deep rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // ─── No guide profile (real mode) ───
  if (!user?.guideId && !shouldUseStubs()) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 text-ocre" role="alert">
          Le Studio est réservé aux guides. Créez un profil guide pour commencer.
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error || !draft) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-grenadine-soft border border-grenadine rounded-lg p-4" role="alert">
          <p className="text-danger">{error ?? 'Erreur inattendue.'}</p>
          <button
            type="button"
            onClick={() => load(user?.guideId || 'guide-1')}
            className="mt-2 text-caption font-medium text-danger underline hover:opacity-80"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const canSave = dirty && validation.ok && saveState !== 'saving';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ───── Page header ───── */}
      <div className="flex items-start justify-between gap-6 flex-wrap mb-7">
        <div>
          <div className="tg-eyebrow text-grenadine">Mon profil · public</div>
          <h1 className="font-display text-h3 text-ink mt-1 leading-none">
            Comment vous <em className="font-editorial italic">apparaissez</em>.
          </h1>
          <p className="font-editorial italic text-body text-ink-60 max-w-xl mt-2">
            Ce profil est visible des voyageurs qui écoutent vos tours. Soignez-le — c&apos;est votre signature.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          data-testid="profile-save"
          className="bg-ink text-paper border-none px-5 py-3 rounded-pill text-caption font-bold cursor-pointer hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saveState === 'saving' ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>

      {/* ───── Save feedback ───── */}
      {saveState === 'saved' && (
        <div
          data-testid="profile-save-success"
          className="bg-grenadine-soft border border-grenadine rounded-md px-4 py-2.5 mb-5 text-caption text-grenadine font-semibold"
          role="status"
        >
          Modifications enregistrées.
        </div>
      )}
      {saveState === 'error' && saveError && (
        <div
          data-testid="profile-save-error"
          className="bg-grenadine-soft border border-grenadine rounded-md px-4 py-2.5 mb-5"
          role="alert"
        >
          <p className="text-caption text-danger">{saveError}</p>
        </div>
      )}

      {/* ───── Form + Preview ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
        <ProfileForm
          value={draft}
          onChange={setDraft}
          nativeLanguageCode={initial?.languages[0]}
        />
        <LivePreview
          value={draft}
          toursCount={tours.length}
          sampleTours={sampleTours}
        />
      </div>
    </div>
  );
}

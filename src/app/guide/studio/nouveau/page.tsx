'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lightbulb, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { createTourWithSession } from '@/lib/api/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'StudioNouveauPage';

export default function StudioNouveauPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useStudioLocale();
  const copy = locale === 'en' ? {
    failure: 'Unable to create the tour. Try again.', guideOnly: 'The Studio is for guides. Create a guide profile to get started.',
    eyebrow: 'New tour', titleStart: 'Create a', titleEmphasis: 'tour',
    intro: 'Give it a title and a city to get started. You can refine everything later in the editor.',
    titleLabel: 'Tour title', titlePlaceholder: 'E.g. Old Nice - Baroque streets and hidden lanes', city: 'City', cityPlaceholder: 'E.g. Nice',
    creating: 'Creating...', create: 'Create tour', cancel: 'Cancel',
    hintStart: 'You can also record a route in the field with the mobile app. It will automatically appear in',
    hintLink: 'My tours', hintEnd: ', ready to be turned into an audio tour.',
  } : {
    failure: 'Impossible de créer la visite. Réessayez.', guideOnly: 'Le Studio est réservé aux guides. Créez un profil guide pour commencer.',
    eyebrow: 'Nouvelle visite', titleStart: 'Créer une', titleEmphasis: 'visite',
    intro: "Donnez-lui un titre et une ville pour commencer. Vous pourrez tout affiner ensuite dans l'éditeur.",
    titleLabel: 'Titre de la visite', titlePlaceholder: 'Ex. : Vieux-Nice - Baroque et ruelles secrètes', city: 'Ville', cityPlaceholder: 'Ex. : Nice',
    creating: 'Création...', create: 'Créer la visite', cancel: 'Annuler',
    hintStart: "Vous pouvez aussi enregistrer un parcours sur le terrain avec l'app mobile. Il apparaîtra automatiquement dans",
    hintLink: 'Mes visites', hintEnd: ', prêt à être transformé en visite audio.',
  };

  const canSubmit = title.trim().length > 0 && city.trim().length > 0 && !isSubmitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;
      if (!guideId || !canSubmit) return;

      setIsSubmitting(true);
      setError(null);
      const result = await createTourWithSession(guideId, title.trim(), city.trim());
      if (result.ok) {
        logger.info(SERVICE_NAME, 'Tour created', { sessionId: result.sessionId });
        // Land on the wizard's first step to fill in the details.
        router.push(`/guide/studio/${result.sessionId}/general`);
      } else {
        setIsSubmitting(false);
        setError(result.error || copy.failure);
        logger.error(SERVICE_NAME, 'Tour creation failed', { error: result.error });
      }
    },
    [user, title, city, canSubmit, router, copy.failure],
  );

  // ─── No guide profile (real mode) ───
  if (!user?.guideId && !shouldUseStubs()) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 text-ocre" role="alert">
          {copy.guideOnly}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* ───── Header ───── */}
      <header className="mb-7">
        <div className="tg-eyebrow text-grenadine">{copy.eyebrow}</div>
        <h1 className="font-display text-h3 text-ink mt-1 leading-none">
          {copy.titleStart} <em className="font-editorial italic">{copy.titleEmphasis}</em>.
        </h1>
        <p className="font-editorial italic text-body text-ink-60 max-w-xl mt-2">
          {copy.intro}
        </p>
      </header>

      {/* ───── Form ───── */}
      <form onSubmit={handleSubmit} className="bg-card border border-line rounded-xl p-6">
        <label className="block mb-5">
          <span className="text-caption font-semibold text-ink">{copy.titleLabel}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.titlePlaceholder}
            data-testid="nouveau-title"
            maxLength={120}
            autoFocus
            className="mt-1.5 w-full bg-paper border border-line rounded-md px-3.5 py-2.5 text-caption text-ink placeholder:text-ink-40 focus:outline-none focus:border-grenadine transition"
          />
        </label>

        <label className="block mb-6">
          <span className="text-caption font-semibold text-ink">{copy.city}</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={copy.cityPlaceholder}
            data-testid="nouveau-city"
            maxLength={80}
            className="mt-1.5 w-full bg-paper border border-line rounded-md px-3.5 py-2.5 text-caption text-ink placeholder:text-ink-40 focus:outline-none focus:border-grenadine transition"
          />
        </label>

        {error && (
          <div className="bg-grenadine-soft border border-grenadine rounded-md p-3 mb-4" role="alert">
            <p className="text-meta text-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="nouveau-submit"
            className="bg-grenadine text-paper px-6 py-3 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center gap-2">
              {!isSubmitting && <Plus size={17} aria-hidden="true" />}
              {isSubmitting ? copy.creating : copy.create}
            </span>
          </button>
          <Link
            href="/guide/studio/tours"
            className="text-caption font-medium text-ink-60 hover:text-ink no-underline transition"
          >
            {copy.cancel}
          </Link>
        </div>
      </form>

      {/* ───── Hint : flux mobile ───── */}
      <div className="mt-6 px-5 py-4 bg-paper-deep rounded-lg">
        <p className="text-meta text-ink-60 leading-relaxed">
          <Lightbulb size={16} className="mr-1 inline" aria-hidden="true" />
          {copy.hintStart}{' '}<Link href="/guide/studio/tours" className="text-grenadine underline hover:opacity-80">{copy.hintLink}</Link>{copy.hintEnd}
        </p>
      </div>
    </div>
  );
}

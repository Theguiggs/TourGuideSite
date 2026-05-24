'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getGuideProfile, updateGuideProfile } from '@/lib/api/guide';
import { trackEvent, GuideAnalyticsEvents } from '@/lib/analytics';
import type { GuideProfile } from '@/types/tour';

export default function GuideProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [languages, setLanguages] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user?.guideId) return;
    trackEvent(GuideAnalyticsEvents.GUIDE_PORTAL_PROFILE_EDIT);
    getGuideProfile(user.guideId)
      .then((p) => {
        if (p) {
          setProfile(p);
          setDisplayName(p.displayName);
          setBio(p.bio || '');
          setCity(p.city);
          setSpecialties(p.specialties.join(', '));
          setLanguages(p.languages.join(', '));
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [user?.guideId]);

  const handleSave = async () => {
    if (!user?.guideId) return;
    setSaving(true);
    setMessage(null);

    const result = await updateGuideProfile(user.guideId, {
      displayName,
      bio,
      city,
      specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
      languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
    });

    setSaving(false);
    if (result.ok) {
      setMessage({ type: 'success', text: 'Profil sauvegardé !' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
    }
  };

  if (loading) return <div className="text-caption text-ink-40">Chargement du profil…</div>;
  if (loadError || !profile) return (
    <div className="bg-grenadine-soft border border-grenadine text-danger rounded-md p-6 text-caption">
      Impossible de charger le profil. Vérifiez votre connexion et rechargez la page.
    </div>
  );

  const inputClass = "w-full bg-paper border border-line rounded-md px-4 py-2 text-caption text-ink focus:outline-none focus:border-grenadine focus:ring-2 focus:ring-grenadine-soft transition";
  const labelClass = "block text-meta font-semibold text-ink-80 mb-1.5";

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-h4 text-ink mb-6 leading-none">Mon Profil</h1>

      {message && (
        <div
          className={`rounded-md p-3 mb-6 text-caption border ${
            message.type === 'success'
              ? 'bg-olive-soft text-olive border-olive/30'
              : 'bg-grenadine-soft text-danger border-grenadine/30'
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <div className="bg-card border border-line rounded-md p-6 space-y-5">
        <div>
          <label htmlFor="displayName" className={labelClass}>
            Nom d&apos;affichage (2-50 caractères)
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className={inputClass}
          />
          <p className="text-meta text-ink-40 mt-1">{displayName.length}/50</p>
        </div>

        <div>
          <label htmlFor="bio" className={labelClass}>
            Bio (max 500 caractères)
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className={inputClass}
          />
          <p className={`text-meta mt-1 ${bio.length > 450 ? 'text-ocre' : 'text-ink-40'}`}>
            {bio.length}/500
          </p>
        </div>

        <div>
          <label htmlFor="city" className={labelClass}>Ville</label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="specialties" className={labelClass}>
            Spécialités (séparées par des virgules)
          </label>
          <input
            id="specialties"
            type="text"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="Parfumerie, Histoire locale, Architecture"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="languages" className={labelClass}>
            Langues (séparées par des virgules)
          </label>
          <input
            id="languages"
            type="text"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="Français, Anglais, Italien"
            className={inputClass}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || displayName.length < 2}
          className="bg-grenadine text-paper font-bold py-3 px-6 rounded-pill hover:opacity-90 disabled:opacity-50 transition text-caption"
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      {/* Public Profile Preview */}
      <div className="mt-8">
        <h2 className="font-display text-h6 text-ink mb-4">Aperçu du profil public</h2>
        <div className="bg-paper-soft border border-line rounded-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-grenadine rounded-full flex items-center justify-center text-paper font-bold text-h5">
              {displayName.charAt(0)}
            </div>
            <div>
              <p className="font-display text-h5 text-ink leading-none">{displayName}</p>
              <p className="text-caption text-ink-60 mt-1">
                {city}
                {profile.verified && <span className="text-olive ml-2">✓ Vérifié</span>}
              </p>
            </div>
          </div>
          {bio && <p className="text-caption text-ink-80 mb-3 leading-relaxed">{bio}</p>}
          {specialties && (
            <div className="flex flex-wrap gap-2">
              {specialties.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                <span key={s} className="bg-grenadine-soft text-grenadine text-meta font-medium px-2 py-1 rounded-pill">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

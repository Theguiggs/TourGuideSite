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
      setMessage({ type: 'success', text: 'Profil sauvegarde !' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">Chargement du profil...</div>;
  if (loadError || !profile) return (
    <div className="bg-red-50 text-red-700 rounded-xl p-6 text-sm">
      Impossible de charger le profil. Vérifiez votre connexion et rechargez la page.
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon Profil</h1>

      {message && (
        <div
          className={`rounded-lg p-3 mb-6 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Nom d&apos;affichage (2-50 caracteres)
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-gray-400 mt-1">{displayName.length}/50</p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio (max 500 caracteres)
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500"
          />
          <p className={`text-xs mt-1 ${bio.length > 450 ? 'text-amber-600' : 'text-gray-400'}`}>
            {bio.length}/500
          </p>
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            Ville
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1">
            Specialites (separees par des virgules)
          </label>
          <input
            id="specialties"
            type="text"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="Parfumerie, Histoire locale, Architecture"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">
            Langues (separees par des virgules)
          </label>
          <input
            id="languages"
            type="text"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="Francais, Anglais, Italien"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || displayName.length < 2}
          className="bg-teal-700 text-white font-bold py-3 px-6 rounded-xl hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Public Profile Preview */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Apercu du profil public</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-2xl">
              {displayName.charAt(0)}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{displayName}</p>
              <p className="text-gray-500">{city} {profile.verified && '✓ Verifie'}</p>
            </div>
          </div>
          {bio && <p className="text-gray-700 mb-3">{bio}</p>}
          {specialties && (
            <div className="flex flex-wrap gap-2">
              {specialties.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                <span key={s} className="bg-teal-100 text-teal-700 text-xs font-medium px-2 py-1 rounded-full">
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

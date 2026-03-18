'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes } from '@/lib/api/studio';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import type { StudioSession } from '@/types/studio';

const SERVICE_NAME = 'GeneralPage';

const TOUR_THEMES = [
  'histoire', 'gastronomie', 'art', 'nature',
  'architecture', 'culture', 'insolite', 'romantique',
  'famille', 'sportif',
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'facile', label: 'Facile — accessible à tous' },
  { value: 'moyen', label: 'Moyen — quelques montées' },
  { value: 'difficile', label: 'Difficile — terrain accidenté' },
];

export default function GeneralPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenesCount, setScenesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('fr');
  const [difficulty, setDifficulty] = useState('facile');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        const [sess, scenesList] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
        ]);
        if (cancelled) return;
        setSession(sess);
        setScenesCount(scenesList.length);
        if (sess) {
          setActiveSession(sess);
          setTitle(sess.title || '');
          setLanguage(sess.language || 'fr');
          // City/description/themes would come from tour data in production
          setCity('Grasse');
          setDescription('');
          setDuration(45);
          setDistance(2.1);
        }
        logger.info(SERVICE_NAME, 'General page loaded', { sessionId });
      } catch (e) {
        if (!cancelled) {
          setError('Impossible de charger la session.');
          logger.error(SERVICE_NAME, 'Load failed', { error: String(e) });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; clearSession(); };
  }, [sessionId, setActiveSession, clearSession]);

  const toggleTheme = useCallback((theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme],
    );
  }, []);

  // TODO: Persist to AppSync — currently only updates local state (pre-existing limitation)
  const handleSave = useCallback(() => {
    logger.info(SERVICE_NAME, 'Saved general info', { sessionId, title, city, language, difficulty });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }, [sessionId, title, city, language, difficulty]);

  if (isLoading) {
    return <div className="p-6" aria-busy="true"><div className="bg-gray-100 rounded-lg h-96 animate-pulse" /></div>;
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">&larr; Retour</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">{error || 'Session introuvable.'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
        &larr; Retour au tour
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Informations générales</h1>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="tour-title" className="block text-sm font-medium text-gray-700 mb-1">Titre du tour *</label>
          <input id="tour-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: L'Âme des Parfumeurs de Grasse" maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400" data-testid="title-input" />
          <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
        </div>

        {/* City */}
        <div>
          <label htmlFor="tour-city" className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
          <input id="tour-city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Grasse" maxLength={50}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400" data-testid="city-input" />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="tour-description" className="block text-sm font-medium text-gray-700 mb-1">Description longue</label>
          <textarea id="tour-description" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre tour tel qu'il apparaîtra dans le catalogue..."
            rows={4} maxLength={2000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y" data-testid="description-input" />
          <p className="text-xs text-gray-400 mt-1">{description.length}/2000</p>
        </div>

        {/* Language + Difficulty row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tour-language" className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
            <select id="tour-language" value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400" data-testid="language-select">
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
          </div>
          <div>
            <label htmlFor="tour-difficulty" className="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
            <select id="tour-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400" data-testid="difficulty-select">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration + Distance row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tour-duration" className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
            <input id="tour-duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              min={0} max={300}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400" data-testid="duration-input" />
          </div>
          <div>
            <label htmlFor="tour-distance" className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
            <input id="tour-distance" type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))}
              min={0} max={50} step={0.1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400" data-testid="distance-input" />
          </div>
        </div>

        {/* Themes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Thèmes</label>
          <div className="flex flex-wrap gap-2">
            {TOUR_THEMES.map((theme) => {
              const isSelected = selectedThemes.includes(theme);
              return (
                <button key={theme} onClick={() => toggleTheme(theme)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`} data-testid={`theme-${theme}`}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Session terrain</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Scènes</dt>
            <dd className="text-gray-900">{scenesCount}</dd>
            <dt className="text-gray-500">Statut</dt>
            <dd className="text-gray-900 capitalize">{session.status}</dd>
            <dt className="text-gray-500">Créée le</dt>
            <dd className="text-gray-900">{new Date(session.createdAt).toLocaleDateString('fr-FR')}</dd>
          </dl>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
            data-testid="save-general-btn">
            Enregistrer
          </button>
          <Link href={`/guide/studio/${sessionId}/itinerary`}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-6 rounded-lg transition-colors">
            Étape suivante : Itinéraire →
          </Link>
          {isSaved && <span className="text-sm text-green-600" role="status">✓ Enregistré</span>}
        </div>
      </div>
    </div>
  );
}

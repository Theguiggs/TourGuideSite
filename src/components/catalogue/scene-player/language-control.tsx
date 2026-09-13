'use client';
import { extendCopy } from '@/lib/i18n/translate';

import { useId } from 'react';
import { Button, tg } from '@murmure/design-system/web';
import { audioSourceLabel, displayedAudioSource } from '@/lib/api/audio-source-policy';
import { languageName, languageLabel } from '@/lib/i18n/languages';
import { useTourPlayer } from './scene-player';

const COPY = extendCopy({
  fr: {
    label: 'Langue d’écoute', original: 'Langue d’origine',
    help: 'Changer de langue redémarre l’étape depuis le début.',
    loading: 'Chargement des langues…', error: 'Langues momentanément indisponibles.', retry: 'Réessayer les langues',
    fallback: (count: number, base: string) => `${count} étape${count > 1 ? 's' : ''} ${count > 1 ? 'seront lues' : 'sera lue'} ${base === 'und' ? 'dans la langue d’origine' : `en ${languageLabel(base, 'fr').toLowerCase()}`}.`,
  },
  en: {
    label: 'Listening language', original: 'Original language',
    help: 'Changing language restarts the current stop from the beginning.',
    loading: 'Loading languages…', error: 'Languages are temporarily unavailable.', retry: 'Retry languages',
    fallback: (count: number, base: string) => `${count} stop${count > 1 ? 's' : ''} will play ${base === 'und' ? 'in the original language' : `in ${languageLabel(base, 'en')}`}.`,
  },
} as const);

export function LanguageControl() {
  const player = useTourPlayer();
  const id = useId();
  if (!player) return null;
  const copy = COPY[player.locale];
  const mention = (language: string) => audioSourceLabel(displayedAudioSource(player.languageAudioTypes, language), player.locale);
  return (
    <div data-testid="listening-language" style={{ display: 'flex', flexDirection: 'column', gap: tg.space[2], color: tg.colors.ink, fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body }}>
      <label htmlFor={id}>{copy.label}</label>
      <select
        id={id}
        aria-describedby={`${id}-help ${id}-status`}
        value={player.selectedLanguage}
        disabled={player.languageStatus === 'idle' || player.languageStatus === 'loading'}
        onChange={(event) => player.changeLanguage(event.currentTarget.value)}
        style={{ color: tg.colors.ink, background: tg.colors.paper, padding: tg.space[3], border: `1px solid ${tg.colors.ink60}`, borderRadius: tg.radius.md, maxWidth: 420, font: 'inherit' }}
      >
        {player.languageOptions.map((language) => (
          <option key={language} value={language}>
            {language === 'und' ? copy.original : languageName(language)}{mention(language) ? ` — ${mention(language)}` : ''}
          </option>
        ))}
      </select>
      <p id={`${id}-help`} style={{ margin: 0, fontSize: tg.fontSize.caption }}>{copy.help}</p>
      <p id={`${id}-status`} role="status" style={{ margin: 0, fontSize: tg.fontSize.caption }}>
        {player.languageStatus === 'loading' ? copy.loading
          : player.languageStatus === 'error' ? copy.error
            : player.fallbackCount > 0 ? `${copy.fallback(player.fallbackCount, player.baseLanguage)} ${mention(player.baseLanguage) ?? ''}` : ''}
      </p>
      {player.languageStatus === 'error' && <Button variant="ghost" size="sm" onClick={player.retryLanguages}>{copy.retry}</Button>}
    </div>
  );
}

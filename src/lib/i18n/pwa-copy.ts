import type { InterfaceLocale } from './locales';

export const PWA_COPY = {
  fr: { update: 'Mise à jour du site', ready: 'Une nouvelle version est prête.', reload: 'Recharger' },
  en: { update: 'Site update', ready: 'A new version is ready.', reload: 'Reload' },
  es: { update: 'Actualización del sitio', ready: 'Hay una nueva versión disponible.', reload: 'Recargar' },
  de: { update: 'Website aktualisieren', ready: 'Eine neue Version ist verfügbar.', reload: 'Neu laden' },
  it: { update: 'Aggiornamento del sito', ready: 'È disponibile una nuova versione.', reload: 'Ricarica' },
  nl: { update: 'Website bijwerken', ready: 'Er staat een nieuwe versie klaar.', reload: 'Opnieuw laden' },
} as const satisfies Record<InterfaceLocale, { update: string; ready: string; reload: string }>;

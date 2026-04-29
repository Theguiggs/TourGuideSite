// Source: design/handoff/BRIEF-CLAUDE-CODE.md §7 (Voix éditoriale)
//
// Lexique éditorial et microcopy boutons exposés en constants TypeScript typées.
// Source unique de vérité pour toutes les strings utilisateur (V1.0 FR-only).
// Story 1.4 — Epic 1 Design System Migration.
//
// IMPORTANT (i18n) : V1.0 monolingue FR. Une future story i18n remplacera
// `editorial.cta.listen: 'Écouter'` par `editorial.cta.listen.fr: 'Écouter'`.
// Hors scope ici.

/**
 * Microcopy CTA et actions secondaires (brief §7, table "Microcopy boutons").
 *
 * Structure :
 * - `cta.*`     : CTA primaires (lecture, achat, premium)
 * - `actions.*` : Actions secondaires (carte, téléchargement, partage)
 *
 * Usage :
 *   import { editorial } from '@tourguide/design-system';
 *   <Button title={editorial.cta.listen} />
 */
export const editorial = {
  cta: {
    /** CTA primaire lecture (brief §7). */
    listen: 'Écouter',
    /**
     * @deprecated V1.0 — Phase 0 Q2 = freemium ; conservé pour pivot futur vers modèle hybride. Ne pas utiliser dans les écrans V1.0.
     */
    getTour: 'Obtenir le tour',
    /** CTA primaire premium — ACTIVE V1.0 (Phase 0 Q2 = freemium 3 tours + abonnement). */
    becomeMember: 'Devenir membre',
    /** CTA téléchargement hors-ligne — Story 5.8. Lexique strict §7. */
    downloadForFlight: "Télécharger pour l'avion",
  },
  actions: {
    /** Action secondaire carte (brief §7). */
    viewMap: 'Voir sur la carte',
    /** Action secondaire téléchargement (brief §7). */
    download: "Télécharger pour l'avion",
    /** Action secondaire partage (brief §7). */
    share: 'Partager ce tour',
  },
  /**
   * Microcopy downloads screen — Story 5.8.
   *
   * Lexique strict (cf. forbiddenTerms) : `Hors-ligne` (pas `Offline`).
   */
  downloads: {
    /** Titre de l'écran Téléchargements. */
    title: 'Téléchargements',
    /** Label jauge stockage. */
    storageLabel: 'Stockage utilisé',
    /** Bouton suppression globale. */
    deleteAll: 'Tout supprimer',
    /** Empty state — titre. */
    emptyTitle: 'Préparez votre prochain voyage',
    /** Empty state — accroche (lexique strict : Hors-ligne). */
    emptyHint: 'Téléchargez vos tours pour les écouter sans réseau',
    /** Empty state — CTA catalogue. */
    viewCatalog: 'Voir le catalogue',
  },
  /**
   * Microcopy empty states — Story 5.10.
   *
   * Voix éditoriale §7 : titres ≤ 6 mots, accroches ≤ 12 mots.
   * Lexique strict : `Hors-ligne` (pas `Offline`).
   */
  emptyState: {
    /** Empty state hors-ligne — CityListScreen / TourListScreen quand offline et liste vide. */
    offline: {
      title: 'Pas de réseau',
      lede: 'Pas de réseau. Vos téléchargements sont là.',
      cta: 'Voir les téléchargements',
    },
    /** Empty state GPS désactivé — TourActiveScreen quand permission refusée ou bloquée. */
    gpsDenied: {
      title: 'Localisation désactivée',
      lede: 'Activez votre position pour vous laisser guider.',
      cta: 'Activer la localisation',
    },
  } as const,
  /**
   * Microcopy Player full — Story 5.7 (AC13).
   *
   * Lexique strict : références au bénéfice ("la carte qui suit votre voix")
   * pas à la permission ("autoriser", "demander"). Audité Story 1.5 / 7.5.
   */
  player: {
    /** Sheet GPS — eyebrow (≤6 mots). */
    locationRationaleEyebrow: 'La carte qui suit votre voix',
    /** Sheet GPS — accroche (≤16 mots). */
    locationRationaleBody:
      'Activez la localisation pour voir où vous êtes et déclencher les commentaires à proximité.',
    /** CTA primaire sheet GPS. */
    activateLocation: 'Activer la localisation',
    /** CTA secondaire sheet GPS. */
    deferLocation: 'Plus tard',
    /** Card sticky mode dégradé (Story 5.9). */
    degradedModeCta: 'Activer la localisation',
  },
  /**
   * Microcopy onboarding — Story 5.2a (slides 1+2 indépendants Phase 0).
   *
   * Lexique strict (cf. forbiddenTerms) : `Hors-ligne` (pas `Offline`).
   * Voix éditoriale §7 : titres ≤ 6 mots, accroches ≤ 12 mots.
   */
  onboarding: {
    /** Slide 1/3 — `key: 'welcome'` (analytics stable). */
    welcome: {
      title: 'Bienvenue sur Murmure',
      subtitle: 'Le monde a une voix.',
    },
    /** Slide 2/3 — `key: 'audio-first'` (filename + analytics stables, sémantique offline). */
    offline: {
      title: 'Hors-ligne, partout',
      subtitle: "Téléchargez avant d'oublier le réseau.",
    },
  },
} as const;

/** Type dérivé du literal `editorial` — autocomplete sur `editorial.cta.listen`, etc. */
export type EditorialMicrocopy = typeof editorial;

/**
 * Entrée du lexique interdit. Consommé par Story 1.5 (script audit) et
 * Story 7.5 (audit microcopy global). Aucun enforcement runtime ici.
 */
export interface ForbiddenTerm {
  readonly wrong: string;
  readonly right: string;
  readonly context?: string;
}

/**
 * Termes interdits + remplacement canonique. Source : brief §7 "Lexique".
 *
 * Les `context` indiquent une portée restreinte :
 * - `"CTA only"` : le mot anglais peut apparaître ailleurs (ex. lexique technique)
 *                  mais JAMAIS dans un CTA utilisateur.
 * - `"FR text only"` : interdit dans les strings FR ; toléré dans le code
 *                       (logs, identifiants techniques, etc.).
 */
export const forbiddenTerms: readonly ForbiddenTerm[] = [
  { wrong: 'parcours', right: 'tour' },
  { wrong: 'circuit', right: 'tour' },
  { wrong: 'POI', right: 'Étape' },
  { wrong: 'démarrer', right: 'Écouter', context: 'CTA only' },
  { wrong: 'lancer', right: 'Écouter', context: 'CTA only' },
  { wrong: 'offline', right: 'Hors-ligne', context: 'FR text only' },
] as const;

/**
 * Règle de voix éditoriale. Documentaire uniquement (consommé par audits Story 1.5 / 7.5).
 */
export interface VoiceRule {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly example: string;
}

/**
 * 4 règles de voix éditoriale (brief §7 "Ton"). Documentation pour reviewers
 * et auditeurs. N'est pas consommé en runtime par les écrans.
 */
export const voiceRules: readonly VoiceRule[] = [
  {
    id: 'cultivated-not-pompous',
    label: 'Cultivé sans être prétentieux',
    description:
      "On nomme les choses simplement. On évite les superlatifs et adjectifs marketing (« historique », « emblématique »).",
    example: '« place du Cours » — pas « place historique du Cours Mirabeau ».',
  },
  {
    id: 'sensorial',
    label: 'Sensoriel',
    description:
      'On privilégie les odeurs, les sons, les matières et les sensations plutôt que les dates et les statistiques.',
    example: "« L'odeur de tilleul à l'ombre des platanes » — pas « Construit en 1856 ».",
  },
  {
    id: 'short-form',
    label: '≤ 6 mots titre / ≤ 12 mots accroche',
    description:
      'Les titres tiennent en 6 mots maximum, les accroches en 12 mots. Tout dépassement déclenche une alerte audit.',
    example: '« Le vieux Aix, secret » (5 mots).',
  },
  {
    id: 'gentle-imperative',
    label: 'Impératif doux',
    description:
      "On utilise l'impératif à la deuxième personne du pluriel (« Écoutez », « Tournez »), jamais d'injonction directe (« Vous devez », « Il faut »).",
    example: '« Écoutez », « Tournez à droite » — jamais « Vous devez tourner ».',
  },
] as const;

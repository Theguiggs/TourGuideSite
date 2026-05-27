// Story 4.6 — Contenu de la page d'aide (`/aide`), externalisé pour
// maintenabilité et testabilité. Source unique de vérité du copy FR.

export type HelpStep = {
  /** Ancre HTML (#id) — ciblée depuis la home « Comment ça marche ». */
  id: string;
  /** Numéro d'étape affiché via <NumberMark>. */
  n: number;
  title: string;
  body: string;
  /** Astuce optionnelle (rendue en encart). */
  tip?: string;
};

export type FaqItem = {
  q: string;
  a: string;
};

/** Les 7 étapes de création d'un parcours (AC9). */
export const STEPS: HelpStep[] = [
  {
    id: 'creer',
    n: 1,
    title: 'Créez votre parcours',
    body: "Depuis l'atelier, cliquez « + Créer un nouveau tour », puis donnez un titre et une ville. Votre parcours est créé en brouillon, prêt à être enrichi.",
    tip: 'Un titre évocateur (« Vieux-Nice — ruelles secrètes ») attire plus de voyageurs.',
  },
  {
    id: 'informations',
    n: 2,
    title: 'Renseignez les informations',
    body: "Ajoutez une description (jusqu'à 2000 caractères), une photo de couverture (JPG/PNG/WebP, min. 1200×800), les thèmes (3 max), la difficulté, la durée, la distance, la langue de base et les langues que vous souhaitez proposer.",
  },
  {
    id: 'tracer',
    n: 3,
    title: "Tracez l'itinéraire",
    body: "Ajoutez vos points d'intérêt (POI) sur la carte — par adresse ou par clic — et réordonnez-les. Trois modes au choix : automatique (l'itinéraire est calculé), manuel (vous tracez à la main), ou import GPX (Komoot, Strava, Garmin). La distance et la durée se calculent automatiquement.",
  },
  {
    id: 'raconter',
    n: 4,
    title: 'Racontez chaque scène',
    body: "Chaque POI devient une scène, avec ses onglets POI, Photos, Texte et Audio. Écrivez votre texte, ajoutez jusqu'à 3 photos. Pour l'audio : enregistrez au micro, importez un fichier, ou générez une voix de synthèse depuis votre texte. La transcription automatique est disponible.",
    tip: "Pas besoin de savoir enregistrer : la voix de synthèse lit votre texte si vous préférez.",
  },
  {
    id: 'traduire',
    n: 5,
    title: 'Traduisez (optionnel)',
    body: "Ajoutez des langues : la traduction se lance automatiquement, puis la voix de synthèse par langue. Vous pouvez tout relire et corriger avant de soumettre.",
  },
  {
    id: 'previsualiser',
    n: 6,
    title: 'Prévisualisez',
    body: "Vérifiez le rendu final de votre parcours, exactement tel que les voyageurs le verront dans le catalogue et dans l'app.",
  },
  {
    id: 'publier',
    n: 7,
    title: 'Publiez',
    body: "Soumettez pour modération. Les statuts s'enchaînent : brouillon → soumis → publié (ou révision demandée). Une fois publié, votre tour apparaît dans le catalogue et l'app. Vous pouvez le mettre en pause ou l'archiver à tout moment.",
  },
];

/** Conseils pour un parcours réussi (AC10). */
export const TIPS: string[] = [
  'Des scènes courtes (1 à 3 minutes) gardent l’écoute vivante.',
  'Adoptez un ton conversationnel, comme si vous guidiez un ami.',
  'Commencez chaque scène par une accroche qui donne envie d’écouter la suite.',
  'Vérifiez vos coordonnées GPS sur la carte : un POI mal placé perd le voyageur.',
  'Soignez la photo de couverture : c’est la première impression dans le catalogue.',
  'Relisez la traduction automatique avant de publier une langue.',
];

/** FAQ — groupe Guides (AC11, ≥ 6 questions). */
export const FAQ_GUIDES: FaqItem[] = [
  {
    q: 'Créer un parcours, est-ce payant ?',
    a: 'Créer et publier est gratuit. Seules certaines langues de traduction peuvent être proposées en option payante (pack Standard ou Pro).',
  },
  {
    q: 'Comment suis-je rémunéré ?',
    a: "Vous touchez une part majoritaire de chaque vente de votre tour, suivie dans l'onglet Revenus de l'atelier.",
  },
  {
    q: 'Combien de temps avant la publication ?',
    a: "Après soumission, l'équipe de modération vérifie le contenu avant la mise en ligne. Le délai dépend du volume en cours.",
  },
  {
    q: 'Puis-je modifier un parcours déjà publié ?',
    a: 'Oui : mettez-le en pause, créez une nouvelle version, ou corrigez-le après un retour de modération — sans tout recommencer.',
  },
  {
    q: 'Dois-je savoir enregistrer de l’audio ?',
    a: 'Non. La voix de synthèse lit votre texte si vous ne souhaitez pas enregistrer votre propre voix.',
  },
  {
    q: 'Mon tour peut-il être multilingue ?',
    a: 'Oui. Ajoutez des langues ; chacune est traduite, doublée, puis modérée séparément.',
  },
];

/** FAQ — groupe Voyageurs (AC11, ≥ 4 questions). */
export const FAQ_VOYAGEURS: FaqItem[] = [
  {
    q: 'Comment écouter un tour ?',
    a: "Téléchargez l'app Murmure, choisissez un tour et lancez la lecture : le récit vous suit au fil de votre marche.",
  },
  {
    q: 'Ça marche hors-ligne ?',
    a: 'Oui. Téléchargez le tour avant de partir et écoutez-le sans réseau.',
  },
  {
    q: 'Sur quels appareils ?',
    a: 'iOS et Android.',
  },
  {
    q: 'Est-ce gratuit ?',
    a: 'Plusieurs tours sont gratuits ; d’autres sont payants.',
  },
  {
    q: 'Où trouver les tours ?',
    a: 'Parcourez le catalogue sur le web, puis écoutez dans l’app.',
  },
];

/** Adresse de contact support (Story 4.6). */
export const SUPPORT_EMAIL = 'tourguideyeup@gmail.com';

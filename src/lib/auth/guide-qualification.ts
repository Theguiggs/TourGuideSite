/**
 * Qualification d'un guide — « ce profil appartient-il VRAIMENT à ce sub ? »
 *
 * COPIE GARDÉE de `TourGuideApp/amplify/shared/guide-qualification.ts`.
 * L'original porte le raisonnement complet (le VTL synthétisé, la forme de
 * `owner` en base, l'ordre des trois verdicts) ; il n'est pas IMPORTABLE ici —
 * l'alias `@amplify-schema` ne sert qu'aux TYPES, un import de valeur depuis le
 * dépôt voisin ne survit ni au `next build` ni au conteneur (cf.
 * `src/lib/api/internal-spend.ts`). La copie est donc assumée comme telle et
 * épinglée par ses épreuves : toute divergence avec l'original est un défaut.
 *
 * LE TROU QU'ON FERME
 * -------------------
 * `GuideProfile.userId` est une chaîne LIBRE que le créateur pose lui-même, et
 * le modèle est en `allow.owner().to(['create','read','update'])` : tout compte
 * connecté peut créer une ligne portant n'importe quel `userId`. Tant qu'un
 * consommateur déduisait le rôle `guide` de la seule présence d'une ligne
 * d'index `userId == sub`, deux abus en découlaient :
 *
 *  1. **Élévation.** Se poser `{userId: <son sub>, profileStatus:'active'}` et
 *     devenir guide — donc entrer dans le Studio, donc faire facturer le TTS.
 *  2. **Révocation croisée.** Poser `{userId: <sub d'un guide>, profileStatus:
 *     'suspended'}` et retirer son rôle à un guide légitime.
 *
 * LA CHARNIÈRE : `owner`, PAS `userId`
 * ------------------------------------
 * Le résolveur de `createGuideProfile` borne `owner` aux revendications de
 * l'appelant (`sub`, `username`, ou `sub::username`) : toute autre valeur tombe
 * en `$util.unauthorized()`. Et sur `update`, `owner` n'est pas dans les champs
 * autorisés pour un non-admin. `owner` est donc le SEUL champ de ce modèle
 * qu'un attaquant ne peut pas falsifier.
 *
 * Sur le parc vivant la forme est `"<sub>::<sub>"` (le pool est en
 * `UsernameAttributes:["email"]`, donc Cognito ENGENDRE le `username` et il vaut
 * le `sub`). D'où la comparaison : `owner === sub` OU `owner` commence par
 * `sub + '::'`. Ce qu'elle ne couvre pas volontairement — la forme `username`
 * nue si un jour `username !== sub` — produit un REFUS, jamais un octroi.
 *
 * CE QUE CE JUGE NE FERME PAS, ET QUI DOIT L'ÊTRE AILLEURS
 * --------------------------------------------------------
 * Un compte quelconque peut TOUJOURS se créer un profil À SON NOM et devenir
 * `guide` : c'est le parcours d'inscription guide, ouvert PAR CONCEPTION. Ce qui
 * doit le borner est la modération (`profileStatus`) et le plafond de dépense du
 * proxy `v1/tts/generate` — pas ce juge. Le juge ferme l'USURPATION, pas
 * l'inscription.
 */

/** Les statuts qui retirent le rôle, quoi qu'il arrive par ailleurs. */
export const STATUTS_DISQUALIFIANTS = ['suspended', 'rejected'] as const;

/**
 * Borne de lecture par `sub`.
 *
 * Assez large pour qu'un guide légitime (1 ligne) n'y touche jamais, assez
 * étroite pour qu'un compte qui s'inonde de doublons franchisse la borne — et se
 * fasse REFUSER par `vue-tronquee` au lieu de noyer sa suspension.
 */
export const BORNE_LECTURE_PROFILS = 25;

/** Le strict nécessaire à juger : tout le reste du profil est hors sujet ici. */
export interface LigneProfilGuide {
  readonly owner?: string | null;
  readonly profileStatus?: string | null;
}

/** Pourquoi le rôle n'est pas accordé — ne jamais confondre ces trois-là. */
export type RefusQualification =
  /** Aucune ligne n'appartient à ce `sub`. */
  | 'aucun-profil'
  /** Au moins une ligne À SOI est `suspended` ou `rejected`. */
  | 'disqualifie'
  /** Lecture incomplète : l'invisible peut disqualifier, donc on refuse. */
  | 'vue-tronquee';

/**
 * Le verdict. Le SEUL moyen d'en tirer un guide est `role === 'guide'` : aucune
 * valeur de refus n'est truthy au sens du rôle, donc aucun
 * `profil ? ['guide'] : []` ne peut se glisser ici par accident.
 */
export type Qualification =
  | { readonly role: 'guide' }
  | { readonly role: null; readonly refus: RefusQualification };

/**
 * `owner` désigne-t-il ce `sub` ?
 *
 * Accepte la forme nue (`sub`) et la forme composite écrite par Amplify
 * (`sub::username`). Refuse tout le reste, y compris les chaînes vides — un
 * `sub` vide ne doit JAMAIS devenir un joker qui apparie `"::x"`.
 */
export function ownerAppartientAuSub(owner: unknown, sub: unknown): boolean {
  if (typeof owner !== 'string' || typeof sub !== 'string') return false;
  if (owner.length === 0 || sub.length === 0) return false;
  return owner === sub || owner.startsWith(`${sub}::`);
}

/** Ce statut retire-t-il le rôle ? */
export function statutDisqualifie(statut: unknown): boolean {
  return (
    typeof statut === 'string' && (STATUTS_DISQUALIFIANTS as readonly string[]).includes(statut)
  );
}

/**
 * Le juge. Voir l'en-tête du fichier pour le raisonnement.
 *
 * L'ORDRE DES TROIS VERDICTS N'EST PAS ARBITRAIRE :
 *   1. une suspension VUE est décisive, même sur une vue partielle ;
 *   2. sinon une vue tronquée refuse, car l'invisible peut disqualifier — un
 *      repli permissif ferait de la borne elle-même le contournement ;
 *   3. sinon seule la présence d'au moins une ligne À SOI qualifie.
 *
 * @param sub      Le `sub` VÉRIFIÉ du jeton — jamais une valeur d'entrée.
 * @param lignes   Toutes les lignes lues pour ce `sub` (page bornée).
 * @param tronquee `true` dès qu'il reste des lignes non lues (`nextToken` non nul).
 */
export function qualifieGuide({
  sub,
  lignes,
  tronquee,
}: {
  readonly sub: unknown;
  readonly lignes: readonly LigneProfilGuide[];
  readonly tronquee: boolean;
}): Qualification {
  const miennes = lignes.filter((ligne) => ownerAppartientAuSub(ligne.owner, sub));

  // 1. Une suspension VUE est décisive, même si la vue est partielle.
  if (miennes.some((ligne) => statutDisqualifie(ligne.profileStatus))) {
    return { role: null, refus: 'disqualifie' };
  }
  // 2. Sinon l'invisible peut disqualifier : on refuse.
  if (tronquee) {
    return { role: null, refus: 'vue-tronquee' };
  }
  // 3. Sinon seule une ligne À SOI qualifie.
  if (miennes.length === 0) {
    return { role: null, refus: 'aucun-profil' };
  }
  return { role: 'guide' };
}

/**
 * Le rôle final, revendication de groupe COMPRISE.
 *
 * `cognito:groups` est posé par Cognito, donc digne de foi : il qualifie seul.
 * Mais une DISQUALIFICATION le renverse — un guide suspendu reste suspendu, même
 * membre du groupe ; c'est la sémantique qui existait déjà, on ne fait que la
 * rendre insensible aux lignes d'autrui.
 *
 * Une `vue-tronquee`, elle, ne renverse PAS le groupe : elle n'a rien prouvé, et
 * le groupe se suffit à lui-même.
 */
export function roleGuide({
  qualification,
  groupes,
}: {
  readonly qualification: Qualification;
  readonly groupes: readonly string[];
}): 'guide' | null {
  if (qualification.role === null && qualification.refus === 'disqualifie') {
    return null;
  }
  if (groupes.includes('guide')) return 'guide';
  return qualification.role === 'guide' ? 'guide' : null;
}

/**
 * Qualification d'un guide — « ce profil appartient-il VRAIMENT à ce sub ? »
 *
 * COPIE GARDÉE de `TourGuideApp/amplify/shared/guide-qualification.ts`.
 * L'original porte le raisonnement complet (le VTL synthétisé, le verrou de
 * champ, l'ordre des trois verdicts) ; il n'est pas IMPORTABLE ici — l'alias
 * `@amplify-schema` ne sert qu'aux TYPES, un import de valeur depuis le dépôt
 * voisin ne survit ni au `next build` ni au conteneur (cf.
 * `src/lib/api/internal-spend.ts`). La copie est donc assumée comme telle et
 * épinglée par ses épreuves : toute divergence avec l'original est un défaut.
 *
 * LE TROU QU'ON FERME
 * -------------------
 * `GuideProfile.userId` ÉTAIT une chaîne LIBRE que le créateur posait lui-même,
 * sous `allow.owner()`. Tout compte connecté pouvait créer une ligne portant
 * N'IMPORTE QUEL `userId`. Trois abus en découlaient :
 *
 *  1. **Élévation.** Se poser `{userId: <son sub>, profileStatus: 'active'}` et
 *     devenir guide — donc entrer dans le Studio, donc faire facturer le TTS.
 *  2. **Révocation croisée.** Poser `{userId: <sub d'un guide>, profileStatus:
 *     'suspended'}` et retirer son rôle à un guide légitime.
 *  3. **Révocation croisée par INONDATION.** Créer 25+ lignes sous le `userId`
 *     de la victime : sa page d'index ne contient plus que les lignes de
 *     l'attaquant, le `nextToken` est non nul, et la règle « vue tronquée ⇒
 *     refus » lui retire son rôle. Permanent, faute de `delete`.
 *
 * LA CHARNIÈRE : `userId`, ET PLUS `owner`
 * ----------------------------------------
 * Une PREMIÈRE tentative (commits `6c991179` / `e0db1b37` de cette branche) a
 * fait porter l'autorité par `owner`, le champ implicite d'Amplify, en laissant
 * `userId` libre. Elle traitait le symptôme ; l'inondation (3) y survivait, et
 * elle est morte avec le correctif backend. Le modèle porte désormais
 *
 *     allow.ownerDefinedIn('userId').identityClaim('sub')
 *
 * PLUS une autorisation AU NIVEAU DU CHAMP sur `userId` : `.to(['create',
 * 'read'])`, SANS `update`. Sans cette seconde moitié, `userId` restait dans
 * `$ownerAllowedFields0` de l'update et son propriétaire pouvait le RÉASSIGNER :
 * l'inondation se reconstruisait en deux mutations (créer 25 lignes à son propre
 * sub, puis les réassigner au sub de la victime). Le transformateur Amplify
 * émettait lui-même l'avertissement « owners may reassign ownership ».
 *
 * `owner` DISPARAÎT — CE N'EST PAS UN DÉTAIL
 * ------------------------------------------
 * `resolveOwnerFields` (aws-amplify/data-schema) tire le champ de propriété des
 * RÈGLES D'AUTH, et c'est lui qui alimente `defaultSelectionSetForModel`. Il rend
 * maintenant `['userId']`. Donc `owner` sort du type GraphQL ET du JEU DE
 * SÉLECTION PAR DÉFAUT de tout appel `client.models.GuideProfile.*`, sur TOUS les
 * chemins d'auth. Pas « parfois absent » : ABSENT. Un juge resté sur
 * `ligne.owner` lirait `undefined` partout et rendrait `aucun-profil` pour TOUT
 * LE MONDE — les guides réels compris — sans qu'aucune épreuve fabriquant ses
 * lignes à la main ne puisse le voir. C'est le mode de panne que
 * `__tests__/guide-qualification-jeu-de-selection.test.ts` existe pour rendre
 * visible : il PROJETTE ses lignes sur le jeu de sélection dérivé des règles
 * d'auth réelles avant de les donner au juge.
 *
 * L'attribut `owner` reste physiquement présent sur les lignes DynamoDB écrites
 * avant la bascule (elles portent `"<sub>::<sub>"`). Il devient du poids mort :
 * plus sélectionné, plus lu, plus écrit.
 *
 * POURQUOI LE JUGE EST SÛR DANS LES DEUX SENS DU DÉPLOIEMENT
 * ----------------------------------------------------------
 * `userId` est un champ EXPLICITE du modèle (`model_introspection.models
 * .GuideProfile.fields`), pas un champ ajouté par les règles d'auth. Il est donc
 * dans le jeu de sélection par défaut AVANT comme APRÈS la bascule du schéma —
 * contrairement à `owner`, qui n'y était QUE par la règle d'auth. Ce juge-ci
 * rend donc le bon verdict quel que soit l'état du backend au moment où le
 * portail part. C'est l'inverse qui était vrai de son prédécesseur, et c'est
 * exactement ce qui l'aurait cassé.
 *
 * Cela ne dispense PAS de l'ordre de déploiement : tant que le schéma n'est pas
 * redéployé, `userId` reste LIBRE en écriture et les trois abus ci-dessus restent
 * ouverts. Le portail reste JUSTE, il n'a simplement rien fermé. Ordre : schéma
 * d'abord, consommateurs ensuite.
 *
 * CE QUE CE JUGE NE FERME PAS, ET QUI DOIT L'ÊTRE AILLEURS
 * --------------------------------------------------------
 * Un compte quelconque peut TOUJOURS se créer un profil À SON NOM et devenir
 * `guide` : c'est le parcours d'inscription guide, ouvert PAR CONCEPTION. Ce qui
 * doit le borner est la modération (`profileStatus`) et le plafond de dépense du
 * proxy `v1/tts/generate` — pas ce juge. Le juge ferme l'USURPATION, pas
 * l'inscription.
 */

/**
 * Le champ qui PORTE la propriété du profil, côté schéma comme côté juge.
 *
 * Miroir de la constante du même nom dans `amplify/shared/guide-qualification.ts`,
 * que `amplify/data/resource.ts` lit pour écrire ses règles d'auth. L'épreuve de
 * jeu de sélection la relit ici pour dériver ce que le client sélectionnera :
 * changer le modèle de propriété fait donc tomber quelque chose.
 */
export const CHAMP_PROPRIETE_PROFIL = 'userId';

/**
 * La revendication du jeton comparée à ce champ.
 *
 * `'sub'` — et pas le défaut `cognito:username` — pour que la valeur écrite et
 * comparée soit le `sub` NU. Sans `.identityClaim('sub')`, `ownerDefinedIn`
 * écrirait `"$sub::$username"` DANS `userId`, qui est la clé de partition de
 * `guideProfilesByUserId` : les profils créés après bascule deviendraient
 * introuvables. L'épreuve de jeu de sélection vérifie cette revendication.
 */
export const REVENDICATION_PROPRIETE_PROFIL = 'sub';

/** Les statuts qui retirent le rôle, quoi qu'il arrive par ailleurs. */
export const STATUTS_DISQUALIFIANTS = ['suspended', 'rejected'] as const;

/**
 * Borne de lecture par `sub`.
 *
 * CE QU'ELLE PROTÈGE A CHANGÉ. Elle bornait l'INONDATION PAR UN TIERS ; celle-là
 * est morte à la source, plus personne ne peut écrire ni faire dériver une ligne
 * vers le `userId` d'autrui. Ce qu'elle borne désormais est l'AUTO-INONDATION :
 * `guideProfilesByUserId` est une GSI à clé de partition SANS clé de tri, donc
 * ordonnée par `id`, et `id` est dans `CreateGuideProfileInput`. Un guide
 * suspendu pourrait se créer assez de doublons `active` aux `id` choisis pour
 * repousser sa propre ligne suspendue hors de la page lue, et se re-qualifier.
 * La borne, plus le refus sur vue tronquée, l'en empêchent — et le refus ne prive
 * plus que celui qui l'a provoqué, qui n'y gagne rien.
 *
 * Assez large pour qu'un guide légitime (1 ligne) n'y touche jamais.
 */
export const BORNE_LECTURE_PROFILS = 25;

/**
 * Le strict nécessaire à juger : tout le reste du profil est hors sujet ici.
 *
 * `userId` est le champ CONTRAINT (voir l'en-tête). Il N'Y A PLUS de champ
 * `owner` à lire, et il ne faut surtout pas en réintroduire un : `LigneProfilLue`
 * (`src/lib/api/appsync-client.ts`) croise ce type avec
 * `Schema['GuideProfile']['type']`, d'où `owner` a déjà disparu. Un `owner?`
 * optionnel rendu ici le ferait REVENIR dans l'intersection, et l'erreur
 * redeviendrait invisible à la compilation.
 */
export interface LigneProfilGuide {
  readonly userId?: string | null;
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
 * Ce `userId` désigne-t-il ce `sub` ?
 *
 * ÉGALITÉ STRICTE, et rien d'autre : c'est exactement ce que compare le
 * résolveur (`$ctx.args.input.userId == $ctx.identity.claims.get("sub")` à la
 * création, `$ctx.result.userId == …` à la modification), avec une liste de
 * revendications de repli VIDE. Le backend ne peut donc plus écrire NI faire
 * dériver une forme `sub::username`. Accepter un préfixe `sub::…` ici rouvrirait
 * un écart entre ce que le backend permet d'écrire et ce que le juge accepte de
 * lire — l'écart même qui a produit le trou d'origine.
 *
 * Les chaînes vides sont refusées des deux côtés : un `sub` vide ne doit JAMAIS
 * apparier une ligne dont le `userId` est vide ou absent.
 */
export function profilAppartientAuSub(userId: unknown, sub: unknown): boolean {
  if (typeof userId !== 'string' || typeof sub !== 'string') return false;
  if (userId.length === 0 || sub.length === 0) return false;
  return userId === sub;
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
  const miennes = lignes.filter((ligne) => profilAppartientAuSub(ligne.userId, sub));

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
 *
 * ÉTAT DU PARC — À NE PAS PRENDRE POUR UN REPLI : le pool vivant
 * `us-east-1_6LLCychLP` n'a qu'un seul groupe, `admin` ; le groupe `guide`
 * N'EXISTE PAS. Cette branche est donc INERTE en production aujourd'hui. Elle
 * existe pour que mobile et portail rendent le MÊME verdict le jour où le groupe
 * sera créé.
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

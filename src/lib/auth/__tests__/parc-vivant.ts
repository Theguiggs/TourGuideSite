/**
 * LE PARC VIVANT — un seul relevé, relu par toutes les épreuves.
 *
 * Ce fichier n'est pas une épreuve : c'est la DONNÉE du contrôle négatif. Il est
 * unique parce que le relevé précédent, recopié dans trois fichiers, s'est
 * trompé dans les trois de la même façon — il comptait TROIS guides.
 *
 * IL Y EN A DEUX. Le `sub` `a4e854b8-0001-70c8-fb8d-a8199917905e`
 * (« E2E Guide (2) ») N'EXISTE PAS dans le pool vivant `us-east-1_6LLCychLP` :
 * sa ligne a survécu à une migration de pool, pas son identité. C'est une LIGNE
 * ORPHELINE, pas un guide.
 *
 * CE QUI N'EST PAS PROUVÉ ICI : ce relevé est une donnée d'entrée, pas une
 * lecture. Aucune épreuve du portail n'interroge DynamoDB ni Cognito — écrire
 * sur le vivant est interdit, et le lire n'est pas à la portée de la suite. Si
 * le parc change, ces constantes mentent en silence.
 *
 * FORME DES LIGNES EN BASE (table `GuideProfile-yvupc5stqzaxrgz6wv2wz7he5y-NONE`) :
 * `userId` NU, plus un attribut `owner` composite `"<sub>::<sub>"` hérité
 * d'`allow.owner()` — le pool est en `UsernameAttributes:["email"]`, donc Cognito
 * ENGENDRE le `username` et il vaut le `sub`.
 *
 * `owner` N'EST PAS PARTI, ET C'EST TOUT LE PIÈGE. La bascule vers
 * `ownerDefinedIn('userId').identityClaim('sub')` lui retire l'AUTORITÉ, pas
 * l'existence : une règle de transition `allow.owner().to(['read'])` le garde
 * dans le TYPE GraphQL, sans quoi l'APK v1.3.3 en magasin — dont l'artefact
 * embarqué le réclame dans chaque requête — recevrait `data: null` +
 * « Validation error of type FieldUndefined ». Le champ reste donc SÉLECTIONNÉ
 * (`resolveOwnerFields` rend `['userId','owner']`), il est simplement mort :
 * plus aucun résolveur ne l'écrit.
 *
 * D'OÙ LA LIGNE NEUVE ci-dessous. Les trois lignes du relevé sont ANTÉRIEURES à
 * la bascule : elles portent encore leur `owner` composite en base. Une ligne
 * créée APRÈS n'en portera aucun, et le client y lira `owner: null`. Un juge
 * resté sur `owner` marcherait donc sur le parc actuel et s'effondrerait sur
 * chaque nouvelle inscription — la pire des pannes, celle qui ne se voit pas.
 *
 * Aucune des trois lignes n'est « plantée » : chacune porte un `owner` cohérent
 * avec son propre `userId`. C'est ce qui permet d'affirmer que le résidu
 * documenté dans `guide-qualification.test.ts` (une ligne héritée `suspended`
 * sous le `userId` d'autrui devient indiscernable) n'a aujourd'hui aucune
 * victime en base. Vérifié par `aws dynamodb scan` le 2026-09-01 : pour les
 * trois, le segment d'`owner` avant le PREMIER `::` est égal à `userId`.
 */

/** Une ligne DynamoDB entière, avant toute projection. */
export interface LigneDynamo {
  readonly id: string;
  readonly userId: string;
  /**
   * Poids mort depuis la bascule — mais TOUJOURS SÉLECTIONNÉ, et c'est ce qui
   * rend l'erreur silencieuse. `null` sur toute ligne créée après la bascule.
   */
  readonly owner: string | null;
  readonly displayName: string;
  readonly profileStatus: string;
}

const composite = (sub: string) => `${sub}::${sub}`;

/** Les DEUX guides réels. Le contrôle négatif porte sur eux, et sur eux seuls. */
export const PARC_VIVANT: ReadonlyArray<{
  readonly nom: string;
  readonly sub: string;
  readonly ligne: LigneDynamo;
}> = [
  {
    nom: 'E2E Guide (1)',
    sub: '34385438-f0c1-708d-edb6-7254fdf3c203',
    ligne: {
      id: 'p1',
      userId: '34385438-f0c1-708d-edb6-7254fdf3c203',
      owner: composite('34385438-f0c1-708d-edb6-7254fdf3c203'),
      displayName: 'E2E Guide',
      profileStatus: 'active',
    },
  },
  {
    nom: 'Guillaume STEFFEN',
    sub: '4418d408-8091-7086-42d5-ff563a43379c',
    ligne: {
      id: 'p3',
      userId: '4418d408-8091-7086-42d5-ff563a43379c',
      owner: composite('4418d408-8091-7086-42d5-ff563a43379c'),
      displayName: 'Guillaume STEFFEN',
      profileStatus: 'active',
    },
  },
];

/**
 * La ligne orpheline — en base, sans identité derrière elle.
 *
 * Elle est INERTE et doit le rester : `guideProfilesByUserId` est une requête sur
 * clé de partition, donc cette ligne n'apparaît que dans la page de SON PROPRE
 * `userId`, et personne ne peut plus s'authentifier avec ce `sub`. Aucune lecture
 * d'autorisation ne la demandera. On l'éprouve quand même : si elle sortait, elle
 * ne doit qualifier personne.
 */
/**
 * UNE LIGNE CRÉÉE APRÈS LA BASCULE — celle qu'aucun relevé ne peut encore
 * contenir, et qui décide pourtant du sort de chaque nouvelle inscription.
 *
 * Elle n'est PAS une lecture : c'est ce que le schéma écrira. Aucun résolveur
 * n'écrit plus `owner` (la règle de transition est en LECTURE seule), donc
 * l'attribut sera absent en base et le client, qui le sélectionne toujours, y
 * lira `null`.
 *
 * Elle existe pour une seule épreuve, la décisive : un juge resté sur `owner`
 * qualifie encore les DEUX guides du relevé — leurs lignes sont antérieures et
 * portent leur composite — et s'effondre sur celle-ci. Un contrôle négatif qui
 * ne regarderait que le parc actuel le laisserait passer.
 */
export const LIGNE_NEUVE = {
  nom: 'Guide inscrit APRÈS la bascule',
  sub: '9f0c1d2e-3456-4789-abcd-ef0123456789',
  ligne: {
    id: 'p-neuve',
    userId: '9f0c1d2e-3456-4789-abcd-ef0123456789',
    // Jamais écrit par aucun résolveur depuis la bascule.
    owner: null,
    displayName: 'Guide Neuf',
    profileStatus: 'active',
  },
} as const;

export const LIGNE_ORPHELINE = {
  nom: 'E2E Guide (2) — ligne orpheline',
  sub: 'a4e854b8-0001-70c8-fb8d-a8199917905e',
  ligne: {
    id: 'p2',
    userId: 'a4e854b8-0001-70c8-fb8d-a8199917905e',
    owner: composite('a4e854b8-0001-70c8-fb8d-a8199917905e'),
    displayName: 'E2E Guide',
    profileStatus: 'active',
  },
} as const;

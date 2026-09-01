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
 * ENGENDRE le `username` et il vaut le `sub`. Depuis la bascule vers
 * `ownerDefinedIn('userId').identityClaim('sub')`, `owner` n'est plus ni lu ni
 * écrit ni SÉLECTIONNABLE : il est laissé ici EXPRÈS, pour que la projection sur
 * le jeu de sélection réel ait quelque chose à retirer.
 *
 * Aucune des trois lignes n'est « plantée » : chacune porte un `owner` cohérent
 * avec son propre `userId`. C'est ce qui permet d'affirmer que le résidu
 * documenté dans `guide-qualification.test.ts` (une ligne héritée `suspended`
 * sous le `userId` d'autrui devient indiscernable) n'a aujourd'hui aucune
 * victime en base.
 */

/** Une ligne DynamoDB entière, avant toute projection. */
export interface LigneDynamo {
  readonly id: string;
  readonly userId: string;
  /** Poids mort depuis la bascule — conservé pour que la projection le retire. */
  readonly owner: string;
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

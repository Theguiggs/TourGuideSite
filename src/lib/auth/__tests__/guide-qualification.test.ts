/**
 * Épreuves de la qualification d'un guide, côté portail.
 *
 * Chaque épreuve d'attaque POSE la mutation et constate la chute ; le contrôle
 * négatif (les profils RÉELS du parc vivant) constate qu'ils qualifient
 * toujours. Une garde que rien ne fait tomber ne prouve rien : les deux moitiés
 * sont ici.
 *
 * CE FICHIER FABRIQUE SES LIGNES À LA MAIN, ET C'EST SA LIMITE. Il ne peut pas
 * voir qu'un champ lu n'est pas un champ rendu — c'est précisément ainsi que le
 * juge `owner` est resté vert pendant que le backend le retirait du jeu de
 * sélection. Ce trou-là est fermé par `guide-qualification-jeu-de-selection.test.ts`,
 * qui PROJETTE ses lignes sur le jeu de sélection dérivé des règles d'auth.
 */

import outputs from '../../../../amplify_outputs.json';

import {
  BORNE_LECTURE_PROFILS,
  CHAMP_PROPRIETE_PROFIL,
  profilAppartientAuSub,
  qualifieGuide,
  REVENDICATION_PROPRIETE_PROFIL,
  roleGuide,
  statutDisqualifie,
  type LigneProfilGuide,
} from '../guide-qualification';
// Le relevé du vivant est UNIQUE et partagé : le précédent, recopié dans trois
// fichiers, s'était trompé dans les trois de la même façon (trois guides au lieu
// de deux). Voir `./parc-vivant.ts`.
import type { Schema } from '@amplify-schema';
import { LIGNE_ORPHELINE, PARC_VIVANT } from './parc-vivant';

const GUIDE = 'guide-sub-0000-1111';
const ATTAQUANT = 'attaquant-sub-2222-3333';

/** Une ligne telle que le client la rend depuis la bascule : `userId` nu. */
const ligne = (sub: string, profileStatus = 'active'): LigneProfilGuide => ({
  userId: sub,
  profileStatus,
});

describe('les constantes du modèle de propriété', () => {
  // Elles ne sont pas décoratives : `guide-qualification-jeu-de-selection.test.ts`
  // les relit pour DÉRIVER le jeu de sélection, et `amplify/data/resource.ts`
  // (côté backend) les lit pour écrire ses règles d'auth. Les figer ici fait
  // tomber quelque chose si le modèle de propriété change d'un seul côté.
  it('désignent `userId` et la revendication `sub`', () => {
    expect(CHAMP_PROPRIETE_PROFIL).toBe('userId');
    expect(REVENDICATION_PROPRIETE_PROFIL).toBe('sub');
  });
});

describe('le TYPE des lignes jugées', () => {
  // Ces deux épreuves sont de nature COMPILATION : elles ne tombent pas à
  // l'exécution mais sous `tsc --noEmit`. C'est le seul endroit où le défaut
  // d'origine était visible — et il ne l'était pas, justement parce que
  // `LigneProfilGuide` déclarait un `owner?` optionnel.
  it('n’a PAS de champ `owner` — mais ce n’est plus ce qui protège le portail', () => {
    // CE QUE CETTE DIRECTIVE COUVRE ENCORE, ET CE QU'ELLE NE COUVRE PLUS.
    // Elle empêche de rendre la lecture d'`owner` délibérée DANS LE TYPE DU JUGE,
    // et à ce titre elle reste utile : la retirer serait un choix, pas un oubli.
    //
    // Mais elle ne protège plus le portail. `LigneProfilLue`
    // (`src/lib/api/appsync-client.ts`) croise ce type avec
    // `Schema['GuideProfile']['type']`, où la règle de transition
    // `allow.owner().to(['read'])` REMET `owner` — l'intersection le porte donc,
    // et `ligne.owner` compile ailleurs quoi qu'on écrive ici. Ce qui interdit la
    // lecture est `owner-champ-mort.test.ts`, qui relit les sources.
    const interdit = () => {
      // @ts-expect-error `owner` n'appartient pas à `LigneProfilGuide`.
      const ligneAvecOwner: LigneProfilGuide = { owner: 'x', profileStatus: 'active' };
      return ligneAvecOwner;
    };
    expect(typeof interdit).toBe('function');
  });

  it('`userId` est bien un champ du type que le backend expose', () => {
    // La seule chose que le portail doive exiger du type backend, et qui vaut
    // AVANT comme APRÈS le déploiement du schéma : `userId` est un champ explicite
    // du modèle. `owner`, lui, n'est volontairement pas contrôlé ici — il y est
    // aujourd'hui (règle de transition) et en sortira un jour, sans que le juge en
    // soit affecté ni dans un cas ni dans l'autre. C'est tout l'intérêt d'avoir
    // déplacé l'autorité sur un champ EXPLICITE du modèle.
    const ligneTypee: Pick<Schema['GuideProfile']['type'], 'userId'> = { userId: 'un-sub' };
    expect(profilAppartientAuSub(ligneTypee.userId, 'un-sub')).toBe(true);
  });
});

describe('le TYPE de `profileStatus` — l’enum est parti, plus rien ne rattrape une faute', () => {
  /**
   * CE QUI A CHANGÉ AU SCHÉMA, ET CE QUE ÇA COÛTE ICI.
   *
   * `profileStatus` est passé d'`a.enum()` à `a.string()` : Amplify Gen 2 refuse
   * une autorisation AU NIVEAU DU CHAMP sur un champ enum, et c'est cette
   * autorisation qui retire `update` au propriétaire (sans quoi un guide suspendu
   * se remet `active` en une mutation sur sa propre ligne).
   *
   * SUR LE FIL, RIEN NE BOUGE : une valeur d'énumération GraphQL voyage déjà
   * comme une chaîne JSON, les quatre valeurs restent
   * `pending_moderation | active | suspended | rejected`, et les binaires déjà
   * distribués ne s'en aperçoivent pas.
   *
   * DANS LE TYPE, SI : `Schema['GuideProfile']['type']['profileStatus']` était
   * une UNION, il devient `string | null`. Le compilateur ne refuse donc plus une
   * faute de frappe (`'suspend'`, `'Active'`), et il ne le fera plus jamais. Ce
   * qui doit rattraper à sa place :
   *   - `STATUTS_DISQUALIFIANTS`, ici, pour la LECTURE ;
   *   - l'union littérale d'`adminUpdateGuideProfileStatus` et celles des écrans
   *     d'administration, pour l'ÉCRITURE (épinglées dans
   *     `src/lib/api/__tests__/guide-profile-ecritures.test.ts`).
   */
  it('l’union a disparu — constaté sur l’ARTEFACT, pas sur le type', () => {
    // POURQUOI PAS UNE ASSERTION DE COMPILATION.
    //
    // La forme naturelle était d'écrire
    // `const x: Schema[…]['profileStatus'] = 'ce-statut-nexiste-pas'` et de
    // laisser `tsc` tomber si l'union revenait. Elle ne tient pas ICI, et
    // l'intégration continue l'a prouvée fausse : le type vient de
    // `@amplify-schema`, qui se résout sur l'AUTRE dépôt — sur `main`, où le
    // champ est encore un enum tant que le backend n'est pas déployé. En local
    // la ligne compilait (branche de correctif), en CI elle échouait.
    // UNE GARDE DONT LE VERDICT DÉPEND DE LA BRANCHE D'UN AUTRE DÉPÔT NE GARDE
    // RIEN : elle date.
    //
    // On lit donc l'ARTEFACT que ce portail embarque réellement — même source
    // que `guide-qualification-jeu-de-selection.test.ts` — et on décrit les
    // DEUX ères. Une troisième forme tombe, avec son diff.
    const champ = (
      outputs as unknown as {
        data: {
          model_introspection: {
            models: {GuideProfile: {fields: {profileStatus: {type: unknown}}}};
          };
        };
      }
    ).data.model_introspection.models.GuideProfile.fields.profileStatus.type;

    const enumere =
      typeof champ === 'object' && champ !== null && 'enum' in (champ as Record<string, unknown>);

    if (enumere) {
      // ÈRE D'AVANT : le domaine est encore porté par le schéma.
      expect(champ).toEqual({enum: 'GuideProfileProfileStatus'});
    } else {
      // ÈRE D'APRÈS : le compilateur ne refuse plus une faute de frappe, et il
      // ne le fera plus jamais. `STATUTS_DISQUALIFIANTS` (lecture) et les
      // unions littérales d'écriture sont désormais les SEULES gardes du
      // domaine.
      expect(champ).toBe('String');
    }
  });

  it('le domaine reste les QUATRE valeurs, et le juge les partage en deux', () => {
    // Le domaine n'est plus porté par le type : il est porté par ceci, et par le
    // commentaire du schéma. Une cinquième valeur qui apparaîtrait en base serait
    // traitée comme qualifiante — c'est le sens sûr (elle ne retire rien), mais
    // il faut le savoir.
    const domaine = ['pending_moderation', 'active', 'suspended', 'rejected'];
    expect(domaine.filter(statutDisqualifie)).toEqual(['suspended', 'rejected']);
    expect(domaine.filter((v) => !statutDisqualifie(v))).toEqual([
      'pending_moderation',
      'active',
    ]);
  });

  it('une faute de frappe ne disqualifie plus personne — et personne ne la signale', () => {
    // Le coût exact de la perte de l'enum, écrit noir sur blanc : `'suspend'`
    // (sans le `ed`) rendrait son rôle à un suspendu, sans erreur de compilation
    // ni erreur d'exécution. C'est pourquoi l'écriture passe par des unions
    // littérales, et jamais par une chaîne libre.
    expect(statutDisqualifie('suspend')).toBe(false);
    expect(statutDisqualifie('Suspended')).toBe(false);
    expect(
      qualifieGuide({ sub: GUIDE, lignes: [ligne(GUIDE, 'suspend')], tronquee: false }),
    ).toEqual({ role: 'guide' });
  });
});

describe('profilAppartientAuSub — ÉGALITÉ STRICTE', () => {
  it('accepte la seule forme que le résolveur peut écrire : le `sub` NU', () => {
    expect(profilAppartientAuSub(GUIDE, GUIDE)).toBe(true);
  });

  // ------------------------------------------------------------------
  // LA STRICTESSE — ce que l'ancien juge acceptait et que celui-ci refuse.
  // ------------------------------------------------------------------
  it('REFUSE la forme composite `sub::…`, que le backend ne peut plus écrire', () => {
    // L'ancienne tolérance (`startsWith(sub + '::')`) existait parce que le champ
    // de propriété était `owner`, qu'Amplify écrivait en `"<sub>::<username>"`.
    // Depuis `.identityClaim('sub')`, la SEULE valeur acceptée par le résolveur
    // est le `sub` nu — et `$ownerClaimsList0` reste VIDE. Garder la tolérance
    // rouvrirait un écart entre ce que le backend permet d'écrire et ce que le
    // juge accepte de lire : l'écart même qui a produit le trou d'origine.
    expect(profilAppartientAuSub(`${GUIDE}::${GUIDE}`, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(`${GUIDE}::un-username-quelconque`, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(`${GUIDE}::`, GUIDE)).toBe(false);
  });

  it("refuse le `userId` d'un tiers, sous toutes ses formes", () => {
    expect(profilAppartientAuSub(ATTAQUANT, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(`${ATTAQUANT}::${ATTAQUANT}`, GUIDE)).toBe(false);
  });

  it('refuse un préfixe qui ressemble sans être une égalité', () => {
    expect(profilAppartientAuSub(`${GUIDE}-bis`, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(`${GUIDE} `, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(`x${GUIDE}`, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(GUIDE, `${GUIDE}-bis`)).toBe(false);
  });

  it('refuse le vide, le nul et le non-chaîne — jamais de joker', () => {
    expect(profilAppartientAuSub('', '')).toBe(false);
    expect(profilAppartientAuSub('', GUIDE)).toBe(false);
    expect(profilAppartientAuSub(GUIDE, '')).toBe(false);
    expect(profilAppartientAuSub(null, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(undefined, GUIDE)).toBe(false);
    expect(profilAppartientAuSub(GUIDE, undefined)).toBe(false);
    expect(profilAppartientAuSub({ toString: () => GUIDE }, GUIDE)).toBe(false);
  });
});

describe('statutDisqualifie', () => {
  it('retient exactement suspended et rejected', () => {
    expect(statutDisqualifie('suspended')).toBe(true);
    expect(statutDisqualifie('rejected')).toBe(true);
    expect(statutDisqualifie('active')).toBe(false);
    expect(statutDisqualifie('pending_moderation')).toBe(false);
    expect(statutDisqualifie(null)).toBe(false);
    expect(statutDisqualifie(undefined)).toBe(false);
  });
});

describe('qualifieGuide — les épreuves du correctif chaud', () => {
  // ------------------------------------------------------------------
  // CONTRÔLE NÉGATIF : les guides réels continuent de qualifier.
  // ------------------------------------------------------------------
  describe('contrôle négatif — le parc vivant', () => {
    it.each(PARC_VIVANT)('le profil réel de $nom qualifie toujours son guide', ({ sub }) => {
      expect(qualifieGuide({ sub, lignes: [ligne(sub)], tronquee: false })).toEqual({
        role: 'guide',
      });
    });

    it('les deux lignes lues ENSEMBLE qualifient chacune leur guide, et eux seuls', () => {
      const toutes = PARC_VIVANT.map((p) => ligne(p.sub));
      for (const { sub } of PARC_VIVANT) {
        expect(qualifieGuide({ sub, lignes: toutes, tronquee: false })).toEqual({ role: 'guide' });
      }
      // Un troisième compte qui lirait les mêmes lignes n'en tire rien.
      expect(qualifieGuide({ sub: ATTAQUANT, lignes: toutes, tronquee: false })).toEqual({
        role: null,
        refus: 'aucun-profil',
      });
    });

    it("la ligne ORPHELINE ne qualifie aucun des deux guides vivants", () => {
      // Elle n'apparaîtra jamais dans leur page (clé de partition différente),
      // mais si elle y était, elle ne leur donnerait rien.
      const orpheline = [ligne(LIGNE_ORPHELINE.sub)];
      for (const { sub } of PARC_VIVANT) {
        expect(qualifieGuide({ sub, lignes: orpheline, tronquee: false })).toEqual({
          role: null,
          refus: 'aucun-profil',
        });
      }
    });

    it("un profil en modération (pending_moderation) qualifie — ce n'est pas un statut disqualifiant", () => {
      expect(
        qualifieGuide({
          sub: GUIDE,
          lignes: [ligne(GUIDE, 'pending_moderation')],
          tronquee: false,
        }),
      ).toEqual({ role: 'guide' });
    });
  });

  // ------------------------------------------------------------------
  // ATTAQUE 1 — révocation croisée. Elle est MORTE À LA SOURCE : le schéma
  // n'autorise plus personne à écrire, ni à faire dériver, une ligne vers le
  // `userId` d'un tiers. Restent les DONNÉES HÉRITÉES, écrites avant la
  // bascule, et il faut dire exactement ce qu'elles produisent.
  // ------------------------------------------------------------------
  it("une ligne héritée portant le `userId` d'un ATTAQUANT ne retire rien au guide", () => {
    const lignes: LigneProfilGuide[] = [ligne(GUIDE), ligne(ATTAQUANT, 'suspended')];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({ role: 'guide' });
  });

  it("et elle ne le qualifie pas non plus s'il n'a rien à lui", () => {
    const lignes: LigneProfilGuide[] = [ligne(ATTAQUANT, 'active')];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({
      role: null,
      refus: 'aucun-profil',
    });
  });

  it(
    "RÉSIDU ASSUMÉ — une ligne héritée `suspended` portant le `userId` DU GUIDE " +
      'le disqualifie, et rien ici ne peut plus la distinguer de la sienne',
    () => {
      // CE POINT CONTREDIT LE CONTRAT REÇU, qui demandait qu'une telle ligne « ne
      // le disqualifie pas à tort ». C'est un choix, et il est délibéré :
      //   - l'ancien juge distinguait la ligne plantée par son `owner` (celui de
      //     l'attaquant), champ que le résolveur bornait ;
      //   - `owner` EXISTE toujours (règle de transition `allow.owner()
      //     .to(['read'])`, pour ne pas casser les binaires distribués) et le
      //     portail POURRAIT donc encore le lire. Mais il ne le doit pas : plus
      //     aucun résolveur ne l'écrit, il vaut `null` sur toute ligne créée après
      //     la bascule, et un juge qui s'y fierait qualifierait les deux guides
      //     antérieurs tout en verrouillant chaque nouvelle inscription. Le lire
      //     « juste pour les lignes héritées » serait donc rouvrir un chemin qui
      //     ment sur la moitié du parc à venir.
      // Une ligne héritée `{userId: <sub du guide>, owner: <attaquant>}` est ainsi
      // INDISCERNABLE d'une ligne légitime du guide, et le juge la compte comme
      // sienne. Le correctif est plus permissif que son prédécesseur SUR CE SEUL
      // POINT, et seulement sur les données antérieures au déploiement.
      //
      // L'AUDIT DU PARC, qui en découle, A ÉTÉ EXÉCUTÉ le 2026-09-01 par
      // `aws dynamodb scan` (l'attribut BRUT ; AppSync, lui, rend le DERNIER
      // segment et mentirait) : 3 lignes, AUCUNE anomalie — pour les trois, le
      // segment d'`owner` avant le PREMIER `::` est égal à `userId`. Deux comptes
      // seulement existent au pool ; la troisième ligne est orpheline.
      expect(
        qualifieGuide({ sub: GUIDE, lignes: [ligne(GUIDE, 'suspended')], tronquee: false }),
      ).toEqual({ role: null, refus: 'disqualifie' });
    },
  );

  // ------------------------------------------------------------------
  // ATTAQUE 2 — le suspendu qui se re-qualifie par un doublon actif À SON NOM.
  // Celle-ci reste entièrement ouverte côté schéma : rien n'impose l'unicité de
  // `userId`, et l'inscription guide est ouverte par conception.
  // ------------------------------------------------------------------
  it('un guide suspendu ne se re-qualifie pas en se créant un second profil actif à SON nom', () => {
    const lignes: LigneProfilGuide[] = [
      // L'ordre est celui du pire cas : l'actif arrive EN PREMIER, donc un
      // `data?.[0]` ou un `find` s'y arrêterait et accorderait le rôle.
      ligne(GUIDE, 'active'),
      ligne(GUIDE, 'suspended'),
    ];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({
      role: null,
      refus: 'disqualifie',
    });
  });

  it('un rejeté ne se re-qualifie pas davantage, quel que soit le nombre de doublons actifs', () => {
    const lignes: LigneProfilGuide[] = [
      ...Array.from({ length: BORNE_LECTURE_PROFILS - 1 }, () => ligne(GUIDE, 'active')),
      ligne(GUIDE, 'rejected'),
    ];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({
      role: null,
      refus: 'disqualifie',
    });
  });

  // ------------------------------------------------------------------
  // LA BORNE — ce qu'elle protège a changé : plus l'inondation par un tiers
  // (impossible), mais l'AUTO-INONDATION. Le refus reste le même.
  // ------------------------------------------------------------------
  it('une vue tronquée refuse, même quand toutes les lignes VUES sont actives et à soi', () => {
    expect(
      qualifieGuide({ sub: GUIDE, lignes: [ligne(GUIDE)], tronquee: true }),
    ).toEqual({ role: null, refus: 'vue-tronquee' });
  });

  it('une suspension VUE reste décisive même sur une vue tronquée', () => {
    expect(
      qualifieGuide({ sub: GUIDE, lignes: [ligne(GUIDE, 'suspended')], tronquee: true }),
    ).toEqual({ role: null, refus: 'disqualifie' });
  });

  it('noyer SA PROPRE suspension hors de la page ne la contourne pas : la troncature refuse', () => {
    // L'attaque exacte contre laquelle la règle existe encore : la GSI
    // `guideProfilesByUserId` n'a pas de clé de tri, elle ordonne par `id`, et
    // `id` est dans `CreateGuideProfileInput`. Un suspendu pourrait donc choisir
    // des `id` qui repoussent sa ligne suspendue hors de la page lue.
    const lignes = Array.from({ length: BORNE_LECTURE_PROFILS }, () => ligne(GUIDE, 'active'));
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: true })).toEqual({
      role: null,
      refus: 'vue-tronquee',
    });
  });

  // ------------------------------------------------------------------
  // LE PIÈGE DORMANT — un `userId` absent du jeu de sélection.
  // ------------------------------------------------------------------
  it('des lignes sans `userId` ne qualifient PERSONNE (le piège du selectionSet amputé)', () => {
    // Si un `selectionSet` explicite retirait `userId`, la comparaison porterait
    // sur `undefined` : la règle refuserait tout le monde. On le constate ici
    // pour que le coût du piège soit écrit ; `appsync-client` en interdit la
    // cause par une épreuve dédiée, et `guide-qualification-jeu-de-selection`
    // vérifie que `userId` est bien dans le jeu de sélection RÉEL.
    expect(
      qualifieGuide({
        sub: GUIDE,
        lignes: [{ profileStatus: 'active' }, { userId: null, profileStatus: 'active' }],
        tronquee: false,
      }),
    ).toEqual({ role: null, refus: 'aucun-profil' });
  });

  it("un `sub` vide ne qualifie rien, même face à une ligne au `userId` vide", () => {
    expect(
      qualifieGuide({ sub: '', lignes: [{ userId: '', profileStatus: 'active' }], tronquee: false }),
    ).toEqual({ role: null, refus: 'aucun-profil' });
  });
});

describe('roleGuide — la revendication de groupe', () => {
  it('le groupe `guide` qualifie seul, sans profil', () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({ sub: GUIDE, lignes: [], tronquee: false }),
        groupes: ['guide'],
      }),
    ).toBe('guide');
  });

  it('une DISQUALIFICATION renverse le groupe — un guide suspendu reste suspendu', () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({
          sub: GUIDE,
          lignes: [ligne(GUIDE, 'suspended')],
          tronquee: false,
        }),
        groupes: ['guide'],
      }),
    ).toBeNull();
  });

  it("une vue tronquée ne renverse PAS le groupe : elle n'a rien prouvé", () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({ sub: GUIDE, lignes: [ligne(GUIDE)], tronquee: true }),
        groupes: ['guide'],
      }),
    ).toBe('guide');
  });

  it('sans groupe ni profil à soi, aucun rôle', () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({
          sub: GUIDE,
          lignes: [ligne(ATTAQUANT, 'active')],
          tronquee: false,
        }),
        groupes: [],
      }),
    ).toBeNull();
  });

  // ------------------------------------------------------------------
  // LE GROUPE DU PERSONNEL — `admin`, ET SA PRÉCÉDENCE.
  //
  // Arbitrage du 2026-09-01 : le portail rendait `['admin','guide']` par un
  // court-circuit placé AVANT le juge, le mobile ne connaissait que le groupe
  // `guide`. La règle a déménagé DANS le juge, ce qui la rend identique sur les
  // deux surfaces. Ces trois épreuves tiennent les deux moitiés : le groupe
  // qualifie seul, ET il passe avant la disqualification.
  // ------------------------------------------------------------------
  it('le groupe `admin` qualifie seul, sans le moindre profil', () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({ sub: GUIDE, lignes: [], tronquee: false }),
        groupes: ['admin'],
      }),
    ).toBe('guide');
  });

  it("une DISQUALIFICATION ne renverse PAS `admin` — c'est la précédence, et elle est délibérée", () => {
    // LA MUTATION : déplacer `if (groupes.includes(GROUPE_PERSONNEL))` sous le
    // test de disqualification dans `roleGuide`. Cette épreuve tombe, et avec
    // elle l'accès Studio d'un admin qui aurait modéré sa propre ligne.
    expect(
      roleGuide({
        qualification: qualifieGuide({
          sub: GUIDE,
          lignes: [ligne(GUIDE, 'suspended')],
          tronquee: false,
        }),
        groupes: ['admin'],
      }),
    ).toBe('guide');
  });

  it("le groupe `guide`, lui, RESTE renversé par la disqualification", () => {
    // Le contraste qui donne son sens à la précédence : les deux groupes ne sont
    // pas traités pareil, et c'est voulu. Si `admin` passait après, cette
    // épreuve-ci et la précédente rendraient le même verdict — la distinction
    // aurait disparu sans bruit.
    expect(
      roleGuide({
        qualification: qualifieGuide({
          sub: GUIDE,
          lignes: [ligne(GUIDE, 'rejected')],
          tronquee: false,
        }),
        groupes: ['guide'],
      }),
    ).toBeNull();
  });

  it('un non-verdict (vue tronquée, lecture ratée) laisse `admin` intact', () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({ sub: GUIDE, lignes: [], tronquee: true }),
        groupes: ['admin'],
      }),
    ).toBe('guide');
  });
});

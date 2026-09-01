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
  it('n’a PAS de champ `owner` — le remettre rendrait le défaut invisible', () => {
    // `LigneProfilLue` croise ce type avec `Schema['GuideProfile']['type']`, d'où
    // `owner` a déjà disparu. Un `owner?` optionnel ICI le ferait revivre dans
    // l'intersection, et `ligne.owner` redeviendrait typé — donc compilable, donc
    // silencieux. Si ce `@ts-expect-error` devient inutile, c'est que le champ
    // est revenu : le retirer, ne pas retirer la directive.
    const interdit = () => {
      // @ts-expect-error `owner` n'appartient plus à `LigneProfilGuide`.
      const ligneAvecOwner: LigneProfilGuide = { owner: 'x', profileStatus: 'active' };
      return ligneAvecOwner;
    };
    expect(typeof interdit).toBe('function');
  });

  it('`userId` est bien un champ du type que le backend expose', () => {
    // La seule chose que le portail doive exiger du type backend, et qui vaut
    // AVANT comme APRÈS le déploiement du schéma : `userId` est un champ explicite
    // du modèle. `owner`, lui, n'est volontairement pas contrôlé ici — il est
    // présent ou absent selon l'ère du dépôt voisin, et le juge est juste dans les
    // deux cas.
    const ligneTypee: Pick<Schema['GuideProfile']['type'], 'userId'> = { userId: 'un-sub' };
    expect(profilAppartientAuSub(ligneTypee.userId, 'un-sub')).toBe(true);
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
      // le disqualifie pas à tort ». C'est IMPOSSIBLE depuis la bascule :
      //   - l'ancien juge distinguait la ligne plantée par son `owner` (celui de
      //     l'attaquant), champ que le résolveur bornait ;
      //   - `owner` a disparu du type GraphQL ET du jeu de sélection. Le portail
      //     ne peut plus le lire, ni par défaut ni par `selectionSet` explicite.
      // Une ligne héritée `{userId: <sub du guide>, owner: <attaquant>}` est donc
      // désormais INDISCERNABLE d'une ligne légitime du guide, et le juge la
      // compte comme sienne. Le correctif est plus permissif que son prédécesseur
      // SUR CE SEUL POINT, et seulement sur les données antérieures au
      // déploiement.
      //
      // PRÉREQUIS DE DÉPLOIEMENT qui en découle : auditer la table avant de
      // basculer, et supprimer toute ligne dont l'attribut `owner` ne commence
      // pas par son propre `userId`. Sur le parc relevé, il n'y en a aucune — les
      // deux guides et la ligne orpheline portent tous un `owner` cohérent avec
      // leur `userId`.
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
});

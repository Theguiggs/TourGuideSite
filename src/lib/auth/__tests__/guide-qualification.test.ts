/**
 * Épreuves de la qualification d'un guide, côté portail.
 *
 * Chaque épreuve d'attaque POSE la mutation et constate la chute ; le contrôle
 * négatif (les trois profils RÉELS du parc vivant) constate qu'ils qualifient
 * toujours. Une garde que rien ne fait tomber ne prouve rien : les deux moitiés
 * sont ici.
 */

import {
  BORNE_LECTURE_PROFILS,
  ownerAppartientAuSub,
  qualifieGuide,
  roleGuide,
  statutDisqualifie,
  type LigneProfilGuide,
} from '../guide-qualification';

/**
 * Le parc vivant, relevé le 2026-09-01 par balayage complet de
 * `GuideProfile-yvupc5stqzaxrgz6wv2wz7he5y-NONE` : 3 lignes, toutes `active`,
 * toutes en `owner === "<sub>::<sub>"`, aucun doublon de `userId`.
 *
 * C'EST LE CONTRÔLE NÉGATIF ET C'EST LE PLUS IMPORTANT : un correctif de
 * sécurité qui casse les comptes légitimes est un incident, pas un correctif.
 */
const PARC_VIVANT = [
  {
    nom: 'E2E Guide (1)',
    sub: '34385438-f0c1-708d-edb6-7254fdf3c203',
    owner: '34385438-f0c1-708d-edb6-7254fdf3c203::34385438-f0c1-708d-edb6-7254fdf3c203',
  },
  {
    nom: 'E2E Guide (2)',
    sub: 'a4e854b8-0001-70c8-fb8d-a8199917905e',
    owner: 'a4e854b8-0001-70c8-fb8d-a8199917905e::a4e854b8-0001-70c8-fb8d-a8199917905e',
  },
  {
    nom: 'Guillaume STEFFEN',
    sub: '4418d408-8091-7086-42d5-ff563a43379c',
    owner: '4418d408-8091-7086-42d5-ff563a43379c::4418d408-8091-7086-42d5-ff563a43379c',
  },
] as const;

const GUIDE = 'guide-sub-0000-1111';
const ATTAQUANT = 'attaquant-sub-2222-3333';

/** Ce que le résolveur laisse écrire à un compte : sa propre identité, 3 formes. */
const formesLegitimes = (sub: string): string[] => [
  sub,
  `${sub}::${sub}`,
  `${sub}::un-username-quelconque`,
];

describe('ownerAppartientAuSub', () => {
  it('accepte les trois formes que le résolveur autorise pour son PROPRE sub', () => {
    for (const owner of formesLegitimes(GUIDE)) {
      expect(ownerAppartientAuSub(owner, GUIDE)).toBe(true);
    }
  });

  it("refuse l'owner d'un tiers, sous toutes ses formes", () => {
    for (const owner of formesLegitimes(ATTAQUANT)) {
      expect(ownerAppartientAuSub(owner, GUIDE)).toBe(false);
    }
  });

  it('refuse un préfixe qui ressemble sans être une frontière `::`', () => {
    // Le danger d'un `startsWith` naïf sans le séparateur.
    expect(ownerAppartientAuSub(`${GUIDE}-bis`, GUIDE)).toBe(false);
    expect(ownerAppartientAuSub(`${GUIDE}:autre`, GUIDE)).toBe(false);
    expect(ownerAppartientAuSub(`x${GUIDE}`, GUIDE)).toBe(false);
  });

  it('refuse le vide, le nul et le non-chaîne — jamais de joker', () => {
    expect(ownerAppartientAuSub('', '')).toBe(false);
    expect(ownerAppartientAuSub('::truc', '')).toBe(false);
    expect(ownerAppartientAuSub(null, GUIDE)).toBe(false);
    expect(ownerAppartientAuSub(undefined, GUIDE)).toBe(false);
    expect(ownerAppartientAuSub(GUIDE, undefined)).toBe(false);
    expect(ownerAppartientAuSub({ toString: () => GUIDE }, GUIDE)).toBe(false);
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
  // CONTRÔLE NÉGATIF : les trois guides réels continuent de qualifier.
  // ------------------------------------------------------------------
  describe('contrôle négatif — le parc vivant', () => {
    it.each(PARC_VIVANT)('le profil réel de $nom qualifie toujours son guide', ({ sub, owner }) => {
      expect(qualifieGuide({ sub, lignes: [{ owner, profileStatus: 'active' }], tronquee: false })).toEqual({
        role: 'guide',
      });
    });

    it('les trois lignes lues ENSEMBLE qualifient chacun leur guide, et eux seuls', () => {
      const toutes: LigneProfilGuide[] = PARC_VIVANT.map((p) => ({
        owner: p.owner,
        profileStatus: 'active',
      }));
      for (const { sub } of PARC_VIVANT) {
        expect(qualifieGuide({ sub, lignes: toutes, tronquee: false })).toEqual({ role: 'guide' });
      }
      // Un quatrième compte qui lirait les mêmes lignes n'en tire rien.
      expect(qualifieGuide({ sub: ATTAQUANT, lignes: toutes, tronquee: false })).toEqual({
        role: null,
        refus: 'aucun-profil',
      });
    });

    it("un profil en modération (pending_moderation) qualifie — ce n'est pas un statut disqualifiant", () => {
      expect(
        qualifieGuide({
          sub: GUIDE,
          lignes: [{ owner: `${GUIDE}::${GUIDE}`, profileStatus: 'pending_moderation' }],
          tronquee: false,
        }),
      ).toEqual({ role: 'guide' });
    });
  });

  // ------------------------------------------------------------------
  // ATTAQUE 1 — révocation croisée : la ligne plantée ne retire RIEN.
  // ------------------------------------------------------------------
  it("une ligne 'suspended' plantée sous le userId d'un guide ne lui retire pas son rôle", () => {
    const lignes: LigneProfilGuide[] = [
      { owner: `${GUIDE}::${GUIDE}`, profileStatus: 'active' },
      // Plantée par l'attaquant sous `userId: <sub du guide>` : le résolveur l'a
      // forcée à porter l'`owner` de l'ATTAQUANT.
      { owner: `${ATTAQUANT}::${ATTAQUANT}`, profileStatus: 'suspended' },
    ];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({ role: 'guide' });
  });

  it("une ligne 'active' plantée sous le userId d'un tiers ne qualifie pas non plus la victime", () => {
    // Le miroir : ne pas qualifier quelqu'un avec la ligne d'un autre.
    const lignes: LigneProfilGuide[] = [{ owner: `${ATTAQUANT}::${ATTAQUANT}`, profileStatus: 'active' }];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({
      role: null,
      refus: 'aucun-profil',
    });
  });

  // ------------------------------------------------------------------
  // ATTAQUE 2 — le suspendu qui se re-qualifie par un doublon actif.
  // ------------------------------------------------------------------
  it('un guide suspendu ne se re-qualifie pas en se créant un second profil actif', () => {
    const lignes: LigneProfilGuide[] = [
      // L'ordre est celui du pire cas : l'actif arrive EN PREMIER, donc un
      // `data?.[0]` ou un `find` s'y arrêterait et accorderait le rôle.
      { owner: `${GUIDE}::${GUIDE}`, profileStatus: 'active' },
      { owner: `${GUIDE}::${GUIDE}`, profileStatus: 'suspended' },
    ];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({
      role: null,
      refus: 'disqualifie',
    });
  });

  it('un rejeté ne se re-qualifie pas davantage, quel que soit le nombre de doublons actifs', () => {
    const lignes: LigneProfilGuide[] = [
      ...Array.from({ length: BORNE_LECTURE_PROFILS - 1 }, () => ({
        owner: `${GUIDE}::${GUIDE}`,
        profileStatus: 'active',
      })),
      { owner: `${GUIDE}::${GUIDE}`, profileStatus: 'rejected' },
    ];
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: false })).toEqual({
      role: null,
      refus: 'disqualifie',
    });
  });

  // ------------------------------------------------------------------
  // LA BORNE — une vue tronquée REFUSE, jamais un repli permissif.
  // ------------------------------------------------------------------
  it('une vue tronquée refuse, même quand toutes les lignes VUES sont actives et à soi', () => {
    expect(
      qualifieGuide({
        sub: GUIDE,
        lignes: [{ owner: `${GUIDE}::${GUIDE}`, profileStatus: 'active' }],
        tronquee: true,
      }),
    ).toEqual({ role: null, refus: 'vue-tronquee' });
  });

  it('une suspension VUE reste décisive même sur une vue tronquée', () => {
    expect(
      qualifieGuide({
        sub: GUIDE,
        lignes: [{ owner: `${GUIDE}::${GUIDE}`, profileStatus: 'suspended' }],
        tronquee: true,
      }),
    ).toEqual({ role: null, refus: 'disqualifie' });
  });

  it("noyer sa suspension hors de la page ne la contourne pas : la troncature refuse", () => {
    // L'attaque exacte contre laquelle la règle existe — se créer assez de
    // doublons actifs pour repousser la ligne suspendue hors de la page lue.
    const lignes: LigneProfilGuide[] = Array.from({ length: BORNE_LECTURE_PROFILS }, () => ({
      owner: `${GUIDE}::${GUIDE}`,
      profileStatus: 'active',
    }));
    expect(qualifieGuide({ sub: GUIDE, lignes, tronquee: true })).toEqual({
      role: null,
      refus: 'vue-tronquee',
    });
  });

  // ------------------------------------------------------------------
  // LE PIÈGE DORMANT — un `owner` absent du jeu de sélection.
  // ------------------------------------------------------------------
  it("des lignes sans `owner` ne qualifient PERSONNE (le piège du selectionSet explicite)", () => {
    // Si un `selectionSet` explicite retirait `owner`, la comparaison porterait
    // sur `undefined` : la règle refuserait tout le monde. On le constate ici
    // pour que le coût du piège soit écrit ; `appsync-client` en interdit la
    // cause par une épreuve dédiée.
    expect(
      qualifieGuide({
        sub: GUIDE,
        lignes: [{ profileStatus: 'active' }, { owner: null, profileStatus: 'active' }],
        tronquee: false,
      }),
    ).toEqual({ role: null, refus: 'aucun-profil' });
  });

  it("un `sub` vide ne qualifie rien, même face à un owner qui commence par '::'", () => {
    expect(
      qualifieGuide({ sub: '', lignes: [{ owner: '::x', profileStatus: 'active' }], tronquee: false }),
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
          lignes: [{ owner: `${GUIDE}::${GUIDE}`, profileStatus: 'suspended' }],
          tronquee: false,
        }),
        groupes: ['guide'],
      }),
    ).toBeNull();
  });

  it("une vue tronquée ne renverse PAS le groupe : elle n'a rien prouvé", () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({
          sub: GUIDE,
          lignes: [{ owner: `${GUIDE}::${GUIDE}`, profileStatus: 'active' }],
          tronquee: true,
        }),
        groupes: ['guide'],
      }),
    ).toBe('guide');
  });

  it("sans groupe ni profil à soi, aucun rôle", () => {
    expect(
      roleGuide({
        qualification: qualifieGuide({
          sub: GUIDE,
          lignes: [{ owner: `${ATTAQUANT}::${ATTAQUANT}`, profileStatus: 'active' }],
          tronquee: false,
        }),
        groupes: [],
      }),
    ).toBeNull();
  });
});

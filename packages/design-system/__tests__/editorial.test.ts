// Story 1.4 — Lexique éditorial : tests valeurs exactes + counts + snapshot.
// Source AC : _bmad-output/stories/1-4-editorial-lexicon.md (AC 7).

import { editorial, forbiddenTerms, voiceRules } from '../editorial';

describe('editorial.cta — CTA primaires (brief §7)', () => {
  it('cta.listen = "Écouter"', () => {
    expect(editorial.cta.listen).toBe('Écouter');
  });

  it('cta.getTour = "Obtenir le tour" (deprecated, conservé pour pivot futur)', () => {
    expect(editorial.cta.getTour).toBe('Obtenir le tour');
  });

  it('cta.becomeMember = "Devenir membre" (CTA premium V1.0)', () => {
    expect(editorial.cta.becomeMember).toBe('Devenir membre');
  });
});

describe('editorial.actions — actions secondaires (brief §7)', () => {
  it('actions.viewMap = "Voir sur la carte"', () => {
    expect(editorial.actions.viewMap).toBe('Voir sur la carte');
  });

  it("actions.download = \"Télécharger pour l'avion\"", () => {
    expect(editorial.actions.download).toBe("Télécharger pour l'avion");
  });

  it('actions.share = "Partager ce tour"', () => {
    expect(editorial.actions.share).toBe('Partager ce tour');
  });
});

describe('editorial.onboarding — Story 5.2a slides 1+2', () => {
  it('welcome.title = "Bienvenue sur Murmure"', () => {
    expect(editorial.onboarding.welcome.title).toBe('Bienvenue sur Murmure');
  });

  it('welcome.subtitle = "Le monde a une voix."', () => {
    expect(editorial.onboarding.welcome.subtitle).toBe('Le monde a une voix.');
  });

  it('offline.title = "Hors-ligne, partout" (lexique strict — pas "Offline")', () => {
    expect(editorial.onboarding.offline.title).toBe('Hors-ligne, partout');
  });

  it("offline.subtitle = \"Téléchargez avant d'oublier le réseau.\"", () => {
    expect(editorial.onboarding.offline.subtitle).toBe(
      "Téléchargez avant d'oublier le réseau.",
    );
  });
});

describe('forbiddenTerms — lexique interdit', () => {
  it('contient exactement 6 entrées', () => {
    expect(forbiddenTerms.length).toBe(6);
  });

  it('chaque entrée a un champ wrong et right non vides', () => {
    for (const term of forbiddenTerms) {
      expect(term.wrong).toBeTruthy();
      expect(term.wrong.length).toBeGreaterThan(0);
      expect(term.right).toBeTruthy();
      expect(term.right.length).toBeGreaterThan(0);
    }
  });

  it('inclut les 6 termes interdits attendus du brief §7', () => {
    const wrongs = forbiddenTerms.map((t) => t.wrong);
    expect(wrongs).toEqual(
      expect.arrayContaining(['parcours', 'circuit', 'POI', 'démarrer', 'lancer', 'offline']),
    );
  });

  it('mappe parcours → tour et circuit → tour', () => {
    const parcours = forbiddenTerms.find((t) => t.wrong === 'parcours');
    const circuit = forbiddenTerms.find((t) => t.wrong === 'circuit');
    expect(parcours?.right).toBe('tour');
    expect(circuit?.right).toBe('tour');
  });

  it('mappe POI → Étape', () => {
    const poi = forbiddenTerms.find((t) => t.wrong === 'POI');
    expect(poi?.right).toBe('Étape');
  });

  it('marque démarrer/lancer comme "CTA only"', () => {
    const demarrer = forbiddenTerms.find((t) => t.wrong === 'démarrer');
    const lancer = forbiddenTerms.find((t) => t.wrong === 'lancer');
    expect(demarrer?.right).toBe('Écouter');
    expect(demarrer?.context).toBe('CTA only');
    expect(lancer?.right).toBe('Écouter');
    expect(lancer?.context).toBe('CTA only');
  });

  it('mappe offline → Hors-ligne (FR text only)', () => {
    const offline = forbiddenTerms.find((t) => t.wrong === 'offline');
    expect(offline?.right).toBe('Hors-ligne');
    expect(offline?.context).toBe('FR text only');
  });
});

describe('voiceRules — règles de voix éditoriale', () => {
  it('contient exactement 4 règles (brief §7)', () => {
    expect(voiceRules.length).toBe(4);
  });

  it('chaque règle a id, label, description, example non vides', () => {
    for (const rule of voiceRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.label).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.example).toBeTruthy();
    }
  });
});

describe('editorial — snapshot global (anti-mutation accidentelle)', () => {
  it('matches snapshot', () => {
    expect(editorial).toMatchSnapshot();
  });
});

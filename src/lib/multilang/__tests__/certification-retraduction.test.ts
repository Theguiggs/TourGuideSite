/**
 * Story 5 — la règle de certification de la retraduction.
 *
 * Toute la story tient dans un script d'exploitation, et un script
 * d'exploitation n'est couvert par aucune suite : `jest.config.ts` borne ses
 * racines à `src/`. La règle a donc été sortie du script, en CommonJS, pour
 * être éprouvée ici — c'est elle qui décide si le catalogue est conforme, et
 * c'est la dernière pièce qu'on voudrait voir livrée sans épreuve.
 *
 * Ce fichier couvre les neuf lignes de la matrice.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

type Scene = { sceneId: string; text: string; title?: string };
type Segment = {
  transcriptText?: string;
  translatedTitle?: string | null;
  audioKey?: string | null;
  translationProvider?: string | null;
  status?: string | null;
  sourceTextHash?: string | null;
};
type StudioScene = {
  transcriptText?: string;
  title?: string | null;
  studioAudioKey?: string | null;
  archived?: boolean;
};

type Regles = {
  norm: (t: unknown) => string;
  pauses: (t: unknown) => string;
  estDuCatalogue: (tour: { title?: string }, env?: Record<string, string | undefined>) => boolean;
  controleVisite: (arg: {
    src: { scenes: Scene[] };
    out: Record<string, { title?: string; description?: string; scenes: Scene[] }>;
    langs: string[];
    segments: Map<string, Segment>;
    scenes: Map<string, StudioScene>;
    hashSourceText?: (texte?: string, titre?: string) => string;
  }) => { griefs: string[]; parLangue: Record<string, unknown>; controles: number; concordants: number };
  verdictGlobal: (
    rapport: Array<{ catalogue: boolean; griefs: string[] }>,
    options?: { controles?: number | null; catalogueNonCouvert?: string[] },
  ) => { conforme: boolean; motif: string | null; enDefaut: unknown[] };
};

const regles: Regles = require('../../../../scripts/certification-rules.cjs');
const { controleVisite, verdictGlobal, estDuCatalogue, pauses, norm } = regles;

const LANGS = ['en', 'de'];

/** Une Visite minimale mais réaliste : deux scènes, dont une avec une pause. */
const source = (): { scenes: Scene[] } => ({
  scenes: [
    { sceneId: 's1', title: 'Fontaine', text: 'Arrête-toi ici.\n\n<break time="4s"/>\n\nTu es au cœur.' },
    { sceneId: 's2', title: 'Porte', text: 'Avance sur le cours.' },
  ],
});

const traduction = () => ({
  en: {
    title: 'Squares and Gates',
    description: 'Urban history.',
    scenes: [
      { sceneId: 's1', title: 'Fountain', text: 'Stop here.\n\n<break time="4s"/>\n\nYou are at the heart.' },
      { sceneId: 's2', title: 'Gate', text: 'Walk along the cours.' },
    ],
  },
  de: {
    title: 'Plätze und Tore',
    description: 'Stadtgeschichte.',
    scenes: [
      { sceneId: 's1', title: 'Brunnen', text: 'Halt hier.\n\n<break time="4s"/>\n\nDu bist im Herzen.' },
      { sceneId: 's2', title: 'Tor', text: 'Geh den cours entlang.' },
    ],
  },
});

/**
 * L'empreinte de fraicheur vient du MODULE partage, jamais d'une copie locale :
 * une copie de plus est exactement ce qui a produit le defaut que ce controle
 * revele. La copie annoncee « EXACTE » de retrad-lib joignait texte et titre par
 * une espace ; l'application les concatene sans separateur.
 */
const { hashSourceText: hashDeTest }: { hashSourceText: (t?: string | null, ti?: string | null) => string } =
  require('../../../../scripts/source-hash.cjs');

/** Base saine, dérivée du corpus : le cas nominal dont chaque test s'écarte d'un cran. */
function baseSaine(out = traduction(), src = source()) {
  const segments = new Map<string, Segment>();
  for (const lang of LANGS) {
    for (const sc of out[lang as keyof typeof out]?.scenes ?? []) {
      segments.set(`${sc.sceneId}|${lang}`, {
        transcriptText: sc.text, translatedTitle: sc.title, audioKey: null,
      });
    }
  }
  const scenes = new Map<string, StudioScene>();
  for (const s of src.scenes) {
    scenes.set(s.sceneId, { transcriptText: s.text, studioAudioKey: `guide-studio/${s.sceneId}.wav` });
  }
  // Empreinte cohérente par défaut : chaque test qui veut éprouver la péremption
  // la casse explicitement, au lieu de la subir partout.
  for (const [cle, seg] of segments) {
    const sceneId = cle.split('|')[0];
    const sc = scenes.get(sceneId);
    seg.sourceTextHash = hashDeTest(sc?.transcriptText, sc?.title);
  }
  return { segments, scenes };
}

const controle = (o?: Partial<Parameters<Regles['controleVisite']>[0]>) => {
  const src = o?.src ?? source();
  const out = o?.out ?? traduction();
  const base = baseSaine(out as ReturnType<typeof traduction>, src);
  return controleVisite({
    src, out, langs: LANGS,
    segments: o?.segments ?? base.segments,
    scenes: o?.scenes ?? base.scenes,
    hashSourceText: o?.hashSourceText ?? hashDeTest,
  });
};

describe('matrice — catalogue conforme', () => {
  it('ne relève aucun grief et compte tous les segments', () => {
    const r = controle();
    expect(r.griefs).toEqual([]);
    expect(r.controles).toBe(4);
    expect(r.concordants).toBe(4);
    expect(r.parLangue).toEqual({
      en: { attendus: 2, presents: 2, concordants: 2 },
      de: { attendus: 2, presents: 2, concordants: 2 },
    });
  });

  it('rend un verdict conforme sur un rapport sans grief', () => {
    expect(verdictGlobal([{ catalogue: true, griefs: [] }])).toEqual({
      conforme: true, motif: null, enDefaut: [],
    });
  });
});

describe('matrice — texte divergent', () => {
  it('nomme la langue et la scène', () => {
    const base = baseSaine();
    base.segments.set('s2|de', { transcriptText: 'Un autre texte', audioKey: null });
    const r = controle({ segments: base.segments });
    expect(r.griefs).toContain('de/s2 : texte divergent du corpus relu');
    expect(r.concordants).toBe(3);
  });
});

describe('matrice — scène manquante', () => {
  it('rapporte le segment absent ET l écart de compte', () => {
    const base = baseSaine();
    base.segments.delete('s1|en');
    const r = controle({ segments: base.segments });
    expect(r.griefs).toContain('en/s1 : segment absent en base');
    expect(r.griefs).toContain('en : 1 segments en base pour 2 scènes');
  });

  it('rapporte un corpus qui traduit moins de scènes que la source', () => {
    const out = traduction();
    out.en.scenes = [out.en.scenes[0]];
    const r = controle({ out });
    expect(r.griefs).toContain('en : 1 scènes au corpus pour 2 à la source');
  });

  it('rapporte une scène traduite inconnue de la source', () => {
    const out = traduction();
    out.en.scenes.push({ sceneId: 's99', title: 'Fantôme', text: 'Inventé.' });
    const r = controle({ out });
    expect(r.griefs).toContain('en/s99 : scène inconnue de la source');
  });
});

describe('matrice — balisage de pause', () => {
  it('refuse une traduction qui a perdu la pause de la source', () => {
    const out = traduction();
    out.de.scenes[0].text = 'Halt hier. Du bist im Herzen.';
    const r = controle({ out });
    expect(r.griefs).toContain('de/s1 : balisage de pause divergent de la source');
  });

  it('refuse une pause dont la durée a changé', () => {
    const out = traduction();
    out.en.scenes[0].text = out.en.scenes[0].text.replace('4s', '2s');
    const r = controle({ out });
    expect(r.griefs).toContain('en/s1 : balisage de pause divergent de la source');
  });

  it("compare l'ensemble des pauses, quel que soit leur ordre d'apparition", () => {
    expect(pauses('a<break time="1s"/>b<break time="3s"/>')).toBe(
      pauses('x<break time="3s"/>y<break time="1s"/>'),
    );
    expect(pauses('<break time="1s"/>')).not.toBe(pauses('<break time="2s"/>'));
  });
});

describe('matrice — audio traduit résiduel', () => {
  it("rapporte l'invalidation incomplète, avec la clé fautive", () => {
    const base = baseSaine();
    const seg = base.segments.get('s1|en')!;
    seg.audioKey = 'guide-studio/vieux-marianmt.mp3';
    const r = controle({ segments: base.segments });
    expect(r.griefs).toContain('en/s1 : audio traduit résiduel (guide-studio/vieux-marianmt.mp3)');
  });
});

describe('matrice — marqueur d origine périmé', () => {
  it('refuse un segment de catalogue encore marqué marianmt', () => {
    const base = baseSaine();
    base.segments.get('s2|en')!.translationProvider = 'marianmt';
    const r = controle({ segments: base.segments });
    expect(r.griefs).toContain("en/s2 : marqueur d'origine « marianmt » résiduel");
  });
});

describe('matrice — français altéré', () => {
  it.each([
    ['texte source divergent', { transcriptText: 'Un autre texte français', studioAudioKey: 'k.wav' }, 'fr/s1 : texte source divergent'],
    ['audio absent', { transcriptText: source().scenes[0].text, studioAudioKey: null }, 'fr/s1 : audio français absent'],
    ['scène archivée', { transcriptText: source().scenes[0].text, studioAudioKey: 'k.wav', archived: true }, 'fr/s1 : scène archivée'],
  ])('rapporte : %s', (_cas, scene, attendu) => {
    const base = baseSaine();
    base.scenes.set('s1', scene as StudioScene);
    const r = controle({ scenes: base.scenes });
    expect(r.griefs).toContain(attendu);
  });

  it('rapporte une scène française absente de la base', () => {
    const base = baseSaine();
    base.scenes.delete('s2');
    const r = controle({ scenes: base.scenes });
    expect(r.griefs).toContain('fr/s2 : scène absente en base');
  });
});

describe('matrice — corpus absent ou vide', () => {
  it("un rapport vide n'est JAMAIS conforme : ne rien contrôler n'est pas ne rien trouver", () => {
    const v = verdictGlobal([]);
    expect(v.conforme).toBe(false);
    expect(v.motif).toBe('aucune Visite de catalogue contrôlée');
  });

  it("un rapport ne contenant que du hors-catalogue n'est pas conforme non plus", () => {
    expect(verdictGlobal([{ catalogue: false, griefs: [] }]).conforme).toBe(false);
  });

  it('une langue absente du corpus relu est un grief, pas un silence', () => {
    const out = traduction() as Record<string, unknown>;
    delete out.de;
    const r = controle({ out: out as Parameters<Regles['controleVisite']>[0]['out'] });
    expect(r.griefs).toContain('de : absent du corpus relu');
  });

  it('une source sans scène est un grief', () => {
    const r = controle({ src: { scenes: [] }, out: { en: { title: 'T', description: 'D', scenes: [] }, de: { title: 'T', description: 'D', scenes: [] } } });
    expect(r.griefs).toContain('fr : source sans aucune scène');
  });
});

describe('matrice — hors catalogue', () => {
  it('les fixtures de test ne pèsent pas sur le verdict', () => {
    const v = verdictGlobal([
      { catalogue: true, griefs: [] },
      { catalogue: false, griefs: ['en/s1 : texte divergent du corpus relu'] },
    ]);
    expect(v.conforme).toBe(true);
    expect(v.enDefaut).toEqual([]);
  });

  it.each([
    ['e2e-32703238144-4-full-ml Grasse', false],
    ['Persistence Test 1787562739577', false],
    ['Aix-en-Provence — Places et portes', true],
  ])('classe « %s » comme catalogue = %s', (titre, attendu) => {
    expect(estDuCatalogue({ title: titre }, {})).toBe(attendu);
  });

  it("l'échappatoire E2E_ALLOW_TEST_TOURS est respectée, comme dans le jumeau applicatif", () => {
    expect(estDuCatalogue({ title: 'e2e-xxx' }, { E2E_ALLOW_TEST_TOURS: 'true' })).toBe(true);
  });
});

describe('titre et description de Visite', () => {
  it.each([
    ['titre vide', { title: '   ' }, 'en : titre de Visite vide'],
    ['description vide', { description: '' }, 'en : description de Visite vide'],
  ])('rapporte : %s', (_cas, patch, attendu) => {
    const out = traduction();
    Object.assign(out.en, patch);
    const r = controle({ out });
    expect(r.griefs).toContain(attendu);
  });
});

describe('durcissements issus de la revue', () => {
  it('normalise les fins de ligne : un corpus en CRLF ne fait pas diverger le catalogue', () => {
    // `core.autocrlf` vaut true sur les postes Windows du projet. Sans cette
    // normalisation, une copie de travail fraiche declarerait les 3 810
    // segments divergents sur des donnees parfaitement saines.
    const CR = String.fromCharCode(13);
    const out = traduction();
    const base = baseSaine(out);
    out.en.scenes[0].text = out.en.scenes[0].text.split('\n').join(CR + '\n');
    const r = controleVisite({
      src: source(), out, langs: LANGS,
      segments: base.segments, scenes: base.scenes, hashSourceText: hashDeTest,
    });
    expect(r.griefs).toEqual([]);
  });

  it("refuse une scene restee en francais : un passe-plat n'est pas une traduction", () => {
    const src = source();
    const out = traduction();
    out.de.scenes[1].text = src.scenes[1].text;
    const base = baseSaine(out, src);
    const r = controleVisite({
      src, out, langs: LANGS, segments: base.segments, scenes: base.scenes,
      hashSourceText: hashDeTest,
    });
    expect(r.griefs).toContain('de/s2 : texte identique au fran\u00e7ais \u2014 sc\u00e8ne non traduite');
  });

  it('refuse une empreinte de source perimee', () => {
    const base = baseSaine();
    base.segments.get('s1|en')!.sourceTextHash = 'deadbeef';
    const r = controle({ segments: base.segments });
    expect(r.griefs.some((g) => g.startsWith('en/s1 : empreinte de source p\u00e9rim\u00e9e'))).toBe(true);
  });

  it('signale une empreinte absente plutot que de la supposer bonne', () => {
    const base = baseSaine();
    base.segments.get('s2|de')!.sourceTextHash = null;
    const r = controle({ segments: base.segments });
    expect(r.griefs.some((g) => g.startsWith('de/s2 : empreinte de source absente'))).toBe(true);
  });

  it('refuse un statut tts_generated DANS le perimetre, pas seulement hors de lui', () => {
    const base = baseSaine();
    base.segments.get('s1|de')!.status = 'tts_generated';
    const r = controle({ segments: base.segments });
    expect(r.griefs.some((g) => g.startsWith('de/s1 : statut'))).toBe(true);
  });

  it('refuse un titre de scene divergent du corpus', () => {
    const base = baseSaine();
    base.segments.get('s1|en')!.translatedTitle = 'Un autre titre';
    const r = controle({ segments: base.segments });
    expect(r.griefs).toContain('en/s1 : titre de sc\u00e8ne divergent du corpus relu');
  });

  it("releve TOUS les griefs d'un segment, pas seulement le premier", () => {
    // En s'arretant au premier, reparer puis recontroler devenait une boucle a
    // N passes.
    const base = baseSaine();
    const seg = base.segments.get('s1|en')!;
    seg.audioKey = 'vieux.mp3';
    seg.translationProvider = 'MarianMT';
    seg.status = 'tts_generated';
    const r = controle({ segments: base.segments });
    const pourS1 = r.griefs.filter((g) => g.startsWith('en/s1 :'));
    expect(pourS1.length).toBeGreaterThanOrEqual(3);
  });

  it('reconnait le marqueur marianmt quelle que soit sa casse', () => {
    const base = baseSaine();
    base.segments.get('s2|en')!.translationProvider = 'MarianMT';
    const r = controle({ segments: base.segments });
    expect(r.griefs.some((g) => g.includes('marianmt'))).toBe(true);
  });

  it('refuse un sceneId duplique a la source : une Map dedoublonne en silence', () => {
    const src = source();
    src.scenes.push({ ...src.scenes[0] });
    const r = controle({ src });
    expect(r.griefs.some((g) => g.includes('dupliqu'))).toBe(true);
  });

  it('refuse une scene en double dans le corpus traduit', () => {
    const out = traduction();
    out.en.scenes.push({ ...out.en.scenes[0] });
    const r = controle({ out });
    expect(r.griefs.some((g) => g.startsWith('en/s1 : sc\u00e8ne en double'))).toBe(true);
  });

  it('donne une entree parLangue meme pour une langue absente', () => {
    const out = traduction() as Record<string, unknown>;
    delete out.de;
    const r = controle({ out: out as Parameters<Regles['controleVisite']>[0]['out'] });
    expect(r.parLangue.de).toEqual({ attendus: 2, presents: 0, concordants: 0 });
  });
});

describe('verdict : les trois facons de mentir par construction', () => {
  it("refuse de conclure sans avoir compare le moindre segment", () => {
    const v = verdictGlobal([{ catalogue: true, griefs: [] }], { controles: 0 });
    expect(v.conforme).toBe(false);
    expect(v.motif).toContain('aucun segment');
  });

  it("refuse de conclure quand une Visite publiee n'a pas de corpus", () => {
    const v = verdictGlobal([{ catalogue: true, griefs: [] }], {
      controles: 10, catalogueNonCouvert: ['seed-100-nouvelle-visite'],
    });
    expect(v.conforme).toBe(false);
    expect(v.motif).toContain('seed-100-nouvelle-visite');
  });

  it('conclut conforme quand rien ne cloche', () => {
    expect(verdictGlobal([{ catalogue: true, griefs: [] }], { controles: 10 })).toEqual({
      conforme: true, motif: null, enDefaut: [],
    });
  });

  it("cumule les motifs au lieu de n'en garder qu'un", () => {
    const v = verdictGlobal([{ catalogue: true, griefs: ['x'] }], {
      controles: 5, catalogueNonCouvert: ['a'],
    });
    expect(v.motif).toContain('sans corpus');
    expect(v.motif).toContain('d\u00e9faut');
  });
});

describe("l'empreinte de fraicheur est epinglee a celle de l'application", () => {
  // C'est l'epreuve qui manquait. Une copie annoncee « EXACTE » a diverge d'une
  // seule espace, et les 101 Visites se sont affichees perimees dans le Studio.
  const ENTREES: Array<[string | null, string | null]> = [
    ['Arrete-toi ici.', 'Fontaine'],
    ['', ''],
    [null, null],
    ['texte sans titre', null],
    [null, 'titre sans texte'],
    ['accents : eacute, ccedil, ugrave', 'Place du Capitole'],
    ['a'.repeat(5000), 'long'],
  ];

  it("rend exactement la meme valeur que hashSourceText de src/types/studio.ts", async () => {
    const { hashSourceText: hashApp } = await import('@/types/studio');
    for (const [texte, titre] of ENTREES) {
      expect([texte, titre, hashDeTest(texte, titre)]).toEqual([
        texte, titre, hashApp(texte, titre),
      ]);
    }
  });

  it("joint texte et titre par un caractere NUL, pas par rien ni par une espace", () => {
    const { SEPARATEUR } = require('../../../../scripts/source-hash.cjs');
    // Le piege exact : le separateur de src/types/studio.ts est un octet nul
    // LITTERAL, invisible a la relecture. Deux copies « exactes » ont diverge
    // dessus — l'une joignait par une espace, l'autre par rien. Ce test fige le
    // separateur ET le fait qu'il separe reellement.
    expect(SEPARATEUR).toBe(String.fromCharCode(0));
    expect(hashDeTest('ab', 'c')).not.toBe(hashDeTest('abc', ''));
    expect(hashDeTest('ab', 'c')).not.toBe(hashDeTest('ab c', ''));
    expect(hashDeTest('a', 'bc')).not.toBe(hashDeTest('ab', 'c'));
  });
});

describe('le jumeau de isPublicCatalogueTour ne doit pas deriver', () => {
  // Le test est en TypeScript : il peut donc importer la VRAIE politique et la
  // confronter a la copie du script sur la meme table de titres. Sans cela, la
  // derive du jour ou la politique evoluera passerait inapercue.
  const TITRES = [
    'e2e-32703238144-4-full-ml Grasse',
    'E2E-MAJUSCULES',
    'Persistence Test 1787562739577',
    'persistence test minuscules',
    'Aix-en-Provence \u2014 Places et portes',
    '  e2e-avec-espaces-devant',
    '',
    'Grasse \u2014 Les Routes du Parfum',
  ];

  it('rend le meme verdict que la politique applicative sur chaque titre', async () => {
    const { isPublicCatalogueTour } = await import('@/lib/api/public-tour-policy');
    const avant = process.env.E2E_ALLOW_TEST_TOURS;
    delete process.env.E2E_ALLOW_TEST_TOURS;
    try {
      for (const title of TITRES) {
        expect([title, estDuCatalogue({ title }, process.env)]).toEqual([
          title, isPublicCatalogueTour({ title }),
        ]);
      }
    } finally {
      if (avant === undefined) delete process.env.E2E_ALLOW_TEST_TOURS;
      else process.env.E2E_ALLOW_TEST_TOURS = avant;
    }
  });

  it("lit process.env par defaut : la branche reellement empruntee en production", () => {
    const avant = process.env.E2E_ALLOW_TEST_TOURS;
    process.env.E2E_ALLOW_TEST_TOURS = 'true';
    try {
      expect(estDuCatalogue({ title: 'e2e-xxx' })).toBe(true);
    } finally {
      if (avant === undefined) delete process.env.E2E_ALLOW_TEST_TOURS;
      else process.env.E2E_ALLOW_TEST_TOURS = avant;
    }
  });
});

describe('norm : tolerance aux entrees', () => {
  it.each([
    [42, ''],
    [null, ''],
    [undefined, ''],
    [{}, ''],
    ['  bord  ', 'bord'],
  ])('rend une chaine sur %s sans lever', (entree, attendu) => {
    expect(norm(entree)).toBe(attendu);
  });
});

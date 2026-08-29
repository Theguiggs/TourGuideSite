/**
 * Story 4 — le portage entre les deux dépôts ne dérive pas, et les refus du
 * pipeline sont éprouvés PAR UNE SUITE QUI S'EXÉCUTE.
 *
 * Le pipeline de traduction par modèle de langue vit dans
 * `TourGuideApp/amplify/functions/translate-claude*`. Trois choses n'y sont
 * vérifiables que d'ici :
 *
 *   1. `CONSIGNES.md` y est PORTÉ mot pour mot — la source est dans ce dépôt ;
 *   2. `pauses()` et `norm()` y sont portés depuis `certification-rules.cjs` —
 *      portage ratifié par l'humain le 2026-08-28, À CONDITION qu'une épreuve
 *      de dérive tourne dans un travail de CI qui récupère RÉELLEMENT les deux
 *      dépôts. C'est ici, et nulle part ailleurs ;
 *   3. les arguments de la mutation, que le portail envoie derrière un
 *      `(client as any)` — donc sans le moindre typage.
 *
 * Pourquoi un portage et pas un import : `TourGuideApp` et `TourGuideSite` sont
 * deux dépôts GitHub distincts. La CI de l'application (`pr-validation.yml`) et
 * `ampx pipeline-deploy` n'extraient QUE le dépôt de l'application — un import
 * relatif vers ce portail casserait l'empaquetage esbuild de la Lambda et sa
 * suite Jest.
 *
 * Le travail `unit-tests` de `.github/workflows/web-ci.yml`, lui, extrait LES
 * DEUX dépôts côte à côte (deux `actions/checkout`, paths `TourGuideWeb` et
 * `TourGuideApp`) — la condition posée par l'humain est donc satisfaite, et
 * l'épreuve ci-dessous le VÉRIFIE plutôt que de l'affirmer.
 *
 * Les modules importés depuis le dépôt voisin sont tous SANS entrées/sorties
 * (`verification.ts`, `prompt.ts`, `contrat.ts`, `consignes.ts`, `job-id.ts`) :
 * aucun client AWS, aucun SDK, rien à installer.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import fs from 'node:fs';
import path from 'node:path';

import { buildTranslationMutationArgs } from '@/lib/api/translation';

const RACINE_WEB = path.resolve(__dirname, '..', '..', '..', '..');
const RACINE_APP = path.resolve(RACINE_WEB, '..', 'TourGuideApp');
const DIR_LAMBDA = path.join(RACINE_APP, 'amplify', 'functions', 'translate-claude');
const DIR_API = path.join(RACINE_APP, 'amplify', 'functions', 'translate-claude-api');

const CHEMIN_CONSIGNES = path.join(RACINE_WEB, 'content', 'translations', 'CONSIGNES.md');
const CHEMIN_REGLES = path.join(RACINE_WEB, 'scripts', 'certification-rules.cjs');
const CHEMIN_VERIFICATION = path.join(DIR_LAMBDA, 'verification.ts');
const CHEMIN_SCHEMA = path.join(RACINE_APP, 'amplify', 'data', 'resource.ts');

const norm = (t: string): string => t.replace(/\r\n?/g, '\n');

/**
 * L'absence du dépôt voisin est une PANNE d'épreuve, pas un succès : un
 * contrôle qui se tait quand il ne peut rien lire ne contrôle rien.
 */
function litOuEchoue(chemin: string): string {
  if (!fs.existsSync(chemin)) {
    throw new Error(
      `Fichier introuvable : ${chemin}\n` +
        "Cette épreuve confronte le portage de la Lambda à son original. Elle exige " +
        'que TourGuideApp et TourGuideWeb soient côte à côte — ce que fait le travail ' +
        '`unit-tests` de web-ci.yml. Sans les deux, elle ne peut RIEN affirmer, ' +
        'et elle échoue plutôt que de se taire.',
    );
  }
  return norm(fs.readFileSync(chemin, 'utf8'));
}

// --- La condition posée par l'humain -----------------------------------------

describe('La CI qui porte cette épreuve voit bien les deux dépôts', () => {
  it('web-ci.yml extrait TourGuideApp à côté de TourGuideWeb', () => {
    // Le portage n'est recevable QU'À CETTE CONDITION. Si quelqu'un retire ce
    // second `checkout`, l'épreuve de dérive cesse de tourner en intégration —
    // et c'est cette ligne-ci qui doit le dire.
    const ci = litOuEchoue(path.join(RACINE_WEB, '.github', 'workflows', 'web-ci.yml'));
    const travailTests = ci.slice(ci.indexOf('unit-tests:'), ci.indexOf('microservice-tests:'));
    expect(travailTests).toContain('repository: Theguiggs/TourGuideApp');
    expect(travailTests).toContain('path: TourGuideApp');
    expect(travailTests).toContain('path: TourGuideWeb');
    expect(travailTests).toContain('npm test');
  });
});

// --- CONSIGNES.md -------------------------------------------------------------

describe('CONSIGNES.md porté dans la Lambda', () => {
  it('est identique au fichier source, octet pour octet', () => {
    const original = litOuEchoue(CHEMIN_CONSIGNES);
    const { CONSIGNES_MD } = require(path.join(DIR_LAMBDA, 'consignes.ts')) as {
      CONSIGNES_MD: string;
    };

    if (norm(CONSIGNES_MD) !== original) {
      throw new Error(
        'consignes.ts a dérivé de content/translations/CONSIGNES.md.\n' +
          'Régénérer depuis la racine de l’espace de travail :\n' +
          "  node -e \"const fs=require('fs');" +
          "const s=fs.readFileSync('TourGuideWeb/content/translations/CONSIGNES.md','utf8').replace(/\\r\\n?/g,'\\n');" +
          "const p='TourGuideApp/amplify/functions/translate-claude/consignes.ts';" +
          "const t=fs.readFileSync(p,'utf8');" +
          "fs.writeFileSync(p,t.replace(/export const CONSIGNES_MD: string =[\\s\\S]*$/," +
          "'export const CONSIGNES_MD: string =\\n  '+JSON.stringify(s)+';\\n'))\"",
      );
    }
    expect(norm(CONSIGNES_MD)).toBe(original);
  });

  it('se déclare applicable à ce pipeline — c’est ce qui l’autorise', () => {
    expect(litOuEchoue(CHEMIN_CONSIGNES)).toContain('pipeline de traduction automatique');
  });

  it('couvre les cinq langues cibles que la Lambda accepte', () => {
    const original = litOuEchoue(CHEMIN_CONSIGNES);
    const { LLM_TARGET_LANGUAGES } = require('../provider-router') as {
      LLM_TARGET_LANGUAGES: readonly string[];
    };
    const { LANGUES_CIBLES } = require(path.join(DIR_LAMBDA, 'contrat.ts')) as {
      LANGUES_CIBLES: readonly string[];
    };
    const bloc = original.split('## Langues')[1]?.split('##')[0] ?? '';
    for (const langue of LLM_TARGET_LANGUAGES) {
      expect(bloc).toContain(`\`${langue}\``);
    }
    expect(bloc).toContain('Aucune langue pivot');
    // Les deux dépôts nomment le MÊME périmètre.
    expect([...LANGUES_CIBLES]).toEqual([...LLM_TARGET_LANGUAGES]);
  });

  it('n’est pas paraphrasé : le fichier porté ne contient QUE la copie', () => {
    const source = litOuEchoue(path.join(DIR_LAMBDA, 'consignes.ts'));
    const exports = source.match(/^export /gm) ?? [];
    expect(exports).toHaveLength(1);
  });
});

// --- pauses() et norm() -------------------------------------------------------

describe('pauses() et norm() portés dans la Lambda', () => {
  const regles = require(CHEMIN_REGLES) as {
    pauses: (t: unknown) => string;
    norm: (t: unknown) => string;
  };
  const porte = require(CHEMIN_VERIFICATION) as {
    pauses: (t: unknown) => string;
    norm: (t: unknown) => string;
  };

  /** Les cas où une regex de balisage approximative diverge de la règle. */
  const echantillons: unknown[] = [
    '',
    '   ',
    'Aucune pause ici.',
    '<break time="3s"/>',
    'Avant <break time="3s"/> après',
    'Deux <break time="2s"/> puis <break time="3s"/> fin',
    // Ordre inversé : `pauses()` TRIE, donc les deux textes se valent pour ELLE.
    'Deux <break time="3s"/> puis <break time="2s"/> fin',
    '<break/>',
    '<break >',
    '<break time="1.5s" strength="strong"/>',
    // Un élément dont le nom COMMENCE par « break » n'en est pas un.
    '<breakpoint/>',
    'texte\r\nsur\r\ndeux lignes',
    '  bords à élaguer  ',
    null,
    undefined,
    42,
    {},
  ];

  it.each(echantillons.map((e, i) => [i, e]))(
    'pauses() rend la même chose que certification-rules.cjs (cas %i)',
    (_i, echantillon) => {
      expect(porte.pauses(echantillon)).toBe(regles.pauses(echantillon));
    },
  );

  it.each(echantillons.map((e, i) => [i, e]))(
    'norm() rend la même chose que certification-rules.cjs (cas %i)',
    (_i, echantillon) => {
      expect(porte.norm(echantillon)).toBe(regles.norm(echantillon));
    },
  );

  it('porte LITTÉRALEMENT la même expression régulière', () => {
    const extrait = (source: string): string | undefined =>
      source.match(/match\((\/<break[^)]*?\/g)\)/)?.[1];

    const attendu = extrait(litOuEchoue(CHEMIN_REGLES));
    const obtenu = extrait(litOuEchoue(CHEMIN_VERIFICATION));

    expect(attendu).toBeDefined();
    expect(obtenu).toBe(attendu);
  });
});

// --- Les refus, exercés ICI parce qu'ils s'exécutent ICI ----------------------

describe('verifierTraduction — les refus, éprouvés dans une suite qui tourne en CI', () => {
  const {
    verifierTraduction,
    riensATraduire,
    BORNES_RAPPORT,
  } = require(CHEMIN_VERIFICATION) as {
    verifierTraduction: (e: {
      source: string;
      traduction: string;
      stopReason?: string | null;
      kind?: 'scene' | 'title';
    }) => { ok: boolean; motif?: string; detail?: string; texte?: string };
    riensATraduire: (s: string) => boolean;
    BORNES_RAPPORT: { scene: { min: number; max: number }; title: { min: number; max: number } };
  };

  const SOURCE = [
    'Arrête-toi sur la place Sainte-Cécile et lève les yeux vers la façade de brique rouge.',
    '',
    '<break time="3s"/>',
    '',
    'Devant toi se dresse la cathédrale, la plus grande cathédrale de brique du monde entier.',
    '',
    '<break time="2s"/>',
    '',
    'Regarde-la vraiment : elle ne ressemble à aucune autre église de ce pays.',
  ].join('\n');

  const TRADUITE = [
    'Halt auf der place Sainte-Cécile an und heb den Blick zur roten Backsteinfassade.',
    '',
    '<break time="3s"/>',
    '',
    'Vor dir erhebt sich die Kathedrale, die größte Backsteinkathedrale der ganzen Welt.',
    '',
    '<break time="2s"/>',
    '',
    'Sieh sie dir wirklich an: Sie gleicht keiner anderen Kirche dieses Landes.',
  ].join('\n');

  const verifie = (traduction: string, stopReason: string | null = 'end_turn') =>
    verifierTraduction({ source: SOURCE, traduction, stopReason });

  it('accepte une traduction conforme', () => {
    expect(verifie(TRADUITE).ok).toBe(true);
  });

  it('REFUSE une sortie tronquée (max_tokens)', () => {
    const r = verifie(TRADUITE, 'max_tokens');
    expect(r.ok).toBe(false);
    expect(r.motif).toBe('tronquee');
  });

  it('REFUSE un tour interrompu — un refus du modèle n’est pas une traduction', () => {
    expect(verifie(TRADUITE, 'refusal').motif).toBe('tour_interrompu');
    expect(verifie(TRADUITE, null).motif).toBe('tour_interrompu');
  });

  it('REFUSE le passe-plat — le français rendu tel quel', () => {
    const r = verifie(SOURCE);
    expect(r.ok).toBe(false);
    expect(r.motif).toBe('passe_plat');
  });

  it('REFUSE un balisage divergent, en portant les deux comptes', () => {
    const r = verifie(TRADUITE.replace('<break time="2s"/>\n\n', ''));
    expect(r.motif).toBe('balisage_divergent');
    expect(r.detail).toContain('attendu 2');
    expect(r.detail).toContain('obtenu 1');
  });

  it('REFUSE une balise DÉPLACÉE — le multiensemble ne suffit pas', () => {
    const permute = TRADUITE.replace('<break time="3s"/>', '<<A>>')
      .replace('<break time="2s"/>', '<break time="3s"/>')
      .replace('<<A>>', '<break time="2s"/>');
    expect(verifie(permute).motif).toBe('balisage_deplace');
  });

  it('REFUSE une parité de paragraphes rompue', () => {
    expect(verifie(TRADUITE.replace(/\n\n/g, '\n')).motif).toBe('paragraphes_divergents');
  });

  it('REFUSE une longueur aberrante — refus poli ou résumé', () => {
    const court = 'Nein.\n\n<break time="3s"/>\n\nNein.\n\n<break time="2s"/>\n\nNein.';
    expect(verifie(court).motif).toBe('longueur_aberrante');
  });

  it('REFUSE une sortie vide', () => {
    expect(verifie('   ').motif).toBe('vide');
  });

  it('laisse un titre garder son toponyme français', () => {
    const r = verifierTraduction({
      source: 'Place Sainte-Cécile',
      traduction: 'Place Sainte-Cécile',
      stopReason: 'end_turn',
      kind: 'title',
    });
    expect(r.ok).toBe(true);
  });

  it('reconnaît une Scène sans rien à traduire hors balisage', () => {
    expect(riensATraduire('<break time="3s"/>\n\n<break time="2s"/>')).toBe(true);
    expect(riensATraduire(SOURCE)).toBe(false);
  });

  it('accepte les 3 810 segments du corpus doré — les bornes ne rejettent pas du bon', () => {
    // Les bornes de longueur sont MESURÉES sur ce corpus. L'épreuve le
    // reconfronte : une borne resserrée par mégarde rejetterait du certifié.
    const SRC = path.join(RACINE_WEB, 'content', 'translations', 'source');
    const OUT = path.join(RACINE_WEB, 'content', 'translations', 'out');
    const fichiers = fs.readdirSync(OUT).filter((f) => f.endsWith('.json'));
    expect(fichiers.length).toBeGreaterThan(50);

    let controles = 0;
    const griefs: string[] = [];
    for (const fichier of fichiers) {
      const cheminSrc = path.join(SRC, fichier);
      if (!fs.existsSync(cheminSrc)) continue;
      const src = JSON.parse(fs.readFileSync(cheminSrc, 'utf8'));
      const out = JSON.parse(fs.readFileSync(path.join(OUT, fichier), 'utf8'));
      const parId = new Map<string, { text: string }>(
        (src.scenes ?? []).map((s: { sceneId: string; text: string }) => [s.sceneId, s]),
      );
      for (const lang of Object.keys(out)) {
        if (lang === 'tourId') continue;
        for (const sc of out[lang].scenes ?? []) {
          const source = parId.get(sc.sceneId);
          if (!source) continue;
          controles++;
          const r = verifierTraduction({
            source: source.text,
            traduction: sc.text,
            stopReason: 'end_turn',
          });
          if (!r.ok) griefs.push(`${fichier} ${lang}/${sc.sceneId} : ${r.motif}`);
        }
      }
    }
    expect(controles).toBeGreaterThan(3000);
    expect(griefs.slice(0, 10)).toEqual([]);
    expect(BORNES_RAPPORT.scene.min).toBeLessThan(0.877);
    expect(BORNES_RAPPORT.scene.max).toBeGreaterThan(1.17);
  });
});

// --- Le contrat entre les deux dépôts ---------------------------------------

describe('Les arguments de la mutation', () => {
  /** Les noms d'arguments déclarés dans le schéma AppSync. */
  function argumentsDuSchema(champ: string): string[] {
    const schema = litOuEchoue(CHEMIN_SCHEMA);
    const debut = schema.indexOf(`${champ}: a`);
    expect(debut).toBeGreaterThan(-1);
    const bloc = schema.slice(debut, schema.indexOf('.returns(', debut));
    const args = bloc.slice(bloc.indexOf('.arguments({'));
    // Le bloc s'écrit tantôt sur plusieurs lignes, tantôt d'un trait : on lit
    // les déclarations, pas la mise en page.
    return [
      ...args.matchAll(/(\w+):\s*a\.(?:string|integer|float|boolean|id|enum|json)\(/g),
    ]
      .map((m) => m[1])
      .sort();
  }

  it('sont EXACTEMENT ceux que le portail envoie', () => {
    // L'appel passe par `(client as any)` derrière un `eslint-disable` : tout
    // typage y est jeté. Renommer `sceneTitle` en `sceneName` dans le schéma
    // laissait les trois suites vertes et le champ arrivait `undefined`.
    const envoyes = Object.keys(
      buildTranslationMutationArgs({
        segmentId: 's',
        text: 't',
        sourceLang: 'fr',
        targetLang: 'de',
        provider: 'claude',
        sceneId: 'sc',
        kind: 'scene',
        context: { tourTitle: 'a', city: 'b', sceneTitle: 'c', sceneIndex: 1, sceneCount: 2 },
      }),
    ).sort();

    expect(envoyes).toEqual(argumentsDuSchema('requestTranslation'));
  });

  it('la moitié « query » du transport existe et prend un jobId', () => {
    expect(argumentsDuSchema('checkTranslation')).toEqual(['jobId']);
  });
});

// --- L'identité du moteur et le transport ------------------------------------

describe('Le moteur porte son propre nom des deux côtés', () => {
  it('la Lambda et le portail nomment le même moteur', () => {
    const { LLM_PROVIDER } = require('../provider-router') as { LLM_PROVIDER: string };
    const { MOTEUR } = require(path.join(DIR_LAMBDA, 'contrat.ts')) as { MOTEUR: string };
    expect(MOTEUR).toBe(LLM_PROVIDER);
    expect(LLM_PROVIDER).not.toBe('openai');
    expect(LLM_PROVIDER).not.toBe('marianmt');
  });

  it('la valeur est ouverte dans l’énumération du schéma', () => {
    const schema = litOuEchoue(CHEMIN_SCHEMA);
    const { LLM_PROVIDER } = require('../provider-router') as { LLM_PROVIDER: string };
    const ligne = schema.split('\n').find((l) => l.includes('translationProvider: a.enum('));
    expect(ligne).toBeDefined();
    expect(ligne).toContain(`'${LLM_PROVIDER}'`);
  });

  it('les deux dépôts convertissent les caractères en jetons de la MÊME façon', () => {
    const { CARACTERES_PAR_JETON } = require('../provider-router') as {
      CARACTERES_PAR_JETON: number;
    };
    const contrat = require(path.join(DIR_LAMBDA, 'contrat.ts')) as {
      CARACTERES_PAR_JETON: number;
    };
    expect(contrat.CARACTERES_PAR_JETON).toBe(CARACTERES_PAR_JETON);
  });

  it('le transport est ASYNCHRONE des deux côtés', () => {
    const schema = litOuEchoue(CHEMIN_SCHEMA);
    // La mutation et la query pointent le résolveur bref ; l'ouvrier, lui,
    // n'est branché sur AUCUN champ AppSync — c'est ce qui l'affranchit de la
    // coupure à 30 s.
    expect(schema).toContain('a.handler.function(translateClaudeApi)');
    expect(schema).not.toContain('a.handler.function(translateClaude)');

    const backend = litOuEchoue(path.join(RACINE_APP, 'amplify', 'backend.ts'));
    expect(backend).toContain('translateClaude,');
    expect(backend).toContain('translateClaudeApi,');
    // Le réveil se fait en mode événement, et l'ouvrier a le droit d'être appelé.
    expect(backend).toContain('grantInvoke(translateApiLambda)');
    // Et la marge SSM n'est plus un défaut silencieux.
    expect(backend).toContain("'ssm:GetParameter'");

    const api = litOuEchoue(path.join(DIR_API, 'handler.ts'));
    expect(api).toContain("InvocationType: 'Event'");
  });

  it('le contrat rendu couvre les champs que le portail lit', () => {
    const schema = litOuEchoue(CHEMIN_SCHEMA);
    const bloc = schema.split('TranslationResult: a.customType(')[1]?.slice(0, 900) ?? '';
    for (const champ of [
      'jobId',
      'status',
      'translatedText',
      'provider',
      'costProvider',
      'costCharged',
      'errorCode',
    ]) {
      expect(bloc).toContain(champ);
    }
  });
});


// --- Le transport asynchrone, épinglé des deux côtés --------------------------

describe('Le transport asynchrone', () => {
  it('ne rejoue PAS l’invasion asynchrone, et observe ses orphelins', () => {
    const backend = litOuEchoue(path.join(RACINE_APP, 'amplify', 'backend.ts'));
    // Une invocation asynchrone Lambda est rejouée DEUX FOIS par défaut.
    // L'ouvrier appelle un fournisseur payant : une redélivrance après un appel
    // réussi mais une conclusion manquée refacturait la Scène.
    expect(backend).toContain('retryAttempts: 0');
    expect(backend).toContain('maxEventAge');
    // Sans destination d'échec, un job orphelin n'était observable que par un
    // client qui sonde jusqu'à renoncer.
    expect(backend).toContain('onFailure: new SqsDestination(');
    // Un lot ouvre autant de Fabrications qu'il a de Scènes × langues.
    expect(backend).toContain('reservedConcurrentExecutions');
  });

  it('borne la dépense en volume, pas seulement par requête', () => {
    const contrat = require(path.join(DIR_LAMBDA, 'contrat.ts')) as {
      QUOTA_HORAIRE_PAR_COMPTE: number;
      TENTATIVES_PAYEES_MAX: number;
      MAX_CARACTERES: number;
    };
    expect(contrat.QUOTA_HORAIRE_PAR_COMPTE).toBeGreaterThan(0);
    expect(contrat.TENTATIVES_PAYEES_MAX).toBeGreaterThan(0);
    expect(contrat.MAX_CARACTERES).toBeGreaterThan(7308);

    const api = litOuEchoue(path.join(DIR_API, 'handler.ts'));
    expect(api).toContain('reserverQuota(sub)');
  });

  it('réclame la ligne AVANT de dépenser — la garde anti-redélivrance', () => {
    const ouvrier = litOuEchoue(path.join(DIR_LAMBDA, 'handler.ts'));
    const iReclamation = ouvrier.indexOf('reclamerLigne(');
    const iAppel = ouvrier.indexOf('traduireScene({');
    expect(iReclamation).toBeGreaterThan(-1);
    expect(iReclamation).toBeLessThan(ouvrier.lastIndexOf('await traduireScene({'));
    expect(iAppel).toBeGreaterThan(-1);

    const magasin = litOuEchoue(path.join(DIR_LAMBDA, 'job-store.ts'));
    // Seul le porteur du jeton conclut : un ouvrier tardif n'écrase pas une
    // ligne déjà reprise.
    expect(magasin).toContain('#claimToken = :token');
    expect(magasin).toContain('#s = :processing OR (#s = :running AND #c < :perime)');
  });

  it('le budget de sondage du portail suit celui de l’ouvrier', () => {
    // 60 s de sondage contre 300 s d'ouvrier : une seule reprise sur 429
    // suffisait à annoncer « fournisseur indisponible » au guide pendant que la
    // facture courait.
    const {BUDGET_OUVRIER_MS} = require('../provider-router') as {BUDGET_OUVRIER_MS: number};
    const contrat = require(path.join(DIR_LAMBDA, 'contrat.ts')) as {
      BUDGET_OUVRIER_MS: number;
    };
    expect(contrat.BUDGET_OUVRIER_MS).toBe(BUDGET_OUVRIER_MS);

    const resource = litOuEchoue(path.join(DIR_LAMBDA, 'resource.ts'));
    const secondes = Number(resource.match(/timeoutSeconds:\s*(\d+)/)?.[1]);
    expect(secondes * 1000).toBe(contrat.BUDGET_OUVRIER_MS);

    const batch = litOuEchoue(path.join(RACINE_WEB, 'src', 'lib', 'multilang', 'batch-translation-service.ts'));
    expect(batch).toContain('BUDGET_OUVRIER_MS');
  });

  it('le nom du paramètre SSM n’a qu’une seule définition', () => {
    const contrat = require(path.join(DIR_LAMBDA, 'contrat.ts')) as {MARGE_SSM_PARAM: string};
    const backend = litOuEchoue(path.join(RACINE_APP, 'amplify', 'backend.ts'));
    const ouvrier = litOuEchoue(path.join(DIR_LAMBDA, 'handler.ts'));
    // Une seule chaîne littérale, dans `contrat.ts` — les deux autres copies
    // l'importent. Un caractère de dérive facturait tout le monde au
    // multiplicateur par défaut.
    expect(backend).toContain('MARGE_SSM_PARAM');
    expect(backend).not.toContain(`'${contrat.MARGE_SSM_PARAM}'`);
    expect(ouvrier).toContain('MARGE_SSM_PARAM');
    expect(ouvrier).not.toContain(`'${contrat.MARGE_SSM_PARAM}'`);
  });
});


// --- Les nombres qui se tiennent, ou qui ne tiennent rien ---------------------

describe('Le couple de constantes de concurrence', () => {
  const contrat = () =>
    require(path.join(DIR_LAMBDA, 'contrat.ts')) as {
      BUDGET_OUVRIER_MS: number;
      BAIL_RECLAMATION_MS: number;
      TOLERANCE_HORLOGE_MS: number;
      AGE_MAX_EVENEMENT_MS: number;
      BUDGET_APPELS_MS: number;
    };

  it('le budget de l’ouvrier EST le timeout de sa fonction', () => {
    // Toutes les assertions de péremption sont écrites RELATIVEMENT à cette
    // constante : posée à 30 000 par mégarde, elles restaient toutes vertes et
    // chaque réclamation périmait PENDANT l'appel fournisseur — double
    // facturation systématique, pas accidentelle. Rien ne liait les deux
    // nombres. C'est fait ici.
    const resource = litOuEchoue(path.join(DIR_LAMBDA, 'resource.ts'));
    const secondes = Number(resource.match(/timeoutSeconds:\s*(\d+)/)?.[1]);
    expect(Number.isFinite(secondes)).toBe(true);
    expect(secondes * 1000).toBe(contrat().BUDGET_OUVRIER_MS);
  });

  it('le BAIL dépasse franchement le budget — pas de quelques millisecondes', () => {
    // L'ancienne version faisait périmer le bail exactement au budget : la
    // marge réelle valait la distance entre le démarrage de la fonction et
    // l'écriture de `claimedAt`, comparée entre DEUX horloges Lambda. Une
    // dérive NTP l'inversait, et deux ouvriers appelaient le fournisseur.
    const c = contrat();
    expect(c.BAIL_RECLAMATION_MS).toBe(c.BUDGET_OUVRIER_MS + c.TOLERANCE_HORLOGE_MS);
    expect(c.TOLERANCE_HORLOGE_MS).toBeGreaterThanOrEqual(60_000);
  });

  it('l’âge maximal d’un événement reste SOUS le budget de l’ouvrier', () => {
    // La valeur valait 6 min pour un budget de 5 min, juste sous un commentaire
    // qui affirmait le contraire : une minute pendant laquelle un événement
    // retenu par l'étranglement pouvait s'exécuter après une reprise.
    const c = contrat();
    expect(c.AGE_MAX_EVENEMENT_MS).toBeLessThan(c.BUDGET_OUVRIER_MS);
  });

  it('backend.ts emploie la constante, pas un nombre à lui', () => {
    const backend = litOuEchoue(path.join(RACINE_APP, 'amplify', 'backend.ts'));
    expect(backend).toContain('Duration.millis(AGE_MAX_EVENEMENT_MS)');
    expect(backend).not.toContain('Duration.minutes(6)');
  });

  it('le budget d’appels laisse à l’ouvrier de quoi conclure', () => {
    // Une reprise ne doit jamais faire mourir l'ouvrier sur son propre délai :
    // il laisserait une ligne réclamée et une dépense non consignée.
    const c = contrat();
    expect(c.BUDGET_APPELS_MS).toBeLessThan(c.BUDGET_OUVRIER_MS);
    expect(c.BUDGET_OUVRIER_MS - c.BUDGET_APPELS_MS).toBeGreaterThanOrEqual(30_000);
  });

  it('un appel avorté sur DÉLAI n’est jamais rejoué', () => {
    // Le SDK lève `APIConnectionTimeoutError` quand son propre `timeout` coupe
    // la requête : elle est partie, le fournisseur l'a générée, elle est
    // facturée. La rejouer jusqu'à trois fois payait la Scène plusieurs fois —
    // et c'est la Scène la plus longue du catalogue qui avorte le plus souvent.
    const ouvrier = litOuEchoue(path.join(DIR_LAMBDA, 'handler.ts'));
    expect(ouvrier).toContain('APIConnectionTimeoutError');
    expect(ouvrier).toContain('const surDelai =');
    // Et les appels sont comptés AVANT l'émission, pour rester vrais quand
    // l'ouvrier meurt entre l'appel et la conclusion.
    expect(ouvrier).toContain('avantAppel');
    const magasin = litOuEchoue(path.join(DIR_LAMBDA, 'job-store.ts'));
    expect(magasin).toContain('export async function compterAppel');
  });
});

// --- La mise en cache : mesurée, jamais affirmée ------------------------------

describe('Le préfixe système', () => {
  it('a sa longueur ÉPINGLÉE — aucune conclusion de cache sans mesure', () => {
    const { PROMPT_SYSTEME } = require(path.join(DIR_LAMBDA, 'prompt.ts')) as {
      PROMPT_SYSTEME: string;
    };
    const { CARACTERES_PAR_JETON } = require('../provider-router') as {
      CARACTERES_PAR_JETON: number;
    };
    const jetonsEstimes = Math.round(PROMPT_SYSTEME.length / CARACTERES_PAR_JETON);

    // Le raisonnement « ~950 jetons, donc sous le minimum cacheable » du Code
    // Map ne comptait QUE `CONSIGNES.md`, sans le cadrage qui l'entoure. La
    // longueur réelle est celle-ci, et elle tombe assez près des 1 024 jetons
    // pour qu'aucune conclusion ne tienne sans mesure côté API : le nombre de
    // jetons dépend du tokeniseur, pas d'une division. On épingle donc la
    // longueur, et on relève `cache_read_input_tokens` — dans les deux sens.
    expect(PROMPT_SYSTEME.length).toBeGreaterThan(3300);
    expect(PROMPT_SYSTEME.length).toBeLessThan(3900);
    expect(jetonsEstimes).toBeGreaterThan(900);
    expect(jetonsEstimes).toBeLessThan(1150);
  });

  it('le miroir employé par l’estimation d’avant-achat suit le prompt RÉEL', () => {
    //  était un nombre recopié à la main que rien ne
    // tenait synchronisé : le prompt pouvait doubler sans que le devis bouge.
    const { PROMPT_SYSTEME } = require(path.join(DIR_LAMBDA, 'prompt.ts')) as {
      PROMPT_SYSTEME: string;
    };
    const { CARACTERES_PAR_JETON } = require('../provider-router') as {
      CARACTERES_PAR_JETON: number;
    };
    const { JETONS_PROMPT_SYSTEME } = require('@/lib/api/translation') as {
      JETONS_PROMPT_SYSTEME: number;
    };
    const derive = Math.round(PROMPT_SYSTEME.length / CARACTERES_PAR_JETON);
    // Tolérance de 5 % : le devis n a pas à bouger sur une virgule de prompt,
    // mais il ne doit pas non plus rester à un chiffre d une autre époque.
    expect(Math.abs(JETONS_PROMPT_SYSTEME - derive) / derive).toBeLessThan(0.05);
  });

  it('ne porte NI langue NI contexte de Visite — c’est ce qui le rend cacheable', () => {
    const { PROMPT_SYSTEME, messageUtilisateur } = require(path.join(DIR_LAMBDA, 'prompt.ts')) as {
      PROMPT_SYSTEME: string;
      messageUtilisateur: (
        t: string,
        l: string,
        c?: Record<string, unknown>,
        k?: string,
      ) => string;
    };
    // « italien » figure dans CONSIGNES.md (le pivot MarianMT y est nommé) :
    // chercher un nom de langue dans le prompt système ne prouverait donc rien.
    // L'invariant est que le préfixe ne dépend PAS de la langue demandée.
    expect(PROMPT_SYSTEME).not.toContain('Langue cible');
    expect(PROMPT_SYSTEME).not.toContain('allemand');
    const message = messageUtilisateur('Texte', 'de', { tourTitle: 'Albi', city: 'Albi' });
    expect(message).toContain('allemand');
    expect(message).toContain('Albi');
  });
});

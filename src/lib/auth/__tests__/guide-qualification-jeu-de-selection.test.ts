/**
 * Le juge ne lit-il QUE des champs que le client lui rendra vraiment ?
 *
 * LE DÉFAUT QUE CE FICHIER EXISTE POUR VOIR. Les autres épreuves du juge
 * fabriquent leurs lignes à la main : elles écrivent `{userId, profileStatus}` et
 * vérifient le verdict. Elles resteraient donc VERTES si le juge lisait un champ
 * que le client ne lui rend pas — le champ serait `undefined` ou `null` en
 * production, jamais dans l'épreuve. C'est ce qui s'est produit avec `owner`.
 *
 * ET LA FORME DU DÉFAUT A CHANGÉ EN COURS DE ROUTE — c'est le point à ne pas
 * manquer. La version précédente de ce fichier tenait pour acquis qu'`owner`
 * SORTAIT du jeu de sélection : `resolveOwnerFields` tire les champs de propriété
 * des RÈGLES D'AUTH, et `ownerDefinedIn('userId')` seul rend `['userId']`. C'était
 * vrai d'un modèle qui n'a jamais été déployé. Le modèle réel porte EN PLUS une
 * règle de transition `allow.owner().to(['read'])`, sans laquelle l'APK v1.3.3 en
 * magasin — dont l'artefact embarqué réclame `owner` dans chaque requête —
 * recevrait `data: null` + « Validation error of type FieldUndefined ».
 *
 * Donc `resolveOwnerFields` rend `['userId', 'owner']`, et le champ RESTE
 * sélectionné. Il est mort sans être absent, et c'est PIRE que s'il avait
 * disparu :
 *   - absent, un juge resté sur `owner` lisait `undefined` PARTOUT, y compris
 *     pour les guides du relevé : n'importe quel contrôle négatif le voyait ;
 *   - présent mais jamais écrit, il vaut encore `"<sub>::<sub>"` sur les lignes
 *     ANTÉRIEURES à la bascule (les seules que le relevé contienne) et `null` sur
 *     toutes les suivantes. Un juge resté sur `owner` continuerait donc de
 *     qualifier les deux guides vivants et s'effondrerait sur CHAQUE NOUVELLE
 *     INSCRIPTION. Un contrôle négatif borné au parc actuel ne verrait rien.
 * D'où `LIGNE_NEUVE` dans `./parc-vivant.ts`, et le mutant décisif plus bas.
 *
 * Et rien de tout cela n'est visible à la compilation : la règle de transition
 * garde `owner` dans `Schema['GuideProfile']['type']`, donc `ligne.owner` compile.
 * La seule chose qui l'interdit est `owner-champ-mort.test.ts`, qui relit les
 * sources.
 *
 * COMMENT ON L'ÉVITE, ET EN QUOI ON S'ÉCARTE DE L'ORIGINAL
 * --------------------------------------------------------
 * L'équivalent backend (`amplify/shared/__tests__/guide-qualification-jeu-de-selection.test.ts`)
 * RECONSTRUIT le modèle : il rebâtit le schéma avec `a.schema()`, le transforme
 * en SDL, en tire une `model_introspection` par `@aws-amplify/graphql-generator`,
 * puis calcule le jeu de sélection. Le portail NE PEUT PAS faire cela :
 * `@aws-amplify/graphql-generator` n'est pas — et n'a pas à être — une de ses
 * dépendances, il ne possède pas le schéma, et son alias `@amplify-schema` ne
 * sert qu'aux TYPES.
 *
 * Ce que le portail possède, en revanche, est l'artefact qu'il EMBARQUE et LIT
 * vraiment : `amplify_outputs.json`. On dérive donc de lui :
 *   1. on prend la `model_introspection.models.GuideProfile` du fichier RÉEL ;
 *   2. on calcule le jeu de sélection avec la VRAIE `resolveOwnerFields`
 *      d'`aws-amplify/data-schema` — celle qu'appelle `defaultSelectionSetForModel`
 *      dans le client, atteinte par chemin de fichier parce que le paquet ne
 *      l'expose pas ; c'est LA FONCTION DU CLIENT, pas une copie ;
 *   3. on PROJETTE les lignes du parc vivant sur ce jeu de sélection avant de les
 *      donner au juge.
 *
 * LE DÉCALAGE, ET COMMENT ON LE TRAITE — LIRE AVANT DE TOUCHER AUX ATTENDUS
 * -------------------------------------------------------------------------
 * `amplify_outputs.json` du portail est une COPIE MANUELLE (voir la note
 * « Web amplify_outputs.json = manual copy »). Tant que le backend n'est pas
 * redéployé ET le fichier recopié, il décrit encore l'ANCIEN modèle de propriété.
 * On ne fait donc pas semblant : on identifie l'ÈRE du fichier par ses règles
 * d'auth réelles, et
 *   - si le fichier est ANTÉRIEUR à la bascule, on PROJETTE l'introspection telle
 *     qu'elle sera — DEUX règles de propriété, l'autorité et la transition, dans
 *     cet ordre ;
 *   - si le fichier est POSTÉRIEUR, l'ère « future » EST l'ère réelle et rien
 *     n'est simulé.
 * Une troisième forme fait TOMBER une épreuve NOMMÉE, la première du fichier —
 * pas une exception au chargement du module, dont le message se perdrait dans une
 * trace.
 *
 * LES ATTENDUS SONT ÉCRITS EN TOUTES LETTRES, ET C'EST VOULU. `JEU_ATTENDU_APRES`
 * vaut `['userId', 'owner']`, littéralement. Rien ici ne se recalcule à partir du
 * fichier : le jour de la recopie, si l'artefact réel dit autre chose, l'épreuve
 * tombe et il faut venir CHANGER CETTE CONSTANTE À LA MAIN, en sachant pourquoi.
 * Une épreuve qui dériverait son attendu de ce qu'elle observe n'aurait rien
 * observé du tout.
 *
 * CE QUE CETTE ÉPREUVE NE PROUVE PAS
 * -----------------------------------
 *  - elle ne prouve rien sur le SCHÉMA DÉPLOYÉ : elle lit un fichier du dépôt, pas
 *    AppSync. Tant que le fichier est de l'ère ancienne, l'ère future qu'elle
 *    éprouve est une PROJECTION, dérivée des constantes du juge — pas une lecture ;
 *  - elle ne prouve pas que le client Amplify calcule son jeu de sélection ainsi.
 *    Elle réutilise `resolveOwnerFields`, mais recompose autour d'elle
 *    (« champs explicites ∪ champs de propriété ») ce que fait
 *    `defaultSelectionSetForModel`, qui n'est pas exporté et gère en plus les
 *    relations et la profondeur. Pour `GuideProfile`, dépourvu de relation, les
 *    deux coïncident ;
 *  - elle ne prouve pas le CONTENU du parc vivant : `parc-vivant.ts` est un
 *    relevé recopié, pas une lecture de DynamoDB ni de Cognito. `LIGNE_NEUVE`
 *    n'est même pas un relevé : c'est ce que le schéma écrira.
 */

import path from 'path';
import type { Schema } from '@amplify-schema';
import outputs from '../../../../amplify_outputs.json';
import {
  CHAMP_PROPRIETE_PROFIL,
  qualifieGuide,
  REVENDICATION_PROPRIETE_PROFIL,
  type LigneProfilGuide,
} from '../guide-qualification';
import { LIGNE_NEUVE, LIGNE_ORPHELINE, PARC_VIVANT, type LigneDynamo } from './parc-vivant';

const RACINE = path.join(__dirname, '..', '..', '..', '..');

// `resolveOwnerFields` n'est pas exposé par les `exports` du paquet : on
// l'atteint par chemin de fichier. C'est la FONCTION DU CLIENT, pas une copie —
// tout l'intérêt de l'épreuve tient à cela.
/* eslint-disable @typescript-eslint/no-require-imports */
const { resolveOwnerFields } = require(
  path.join(RACINE, 'node_modules/@aws-amplify/data-schema/dist/cjs/runtime/utils/index.js'),
) as { resolveOwnerFields: (modele: unknown) => string[] };
/* eslint-enable @typescript-eslint/no-require-imports */

/** Le champ que la règle de TRANSITION maintient dans le type, en lecture seule. */
const CHAMP_TRANSITION = 'owner';

/**
 * L'ATTENDU EXPLICITE DU POINT DE BASCULE — à changer À LA MAIN, jamais à dériver.
 *
 * `resolveOwnerFields` rend les champs de propriété DANS L'ORDRE DES RÈGLES :
 * l'autorité (`ownerDefinedIn('userId')`) d'abord, la transition
 * (`allow.owner()`) ensuite, telles que `guide-profile-model.ts` les déclare.
 *
 * AVANT la recopie d'`amplify_outputs.json`, cet attendu porte sur une
 * PROJECTION ; APRÈS, sur l'artefact réel. C'est le même littéral dans les deux
 * cas — c'est précisément ce qui rend la recopie vérifiable au lieu d'être
 * absorbée en silence.
 *
 * LE JOUR OÙ IL DEVRA CHANGER : quand la règle de transition sera retirée du
 * backend (condition : plus aucun client installé ne sélectionne `owner` —
 * pas « une release de plus », voir `amplify/data/guide-profile-model.ts`).
 * Alors, et alors seulement, cette liste redevient `['userId']`.
 */
const JEU_ATTENDU_APRES = [CHAMP_PROPRIETE_PROFIL, CHAMP_TRANSITION];

/**
 * Le TYPE porte-t-il encore `owner` ?
 *
 * Assertion de COMPILATION, pas d'exécution. Tant que la règle de transition est
 * là, `Schema['GuideProfile']['type']` déclare `owner` et cette constante vaut
 * `true`. Le jour où la règle partira du backend, le type ne le portera plus,
 * `ChampOwnerDansLeType` deviendra `false`, et `tsc --noEmit` tombera ICI — ce
 * qui force à repasser par ce fichier au lieu de laisser l'attendu mentir.
 */
type ChampOwnerDansLeType = 'owner' extends keyof Schema['GuideProfile']['type'] ? true : false;
const OWNER_EST_DANS_LE_TYPE: ChampOwnerDansLeType = true;

interface RegleAuth {
  allow: string;
  ownerField?: string;
  identityClaim?: string;
  operations?: string[];
}
interface ModeleIntrospecte {
  fields: Record<string, { name: string }>;
  attributes: Array<{ type: string; properties: Record<string, unknown> }>;
}

const MODELE_REEL: ModeleIntrospecte = (
  outputs as unknown as {
    data: { model_introspection: { models: { GuideProfile: ModeleIntrospecte } } };
  }
).data.model_introspection.models.GuideProfile;

function reglesAuth(modele: ModeleIntrospecte): RegleAuth[] {
  const attr = modele.attributes.find((a) => a.type === 'auth');
  return ((attr?.properties as { rules?: RegleAuth[] } | undefined)?.rules ?? []) as RegleAuth[];
}

/** Toutes les règles de propriété, DANS L'ORDRE — c'est cet ordre que suit `resolveOwnerFields`. */
function reglesPropriete(modele: ModeleIntrospecte): RegleAuth[] {
  return reglesAuth(modele).filter((r) => r.allow === 'owner');
}

/**
 * Le jeu de sélection par défaut, calculé comme le fait le client :
 * champs explicites du modèle ∪ champs de propriété tirés des règles d'auth.
 * (`defaultSelectionSetForModel`, aws-amplify/data-schema, APIClient.)
 */
function jeuDeSelection(modele: ModeleIntrospecte): string[] {
  const explicites = Object.values(modele.fields).map((f) => f.name);
  return Array.from(new Set(explicites.concat(resolveOwnerFields(modele))));
}

/** Ce que le client rend VRAIMENT : la ligne AMPUTÉE de ce qu'il ne sélectionne pas. */
function projete(ligne: LigneDynamo, selection: readonly string[]): LigneProfilGuide {
  const projetee: Record<string, unknown> = {};
  for (const champ of selection) {
    if (champ in ligne) projetee[champ] = (ligne as unknown as Record<string, unknown>)[champ];
  }
  return projetee as LigneProfilGuide;
}

/**
 * L'introspection TELLE QU'ELLE SERA après la bascule — DEUX règles de propriété,
 * dans l'ordre où `guide-profile-model.ts` les déclare :
 *
 *  1. l'AUTORITÉ : `ownerDefinedIn(CHAMP_PROPRIETE_PROFIL)
 *     .identityClaim(REVENDICATION_PROPRIETE_PROFIL)` — on applique les constantes
 *     du JUGE, pas un littéral : changer le modèle de propriété change donc ce
 *     que cette fonction produit, et fait tomber ce qui suit ;
 *  2. la TRANSITION : `allow.owner().to(['read'])`, qui garde `owner` dans le
 *     type pour les binaires déjà distribués. Elle est recopiée telle quelle
 *     depuis la règle du fichier d'avant-bascule, réduite à `read`.
 */
function introspectionApresBascule(modele: ModeleIntrospecte): ModeleIntrospecte {
  const copie = JSON.parse(JSON.stringify(modele)) as ModeleIntrospecte;
  const regles = reglesPropriete(copie);
  if (regles.length !== 1) {
    throw new Error(
      `attendu UNE règle \`owner\` dans la model_introspection d'avant-bascule, trouvé ${regles.length}`,
    );
  }
  const attr = copie.attributes.find((a) => a.type === 'auth');
  const toutes = (attr!.properties as { rules: RegleAuth[] }).rules;
  const transition: RegleAuth = { ...regles[0], operations: ['read'] };
  regles[0].ownerField = CHAMP_PROPRIETE_PROFIL;
  regles[0].identityClaim = REVENDICATION_PROPRIETE_PROFIL;
  regles[0].operations = ['create', 'read', 'update'];
  toutes.splice(toutes.indexOf(regles[0]) + 1, 0, transition);
  return copie;
}

/**
 * L'ère du fichier `amplify_outputs.json` embarqué, lue dans ses règles d'auth.
 *
 * Une TROISIÈME forme rend `'inconnue'` plutôt que de jeter : une exception au
 * chargement du module ferait tomber la SUITE ENTIÈRE avec un message noyé dans
 * une trace, au lieu d'une épreuve nommée qui dit ce qui ne va pas.
 */
function ereDuFichier(): 'avant-bascule' | 'apres-bascule' | 'inconnue' {
  const regles = reglesPropriete(MODELE_REEL);
  if (
    regles.length === 1 &&
    regles[0].ownerField === CHAMP_TRANSITION &&
    regles[0].identityClaim === 'cognito:username'
  ) {
    return 'avant-bascule';
  }
  if (
    regles.length === 2 &&
    regles[0].ownerField === CHAMP_PROPRIETE_PROFIL &&
    regles[0].identityClaim === REVENDICATION_PROPRIETE_PROFIL &&
    regles[1].ownerField === CHAMP_TRANSITION
  ) {
    return 'apres-bascule';
  }
  return 'inconnue';
}

const ERE = ereDuFichier();
const MODELE_APRES = ERE === 'apres-bascule' ? MODELE_REEL : introspectionApresBascule(MODELE_REEL);
const SELECTION_APRES = jeuDeSelection(MODELE_APRES);

describe('le jeu de sélection que la règle d’auth impose au client', () => {
  it('est dérivé d’un `amplify_outputs.json` dont les règles de propriété sont CONNUES', () => {
    // Deux formes seulement sont admises : celle d'AVANT la bascule (le fichier
    // est une copie manuelle, il reste périmé jusqu'au redéploiement) et celle du
    // correctif, à DEUX règles. Toute autre forme rend cette épreuve rouge AVANT
    // les autres : si le modèle de propriété n'est ni l'un ni l'autre, le juge du
    // portail ne peut plus être supposé juste, et la projection ci-dessous ne veut
    // plus rien dire.
    const observees = reglesPropriete(MODELE_REEL).map((r) => ({
      ownerField: r.ownerField,
      identityClaim: r.identityClaim,
    }));
    expect({ ere: ERE, regles: observees }).toEqual(
      ERE === 'apres-bascule'
        ? {
            ere: 'apres-bascule',
            regles: [
              {
                ownerField: CHAMP_PROPRIETE_PROFIL,
                identityClaim: REVENDICATION_PROPRIETE_PROFIL,
              },
              { ownerField: CHAMP_TRANSITION, identityClaim: 'cognito:username' },
            ],
          }
        : {
            ere: 'avant-bascule',
            regles: [{ ownerField: CHAMP_TRANSITION, identityClaim: 'cognito:username' }],
          },
    );
  });

  // ------------------------------------------------------------------
  // L'ATTENDU DU POINT DE BASCULE — écrit en toutes lettres.
  // ------------------------------------------------------------------
  it('vaut `[userId, owner]` — l’autorité PUIS la transition, dans cet ordre', () => {
    // Le changement d'attendu du correctif, et il est ICI, visible. La version
    // précédente écrivait `toEqual([CHAMP_PROPRIETE_PROFIL])` : elle décrivait un
    // modèle qui n'a jamais été déployé, celui sans règle de transition.
    expect(resolveOwnerFields(MODELE_APRES)).toEqual(JEU_ATTENDU_APRES);
    expect(JEU_ATTENDU_APRES).toEqual(['userId', 'owner']);
  });

  it('désigne `userId` comme champ de propriété — donc il est TOUJOURS sélectionné', () => {
    expect(SELECTION_APRES).toContain(CHAMP_PROPRIETE_PROFIL);
  });

  it('contient `profileStatus` — l’autre champ que le juge lit', () => {
    expect(SELECTION_APRES).toContain('profileStatus');
  });

  it('contient ENCORE `owner` — il est mort, pas absent, et c’est ce qui le rend piégeux', () => {
    // Sans la règle de transition, retirer `owner` du type ferait répondre AppSync
    // `data: null` + « Validation error of type FieldUndefined » à tout client
    // dont l'artefact le réclame — l'APK v1.3.3 en magasin, et ce portail-ci.
    expect(SELECTION_APRES).toContain(CHAMP_TRANSITION);
    // Mais il ne devient PAS un champ du modèle pour autant : il n'entre dans la
    // sélection que par la règle d'auth, comme il l'a toujours fait.
    expect(Object.keys(MODELE_APRES.fields)).not.toContain(CHAMP_TRANSITION);
  });

  it('tant que le jeu de sélection réclame `owner`, le TYPE doit le porter', () => {
    // Le sens du couplage : c'est le TYPE qui répond aux clients installés. Cette
    // constante est une assertion de COMPILATION (voir sa déclaration) ; si le
    // backend retirait la règle de transition, `tsc` tomberait là-haut avant que
    // cette ligne-ci n'ait la moindre chance de s'exécuter.
    expect(SELECTION_APRES.includes(CHAMP_TRANSITION) && !OWNER_EST_DANS_LE_TYPE).toBe(false);
  });

  // ------------------------------------------------------------------
  // LA PROPRIÉTÉ QUI REND LE JUGE SÛR DANS LES DEUX SENS DU DÉPLOIEMENT.
  // ------------------------------------------------------------------
  it('`userId` est un champ EXPLICITE du modèle — donc sélectionné avant COMME après', () => {
    // C'est ce qui distingue ce juge de son prédécesseur : `owner` n'est dans le
    // jeu de sélection QUE par une règle d'auth — retirable, et retirée un jour —
    // tandis que `userId` y est par le modèle lui-même. Constaté sur le fichier
    // RÉEL, quelle que soit son ère : aucune projection.
    expect(Object.keys(MODELE_REEL.fields)).toContain(CHAMP_PROPRIETE_PROFIL);
    expect(jeuDeSelection(MODELE_REEL)).toContain(CHAMP_PROPRIETE_PROFIL);
    expect(jeuDeSelection(MODELE_REEL)).toContain('profileStatus');
  });

  it('`owner`, lui, n’a JAMAIS été un champ explicite du modèle', () => {
    expect(Object.keys(MODELE_REEL.fields)).not.toContain(CHAMP_TRANSITION);
  });

  it('MUTANT : sans la règle de transition, `owner` sort du jeu de sélection', () => {
    // Ce que serait le modèle si l'on retirait `allow.owner().to(['read'])` — et
    // ce que la version précédente de ce fichier croyait déjà déployé. `owner`
    // disparaît alors du type ET du jeu de sélection, et tout client dont
    // l'artefact le réclame reçoit `data: null`.
    const mutant = JSON.parse(JSON.stringify(MODELE_APRES)) as ModeleIntrospecte;
    const attr = mutant.attributes.find((a) => a.type === 'auth');
    const toutes = (attr!.properties as { rules: RegleAuth[] }).rules;
    const transition = toutes.find(
      (r) => r.allow === 'owner' && r.ownerField === CHAMP_TRANSITION,
    );
    toutes.splice(toutes.indexOf(transition!), 1);

    expect(resolveOwnerFields(mutant)).toEqual([CHAMP_PROPRIETE_PROFIL]);
    expect(jeuDeSelection(mutant)).not.toContain(CHAMP_TRANSITION);
  });

  it('MUTANT : avec la règle d’AVANT, `owner` redevient l’autorité', () => {
    const mutant = JSON.parse(JSON.stringify(MODELE_APRES)) as ModeleIntrospecte;
    const autorite = reglesPropriete(mutant)[0];
    autorite.ownerField = CHAMP_TRANSITION;
    autorite.identityClaim = 'cognito:username';

    expect(resolveOwnerFields(mutant)).toEqual([CHAMP_TRANSITION]);
    // Et `userId` reste dans la sélection, parce qu'il est champ explicite : c'est
    // la moitié qui rend la bascule sans risque pour le portail.
    expect(jeuDeSelection(mutant)).toContain(CHAMP_PROPRIETE_PROFIL);
  });
});

describe('le juge, nourri de lignes PROJETÉES sur ce jeu de sélection', () => {
  it.each(PARC_VIVANT)(
    'CONTRÔLE NÉGATIF — $nom qualifie encore, avec ce que le client rend vraiment',
    ({ sub, ligne }) => {
      const rendue = projete(ligne, SELECTION_APRES);
      expect(rendue).toHaveProperty(CHAMP_PROPRIETE_PROFIL);
      // La projection NE retire PLUS `owner` : la règle de transition le garde.
      // Il arrive donc au juge, qui doit continuer de l'ignorer.
      expect(rendue).toHaveProperty(CHAMP_TRANSITION);
      expect(qualifieGuide({ sub, lignes: [rendue], tronquee: false })).toEqual({ role: 'guide' });
    },
  );

  it('les deux ensemble : chacun le sien, et personne d’autre', () => {
    const rendues = PARC_VIVANT.map((p) => projete(p.ligne, SELECTION_APRES));
    for (const { sub } of PARC_VIVANT) {
      expect(qualifieGuide({ sub, lignes: rendues, tronquee: false })).toEqual({ role: 'guide' });
    }
    expect(qualifieGuide({ sub: 'un-tiers', lignes: rendues, tronquee: false })).toEqual({
      role: null,
      refus: 'aucun-profil',
    });
  });

  it('CONTRÔLE NÉGATIF — une ligne créée APRÈS la bascule qualifie elle aussi', () => {
    // Elle n'a pas d'`owner`, et le juge n'en a que faire : il compare `userId`.
    const rendue = projete(LIGNE_NEUVE.ligne, SELECTION_APRES);
    expect(rendue).toHaveProperty(CHAMP_TRANSITION, null);
    expect(qualifieGuide({ sub: LIGNE_NEUVE.sub, lignes: [rendue], tronquee: false })).toEqual({
      role: 'guide',
    });
  });

  it('la ligne ORPHELINE, projetée elle aussi, ne qualifie aucun guide vivant', () => {
    const orpheline = projete(LIGNE_ORPHELINE.ligne, SELECTION_APRES);
    for (const { sub } of PARC_VIVANT) {
      expect(qualifieGuide({ sub, lignes: [orpheline], tronquee: false })).toEqual({
        role: null,
        refus: 'aucun-profil',
      });
    }
  });

  it('une suspension réelle est toujours VUE à travers la projection', () => {
    const { sub, ligne } = PARC_VIVANT[0];
    const suspendue = projete({ ...ligne, profileStatus: 'suspended' }, SELECTION_APRES);
    expect(qualifieGuide({ sub, lignes: [suspendue], tronquee: false })).toEqual({
      role: null,
      refus: 'disqualifie',
    });
  });

  // ------------------------------------------------------------------
  // LES DEUX MUTANTS DÉCISIFS.
  // ------------------------------------------------------------------
  it('MUTANT : un juge resté sur `owner` marche sur le parc ACTUEL et tombe sur le suivant', () => {
    // LE MODE DE PANNE EXACT que ce fichier existe pour rendre visible, et il a
    // changé de forme avec la règle de transition. `owner` n'est plus absent : il
    // est SÉLECTIONNÉ, et il vaut encore son composite sur les lignes antérieures
    // à la bascule — donc sur les deux seules lignes que le relevé contienne.
    //
    // Un juge resté sur `owner` passerait donc TOUS les contrôles négatifs du parc
    // vivant, et s'effondrerait sur la première inscription venue. C'est la pire
    // panne possible : verte en épreuve, verte en production le jour du
    // déploiement, morte pour tout nouveau guide.
    const juge_owner = (sub: string, lignes: LigneProfilGuide[]) =>
      lignes.filter((l) => (l as unknown as { owner?: string | null }).owner === `${sub}::${sub}`);

    // a. sur le parc actuel, il a l'air de marcher — et c'est le piège.
    for (const { sub, ligne } of PARC_VIVANT) {
      expect(juge_owner(sub, [projete(ligne, SELECTION_APRES)])).toHaveLength(1);
    }
    // b. sur une ligne créée après la bascule, il ne trouve RIEN.
    const neuve = projete(LIGNE_NEUVE.ligne, SELECTION_APRES);
    expect(juge_owner(LIGNE_NEUVE.sub, [neuve])).toEqual([]);
    // c. le juge réel, lui, la qualifie.
    expect(qualifieGuide({ sub: LIGNE_NEUVE.sub, lignes: [neuve], tronquee: false })).toEqual({
      role: 'guide',
    });
  });

  it('MUTANT : projetées sur un jeu de sélection amputé de `userId`, TOUTES tombent', () => {
    // Simule un `selectionSet` explicite qui oublierait le champ de propriété :
    // la ligne arrive sans `userId`, et la qualification s'effondre pour TOUT LE
    // MONDE — silencieusement, en production. `owner`, même présent, ne rattrape
    // rien : le juge ne le lit pas, et c'est délibéré.
    const ampute = SELECTION_APRES.filter((c) => c !== CHAMP_PROPRIETE_PROFIL);
    for (const { sub, ligne } of [...PARC_VIVANT, LIGNE_NEUVE]) {
      expect(qualifieGuide({ sub, lignes: [projete(ligne, ampute)], tronquee: false })).toEqual({
        role: null,
        refus: 'aucun-profil',
      });
    }
  });
});

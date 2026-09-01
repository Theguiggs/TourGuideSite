/**
 * Le juge ne lit-il QUE des champs que le client lui rendra vraiment ?
 *
 * LE DÉFAUT QUE CE FICHIER EXISTE POUR VOIR. Les autres épreuves du juge
 * fabriquent leurs lignes à la main : elles écrivent `{userId, profileStatus}` et
 * vérifient le verdict. Elles resteraient donc VERTES si le juge lisait un champ
 * que le client ne sélectionne pas — le champ serait `undefined` en production,
 * jamais dans l'épreuve. C'est exactement ce qui vient de se produire avec
 * `owner` : `resolveOwnerFields` tire le champ de propriété des RÈGLES D'AUTH, et
 * il rend `['userId']` depuis `ownerDefinedIn('userId')`. `owner` sort donc du
 * jeu de sélection par défaut, sur TOUS les chemins d'auth. Un portail resté sur
 * `owner` aurait rendu `aucun-profil` pour les guides vivants — sans une seule
 * épreuve rouge.
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
 * LE DÉCALAGE, ET COMMENT ON LE TRAITE
 * -------------------------------------
 * `amplify_outputs.json` du portail est une COPIE MANUELLE (voir la note
 * « Web amplify_outputs.json = manual copy »). Tant que le backend n'est pas
 * redéployé ET le fichier recopié, il décrit encore l'ANCIEN modèle de propriété.
 * On ne fait donc pas semblant : on identifie l'ÈRE du fichier par ses règles
 * d'auth réelles, et
 *   - si le fichier est ANTÉRIEUR à la bascule, on en dérive l'introspection
 *     TELLE QU'ELLE SERA en appliquant au seul champ `ownerField`/`identityClaim`
 *     de la règle `owner` les constantes du juge, puis on éprouve les DEUX ères ;
 *   - si le fichier est POSTÉRIEUR, l'ère « future » EST l'ère réelle et rien
 *     n'est simulé.
 * Une troisième forme de règle fait TOMBER l'épreuve : c'est la condition pour
 * qu'un changement du modèle de propriété ne passe pas en silence.
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
 *    relevé recopié, pas une lecture de DynamoDB ni de Cognito.
 */

import path from 'path';
import outputs from '../../../../amplify_outputs.json';
import {
  CHAMP_PROPRIETE_PROFIL,
  qualifieGuide,
  REVENDICATION_PROPRIETE_PROFIL,
  type LigneProfilGuide,
} from '../guide-qualification';
import { LIGNE_ORPHELINE, PARC_VIVANT, type LigneDynamo } from './parc-vivant';

const RACINE = path.join(__dirname, '..', '..', '..', '..');

// `resolveOwnerFields` n'est pas exposé par les `exports` du paquet : on
// l'atteint par chemin de fichier. C'est la FONCTION DU CLIENT, pas une copie —
// tout l'intérêt de l'épreuve tient à cela.
/* eslint-disable @typescript-eslint/no-require-imports */
const { resolveOwnerFields } = require(
  path.join(RACINE, 'node_modules/@aws-amplify/data-schema/dist/cjs/runtime/utils/index.js'),
) as { resolveOwnerFields: (modele: unknown) => string[] };
/* eslint-enable @typescript-eslint/no-require-imports */

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

function reglePropriete(modele: ModeleIntrospecte): RegleAuth | undefined {
  return reglesAuth(modele).find((r) => r.allow === 'owner');
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
 * L'introspection TELLE QU'ELLE SERA après la bascule : la règle de propriété
 * pointe le champ et la revendication que le JUGE déclare. On ne recopie pas un
 * littéral — on applique les constantes partagées. Changer le modèle de propriété
 * change donc ce que cette fonction produit, et fait tomber ce qui suit.
 */
function introspectionApresBascule(modele: ModeleIntrospecte): ModeleIntrospecte {
  const copie = JSON.parse(JSON.stringify(modele)) as ModeleIntrospecte;
  const regle = reglePropriete(copie);
  if (!regle) throw new Error('aucune règle `owner` dans la model_introspection');
  regle.ownerField = CHAMP_PROPRIETE_PROFIL;
  regle.identityClaim = REVENDICATION_PROPRIETE_PROFIL;
  regle.operations = ['create', 'read'];
  return copie;
}

/** L'ère du fichier `amplify_outputs.json` embarqué, lue dans ses règles d'auth. */
function ereDuFichier(): 'avant-bascule' | 'apres-bascule' {
  const regle = reglePropriete(MODELE_REEL);
  if (!regle) throw new Error('aucune règle `owner` dans la model_introspection');
  if (regle.ownerField === 'owner' && regle.identityClaim === 'cognito:username') {
    return 'avant-bascule';
  }
  if (
    regle.ownerField === CHAMP_PROPRIETE_PROFIL &&
    regle.identityClaim === REVENDICATION_PROPRIETE_PROFIL
  ) {
    return 'apres-bascule';
  }
  throw new Error(
    '`amplify_outputs.json` porte une règle de propriété INCONNUE : ' +
      `ownerField=${String(regle.ownerField)} identityClaim=${String(regle.identityClaim)}. ` +
      'Ni l’ancienne (owner/cognito:username), ni celle du correctif ' +
      `(${CHAMP_PROPRIETE_PROFIL}/${REVENDICATION_PROPRIETE_PROFIL}). ` +
      'Le juge du portail ne peut plus être supposé juste : vérifier le schéma.',
  );
}

const ERE = ereDuFichier();
const MODELE_APRES = ERE === 'apres-bascule' ? MODELE_REEL : introspectionApresBascule(MODELE_REEL);
const SELECTION_APRES = jeuDeSelection(MODELE_APRES);

describe('le jeu de sélection que la règle d’auth impose au client', () => {
  it('est dérivé d’un `amplify_outputs.json` dont la règle de propriété est CONNUE', () => {
    // `ereDuFichier()` a déjà jeté si la règle est d'une troisième forme. On fige
    // ici l'ère constatée pour que la lecture du rapport de suite dise laquelle.
    expect(['avant-bascule', 'apres-bascule']).toContain(ERE);
  });

  it('désigne `userId` comme champ de propriété — donc il est TOUJOURS sélectionné', () => {
    expect(resolveOwnerFields(MODELE_APRES)).toEqual([CHAMP_PROPRIETE_PROFIL]);
    expect(SELECTION_APRES).toContain(CHAMP_PROPRIETE_PROFIL);
  });

  it('NE contient PLUS `owner` — il n’existe plus, ni comme champ ni comme propriété', () => {
    // Le point qui casse en silence : `owner` n'est pas « vide », il est ABSENT.
    expect(SELECTION_APRES).not.toContain('owner');
    expect(Object.keys(MODELE_APRES.fields)).not.toContain('owner');
  });

  it('contient `profileStatus` — l’autre champ que le juge lit', () => {
    expect(SELECTION_APRES).toContain('profileStatus');
  });

  // ------------------------------------------------------------------
  // LA PROPRIÉTÉ QUI REND LE JUGE SÛR DANS LES DEUX SENS DU DÉPLOIEMENT.
  // ------------------------------------------------------------------
  it('`userId` est un champ EXPLICITE du modèle — donc sélectionné avant COMME après', () => {
    // C'est ce qui distingue ce juge de son prédécesseur : `owner` n'était dans
    // le jeu de sélection QUE par la règle d'auth, `userId` y est par le modèle.
    // Constaté sur le fichier RÉEL, quelle que soit son ère : aucune projection.
    expect(Object.keys(MODELE_REEL.fields)).toContain(CHAMP_PROPRIETE_PROFIL);
    expect(jeuDeSelection(MODELE_REEL)).toContain(CHAMP_PROPRIETE_PROFIL);
    expect(jeuDeSelection(MODELE_REEL)).toContain('profileStatus');
  });

  it('`owner`, lui, n’a JAMAIS été un champ explicite du modèle', () => {
    expect(Object.keys(MODELE_REEL.fields)).not.toContain('owner');
  });

  it('MUTANT : avec la règle d’AVANT, `owner` revient et `userId` cesse d’être l’autorité', () => {
    const mutant = JSON.parse(JSON.stringify(MODELE_APRES)) as ModeleIntrospecte;
    const regle = reglePropriete(mutant);
    regle!.ownerField = 'owner';
    regle!.identityClaim = 'cognito:username';

    expect(resolveOwnerFields(mutant)).toEqual(['owner']);
    expect(jeuDeSelection(mutant)).toContain('owner');
    // Et `userId` y reste, parce qu'il est champ explicite : c'est la moitié qui
    // rend la bascule sans risque pour le portail.
    expect(jeuDeSelection(mutant)).toContain(CHAMP_PROPRIETE_PROFIL);
  });
});

describe('le juge, nourri de lignes PROJETÉES sur ce jeu de sélection', () => {
  it.each(PARC_VIVANT)(
    'CONTRÔLE NÉGATIF — $nom qualifie encore, avec ce que le client rend vraiment',
    ({ sub, ligne }) => {
      const rendue = projete(ligne, SELECTION_APRES);
      // La projection a bien retiré `owner` : c'est la situation de production.
      expect(rendue).not.toHaveProperty('owner');
      expect(rendue).toHaveProperty(CHAMP_PROPRIETE_PROFIL);
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
  it('MUTANT : un juge resté sur `owner` fait tomber TOUS les guides vivants', () => {
    // C'est le mode de panne exact que ce fichier existe pour rendre visible :
    // le champ n'est pas « vide », il est absent de la ligne rendue.
    const juge_owner = (sub: string, lignes: LigneProfilGuide[]) =>
      lignes.filter((l) => (l as unknown as { owner?: string }).owner === `${sub}::${sub}`);

    for (const { sub, ligne } of PARC_VIVANT) {
      const rendue = projete(ligne, SELECTION_APRES);
      expect(juge_owner(sub, [rendue])).toEqual([]);
    }
  });

  it('MUTANT : projetées sur un jeu de sélection amputé de `userId`, les deux tombent', () => {
    // Simule un `selectionSet` explicite qui oublierait le champ de propriété :
    // la ligne arrive sans `userId`, et la qualification s'effondre pour TOUT LE
    // MONDE — silencieusement, en production.
    const ampute = SELECTION_APRES.filter((c) => c !== CHAMP_PROPRIETE_PROFIL);
    for (const { sub, ligne } of PARC_VIVANT) {
      expect(
        qualifieGuide({ sub, lignes: [projete(ligne, ampute)], tronquee: false }),
      ).toEqual({ role: null, refus: 'aucun-profil' });
    }
  });
});

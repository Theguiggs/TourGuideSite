/**
 * `owner` EST MORT, MAIS IL EST ENCORE LÀ — et rien d'autre que ce fichier ne
 * l'empêche d'être relu.
 *
 * CE QUI A CHANGÉ, ET POURQUOI LE COMPILATEUR NE PROTÈGE PLUS RIEN
 * ----------------------------------------------------------------
 * La bascule du schéma (`ownerDefinedIn('userId').identityClaim('sub')`) retire à
 * `owner` son AUTORITÉ, pas son existence. Une règle de TRANSITION
 * `allow.owner().to(['read'])` le maintient dans le type GraphQL, sans quoi tout
 * binaire déjà distribué — l'APK v1.3.3 en magasin, ce portail en production —
 * recevrait `data: null` + « Validation error of type FieldUndefined », son
 * `amplify_outputs.json` embarqué réclamant `owner` dans chaque requête
 * `GuideProfile`.
 *
 * CONSÉQUENCE EXACTE, ET ELLE EST DÉSAGRÉABLE :
 *   - `Schema['GuideProfile']['type']` DÉCLARE encore `owner`. Donc
 *     `LigneProfilLue` (l'intersection avec `LigneProfilGuide`) le déclare aussi,
 *     donc `ligne.owner` COMPILE ;
 *   - aucun résolveur ne l'écrit plus. Il vaut `"<sub>::<sub>"` sur les lignes
 *     antérieures à la bascule et `null` sur toutes les suivantes.
 * Une lecture de `owner` réintroduite ici passerait donc `tsc --noEmit`, passerait
 * les contrôles négatifs du parc vivant (dont les deux lignes sont antérieures),
 * et s'effondrerait sur la première inscription venue.
 *
 * Le `@ts-expect-error` de `guide-qualification.test.ts` ne couvre que
 * `LigneProfilGuide` — le type du JUGE, qui n'a effectivement pas de `owner`. Il
 * ne dit rien du reste du portail. D'où cette épreuve-ci, qui relit les SOURCES.
 *
 * CE QU'ELLE PROUVE, ET CE QU'ELLE NE PROUVE PAS
 * ----------------------------------------------
 * Elle prouve qu'aucun fichier de PRODUCTION (hors `__tests__`, `__mocks__` et
 * `*.test.*`) ne mentionne le jeton `owner` ailleurs que dans un commentaire ou
 * dans les tournures anglaises inoffensives de l'inventaire ci-dessous.
 *
 * Elle ne prouve pas que le portail est juste : un juge peut être faux sans
 * jamais nommer `owner`. Et elle ne voit pas un accès indirect
 * (`ligne[champ]` avec `champ = 'own' + 'er'`) — ce n'est pas un bac à sable,
 * c'est un garde-fou contre la rechute distraite.
 */

import fs from 'fs';
import path from 'path';

const RACINE_SRC = path.join(__dirname, '..', '..', '..');

/**
 * Retire commentaires de ligne et de bloc, en respectant les chaînes.
 *
 * Volontairement simple : il ne connaît pas les littéraux d'expression
 * régulière. Une regex contenant une apostrophe ferait donc dérailler l'analyse
 * du fichier — ce qui produirait un FAUX POSITIF (du commentaire pris pour du
 * code), jamais un faux négatif. L'épreuve reste donc du bon côté de l'erreur :
 * elle crie à tort plutôt que de se taire à tort.
 */
function sansCommentaires(source: string): string {
  let sortie = '';
  let i = 0;
  let mode: 'code' | 'ligne' | 'bloc' | 'chaine' = 'code';
  let delimiteur = '';
  const ANTISLASH = String.fromCharCode(92);

  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];

    if (mode === 'code') {
      if (c === '/' && d === '/') {
        mode = 'ligne';
        i += 2;
        continue;
      }
      if (c === '/' && d === '*') {
        mode = 'bloc';
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        mode = 'chaine';
        delimiteur = c;
        sortie += c;
        i += 1;
        continue;
      }
      sortie += c;
      i += 1;
      continue;
    }

    if (mode === 'ligne') {
      if (c === '\n') {
        mode = 'code';
        sortie += c;
      }
      i += 1;
      continue;
    }

    if (mode === 'bloc') {
      if (c === '*' && d === '/') {
        mode = 'code';
        i += 2;
      } else {
        // On garde les sauts de ligne : les numéros de ligne doivent rester justes.
        if (c === '\n') sortie += c;
        i += 1;
      }
      continue;
    }

    // mode === 'chaine'
    if (c === ANTISLASH) {
      sortie += c + (d ?? '');
      i += 2;
      continue;
    }
    sortie += c;
    if (c === delimiteur) mode = 'code';
    i += 1;
  }
  return sortie;
}

function fichiersDeProduction(dossier: string, acc: string[] = []): string[] {
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === '__tests__' || entree.name === '__mocks__') continue;
      fichiersDeProduction(complet, acc);
      continue;
    }
    if (!/\.tsx?$/.test(entree.name)) continue;
    if (/\.test\.tsx?$/.test(entree.name)) continue;
    acc.push(complet);
  }
  return acc;
}

/**
 * LE JETON, pas la sous-chaîne : `ownerField`, `ownership` et `downer` ne sont pas
 * `owner`. La casse est ignorée pour attraper `Owner` et `OWNER`.
 */
const JETON_OWNER = /(?<![\w$])owner(?![\w$])/i;

/**
 * L'INVENTAIRE DES OCCURRENCES TOLÉRÉES — vide, et il doit le rester.
 *
 * Il n'est pas là pour absorber une rechute : toute entrée ajoutée ici doit être
 * une tournure anglaise sans rapport avec `GuideProfile.owner`, et justifiée sur
 * place. Une lecture réelle du champ NE VA PAS ICI ; elle se supprime.
 */
const TOLEREES: ReadonlyArray<{ fichier: string; motif: RegExp; pourquoi: string }> = [];

function occurrences(): string[] {
  const trouvees: string[] = [];
  for (const fichier of fichiersDeProduction(RACINE_SRC)) {
    const relatif = path.relative(RACINE_SRC, fichier).split(path.sep).join('/');
    const lignes = sansCommentaires(fs.readFileSync(fichier, 'utf8')).split('\n');
    lignes.forEach((ligne, index) => {
      if (!JETON_OWNER.test(ligne)) return;
      const toleree = TOLEREES.some(
        (t) => t.fichier === relatif && t.motif.test(ligne),
      );
      if (toleree) return;
      trouvees.push(`${relatif}:${index + 1}: ${ligne.trim()}`);
    });
  }
  return trouvees;
}

describe('le champ `owner` ne se lit plus nulle part dans le code de production', () => {
  it('aucune occurrence hors commentaire', () => {
    // LA MUTATION QUI FAIT TOMBER CETTE ÉPREUVE : écrire `ligne.owner` où que ce
    // soit sous `src/`, hors épreuve. C'est exactement ce que le compilateur
    // laisse passer depuis que la règle de transition garde le champ dans le type.
    expect(occurrences()).toEqual([]);
  });

  it('elle regarde bien quelque chose — l’analyse trouve les fichiers du portail', () => {
    // Contre-épreuve du garde-fou lui-même : une erreur de chemin rendrait la
    // liste vide, et l'épreuve précédente serait verte sans avoir rien lu.
    const fichiers = fichiersDeProduction(RACINE_SRC);
    expect(fichiers.length).toBeGreaterThan(100);
    expect(fichiers.map((f) => path.basename(f))).toContain('guide-qualification.ts');
    expect(fichiers.map((f) => path.basename(f))).toContain('appsync-client.ts');
  });

  it('elle sait distinguer un commentaire d’une lecture', () => {
    // Le cœur du garde-fou, éprouvé sur pièce : le portail est plein de
    // commentaires qui PARLENT d'`owner` — ils doivent tous passer — et aucune
    // lecture ne doit passer.
    const source = [
      '/** Un bloc qui parle de owner, longuement. */',
      "const a = 1; // owner en fin de ligne",
      'const b = ligne.owner;',
      "const c = ligne['owner'];",
      'const d = ownerField;',
      'const e = "owner";',
    ].join('\n');
    const restant = sansCommentaires(source)
      .split('\n')
      .map((l, i) => ({ n: i + 1, l }))
      .filter(({ l }) => JETON_OWNER.test(l))
      .map(({ n }) => n);
    // Lignes 3, 4 et 6 : la lecture directe, la lecture indexée, et le littéral.
    // Les lignes 1 et 2 sont des commentaires ; la 5 est `ownerField`, un AUTRE
    // jeton.
    expect(restant).toEqual([3, 4, 6]);
  });
});

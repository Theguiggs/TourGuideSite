/**
 * Ce qui est TYPÉ doit être ce qui est TESTÉ.
 *
 * `tsconfig.json` et `jest.config.ts` résolvent chacun l'alias
 * `@amplify-schema` vers le schéma du dépôt voisin. Pendant des mois, l'un
 * visait `../TourGuideApp` et l'autre `../TourGuide`, un répertoire renommé en
 * avril : l'écart restait invisible tant qu'aucune épreuve ne résolvait le
 * module. Cette épreuve rend l'écart bruyant, et vérifie que la cible existe
 * bien sur le disque de la machine qui lance la suite.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

function stripJsonComments(source: string): string {
  return source.replace(/\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
}

function tsconfigAliasTarget(): string {
  const raw = fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8');
  const parsed = JSON.parse(stripJsonComments(raw)) as {
    compilerOptions: { paths: Record<string, string[]> };
  };
  const targets = parsed.compilerOptions.paths['@amplify-schema'];
  expect(targets).toHaveLength(1);
  return path.resolve(ROOT, targets[0]);
}

function jestAliasTarget(): string {
  const raw = fs.readFileSync(path.join(ROOT, 'jest.config.ts'), 'utf8');
  const match = raw.match(/'\^@amplify-schema\$':\s*'<rootDir>\/([^']+)'/);
  expect(match).not.toBeNull();
  return path.resolve(ROOT, match![1]);
}

describe('@amplify-schema alias', () => {
  it('points to the same file in tsconfig.json and jest.config.ts', () => {
    expect(jestAliasTarget()).toBe(tsconfigAliasTarget());
  });

  it('targets a schema that actually exists next to this repo', () => {
    const target = `${tsconfigAliasTarget()}.ts`;
    expect(fs.existsSync(target)).toBe(true);
  });
});

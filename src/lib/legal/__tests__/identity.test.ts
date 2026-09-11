/**
 * Garde légale (lot 0.1) : aucune page publique ne doit conserver de texte à
 * trous, et l'adresse de contact ne doit exister qu'à un seul endroit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { LEGAL_IDENTITY, publisherLine } from '../identity';

const APP_DIR = path.join(process.cwd(), 'src', 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('pages légales', () => {
  const files = walk(APP_DIR);

  it('ne laissent aucun « À COMPLÉTER » ni « TO BE COMPLETED » au public', () => {
    const offenders = files
      .filter((f) => /À COMPLÉTER|A COMPLETER|TO BE COMPLETED/i.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(process.cwd(), f));
    expect(offenders).toEqual([]);
  });

  it("n'écrivent l'adresse de contact qu'une fois, dans l'identité", () => {
    const offenders = files
      .filter((f) => /@gmail\.com|@murmure-visit\.com/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(process.cwd(), f));
    expect(offenders).toEqual([]);
  });
});

describe('publisherLine', () => {
  it('omet le SIREN tant qu’il n’est pas renseigné, sans texte à trous', () => {
    const line = publisherLine('fr');
    expect(line).toContain(LEGAL_IDENTITY.publisher);
    expect(line).toContain(LEGAL_IDENTITY.address);
    if (!LEGAL_IDENTITY.siren) expect(line).not.toMatch(/SIREN/);
    expect(line).not.toMatch(/\[/);
  });
});

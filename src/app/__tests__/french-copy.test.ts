/**
 * Garde de la copie française (lot 3.3).
 *
 * 1. Accents : « Decouvrez », « Telecharger », « Etape », « Reessayer »…
 *    s'affichaient tels quels. La liste ci-dessous est celle des mots que la
 *    revue a trouvés sans accent ; tout retour de l'un d'eux fait échouer la
 *    suite. Les pages EN, les tests et les identifiants de code sont hors champ
 *    (on n'inspecte que les fichiers hors `src/app/en`).
 * 2. Lexique : dans la copie FR, la visite s'appelle « visite » ; « parcours »
 *    désigne le tracé ; « tour » n'existe pas en français. On vérifie les
 *    formes les plus courantes de la dérive.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [path.join(process.cwd(), 'src', 'app'), path.join(process.cwd(), 'src', 'components')];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'en') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Mots français sans accent, en début de mot (les identifiants de code sont
// en camelCase ou snake_case et ne commencent pas par une majuscule isolée).
const UNACCENTED =
  /\b(Decouvr\w*|Telecharg\w*|guidees?\b|Reessay\w*|definitiv\w*|Desarchiv\w*|Etapes?\b|Ecout\w*|Reglages|Donnees|acceder|Publiee|Apercu|Precedent|Parametres|Deconnexion|Selectionn\w*|Arreter|Arrete\b|Editer|Echec|Gener(er|ez)\b|Verifie\b|Verifier\b|approuve et|publie\b|de moderation\b|remoderation|apparaitront|localise\b|integre\b|interet\b|ete traduites)\b/;

// « tour » dans une phrase française (article ou possessif devant).
const FRENCH_TOUR = /\b(ce|un|le|votre|mon|nouveau|du|les|des|vos|tes|ton|chaque)\s+tours?\b/;

function offenders(regex: RegExp): string[] {
  const result: string[] = [];
  for (const file of ROOTS.flatMap((r) => walk(r))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // Commentaires et journaux : pas de copie utilisateur.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (/logger\.(info|warn|error|debug)\(/.test(line)) return;
      if (regex.test(line)) result.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${trimmed.slice(0, 100)}`);
    });
  }
  return result;
}

describe('copie française', () => {
  it('porte ses accents', () => {
    expect(offenders(UNACCENTED)).toEqual([]);
  });

  it('dit « visite », jamais « tour », dans une phrase française', () => {
    expect(offenders(FRENCH_TOUR)).toEqual([]);
  });
});

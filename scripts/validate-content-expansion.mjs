import fs from 'node:fs';
import path from 'node:path';

const [baselineRoot, currentRoot, ...requestedSlugs] = process.argv.slice(2);
if (!baselineRoot || !currentRoot || requestedSlugs.length === 0) {
  console.error('Usage: node validate-content-expansion.mjs <baseline> <current> <slug...>');
  process.exit(2);
}
const baselineToursRoot = fs.existsSync(path.join(baselineRoot, 'content', 'tours'))
  ? path.join(baselineRoot, 'content', 'tours')
  : path.join(baselineRoot, 'tours');

let slugs = requestedSlugs;
if (requestedSlugs.length === 1 && requestedSlugs[0] === '--all-drafts') {
  const seedSource = fs.readFileSync(path.join(currentRoot, 'scripts', 'seed-100-visites.mjs'), 'utf8');
  const slugBlock = seedSource.match(/const SLUGS = \[([\s\S]*?)\n\];/)?.[1];
  if (!slugBlock) throw new Error('Unable to parse SLUGS from seed script');
  const excluded = new Set(['biarritz-table-basque', 'nice-matisse-chagall-collines']);
  slugs = [...slugBlock.matchAll(/'([^']+)'/g)]
    .map((match) => match[1])
    .filter((slug) => !excluded.has(slug));
}

function scenesFrom(markdown) {
  return markdown.split(/^##\s+Scène\s+/m).slice(1).map((block) => {
    const [heading, ...lines] = block.split('\n');
    const body = lines
      .filter((line) => !line.startsWith('**GPS'))
      .join('\n')
      .replace(/^---\s*$/gm, '')
      .trim();
    return {
      heading: heading.trim(),
      words: body.split(/\s+/).filter(Boolean).length,
    };
  });
}

let failed = false;
const report = [];
let totalBefore = 0;
let totalAfter = 0;
let totalScenes = 0;
const failures = [];
for (const slug of slugs) {
  const relative = path.join(slug, 'script-narration.md');
  const before = scenesFrom(fs.readFileSync(path.join(baselineToursRoot, relative), 'utf8'));
  const after = scenesFrom(fs.readFileSync(path.join(currentRoot, 'content', 'tours', relative), 'utf8'));
  if (before.length !== after.length) {
    failed = true;
    const error = `scene count changed: ${before.length} -> ${after.length}`;
    report.push({ slug, error });
    failures.push({ slug, error });
    continue;
  }
  const scenes = before.map((scene, index) => {
    const ratio = after[index].words / scene.words;
    if (ratio < 1.45 || ratio > 1.55) failed = true;
    totalBefore += scene.words;
    totalAfter += after[index].words;
    totalScenes += 1;
    if (ratio < 1.45 || ratio > 1.55) {
      failures.push({ slug, scene: index + 1, before: scene.words, after: after[index].words, ratio: Number(ratio.toFixed(3)) });
    }
    return {
      scene: index + 1,
      before: scene.words,
      after: after[index].words,
      ratio: Number(ratio.toFixed(3)),
      ok: ratio >= 1.45 && ratio <= 1.55,
    };
  });
  report.push({ slug, scenes });
}

console.log(JSON.stringify({
  tours: slugs.length,
  scenes: totalScenes,
  beforeWords: totalBefore,
  afterWords: totalAfter,
  ratio: Number((totalAfter / totalBefore).toFixed(4)),
  failures,
  report: requestedSlugs[0] === '--all-drafts' ? undefined : report,
}, null, 2));
process.exitCode = failed ? 1 : 0;

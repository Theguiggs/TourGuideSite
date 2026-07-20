import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASELINE = path.join(ROOT, 'artifacts', 'content-expansion', 'baseline', 'tours');
const PUBLISHED = new Set(['biarritz-table-basque', 'nice-matisse-chagall-collines']);
const seedSource = fs.readFileSync(path.join(ROOT, 'scripts', 'seed-100-visites.mjs'), 'utf8');
const slugBlock = seedSource.match(/const SLUGS = \[([\s\S]*?)\n\];/)?.[1];
if (!slugBlock) throw new Error('Unable to parse SLUGS from seed script');
const slugs = [...slugBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);

function read(root, slug) {
  return fs.readFileSync(path.join(root, slug, 'script-narration.md'), 'utf8');
}

function structure(markdown) {
  return markdown.split(/^##\s+Scène\s+/m).slice(1).map((block) => {
    const [heading, ...lines] = block.split('\n');
    return {
      heading: heading.trim(),
      gps: lines.filter((line) => line.startsWith('**GPS')).map((line) => line.trim()),
    };
  });
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encodingMarkers(value) {
  return [...value.matchAll(/�|Ã(?:©|¨|ª|«|¯|®|´|§|¹|¢|‰|œ|Ž)|Â(?: | |«|»)|â(?:€|€™|€œ|€”|€“)/g)].length;
}

const failures = [];
let changedDrafts = 0;
for (const slug of slugs) {
  const before = read(BASELINE, slug);
  const after = read(path.join(ROOT, 'content', 'tours'), slug);
  if (PUBLISHED.has(slug)) {
    if (hash(before) !== hash(after)) failures.push({ slug, error: 'published file changed' });
    continue;
  }

  if (hash(before) === hash(after)) failures.push({ slug, error: 'draft file unchanged' });
  else changedDrafts += 1;

  const beforeStructure = structure(before);
  const afterStructure = structure(after);
  if (JSON.stringify(beforeStructure) !== JSON.stringify(afterStructure)) {
    failures.push({ slug, error: 'scene heading or GPS changed' });
  }
  const beforeMarkers = encodingMarkers(before);
  const afterMarkers = encodingMarkers(after);
  if (afterMarkers > beforeMarkers) {
    failures.push({ slug, error: `encoding markers increased: ${beforeMarkers} -> ${afterMarkers}` });
  }
}

console.log(JSON.stringify({
  drafts: slugs.length - PUBLISHED.size,
  changedDrafts,
  publishedChecked: PUBLISHED.size,
  failures,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;

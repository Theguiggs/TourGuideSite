/**
 * Garde d'exposition publique (lot 0.5) : rien du gabarit de démarrage ni du
 * banc d'essai ne doit être servi ou indexé sur le site.
 */
import fs from 'node:fs';
import path from 'node:path';
import robots from '../robots';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

describe('exposition publique', () => {
  it('ne sert plus les fichiers du gabarit Next ni le mémo OG', () => {
    for (const leftover of ['file.svg', 'globe.svg', 'next.svg', 'vercel.svg', 'window.svg', 'og-default-TODO.md']) {
      expect(fs.existsSync(path.join(PUBLIC_DIR, leftover))).toBe(false);
    }
  });

  it('le manifeste porte le nom de la marque', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'manifest.json'), 'utf8'));
    expect(manifest.name).toBe('Murmure');
    expect(manifest.short_name).toBe('Murmure');
  });

  it('robots interdit les espaces privés et le banc d’essai', () => {
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules : [rules]).flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : [r.disallow],
    );
    for (const p of ['/api/', '/guide/', '/admin/', '/test-ds', '/mes-visites', '/en/my-purchases']) {
      expect(disallow).toContain(p);
    }
  });

  it('le banc d’essai du design system répond 404 en production', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'test-ds', 'page.tsx'), 'utf8');
    expect(src).toMatch(/NODE_ENV === 'production'\) notFound\(\)/);
  });

  it("les images OG de secours pointent vers notre domaine, pas vers un fichier absent", () => {
    for (const route of ['og/journal/[slug]/route.tsx', 'og/tour/[city]/[tourSlug]/route.tsx']) {
      const src = fs.readFileSync(path.join(process.cwd(), 'src', 'app', route), 'utf8');
      expect(src).not.toContain('og-default.png');
      expect(src).not.toContain('murmure.app');
    }
  });
});

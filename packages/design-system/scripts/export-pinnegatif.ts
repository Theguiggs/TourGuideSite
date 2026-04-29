/**
 * Story 3.1 — Pipeline d'export `<PinNegatif>` vers PNG/SVG.
 *
 * @decision Tech retenue : `@resvg/resvg-js` (binding Rust ~2 MB, stateless,
 *   pas de browser process, pas de fonts custom requises — `<PinNegatif>`
 *   n'a pas de texte). Fallback Puppeteer (`puppeteer-core` + Chromium déjà
 *   présent via skill `webapp-testing`) activé via env var
 *   `EXPORT_USE_PUPPETEER=1`.
 *
 * @decision Console.log autorisé ici (outil CLI dev-time, hors runtime app —
 *   exception explicite à la convention "logger" du projet TourGuideApp).
 *
 * @usage
 *   npm run tg:export-icons -- --variant light --output-dir ../assets/icons
 *   npm run tg:export-icons -- --variant dark
 *   npm run tg:export-icons -- --variant tinted --config ./scripts/sizes.json
 *
 * @output Voir `EXPORT-PINNEGATIF.md` pour la nomenclature exhaustive.
 *
 * Le script est volontairement structuré pour être testable :
 *  - Les helpers (`resolveVariantColors`, `renderSvg`, `renderPng`,
 *    `outputFileName`) sont exportés.
 *  - L'import de `@resvg/resvg-js` est paresseux (require au moment du render)
 *    pour permettre les mocks Jest sans charger le binaire natif.
 *  - L'entrypoint CLI (`main`) n'est exécuté que si le module est lancé
 *    directement (`require.main === module`).
 */

import * as React from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PinNegatif } from '../components/Pin';
import { tgColors } from '../tokens';

// `react-dom/server` n'a pas de declaration shipped pour cette entry sur
// l'install courante du package DS — déclaration ambient locale (pas de
// pollution globale, pas besoin de `@types/react-dom` plein).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { renderToStaticMarkup } = require('react-dom/server') as {
  renderToStaticMarkup: (el: React.ReactElement) => string;
};

/* ------------------------------------------------------------------------- */
/*  Types                                                                    */
/* ------------------------------------------------------------------------- */

export type Variant = 'light' | 'dark' | 'tinted';

export interface VariantColors {
  bg: string;
  fg: string;
  /** PNG alpha transparent background (only for `tinted`). */
  transparent: boolean;
}

export interface SizesConfig {
  ios: number[];
  android: number[];
  favicon: number[];
  pwa: number[];
  og: Array<{ name: string; width: number; height: number; centered?: boolean }>;
}

export interface CliArgs {
  variant: Variant;
  outputDir: string;
  configPath: string;
}

/* ------------------------------------------------------------------------- */
/*  Variant colors                                                           */
/* ------------------------------------------------------------------------- */

/**
 * Résout les couleurs `bg` / `fg` pour une variante donnée, en lisant
 * `tgColors` depuis `../tokens` (source unique de vérité — aucun hex
 * hard-codé ici, sauf le gris `#9CA3AF` du `tinted` qui n'a pas (encore) de
 * token dédié dans `tgColors`. Voir Risque "tinted variant" dans le spec.
 */
export function resolveVariantColors(variant: Variant): VariantColors {
  switch (variant) {
    case 'light':
      return { bg: tgColors.grenadine, fg: tgColors.paper, transparent: false };
    case 'dark':
      // grenadineDark n'existe pas (encore) dans tgColors — hex hardcodé
      // documenté dans EXPORT-PINNEGATIF.md ; ajout d'un token DS prévu
      // Phase B (cf. references du spec).
      return { bg: '#5B0F12', fg: tgColors.paper, transparent: false };
    case 'tinted':
      // bg transparent (alpha=0) ; fg = gris neutre #9CA3AF (pas de token DS).
      return { bg: 'transparent', fg: '#9CA3AF', transparent: true };
    default: {
      const _exhaustive: never = variant;
      throw new Error(`Unknown variant: ${String(_exhaustive)}`);
    }
  }
}

/* ------------------------------------------------------------------------- */
/*  SVG rendering                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Rend `<PinNegatif>` en SVG via `react-dom/server`, et strippe le wrapper
 * `<div>` que `<PinNegatif>` ajoute autour du `<svg>` pour gérer le
 * `borderRadius` (non utile pour resvg / pour un export PNG natif).
 *
 * @fragility Si `<PinNegatif>` change de wrapper interne, adapter la regex.
 */
export function renderSvg(opts: {
  size: number;
  bg: string;
  fg: string;
  transparent: boolean;
}): string {
  const { size, bg, fg, transparent } = opts;
  const markup = renderToStaticMarkup(
    React.createElement(PinNegatif, {
      size,
      bg: transparent ? 'transparent' : bg,
      fg,
      rounded: false,
    })
  );
  // Extraction du <svg>...</svg> interne ; PinNegatif renvoie <div><svg>...</svg></div>.
  const match = markup.match(/<svg[\s\S]*?<\/svg>/);
  if (!match) {
    throw new Error('Unable to extract <svg> from PinNegatif markup');
  }
  let svg = match[0];

  // Pour la variante `tinted`, on retire le rect plein qui sert de bg —
  // afin que le PNG garde un canal alpha transparent au-delà de la silhouette.
  // React 19 sort `<rect ...></rect>` (closing tag) — couvre les deux formes.
  if (transparent) {
    svg = svg.replace(/<rect[^>]*\/?>(\s*<\/rect>)?/, '');
  }

  // Inject xmlns pour autonomie du fichier (utile pour SVG standalone).
  if (!svg.includes('xmlns=')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svg;
}

/**
 * Convertit un SVG en PNG via `@resvg/resvg-js` (require paresseux pour
 * permettre le mock côté tests + ne pas crasher si le binaire n'est pas
 * encore installé).
 *
 * @param svg SVG markup standalone (avec xmlns).
 * @param size Taille cible en px (carré).
 * @param transparent Si vrai, fond PNG transparent ; sinon fond opaque
 *   utilisé tel quel par resvg (resvg ne compose pas de fond — c'est le SVG
 *   qui le porte via `<rect>`).
 */
export async function renderPng(opts: {
  svg: string;
  size: number;
  transparent: boolean;
}): Promise<Buffer> {
  const { svg, size, transparent } = opts;

  if (process.env.EXPORT_USE_PUPPETEER === '1') {
    // Fallback documenté — non implémenté ici (cf. EXPORT-PINNEGATIF.md
    // troubleshooting). Lancer Chromium pour un seul SVG sans texte est
    // overkill ; on lève une erreur explicite si demandé sans implé.
    throw new Error(
      'EXPORT_USE_PUPPETEER fallback not yet implemented — use @resvg/resvg-js (default).'
    );
  }

  // Lazy require — Jest peut mocker `@resvg/resvg-js` sans devoir installer
  // le binaire natif. Type minimal local pour éviter la dépendance dure aux
  // declarations du package (devDep ajoutée mais non installée encore).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resvg } = require('@resvg/resvg-js') as {
    Resvg: new (
      svg: string,
      opts?: { fitTo?: { mode: 'width'; value: number }; background?: string }
    ) => { render: () => { asPng: () => Buffer } };
  };

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: transparent ? undefined : 'rgba(0,0,0,0)', // fond peint par le SVG
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

/* ------------------------------------------------------------------------- */
/*  File naming + output orchestration                                       */
/* ------------------------------------------------------------------------- */

/**
 * Calcule le nom de fichier de sortie selon la nomenclature AC 6 du spec.
 *
 * @example
 *   outputFileName({platform:'ios', size:1024, variant:'light'})    → 'app-icon-light.png'
 *   outputFileName({platform:'ios', size:180,  variant:'light'})    → 'app-icon-light-180.png'
 *   outputFileName({platform:'android', size:512, variant:'dark'})  → 'app-icon-dark-android-512.png'
 *   outputFileName({platform:'favicon', size:192, variant:'light'}) → 'favicon-192.png'
 *   outputFileName({platform:'pwa', size:180, variant:'light'})     → 'pwa-180.png'
 */
export function outputFileName(opts: {
  platform: 'ios' | 'android' | 'favicon' | 'pwa' | 'og';
  size: number;
  variant: Variant;
  ogName?: string;
}): string {
  const { platform, size, variant, ogName } = opts;
  switch (platform) {
    case 'ios':
      return size === 1024
        ? `app-icon-${variant}.png`
        : `app-icon-${variant}-${size}.png`;
    case 'android':
      return `app-icon-${variant}-android-${size}.png`;
    case 'favicon':
      return `favicon-${size}.png`;
    case 'pwa':
      return `pwa-${size}.png`;
    case 'og':
      return `${ogName ?? 'og-default'}.png`;
  }
}

/** Skip favicon/pwa/og pour `dark` et `tinted` (light only). */
export function shouldSkipPlatform(
  platform: 'ios' | 'android' | 'favicon' | 'pwa' | 'og',
  variant: Variant
): boolean {
  if (variant === 'light') return false;
  return platform === 'favicon' || platform === 'pwa' || platform === 'og';
}

/* ------------------------------------------------------------------------- */
/*  CLI                                                                       */
/* ------------------------------------------------------------------------- */

export function parseArgs(argv: string[]): CliArgs {
  let variant: Variant = 'light';
  let outputDir = path.resolve(__dirname, '..', '..', 'assets', 'icons');
  let configPath = path.resolve(__dirname, 'sizes.json');

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--variant') {
      const v = argv[++i];
      if (v !== 'light' && v !== 'dark' && v !== 'tinted') {
        throw new Error(`Invalid --variant ${v}. Expected light|dark|tinted.`);
      }
      variant = v;
    } else if (a === '--output-dir') {
      outputDir = path.resolve(argv[++i]);
    } else if (a === '--config') {
      configPath = path.resolve(argv[++i]);
    }
  }
  return { variant, outputDir, configPath };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const t0 = Date.now();
  const { variant, outputDir, configPath } = parseArgs(argv);
  const { bg, fg, transparent } = resolveVariantColors(variant);

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as SizesConfig;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let count = 0;

  // Helper de write idempotent.
  const writePng = async (size: number, file: string): Promise<void> => {
    const svg = renderSvg({ size, bg, fg, transparent });
    const png = await renderPng({ svg, size, transparent });
    fs.writeFileSync(path.join(outputDir, file), png);
    count++;
  };

  // iOS
  if (!shouldSkipPlatform('ios', variant)) {
    for (const size of config.ios) {
      await writePng(size, outputFileName({ platform: 'ios', size, variant }));
    }
  }

  // Android
  if (!shouldSkipPlatform('android', variant)) {
    for (const size of config.android) {
      await writePng(size, outputFileName({ platform: 'android', size, variant }));
    }
  }

  // Favicon (light only)
  if (!shouldSkipPlatform('favicon', variant)) {
    for (const size of config.favicon) {
      await writePng(size, outputFileName({ platform: 'favicon', size, variant }));
    }
  }

  // PWA (light only)
  if (!shouldSkipPlatform('pwa', variant)) {
    for (const size of config.pwa) {
      await writePng(size, outputFileName({ platform: 'pwa', size, variant }));
    }
  }

  // OG (light only)
  if (!shouldSkipPlatform('og', variant)) {
    for (const og of config.og) {
      // OG = rectangle (centered PinNegatif on bg — implémentation détaillée
      // déférée à Story 3.5 si besoin de fonts. Ici, version simple : rect bg
      // + Pin centré à `min(width,height)*0.6`).
      const innerSize = Math.round(Math.min(og.width, og.height) * 0.6);
      const innerSvg = renderSvg({ size: innerSize, bg, fg, transparent });
      const offsetX = Math.round((og.width - innerSize) / 2);
      const offsetY = Math.round((og.height - innerSize) / 2);
      const composed =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${og.width}" height="${og.height}" viewBox="0 0 ${og.width} ${og.height}">` +
        `<rect width="${og.width}" height="${og.height}" fill="${bg}"/>` +
        `<g transform="translate(${offsetX},${offsetY})">${innerSvg.replace(/<\/?svg[^>]*>/g, '')}</g>` +
        `</svg>`;
      const png = await renderPng({
        svg: composed,
        size: og.width,
        transparent: false,
      });
      fs.writeFileSync(
        path.join(outputDir, outputFileName({ platform: 'og', size: og.width, variant, ogName: og.name })),
        png
      );
      count++;
    }
  }

  // SVG source (light only — réutilisé par favicon SVG + adaptive Android fg)
  if (variant === 'light') {
    const svg = renderSvg({ size: 220, bg, fg, transparent });
    fs.writeFileSync(path.join(outputDir, 'app-icon.svg'), svg, 'utf-8');
    count++;
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(`[OK] ${count} fichiers générés en ${dt}s (variant: ${variant}, out: ${outputDir})`);
}

/* ------------------------------------------------------------------------- */
/*  Entrypoint guard — main() runs only when invoked directly via tsx/node.  */
/* ------------------------------------------------------------------------- */

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[FAIL]', err);
    process.exit(1);
  });
}

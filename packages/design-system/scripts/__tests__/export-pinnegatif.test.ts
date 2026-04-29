// Story 3.1 — Tests du script d'export <PinNegatif> vers PNG/SVG.
// Pattern Jest hoisting (cf. MEMORY.md) : les `jest.fn()` sont inline dans
// les factories `jest.mock(...)` puis castées dans les tests.

// Mock `node:fs` — on intercepte writeFileSync / mkdirSync / readFileSync /
// existsSync pour éviter de polluer le filesystem pendant les tests.
jest.mock('node:fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn(),
}));

// Mock `@resvg/resvg-js` — binaire natif non installé (Guillaume run npm
// install plus tard). On simule le rendu en retournant un Buffer PNG fixture
// crédible : header PNG 8 bytes + IHDR chunk lisible.
jest.mock(
  '@resvg/resvg-js',
  () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakePngBuffer = (colorType: number): Buffer => {
    // PNG signature : 89 50 4E 47 0D 0A 1A 0A
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // IHDR length (4) + "IHDR" (4) = 8 bytes header
    const ihdrPrefix = Buffer.from([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    // 13 bytes IHDR data : width(4) height(4) bitDepth(1) colorType(1) ...
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(1024, 0); // width
    ihdrData.writeUInt32BE(1024, 4); // height
    ihdrData[8] = 8;                  // bit depth
    ihdrData[9] = colorType;          // color type (6 = RGBA, 2 = RGB)
    ihdrData[10] = 0;                 // compression
    ihdrData[11] = 0;                 // filter
    ihdrData[12] = 0;                 // interlace
    return Buffer.concat([sig, ihdrPrefix, ihdrData]);
  };

  // colorType est dérivé du SVG : si le SVG ne contient pas de <rect> bg,
  // on suppose `tinted` (alpha) → colorType 6 ; sinon RGB → colorType 2.
  return {
    Resvg: jest.fn().mockImplementation((svg: string) => ({
      render: jest.fn().mockReturnValue({
        asPng: jest.fn().mockReturnValue(
          fakePngBuffer(svg.includes('<rect') ? 2 : 6)
        ),
      }),
    })),
  };
  },
  { virtual: true }
);

import {
  resolveVariantColors,
  renderSvg,
  renderPng,
  outputFileName,
  shouldSkipPlatform,
  parseArgs,
  main,
} from '../export-pinnegatif';

describe('resolveVariantColors', () => {
  it('light → grenadine bg + paper fg, opaque', () => {
    const v = resolveVariantColors('light');
    expect(v.bg).toBe('#C1262A');
    expect(v.fg).toBe('#F4ECDD');
    expect(v.transparent).toBe(false);
  });

  it('dark → grenadineDark hex + paper fg, opaque', () => {
    const v = resolveVariantColors('dark');
    expect(v.bg).toBe('#5B0F12');
    expect(v.fg).toBe('#F4ECDD');
    expect(v.transparent).toBe(false);
  });

  it('tinted → transparent bg + gray fg, alpha=true', () => {
    const v = resolveVariantColors('tinted');
    expect(v.bg).toBe('transparent');
    expect(v.fg).toBe('#9CA3AF');
    expect(v.transparent).toBe(true);
  });
});

describe('renderSvg', () => {
  it('produces a standalone <svg> with xmlns', () => {
    const svg = renderSvg({ size: 1024, bg: '#C1262A', fg: '#F4ECDD', transparent: false });
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('strips the <div> wrapper added by PinNegatif', () => {
    const svg = renderSvg({ size: 1024, bg: '#C1262A', fg: '#F4ECDD', transparent: false });
    expect(svg.startsWith('<div')).toBe(false);
    expect(svg.includes('</div>')).toBe(false);
  });

  it('contains <rect> background for opaque variants', () => {
    const svg = renderSvg({ size: 1024, bg: '#C1262A', fg: '#F4ECDD', transparent: false });
    expect(svg).toContain('<rect');
  });

  it('removes <rect> background for tinted (transparent) variant', () => {
    const svg = renderSvg({ size: 1024, bg: 'transparent', fg: '#9CA3AF', transparent: true });
    expect(svg).not.toContain('<rect');
  });
});

describe('renderPng', () => {
  it('returns a Buffer with PNG signature 89 50 4E 47', async () => {
    const svg = renderSvg({ size: 1024, bg: '#C1262A', fg: '#F4ECDD', transparent: false });
    const png = await renderPng({ svg, size: 1024, transparent: false });
    expect(png).toBeInstanceOf(Buffer);
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
  });

  it('tinted PNG has color type 6 (RGBA / alpha channel)', async () => {
    const svg = renderSvg({ size: 1024, bg: 'transparent', fg: '#9CA3AF', transparent: true });
    const png = await renderPng({ svg, size: 1024, transparent: true });
    // Byte 25 of a PNG = colorType (8 sig + 8 IHDR header + offset 9 inside IHDR data = 25)
    expect(png[25]).toBe(6);
  });

  it('opaque variant PNG has color type 2 (RGB)', async () => {
    const svg = renderSvg({ size: 1024, bg: '#C1262A', fg: '#F4ECDD', transparent: false });
    const png = await renderPng({ svg, size: 1024, transparent: false });
    expect(png[25]).toBe(2);
  });
});

describe('outputFileName', () => {
  it('iOS 1024 (light) → app-icon-light.png (no size suffix)', () => {
    expect(outputFileName({ platform: 'ios', size: 1024, variant: 'light' })).toBe(
      'app-icon-light.png'
    );
  });

  it('iOS 180 (light) → app-icon-light-180.png', () => {
    expect(outputFileName({ platform: 'ios', size: 180, variant: 'light' })).toBe(
      'app-icon-light-180.png'
    );
  });

  it('Android 512 (dark) → app-icon-dark-android-512.png', () => {
    expect(outputFileName({ platform: 'android', size: 512, variant: 'dark' })).toBe(
      'app-icon-dark-android-512.png'
    );
  });

  it('favicon 192 → favicon-192.png (no variant suffix)', () => {
    expect(outputFileName({ platform: 'favicon', size: 192, variant: 'light' })).toBe(
      'favicon-192.png'
    );
  });

  it('pwa 180 → pwa-180.png', () => {
    expect(outputFileName({ platform: 'pwa', size: 180, variant: 'light' })).toBe(
      'pwa-180.png'
    );
  });
});

describe('shouldSkipPlatform', () => {
  it('light: never skip', () => {
    expect(shouldSkipPlatform('ios', 'light')).toBe(false);
    expect(shouldSkipPlatform('favicon', 'light')).toBe(false);
    expect(shouldSkipPlatform('pwa', 'light')).toBe(false);
    expect(shouldSkipPlatform('og', 'light')).toBe(false);
  });

  it('dark/tinted: skip favicon, pwa, og', () => {
    expect(shouldSkipPlatform('favicon', 'dark')).toBe(true);
    expect(shouldSkipPlatform('pwa', 'dark')).toBe(true);
    expect(shouldSkipPlatform('og', 'dark')).toBe(true);
    expect(shouldSkipPlatform('favicon', 'tinted')).toBe(true);
    expect(shouldSkipPlatform('og', 'tinted')).toBe(true);
  });

  it('dark/tinted: do NOT skip ios/android', () => {
    expect(shouldSkipPlatform('ios', 'dark')).toBe(false);
    expect(shouldSkipPlatform('android', 'tinted')).toBe(false);
  });
});

describe('parseArgs', () => {
  it('defaults to variant=light', () => {
    const a = parseArgs([]);
    expect(a.variant).toBe('light');
  });

  it('parses --variant dark', () => {
    expect(parseArgs(['--variant', 'dark']).variant).toBe('dark');
  });

  it('throws on invalid --variant', () => {
    expect(() => parseArgs(['--variant', 'rainbow'])).toThrow(/Invalid --variant/);
  });

  it('parses --output-dir as absolute path', () => {
    const a = parseArgs(['--output-dir', './foo']);
    expect(a.outputDir).toMatch(/foo$/);
  });
});

describe('main (light variant — sample sizes)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('node:fs') as {
    writeFileSync: jest.Mock;
    mkdirSync: jest.Mock;
    existsSync: jest.Mock;
    readFileSync: jest.Mock;
  };
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    fs.writeFileSync.mockClear();
    fs.mkdirSync.mockClear();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        ios: [1024, 180],
        android: [512],
        favicon: [32],
        pwa: [180],
        og: [],
      })
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('writes the expected files for --variant light (sample)', async () => {
    await main(['--variant', 'light', '--output-dir', '/tmp/test-icons']);

    const writtenNames = fs.writeFileSync.mock.calls.map(
      (c: [string, ...unknown[]]) => String(c[0]).split(/[\\/]/).pop()
    );
    expect(writtenNames).toContain('app-icon-light.png');
    expect(writtenNames).toContain('app-icon-light-180.png');
    expect(writtenNames).toContain('app-icon-light-android-512.png');
    expect(writtenNames).toContain('favicon-32.png');
    expect(writtenNames).toContain('pwa-180.png');
    expect(writtenNames).toContain('app-icon.svg');
  });

  it('does NOT write favicon/pwa/svg when --variant tinted', async () => {
    await main(['--variant', 'tinted', '--output-dir', '/tmp/test-icons']);

    const writtenNames = fs.writeFileSync.mock.calls.map(
      (c: [string, ...unknown[]]) => String(c[0]).split(/[\\/]/).pop()
    );
    expect(writtenNames).toContain('app-icon-tinted.png');
    expect(writtenNames).toContain('app-icon-tinted-android-512.png');
    expect(writtenNames).not.toContain('favicon-32.png');
    expect(writtenNames).not.toContain('pwa-180.png');
    expect(writtenNames).not.toContain('app-icon.svg');
  });
});

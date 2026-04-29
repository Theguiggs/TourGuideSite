/**
 * Story 2.6 — Tests <Player> Web (DS package)
 *
 * Couvre :
 *  - Wiring : Player exporté Web ; ligne RN câblée dans `rn/index.ts` ;
 *    miroir RN existe (`components-rn/Player.tsx`).
 *  - Variants : `mini` + `full` (snapshot chacun).
 *  - Backward-compat : prop `mode` agit comme alias de `variant`.
 *  - Mini : fond = `tgColors.paper` (pas `ink`), hauteur 64, cover thumb 48×48,
 *    onTap déclenché sur container hors play, NON déclenché sur le bouton play.
 *  - Full : mapSlot render-prop reçoit le node consumer, sinon Pin stub.
 *  - Full : onSkip(-15) / onSkip(+15) / onPlayPause appelés.
 *  - Full : transcript — segment actif `editorial` italique.
 *  - Validation props : `position > duration` clamp ; `duration === 0`
 *    progress 0 % sans NaN.
 *
 * Pattern : `react-test-renderer` + `act()` (identique Button.test.tsx).
 */

import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import TestRenderer, { act } from 'react-test-renderer';
import { Player } from '../web';
import { tgColors, tgFonts } from '../tokens';

type RenderedNode = {
  type: string;
  props: Record<string, unknown>;
  children: unknown[] | null;
};

function renderToJSON(element: React.ReactElement): RenderedNode {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  const tree = renderer!.toJSON();
  if (tree === null || Array.isArray(tree) || typeof tree === 'string') {
    throw new Error('Expected single rendered element node');
  }
  return tree as RenderedNode;
}

function createInstance(element: React.ReactElement): TestRenderer.ReactTestInstance {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  return renderer!.root;
}

const baseProps = {
  title: 'Le Marais aujourd\'hui',
  subtitle: 'Paris · 38 min',
  position: 60,
  duration: 240,
  isPlaying: false,
  onPlayPause: () => undefined,
};

describe('Player — exports & wiring', () => {
  it('Player is exported from @tourguide/design-system/web', () => {
    expect(Player).toBeDefined();
    expect(typeof Player).toBe('function');
  });

  it('Player RN miroir wired in @tourguide/design-system/rn (Story 2.6)', () => {
    const rnIndex = fs.readFileSync(
      path.join(__dirname, '..', 'rn', 'index.ts'),
      'utf8',
    );
    expect(rnIndex).toMatch(/export \* from '\.\.\/components-rn\/Player';/);
  });

  it('Player RN miroir file exists at design-system/components-rn/Player.tsx', () => {
    const rnPlayer = path.join(__dirname, '..', 'components-rn', 'Player.tsx');
    expect(fs.existsSync(rnPlayer)).toBe(true);
  });
});

describe('Player — variant mini', () => {
  it('renders the mini container (snapshot)', () => {
    const tree = renderToJSON(<Player {...baseProps} variant="mini" />);
    expect(tree).toMatchSnapshot();
  });

  it('uses tgColors.paper background (NOT ink — brief §3 delta)', () => {
    const tree = renderToJSON(<Player {...baseProps} variant="mini" />);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.background).toBe(tgColors.paper);
    expect(style.background).not.toBe(tgColors.ink);
  });

  it('mini height is strictly 64', () => {
    const tree = renderToJSON(<Player {...baseProps} variant="mini" />);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.height).toBe(64);
  });

  it('mini cover thumb is 48×48 (NOT 44 — brief §3 delta)', () => {
    const root = createInstance(<Player {...baseProps} variant="mini" />);
    // 1er div enfant = cover thumb
    const divs = root.findAllByType('div');
    const cover = divs.find(
      (d) => (d.props.style as { width?: number } | undefined)?.width === 48,
    );
    expect(cover).toBeDefined();
    const style = cover!.props.style as Record<string, unknown>;
    expect(style.width).toBe(48);
    expect(style.height).toBe(48);
  });

  it('onTap fires on container click but NOT on play button click', () => {
    const onTap = jest.fn();
    const onPlayPause = jest.fn();
    const root = createInstance(
      <Player {...baseProps} variant="mini" onTap={onTap} onPlayPause={onPlayPause} />,
    );

    // Container = div racine avec testID "player-mini" (data-testid en Web).
    const container = root.findByProps({ 'data-testid': 'player-mini' });
    act(() => {
      (container.props.onClick as (e: unknown) => void)({
        target: { closest: () => null } as unknown,
      });
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    // Click play : stopPropagation + onPlayPause.
    const playBtn = root.findByProps({ 'data-player-play': true });
    const stopPropagation = jest.fn();
    act(() => {
      (playBtn.props.onClick as (e: unknown) => void)({ stopPropagation });
    });
    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('mini play button aria-label toggles between "Lire" and "Pause"', () => {
    const root1 = createInstance(<Player {...baseProps} variant="mini" isPlaying={false} />);
    const btn1 = root1.findByProps({ 'data-player-play': true });
    expect(btn1.props['aria-label']).toBe('Lire');

    const root2 = createInstance(<Player {...baseProps} variant="mini" isPlaying={true} />);
    const btn2 = root2.findByProps({ 'data-player-play': true });
    expect(btn2.props['aria-label']).toBe('Pause');
  });
});

describe('Player — variant alias `mode` (backward-compat)', () => {
  it('mode="mini" behaves like variant="mini"', () => {
    const tree = renderToJSON(<Player {...baseProps} mode="mini" />);
    expect((tree.props as { 'data-testid'?: string })['data-testid']).toBe('player-mini');
  });

  it('mode="full" behaves like variant="full"', () => {
    const tree = renderToJSON(<Player {...baseProps} mode="full" />);
    expect((tree.props as { 'data-testid'?: string })['data-testid']).toBe('player-full');
  });

  it('explicit `variant` wins over `mode` if both provided', () => {
    const tree = renderToJSON(<Player {...baseProps} mode="full" variant="mini" />);
    expect((tree.props as { 'data-testid'?: string })['data-testid']).toBe('player-mini');
  });
});

describe('Player — variant full', () => {
  it('renders the full container (snapshot)', () => {
    const tree = renderToJSON(
      <Player
        {...baseProps}
        variant="full"
        currentStopIndex={2}
        totalStops={5}
        city="Paris"
        durationLabel="38 min"
        stepsLabel="5 étapes"
        langLabel="FR"
      />,
    );
    expect(tree).toMatchSnapshot();
  });

  it('renders the placeholder Pin stub when mapSlot is undefined', () => {
    const root = createInstance(<Player {...baseProps} variant="full" />);
    const stub = root.findByProps({ 'data-testid': 'player-map-stub' });
    expect(stub).toBeDefined();
  });

  it('renders consumer mapSlot when provided (render-prop pattern)', () => {
    const customMap = <div data-testid="custom-map">My custom Leaflet map</div>;
    const root = createInstance(<Player {...baseProps} variant="full" mapSlot={customMap} />);
    const custom = root.findByProps({ 'data-testid': 'custom-map' });
    expect(custom).toBeDefined();
    // Et le stub par défaut n'est PAS rendu.
    expect(() => root.findByProps({ 'data-testid': 'player-map-stub' })).toThrow();
  });

  it('onSkip(-15) is called on skip-back click', () => {
    const onSkip = jest.fn();
    const root = createInstance(
      <Player {...baseProps} variant="full" onSkip={onSkip} />,
    );
    const btn = root.findByProps({ 'data-testid': 'player-skip-back' });
    act(() => {
      (btn.props.onClick as () => void)();
    });
    expect(onSkip).toHaveBeenCalledWith(-15);
  });

  it('onSkip(+15) is called on skip-forward click', () => {
    const onSkip = jest.fn();
    const root = createInstance(
      <Player {...baseProps} variant="full" onSkip={onSkip} />,
    );
    const btn = root.findByProps({ 'data-testid': 'player-skip-forward' });
    act(() => {
      (btn.props.onClick as () => void)();
    });
    expect(onSkip).toHaveBeenCalledWith(15);
  });

  it('onPlayPause is called on the central play button', () => {
    const onPlayPause = jest.fn();
    const root = createInstance(
      <Player {...baseProps} variant="full" onPlayPause={onPlayPause} />,
    );
    const btn = root.findByProps({ 'data-testid': 'player-playpause' });
    act(() => {
      (btn.props.onClick as () => void)();
    });
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('onSeek is called on scrubber click with position proportional to click X', () => {
    const onSeek = jest.fn();
    const root = createInstance(
      <Player {...baseProps} variant="full" duration={100} position={0} onSeek={onSeek} />,
    );
    const scrubber = root.findByProps({ 'data-testid': 'player-scrubber' });
    // Simule un click au milieu (pct = 0.5) → onSeek(50).
    act(() => {
      (scrubber.props.onClick as (e: unknown) => void)({
        currentTarget: {
          getBoundingClientRect: () => ({ left: 0, width: 200 }),
        },
        clientX: 100,
      });
    });
    expect(onSeek).toHaveBeenCalled();
    const arg = onSeek.mock.calls[0][0] as number;
    expect(arg).toBeCloseTo(50, 5);
  });
});

describe('Player — transcript', () => {
  const segments = [
    { id: 's1', text: 'Première phrase' },
    { id: 's2', text: 'Deuxième phrase active' },
    { id: 's3', text: 'Troisième phrase à venir' },
  ];

  it('active segment uses tgFonts.editorial italic + ink color', () => {
    const root = createInstance(
      <Player
        {...baseProps}
        variant="full"
        transcriptSegments={segments}
        currentSegmentId="s2"
      />,
    );
    const allP = root.findAllByType('p');
    const active = allP.find(
      (p) => p.props['data-segment-id'] === 's2',
    );
    expect(active).toBeDefined();
    const style = active!.props.style as Record<string, unknown>;
    expect(style.fontFamily).toBe(tgFonts.editorial);
    expect(style.fontStyle).toBe('italic');
    expect(style.color).toBe(tgColors.ink);
  });

  it('past segment uses ink60, future segment uses ink40', () => {
    const root = createInstance(
      <Player
        {...baseProps}
        variant="full"
        transcriptSegments={segments}
        currentSegmentId="s2"
      />,
    );
    const past = root
      .findAllByType('p')
      .find((p) => p.props['data-segment-id'] === 's1')!;
    const future = root
      .findAllByType('p')
      .find((p) => p.props['data-segment-id'] === 's3')!;
    expect((past.props.style as Record<string, unknown>).color).toBe(tgColors.ink60);
    expect((future.props.style as Record<string, unknown>).color).toBe(tgColors.ink40);
  });
});

describe('Player — prop validation (defensive)', () => {
  it('position > duration → progress clamps to duration (no overflow)', () => {
    const root = createInstance(
      <Player {...baseProps} variant="full" position={500} duration={100} />,
    );
    // Le progress fill n'a PAS de background = ink20 (le rail) — il a
    // background = grenadine (le fill). On filtre sur le background.
    const allDivs = root.findAllByType('div');
    const progressFills = allDivs
      .map((d) => d.props.style as Record<string, unknown> | undefined)
      .filter(
        (s) =>
          s && (s.background === tgColors.grenadine || s.background === tgColors.grenadine + ''),
      );
    expect(progressFills.length).toBeGreaterThan(0);
    for (const s of progressFills) {
      const w = s!.width as string;
      const pct = parseFloat(w.replace('%', ''));
      expect(Number.isNaN(pct)).toBe(false);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it('duration === 0 → progress is 0% without NaN', () => {
    const root = createInstance(
      <Player {...baseProps} variant="full" position={42} duration={0} />,
    );
    const allDivs = root.findAllByType('div');
    const progressFills = allDivs
      .map((d) => d.props.style as Record<string, unknown> | undefined)
      .filter((s) => s && s.background === tgColors.grenadine);
    expect(progressFills.length).toBeGreaterThan(0);
    for (const s of progressFills) {
      const pct = parseFloat((s!.width as string).replace('%', ''));
      expect(Number.isNaN(pct)).toBe(false);
      expect(pct).toBe(0);
    }
  });
});

import * as React from 'react';
import { tgColors, type TgColor } from '../tokens';

/**
 * Helper interne — résout une couleur passée en string :
 * - si c'est une clé de `tgColors` (ex: `"grenadine"`), retourne la valeur hex.
 * - sinon, retourne la string telle quelle (hex/rgb/named CSS).
 *
 * @example
 *   resolveColor('grenadine') // '#C1262A'
 *   resolveColor('#FF0000')   // '#FF0000'
 *   resolveColor('red')       // 'red'
 */
function resolveColor(c: string): string {
  return (tgColors as Record<string, string>)[c] ?? c;
}

/**
 * Ratio de border-radius par défaut pour `rounded={true}` (≈ iOS app icon).
 * Utilisé aussi par `<PinNegatif>` AC5.
 */
const DEFAULT_ROUNDED_RATIO = 0.225;

/**
 * <Pin> — l'épingle, ADN visuel TourGuide.
 * Sert à la fois d'icône, de marqueur de carte, et de logo.
 *
 * size  : pixels
 * color : couleur du corps de l'épingle (default = grenadine).
 *         Accepte une **clé `tgColors`** (`"grenadine"`, `"ocre"`, `"mer"`,
 *         `"olive"`, ...) ou une **valeur littérale** (hex/rgb/named CSS).
 * dot   : couleur du cercle intérieur (default = paper). Même résolution.
 * label : optionnel — numéro/lettre dans le cercle (étape, indicateur)
 */
export interface PinProps {
  size?: number;
  color?: string;
  dot?: string;
  label?: string | number;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export function Pin({
  size = 32,
  color = 'grenadine',
  dot = 'paper',
  label,
  className,
  style,
  ...aria
}: PinProps) {
  const fill = resolveColor(color);
  const dotFill = resolveColor(dot);
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={aria['aria-label'] ? 'img' : 'presentation'}
      {...aria}
    >
      <path
        d="M16 3 c-5 0 -9 4 -9 9 c0 6.5 9 17 9 17 s9 -10.5 9 -17 c0 -5 -4 -9 -9 -9 z"
        fill={fill}
      />
      {label != null ? (
        <>
          <circle cx="16" cy="13" r="5.5" fill={dotFill} />
          <text
            x="16"
            y="16"
            textAnchor="middle"
            fontFamily='"DM Serif Display", Georgia, serif'
            fontSize="8"
            fill={fill}
          >
            {label}
          </text>
        </>
      ) : (
        <circle cx="16" cy="13" r="3" fill={dotFill} />
      )}
    </svg>
  );
}

/**
 * <PinNegatif> — version « icône d'app ».
 * Pin évidée sur fond couleur, pour app-icon, splash, favicon.
 *
 * `rounded` :
 *   - `false` → carré net (`borderRadius: 0`) — Android adaptive icon foreground
 *   - `true`  → ratio iOS standard (`0.225`)
 *   - `number`→ ratio direct (ex: `0.5` = pill)
 */
export interface PinNegatifProps {
  size?: number;
  bg?: string;
  fg?: string;
  rounded?: boolean | number;
}

export function PinNegatif({
  size = 80,
  bg = 'grenadine',
  fg = 'paper',
  rounded = DEFAULT_ROUNDED_RATIO,
}: PinNegatifProps) {
  const ratio =
    rounded === true
      ? DEFAULT_ROUNDED_RATIO
      : rounded === false
        ? 0
        : rounded;
  const r = size * ratio;
  const bgFill = resolveColor(bg);
  const fgFill = resolveColor(fg);
  return (
    <div style={{ width: size, height: size, borderRadius: r, overflow: 'hidden' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        <rect width="220" height="220" fill={bgFill} />
        <path
          d="M110 38 c-30 0 -54 24 -54 54 c0 38 54 78 54 78 s54 -40 54 -78 c0 -30 -24 -54 -54 -54 z"
          fill={fgFill}
        />
        <circle cx="110" cy="92" r="18" fill={bgFill} />
      </svg>
    </div>
  );
}

// Type explicit re-use to avoid TS dead-code warnings if needed by downstream.
export type { TgColor };

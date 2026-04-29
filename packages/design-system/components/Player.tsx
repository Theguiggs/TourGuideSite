'use client';

import * as React from 'react';
import {
  tgColors,
  tgFonts,
  tgFontSize,
  tgRadius,
  tgShadow,
  tgSpace,
  tgTracking,
} from '../tokens';
import { Pin } from './Pin';
import { Button } from './Button';
import { Eyebrow } from './Typography';
import { Chip } from './Chip';

/**
 * <Player> — composant signature de l'app TourGuide (Story 2.6).
 *
 * Le brief §3 marque ce composant comme « **L'écran le plus important — soin
 * maximum.** » C'est la story la plus large d'Epic 2 ; le composant fait
 * converger Stories 2.1 (Button), 2.4 (Pin), 2.5 (Typography Eyebrow) et
 * prépare Stories 5.6/5.7 (intégration mobile) et Story 7.0 (quality gates).
 *
 * **Hors-scope** : aucune logique audio (play/pause/seek/decode). L'état
 * (`position`, `duration`, `isPlaying`, `currentSegmentId`) arrive en props.
 * Le wiring `<audio>` HTML / `expo-av` / `react-native-track-player` est la
 * responsabilité des stories d'intégration (5.6, 5.7).
 *
 * Variants :
 * - `variant="mini"` : barre sticky bottom 64 px, fond `paper`, ombre `lg`
 *   orientée vers le haut. Cover thumb 48×48, titre + meta 1 ligne, bouton
 *   play/pause icon-only à droite. Tap n'importe où sauf le bouton play
 *   déclenche `onTap` (le consumer route vers le full).
 * - `variant="full"` : plein écran, header avec actions secondaires
 *   (download/share/more), zone carte (slot via render-prop `mapSlot` —
 *   stub color-block par défaut côté Web), métadonnées avec Eyebrow
 *   "Étape N · ville", scrubber 1 px hit zone 44 pt, controls
 *   skip-back-15/play/skip-forward-15, transcript scrollable avec phrase
 *   active en `editorial` italique.
 *
 * **Décision V1.0 — Web map** : la carte côté Web est un visual stub
 * (color-block + Pin). La vraie carte interactive est mobile-first
 * (Story 5.7, react-native-maps via `mapSlot`). Côté Web, les consumers
 * peuvent fournir leur propre intégration Leaflet/Mapbox via `mapSlot`.
 *
 * **Backward-compat** : la prop `mode` (Story 1.1 POC) reste un alias soft
 * de `variant` jusqu'à Story 7.4. Si les deux sont passés, `variant` gagne.
 */
export type PlayerVariant = 'mini' | 'full';

export interface TranscriptSegment {
  id: string;
  text: string;
  /** Démarrage du segment en secondes (utile pour `onSegmentClick`, optionnel). */
  startSec?: number;
}

export interface PlayerProps {
  /** Variant principal. Si absent, `mode` est utilisé comme fallback (legacy). */
  variant?: PlayerVariant;
  /** @deprecated Story 7.4 — utiliser `variant`. Conservé pour compat POC Story 1.1. */
  mode?: PlayerVariant;

  // Contenu
  title: string;
  subtitle?: string;
  /** Index de l'arrêt en cours (1-based) — affiché dans l'Eyebrow full. */
  currentStopIndex?: number;
  /** Total des arrêts du tour — affiché dans l'Eyebrow full. */
  totalStops?: number;
  /** Ville/lieu — affiché dans l'Eyebrow full ("Étape N · {city}"). */
  city?: string;

  // État audio (en props — la logique est externe)
  position: number;
  duration: number;
  isPlaying: boolean;

  // Transcript
  /** Identifiant du segment actuellement lu — déclenche un auto-scroll Web. */
  currentSegmentId?: string;
  transcriptSegments?: TranscriptSegment[];

  // Map (full uniquement)
  /**
   * Slot personnalisé pour la carte (full variant).
   *
   * Web : par défaut, render un placeholder color-block (`merSoft` + `<Pin>`).
   * Si `mapSlot` est fourni, c'est le node consumer qui s'affiche (Leaflet,
   * Mapbox, etc.).
   *
   * Mobile (RN miroir) : le consumer passe son propre `<MapView>` de
   * `react-native-maps` (Story 5.7) — le composant DS ne dépend PAS de
   * `react-native-maps`.
   */
  mapSlot?: React.ReactNode;

  // Métadonnées chips (full)
  durationLabel?: string;
  stepsLabel?: string;
  langLabel?: string;

  // Callbacks
  onPlayPause: () => void;
  onSkip?: (delta: number) => void;
  onSeek?: (positionSec: number) => void;
  /** Mini : tap container hors play button. */
  onTap?: () => void;
  /** Full : bouton fermer (top-right). */
  onClose?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMore?: () => void;

  // Polish
  pinColor?: string;
  /**
   * Image cover (mini + full). Si absent, fallback `<Pin>` grenadine.
   * Web : URL string utilisé en `background-image`. RN : `{ uri: string }`.
   */
  coverImage?: string;
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function clampProgress(position: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const safe = Math.max(0, Math.min(position, duration));
  return safe / duration;
}

export function Player(props: PlayerProps) {
  const {
    variant: variantProp,
    mode,
    title,
    subtitle,
    currentStopIndex,
    totalStops,
    city,
    position,
    duration,
    isPlaying,
    currentSegmentId,
    transcriptSegments,
    mapSlot,
    durationLabel,
    stepsLabel,
    langLabel,
    onPlayPause,
    onSkip,
    onSeek,
    onTap,
    onClose,
    onDownload,
    onShare,
    onMore,
    pinColor = tgColors.grenadine,
    coverImage,
  } = props;

  const variant: PlayerVariant = variantProp ?? mode ?? 'mini';
  const progress = clampProgress(position, duration);

  if (variant === 'mini') {
    return (
      <MiniPlayer
        title={title}
        subtitle={subtitle}
        progress={progress}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        onTap={onTap}
        pinColor={pinColor}
        coverImage={coverImage}
      />
    );
  }

  return (
    <FullPlayer
      title={title}
      subtitle={subtitle}
      currentStopIndex={currentStopIndex}
      totalStops={totalStops}
      city={city}
      position={position}
      duration={duration}
      progress={progress}
      isPlaying={isPlaying}
      currentSegmentId={currentSegmentId}
      transcriptSegments={transcriptSegments}
      mapSlot={mapSlot}
      durationLabel={durationLabel}
      stepsLabel={stepsLabel}
      langLabel={langLabel}
      onPlayPause={onPlayPause}
      onSkip={onSkip}
      onSeek={onSeek}
      onClose={onClose}
      onDownload={onDownload}
      onShare={onShare}
      onMore={onMore}
      pinColor={pinColor}
      coverImage={coverImage}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini variant
// ─────────────────────────────────────────────────────────────────────────────

interface MiniPlayerProps {
  title: string;
  subtitle?: string;
  progress: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onTap?: () => void;
  pinColor: string;
  coverImage?: string;
}

function MiniPlayer({
  title,
  subtitle,
  progress,
  isPlaying,
  onPlayPause,
  onTap,
  pinColor,
  coverImage,
}: MiniPlayerProps) {
  // Tap sur le container = onTap, sauf si la cible est dans la zone du play
  // button (qui stoppe la propagation en interne).
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!onTap) return;
    const el = e.target as HTMLElement;
    if (el.closest('[data-player-play]')) return;
    onTap();
  };

  return (
    <div
      data-testid="player-mini"
      onClick={handleContainerClick}
      style={{
        position: 'sticky',
        bottom: 0,
        height: 64,
        boxSizing: 'border-box',
        background: tgColors.paper,
        color: tgColors.ink,
        // tg.shadow.lg orientée vers le haut (offset Y négatif). Token de
        // référence : `tgShadow.lg = '0 12px 28px rgba(16, 42, 67, 0.14)'`.
        // On dérive l'inversion en remplaçant l'offset Y par sa valeur négative.
        boxShadow: tgShadow.lg.replace('12px', '-8px'),
        borderTopLeftRadius: tgRadius.lg,
        borderTopRightRadius: tgRadius.lg,
        display: 'flex',
        alignItems: 'center',
        gap: tgSpace[3],
        padding: `${tgSpace[2]}px ${tgSpace[4]}px`,
        cursor: onTap ? 'pointer' : 'default',
      }}
    >
      {/* Cover thumb 48×48 */}
      <div
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: tgRadius.md,
          background: coverImage ? `center / cover no-repeat url(${coverImage})` : tgColors.paperDeep,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {!coverImage && <Pin size={28} color={pinColor} />}
      </div>

      {/* Texte (ellipsis) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: tgFonts.display,
            fontSize: tgFontSize.bodyLg,
            color: tgColors.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: tgTracking.display,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: tgFonts.sans,
              fontSize: tgFontSize.meta,
              color: tgColors.ink60,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
        {/* Mini-progress hairline */}
        <div
          style={{
            height: 1,
            background: tgColors.ink20,
            marginTop: 6,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${progress * 100}%`, height: '100%', background: pinColor }} />
        </div>
      </div>

      {/* Play/pause icon-only 40×40 — data-player-play permet de bypass onTap */}
      <button
        type="button"
        data-player-play
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
        aria-label={isPlaying ? 'Pause' : 'Lire'}
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: tgRadius.pill,
          background: pinColor,
          color: tgColors.paper,
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full variant
// ─────────────────────────────────────────────────────────────────────────────

interface FullPlayerProps {
  title: string;
  subtitle?: string;
  currentStopIndex?: number;
  totalStops?: number;
  city?: string;
  position: number;
  duration: number;
  progress: number;
  isPlaying: boolean;
  currentSegmentId?: string;
  transcriptSegments?: TranscriptSegment[];
  mapSlot?: React.ReactNode;
  durationLabel?: string;
  stepsLabel?: string;
  langLabel?: string;
  onPlayPause: () => void;
  onSkip?: (delta: number) => void;
  onSeek?: (positionSec: number) => void;
  onClose?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  pinColor: string;
  coverImage?: string;
}

function FullPlayer({
  title,
  subtitle,
  currentStopIndex,
  totalStops,
  city,
  position,
  duration,
  progress,
  isPlaying,
  currentSegmentId,
  transcriptSegments,
  mapSlot,
  durationLabel,
  stepsLabel,
  langLabel,
  onPlayPause,
  onSkip,
  onSeek,
  onClose,
  onDownload,
  onShare,
  onMore,
  pinColor,
  coverImage,
}: FullPlayerProps) {
  const transcriptRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll vers le segment actif (best-effort, JSDOM ignore behavior).
  React.useEffect(() => {
    if (!currentSegmentId || !transcriptRef.current) return;
    const node = transcriptRef.current.querySelector<HTMLElement>(
      `[data-segment-id="${currentSegmentId}"]`
    );
    if (node && typeof node.scrollIntoView === 'function') {
      try {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // JSDOM ne supporte pas options — ignore.
      }
    }
  }, [currentSegmentId]);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  // Eyebrow text : "Étape N · ville" si fournis, sinon fallback subtitle.
  const eyebrowText =
    currentStopIndex && totalStops
      ? city
        ? `Étape ${currentStopIndex} · ${city}`
        : `Étape ${currentStopIndex} / ${totalStops}`
      : subtitle ?? '';

  return (
    <div
      data-testid="player-full"
      style={{
        background: tgColors.paper,
        color: tgColors.ink,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: 'inherit',
      }}
    >
      {/* Header — actions secondaires + close */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${tgSpace[3]}px ${tgSpace[5]}px`,
          minHeight: 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tgSpace[2] }}>
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel="Télécharger"
              onClick={onDownload}
              testID="player-download"
            >
              {'⤓'}
            </Button>
          )}
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel="Partager"
              onClick={onShare}
              testID="player-share"
            >
              {'↗'}
            </Button>
          )}
          {onMore && (
            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel="Plus d'options"
              onClick={onMore}
              testID="player-more"
            >
              {'⋯'}
            </Button>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            accessibilityLabel="Fermer"
            onClick={onClose}
            testID="player-close"
          >
            {'×'}
          </Button>
        )}
      </div>

      {/* Map slot — render-prop OU placeholder Web stub */}
      <div
        data-testid="player-map"
        style={{
          flex: '0 0 auto',
          height: '33vh',
          minHeight: 200,
          background: tgColors.merSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {mapSlot ?? (
          <div data-testid="player-map-stub" style={{ textAlign: 'center' }}>
            {coverImage ? (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: tgRadius.lg,
                  background: `center / cover no-repeat url(${coverImage})`,
                }}
              />
            ) : (
              <Pin size={64} color={pinColor} label={currentStopIndex} />
            )}
          </div>
        )}
      </div>

      {/* Métadonnées */}
      <div style={{ padding: `${tgSpace[6]}px ${tgSpace[6]}px ${tgSpace[4]}px` }}>
        {eyebrowText && (
          <Eyebrow color={tgColors.grenadine} style={{ marginBottom: tgSpace[2] }}>
            {eyebrowText}
          </Eyebrow>
        )}
        <h5
          style={{
            fontFamily: tgFonts.display,
            fontSize: tgFontSize.h5,
            color: tgColors.ink,
            letterSpacing: tgTracking.display,
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {title}
        </h5>
        {subtitle && (
          <div
            style={{
              fontFamily: tgFonts.sans,
              fontSize: tgFontSize.caption,
              color: tgColors.ink60,
              marginTop: tgSpace[1],
            }}
          >
            {subtitle}
          </div>
        )}

        {/* Chips meta */}
        {(durationLabel || stepsLabel || langLabel) && (
          <div style={{ display: 'flex', gap: tgSpace[2], marginTop: tgSpace[4], flexWrap: 'wrap' }}>
            {durationLabel && <Chip color="default">{durationLabel}</Chip>}
            {stepsLabel && <Chip color="default">{stepsLabel}</Chip>}
            {langLabel && <Chip color="default">{langLabel}</Chip>}
          </div>
        )}
      </div>

      {/* Scrubber — rail 1px, hit zone 44pt verticale via padding transparent */}
      <div style={{ padding: `0 ${tgSpace[6]}px` }}>
        <div
          data-testid="player-scrubber"
          role="slider"
          aria-label="Position de lecture"
          aria-valuemin={0}
          aria-valuemax={duration > 0 ? Math.round(duration) : 0}
          aria-valuenow={Math.round(position)}
          tabIndex={0}
          onClick={handleScrubberClick}
          onKeyDown={(e) => {
            if (!onSeek) return;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              onSeek(Math.max(0, position - 5));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              onSeek(Math.min(duration, position + 5));
            }
          }}
          style={{
            // Hit zone tactile 44 px : 22 + 1 + 21 = 44
            height: 44,
            display: 'flex',
            alignItems: 'center',
            cursor: onSeek ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 1,
              background: tgColors.ink20,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${progress * 100}%`,
                height: '100%',
                background: tgColors.grenadine,
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: tgFonts.mono,
            fontSize: 11,
            color: tgColors.ink60,
            marginTop: 4,
          }}
        >
          <span data-testid="player-position">{fmt(position)}</span>
          <span data-testid="player-duration">{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tgSpace[6],
          padding: `${tgSpace[5]}px 0`,
        }}
      >
        <button
          type="button"
          aria-label="Reculer de 15 secondes"
          data-testid="player-skip-back"
          onClick={() => onSkip?.(-15)}
          style={controlBtn}
        >
          {'−'}15
        </button>
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Lire'}
          data-testid="player-playpause"
          onClick={onPlayPause}
          style={{
            width: 64,
            height: 64,
            borderRadius: tgRadius.pill,
            background: pinColor,
            color: tgColors.paper,
            border: 'none',
            cursor: 'pointer',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: tgShadow.accent,
          }}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          aria-label="Avancer de 15 secondes"
          data-testid="player-skip-forward"
          onClick={() => onSkip?.(15)}
          style={controlBtn}
        >
          +15
        </button>
      </div>

      {/* Transcript */}
      {transcriptSegments && transcriptSegments.length > 0 && (
        <div
          ref={transcriptRef}
          data-testid="player-transcript"
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            padding: `${tgSpace[4]}px ${tgSpace[6]}px ${tgSpace[8]}px`,
          }}
        >
          {transcriptSegments.map((seg) => {
            const active = seg.id === currentSegmentId;
            const activeIndex = transcriptSegments.findIndex((s) => s.id === currentSegmentId);
            const segIndex = transcriptSegments.findIndex((s) => s.id === seg.id);
            const isPast = activeIndex >= 0 && segIndex < activeIndex;
            const color = active ? tgColors.ink : isPast ? tgColors.ink60 : tgColors.ink40;
            return (
              <p
                key={seg.id}
                data-segment-id={seg.id}
                data-segment-active={active ? 'true' : 'false'}
                style={{
                  fontFamily: active ? tgFonts.editorial : tgFonts.sans,
                  fontStyle: active ? 'italic' : 'normal',
                  fontSize: active ? 18 : 16,
                  lineHeight: 1.55,
                  color,
                  margin: `0 0 ${tgSpace[3]}px 0`,
                }}
              >
                {seg.text}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

const controlBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: tgRadius.pill,
  background: 'transparent',
  color: tgColors.ink,
  border: `1.5px solid ${tgColors.ink20}`,
  cursor: 'pointer',
  fontFamily: tgFonts.mono,
  fontSize: 12,
  fontWeight: 700,
};

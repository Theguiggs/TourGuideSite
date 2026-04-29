import * as React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { tgColors, tgFontsRn, tgFontSize, tgRadius, tgSpace } from '../tokens';
import { Pin } from './Pin';
import { Button } from './Button';
import { Eyebrow } from './Typography';
import { Chip } from './Chip';

/**
 * <Player> (React Native miroir — Story 2.6)
 *
 * API publique identique au Web (`components/Player.tsx`) sauf le handler de
 * lecture interne. Composant signature TourGuide : « **L'écran le plus
 * important — soin maximum.** » (brief §3).
 *
 * **Hors-scope** : aucune logique audio. L'état (`position`, `duration`,
 * `isPlaying`, `currentSegmentId`) arrive en props. Wiring
 * `react-native-track-player` / lock screen / background audio = Story 5.7
 * et Story 7.0 quality gates.
 *
 * Variants :
 * - `variant="mini"` : barre 64 pt, fond `paper`. Le consumer place le
 *   composant en `position: 'absolute', bottom: 0` (RN n'a pas de
 *   `position: sticky`).
 * - `variant="full"` : layout vertical avec ScrollView pour le transcript.
 *   Scrubber : `View` rail 1pt + hit zone 44pt verticale via wrapper avec
 *   padding transparent + `PanResponder` pour drag. Carte : prop `mapSlot`
 *   (consumer injecte `<MapView>` de `react-native-maps` — la dépendance
 *   reste hors `peerDependencies` du DS).
 *
 * **Animations** : `Animated.timing` + `tg.motion` (pas
 * `react-native-reanimated` — non installé sur le projet, voir mémoire).
 *
 * **Accessibility** :
 * - `accessibilityLabel` sur tous les boutons.
 * - Scrubber `accessibilityRole="adjustable"` + `accessibilityActions`
 *   `[increment, decrement]` (pas de 5 s).
 * - Reduce motion : si `AccessibilityInfo.isReduceMotionEnabled()` est `true`,
 *   désactive les animations (durée → 0). Prop `reduceMotion?: boolean`
 *   override (pour tests déterministes).
 */
export type PlayerVariant = 'mini' | 'full';

export interface TranscriptSegment {
  id: string;
  text: string;
  startSec?: number;
}

export interface PlayerProps {
  variant?: PlayerVariant;
  /** @deprecated Story 7.4 — utiliser `variant`. */
  mode?: PlayerVariant;

  title: string;
  subtitle?: string;
  currentStopIndex?: number;
  totalStops?: number;
  city?: string;

  position: number;
  duration: number;
  isPlaying: boolean;

  currentSegmentId?: string;
  transcriptSegments?: TranscriptSegment[];

  /** Slot consumer (RN : généralement `<MapView>` de `react-native-maps`). */
  mapSlot?: React.ReactNode;

  durationLabel?: string;
  stepsLabel?: string;
  langLabel?: string;

  onPlayPause: () => void;
  onSkip?: (delta: number) => void;
  onSeek?: (positionSec: number) => void;
  onTap?: () => void;
  onClose?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMore?: () => void;

  pinColor?: string;
  /** Cover image — RN : `{ uri }` (string passée à `<Image>`). */
  coverImage?: string;

  /**
   * Override la pref OS reduce-motion (pour tests).
   * `undefined` (défaut) : lit `AccessibilityInfo.isReduceMotionEnabled()`.
   */
  reduceMotion?: boolean;

  style?: StyleProp<ViewStyle>;
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

/**
 * Hook : lit la pref OS `Reduce Motion` au mount + écoute les changements.
 * Le prop `override` (Player.reduceMotion) prend toujours priorité.
 */
function useReducedMotion(override?: boolean): boolean {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    if (override !== undefined) return;
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v: boolean) => {
        if (mounted) setEnabled(v);
      })
      .catch(() => {
        // ignore — défaut false.
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) =>
      setEnabled(v)
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, [override]);
  return override !== undefined ? override : enabled;
}

export function Player(props: PlayerProps) {
  const variant: PlayerVariant = props.variant ?? props.mode ?? 'mini';
  const progress = clampProgress(props.position, props.duration);
  const reduceMotion = useReducedMotion(props.reduceMotion);

  if (variant === 'mini') {
    return <MiniPlayer {...props} progress={progress} reduceMotion={reduceMotion} />;
  }
  return <FullPlayer {...props} progress={progress} reduceMotion={reduceMotion} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini variant
// ─────────────────────────────────────────────────────────────────────────────

interface SubProps extends PlayerProps {
  progress: number;
  reduceMotion: boolean;
}

function MiniPlayer({
  title,
  subtitle,
  isPlaying,
  onPlayPause,
  onTap,
  pinColor = tgColors.grenadine,
  progress,
  reduceMotion,
  style,
}: SubProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: reduceMotion ? 0 : 320,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, reduceMotion]);

  return (
    <Animated.View
      testID="player-mini"
      style={[styles.miniRoot, { opacity: fadeAnim }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le player"
        onPress={onTap}
        style={styles.miniTapArea}
      >
        {/* Cover thumb 48×48 */}
        <View style={styles.miniCover} testID="player-mini-cover">
          <Pin size={28} color={pinColor} />
        </View>

        <View style={styles.miniText}>
          <Text numberOfLines={1} style={styles.miniTitle}>
            {title}
          </Text>
          {subtitle && (
            <Text numberOfLines={1} style={styles.miniSubtitle}>
              {subtitle}
            </Text>
          )}
          <View style={styles.miniHairline}>
            <View
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: pinColor,
              }}
            />
          </View>
        </View>
      </Pressable>

      {/* Bouton play/pause — Pressable séparé, ne déclenche pas onTap. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Lire'}
        testID="player-mini-playpause"
        onPress={onPlayPause}
        style={[styles.miniPlay, { backgroundColor: pinColor }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.miniPlayIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full variant
// ─────────────────────────────────────────────────────────────────────────────

function FullPlayer(props: SubProps) {
  const {
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
    pinColor = tgColors.grenadine,
    reduceMotion,
    style,
  } = props;

  const [scrubberWidth, setScrubberWidth] = React.useState(0);
  const transcriptRef = React.useRef<ScrollView | null>(null);
  const segmentOffsets = React.useRef<Record<string, number>>({});

  // Auto-scroll vers le segment actif.
  React.useEffect(() => {
    if (!currentSegmentId || !transcriptRef.current) return;
    const y = segmentOffsets.current[currentSegmentId];
    if (typeof y === 'number') {
      transcriptRef.current.scrollTo({ y: Math.max(0, y - 40), animated: !reduceMotion });
    }
  }, [currentSegmentId, reduceMotion]);

  const onScrubberLayout = (e: LayoutChangeEvent) => {
    setScrubberWidth(e.nativeEvent.layout.width);
  };

  const seekFromX = React.useCallback(
    (x: number) => {
      if (!onSeek || duration <= 0 || scrubberWidth <= 0) return;
      const pct = Math.max(0, Math.min(1, x / scrubberWidth));
      onSeek(pct * duration);
    },
    [onSeek, duration, scrubberWidth]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!onSeek,
        onMoveShouldSetPanResponder: () => !!onSeek,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          seekFromX(e.nativeEvent.locationX);
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          seekFromX(e.nativeEvent.locationX);
        },
      }),
    [onSeek, seekFromX]
  );

  const eyebrowText =
    currentStopIndex && totalStops
      ? city
        ? `Étape ${currentStopIndex} · ${city}`
        : `Étape ${currentStopIndex} / ${totalStops}`
      : subtitle ?? '';

  return (
    <View testID="player-full" style={[styles.fullRoot, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          {onDownload && (
            <Button variant="ghost" size="sm" accessibilityLabel="Télécharger" onPress={onDownload}>
              {'⤓'}
            </Button>
          )}
          {onShare && (
            <Button variant="ghost" size="sm" accessibilityLabel="Partager" onPress={onShare}>
              {'↗'}
            </Button>
          )}
          {onMore && (
            <Button variant="ghost" size="sm" accessibilityLabel="Plus d'options" onPress={onMore}>
              {'⋯'}
            </Button>
          )}
        </View>
        {onClose && (
          <Button variant="ghost" size="sm" accessibilityLabel="Fermer" onPress={onClose}>
            {'×'}
          </Button>
        )}
      </View>

      {/* Map slot — render-prop OU placeholder color-block */}
      <View style={styles.mapSlot} testID="player-map">
        {mapSlot ?? (
          <View testID="player-map-stub" style={styles.mapStub}>
            <Pin size={64} color={pinColor} label={currentStopIndex} />
          </View>
        )}
      </View>

      {/* Métadonnées */}
      <View style={styles.metaBlock}>
        {!!eyebrowText && (
          <Eyebrow color={tgColors.grenadine} style={{ marginBottom: tgSpace[2] }}>
            {eyebrowText}
          </Eyebrow>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {(durationLabel || stepsLabel || langLabel) && (
          <View style={styles.chipsRow}>
            {durationLabel && <Chip color="default">{durationLabel}</Chip>}
            {stepsLabel && <Chip color="default">{stepsLabel}</Chip>}
            {langLabel && <Chip color="default">{langLabel}</Chip>}
          </View>
        )}
      </View>

      {/* Scrubber — hit zone 44pt via padding transparent. */}
      <View style={styles.scrubberWrap}>
        <View
          {...panResponder.panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Position de lecture"
          accessibilityValue={{
            min: 0,
            max: duration > 0 ? Math.round(duration) : 0,
            now: Math.round(position),
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Avancer 5 s' },
            { name: 'decrement', label: 'Reculer 5 s' },
          ]}
          onAccessibilityAction={(e) => {
            if (!onSeek) return;
            if (e.nativeEvent.actionName === 'increment') {
              onSeek(Math.min(duration, position + 5));
            } else if (e.nativeEvent.actionName === 'decrement') {
              onSeek(Math.max(0, position - 5));
            }
          }}
          onLayout={onScrubberLayout}
          testID="player-scrubber"
          style={styles.scrubberHitZone}
        >
          <View style={styles.scrubberRail}>
            <View
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: tgColors.grenadine,
              }}
            />
          </View>
        </View>
        <View style={styles.timecodes}>
          <Text style={styles.timecode}>{fmt(position)}</Text>
          <Text style={styles.timecode}>{fmt(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reculer de 15 secondes"
          testID="player-skip-back"
          onPress={() => onSkip?.(-15)}
          style={styles.skipBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipBtnLabel}>−15</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Lire'}
          testID="player-playpause"
          onPress={onPlayPause}
          style={[styles.playBtn, { backgroundColor: pinColor }]}
        >
          <Text style={styles.playBtnIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Avancer de 15 secondes"
          testID="player-skip-forward"
          onPress={() => onSkip?.(15)}
          style={styles.skipBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipBtnLabel}>+15</Text>
        </Pressable>
      </View>

      {/* Transcript */}
      {transcriptSegments && transcriptSegments.length > 0 && (
        <ScrollView
          ref={transcriptRef}
          testID="player-transcript"
          style={styles.transcript}
          contentContainerStyle={{ paddingBottom: tgSpace[8] }}
        >
          {transcriptSegments.map((seg) => {
            const active = seg.id === currentSegmentId;
            const activeIndex = transcriptSegments.findIndex((s) => s.id === currentSegmentId);
            const segIndex = transcriptSegments.findIndex((s) => s.id === seg.id);
            const isPast = activeIndex >= 0 && segIndex < activeIndex;
            const color = active ? tgColors.ink : isPast ? tgColors.ink60 : tgColors.ink40;
            return (
              <Text
                key={seg.id}
                testID={`segment-${seg.id}`}
                onLayout={(e) => {
                  segmentOffsets.current[seg.id] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.segment,
                  {
                    fontFamily: active ? tgFontsRn.editorial : tgFontsRn.sans,
                    fontStyle: active ? 'italic' : 'normal',
                    fontSize: active ? 18 : 16,
                    color,
                  },
                ]}
              >
                {seg.text}
              </Text>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Mini ───────────────────────────────────────────────────────────────
  miniRoot: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tgColors.paper,
    borderTopLeftRadius: tgRadius.lg,
    borderTopRightRadius: tgRadius.lg,
    paddingHorizontal: tgSpace[4],
    paddingVertical: tgSpace[2],
    // Shadow vers le haut
    shadowColor: tgColors.ink,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  miniTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tgSpace[3],
  },
  miniCover: {
    width: 48,
    height: 48,
    borderRadius: tgRadius.md,
    backgroundColor: tgColors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniText: {
    flex: 1,
    minWidth: 0,
  },
  miniTitle: {
    fontFamily: tgFontsRn.display,
    fontSize: tgFontSize.bodyLg,
    color: tgColors.ink,
  },
  miniSubtitle: {
    fontFamily: tgFontsRn.sans,
    fontSize: tgFontSize.meta,
    color: tgColors.ink60,
    marginTop: 2,
  },
  miniHairline: {
    height: 1,
    backgroundColor: tgColors.ink20,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniPlay: {
    width: 40,
    height: 40,
    borderRadius: tgRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: tgSpace[2],
  },
  miniPlayIcon: {
    color: tgColors.paper,
    fontSize: 16,
  },

  // ── Full ───────────────────────────────────────────────────────────────
  fullRoot: {
    backgroundColor: tgColors.paper,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tgSpace[5],
    paddingVertical: tgSpace[3],
    minHeight: 56,
  },
  headerActions: {
    flexDirection: 'row',
    gap: tgSpace[2],
  },
  mapSlot: {
    height: 240,
    backgroundColor: tgColors.merSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapStub: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBlock: {
    paddingHorizontal: tgSpace[6],
    paddingTop: tgSpace[6],
    paddingBottom: tgSpace[4],
  },
  title: {
    fontFamily: tgFontsRn.display,
    fontSize: tgFontSize.h5,
    color: tgColors.ink,
    letterSpacing: -tgFontSize.h5 * 0.025,
  },
  subtitle: {
    fontFamily: tgFontsRn.sans,
    fontSize: tgFontSize.caption,
    color: tgColors.ink60,
    marginTop: tgSpace[1],
  },
  chipsRow: {
    flexDirection: 'row',
    gap: tgSpace[2],
    marginTop: tgSpace[4],
    flexWrap: 'wrap',
  },
  scrubberWrap: {
    paddingHorizontal: tgSpace[6],
  },
  scrubberHitZone: {
    height: 44,
    justifyContent: 'center',
  },
  scrubberRail: {
    height: 1,
    backgroundColor: tgColors.ink20,
    overflow: 'hidden',
  },
  timecodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timecode: {
    fontFamily: tgFontsRn.mono,
    fontSize: 11,
    color: tgColors.ink60,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tgSpace[6],
    paddingVertical: tgSpace[5],
  },
  skipBtn: {
    width: 44,
    height: 44,
    borderRadius: tgRadius.pill,
    borderWidth: 1.5,
    borderColor: tgColors.ink20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnLabel: {
    fontFamily: tgFontsRn.mono,
    fontSize: 12,
    color: tgColors.ink,
    fontWeight: '700',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: tgRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnIcon: {
    color: tgColors.paper,
    fontSize: 22,
  },
  transcript: {
    flex: 1,
    paddingHorizontal: tgSpace[6],
    paddingTop: tgSpace[4],
  },
  segment: {
    lineHeight: 24,
    marginBottom: tgSpace[3],
  },
});

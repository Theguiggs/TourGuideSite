/**
 * Story 2.6 — Player stories (consumées par Story 2.7 Storybook).
 *
 * 3 stories minimales pour démontrer les variants + le pattern render-prop
 * `mapSlot`. Le setup Storybook complet (CSF, addons) arrive Story 2.7 ;
 * ici on n'expose que des "stories" sous forme de composants React.
 */
import * as React from 'react';
import { Player, type TranscriptSegment } from './Player';
import { tgColors } from '../tokens';

const SAMPLE_SEGMENTS: TranscriptSegment[] = [
  { id: 's1', text: 'Le Marais, c\'est d\'abord une géographie : un quartier né dans les marécages.' },
  { id: 's2', text: 'Ici, au coin de la rue Vieille-du-Temple, vous êtes au cœur du Pletzl historique.' },
  { id: 's3', text: 'L\'hôtel de Sully, devant nous, date du début du XVIIe siècle.' },
  { id: 's4', text: 'Continuons vers la place des Vosges — la plus ancienne place de Paris.' },
];

export function MiniDefault() {
  const [playing, setPlaying] = React.useState(false);
  return (
    <div style={{ minHeight: '100vh', background: tgColors.paper, position: 'relative' }}>
      <div style={{ padding: 24 }}>Contenu de la page (le Player mini est sticky-bottom).</div>
      <Player
        variant="mini"
        title="Le Marais aujourd'hui"
        subtitle="Paris · 38 min · Étape 2/5"
        position={120}
        duration={2280}
        isPlaying={playing}
        onPlayPause={() => setPlaying((v) => !v)}
        onTap={() => alert('Open full player')}
      />
    </div>
  );
}

export function FullDefault() {
  const [playing, setPlaying] = React.useState(true);
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Player
        variant="full"
        title="Le Marais aujourd'hui"
        subtitle="Paris · Voix de Camille"
        currentStopIndex={2}
        totalStops={5}
        city="Paris"
        position={780}
        duration={2280}
        isPlaying={playing}
        currentSegmentId="s2"
        transcriptSegments={SAMPLE_SEGMENTS}
        durationLabel="38 min"
        stepsLabel="5 étapes"
        langLabel="FR"
        onPlayPause={() => setPlaying((v) => !v)}
        onSkip={(d) => console.warn('skip', d)}
        onSeek={(s) => console.warn('seek', s)}
        onClose={() => console.warn('close')}
        onDownload={() => console.warn('download')}
        onShare={() => console.warn('share')}
        onMore={() => console.warn('more')}
      />
    </div>
  );
}

export function FullWithCustomMap() {
  const customMap = (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: tgColors.ocreSoft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"DM Serif Text", Georgia, serif',
        fontStyle: 'italic',
        color: tgColors.ink,
      }}
    >
      Carte personnalisée (Leaflet/Mapbox stub)
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Player
        variant="full"
        title="Le Marais aujourd'hui"
        currentStopIndex={2}
        totalStops={5}
        city="Paris"
        position={300}
        duration={2280}
        isPlaying={false}
        mapSlot={customMap}
        transcriptSegments={SAMPLE_SEGMENTS}
        currentSegmentId="s1"
        onPlayPause={() => undefined}
      />
    </div>
  );
}

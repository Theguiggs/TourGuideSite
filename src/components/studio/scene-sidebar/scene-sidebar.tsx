import type { StudioScene } from '@/types/studio';
import { getSceneStatusConfig } from '@/lib/api/studio';
import { useTranslationStore } from '@/lib/stores/translation-store';
import { useTTSStore } from '@/lib/stores/tts-store';

interface SceneSidebarProps {
  scenes: StudioScene[];
  activeSceneId: string | null;
  onSceneSelect: (sceneId: string) => void;
}

function SegmentBadges({ sceneId }: { sceneId: string }) {
  // Check both implicit (legacy) and any real segment keyed by sceneId
  const translationState = useTranslationStore((s) => {
    const implicit = s.segments[`implicit-${sceneId}`];
    if (implicit) return implicit;
    // Find any segment for this scene
    const key = Object.keys(s.segments).find((k) => k.includes(sceneId));
    return key ? s.segments[key] : null;
  });
  const ttsState = useTTSStore((s) => {
    const implicit = s.segments[`implicit-${sceneId}`];
    if (implicit) return implicit;
    const key = Object.keys(s.segments).find((k) => k.includes(sceneId));
    return key ? s.segments[key] : null;
  });

  const badges: { label: string; color: string }[] = [];

  if (translationState?.status === 'completed') {
    badges.push({ label: 'Traduit', color: 'bg-mer-soft text-mer' });
  } else if (translationState?.status === 'processing') {
    badges.push({ label: 'Trad...', color: 'bg-mer-soft text-mer' });
  }

  if (ttsState?.status === 'completed') {
    badges.push({ label: 'TTS', color: 'bg-grenadine-soft text-grenadine' });
  } else if (ttsState?.status === 'processing') {
    badges.push({ label: 'TTS...', color: 'bg-grenadine-soft text-grenadine' });
  }

  if (badges.length === 0) return null;

  return (
    <span className="flex gap-1 ml-7 mt-0.5">
      {badges.map((b, i) => (
        <span key={i} className={`inline-flex px-1 py-0 rounded text-[9px] font-medium ${b.color}`}>
          {b.label}
        </span>
      ))}
    </span>
  );
}

export function SceneSidebar({ scenes, activeSceneId, onSceneSelect }: SceneSidebarProps) {
  return (
    <nav aria-label="Scenes" className="w-full lg:w-56 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-line bg-paper-soft">
      <div className="p-3">
        <h3 className="text-xs font-semibold text-ink-40 uppercase tracking-wider mb-2 px-2">
          Scènes
        </h3>
        <ol className="space-y-1">
          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            const statusConfig = getSceneStatusConfig(scene.status);
            return (
              <li key={scene.id}>
                <button
                  onClick={() => onSceneSelect(scene.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition ${
                    isActive
                      ? 'bg-grenadine-soft text-grenadine font-medium'
                      : 'text-ink-80 hover:bg-paper-soft'
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                  data-testid={`sidebar-scene-${scene.id}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-paper-deep flex items-center justify-center text-xs font-bold text-ink-60 flex-shrink-0">
                      {scene.sceneIndex + 1}
                    </span>
                    <span className="truncate">{scene.title || `Scène ${scene.sceneIndex + 1}`}</span>
                  </span>
                  <span className={`inline-flex ml-7 mt-0.5 px-1.5 py-0 rounded text-[10px] font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <SegmentBadges sceneId={scene.id} />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

import type { StudioScene } from '@/types/studio';
import { getSceneStatusConfig } from '@/lib/api/studio';

interface SceneSidebarProps {
  scenes: StudioScene[];
  activeSceneId: string | null;
  onSceneSelect: (sceneId: string) => void;
}

export function SceneSidebar({ scenes, activeSceneId, onSceneSelect }: SceneSidebarProps) {
  return (
    <nav aria-label="Scenes" className="w-full lg:w-56 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50">
      <div className="p-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
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
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-teal-100 text-teal-800 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                  data-testid={`sidebar-scene-${scene.id}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                      {scene.sceneIndex + 1}
                    </span>
                    <span className="truncate">{scene.title || `Scène ${scene.sceneIndex + 1}`}</span>
                  </span>
                  <span className={`inline-flex ml-7 mt-0.5 px-1.5 py-0 rounded text-[10px] font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

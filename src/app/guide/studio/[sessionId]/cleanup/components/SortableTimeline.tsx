'use client';

import type { CSSProperties } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StudioScene, WalkSegment } from '@/types/studio';

/**
 * Timeline item kinds — scenes are sortable (drag to reorder), walks are
 * static dividers anchored between adjacent scenes based on their `order`.
 */
export type TimelineItem =
  | { kind: 'scene'; id: string; order: number; scene: StudioScene }
  | { kind: 'walk'; id: string; order: number; walk: WalkSegment };

interface SortableTimelineProps {
  items: TimelineItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Fires after drag-end with the new ordered list of scene ids (only scenes). */
  onScenesReorder: (orderedSceneIds: string[]) => void;
}

export function SortableTimeline({
  items,
  selectedId,
  onSelect,
  onScenesReorder,
}: SortableTimelineProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Only scenes participate in sortable context; walks are rendered as
  // non-sortable static dividers in order with the scenes.
  const sceneItems = items.filter((i) => i.kind === 'scene');
  const sceneIds = sceneItems.map((i) => i.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sceneIds.indexOf(String(active.id));
    const newIndex = sceneIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(sceneIds, oldIndex, newIndex);
    onScenesReorder(next);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
        <ol className="space-y-1" data-testid="cleanup-timeline">
          {items.map((item) =>
            item.kind === 'scene' ? (
              <SortableSceneItem
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onSelect={onSelect}
              />
            ) : (
              <WalkItem
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onSelect={onSelect}
              />
            ),
          )}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function baseClass(isSelected: boolean): string {
  return `w-full text-left rounded-lg px-2 py-2 border transition cursor-pointer ${
    isSelected
      ? 'bg-grenadine-soft border-grenadine-soft text-grenadine'
      : 'bg-white border-line hover:border-grenadine-soft'
  }`;
}

interface SortableSceneItemProps {
  item: Extract<TimelineItem, { kind: 'scene' }>;
  selected: boolean;
  onSelect: (id: string) => void;
}

function SortableSceneItem({ item, selected, onSelect }: SortableSceneItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const scene = item.scene;
  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`${baseClass(selected)} ${item.scene.archived ? 'opacity-50 line-through' : ''}`}
        data-testid={`timeline-poi-${item.id}`}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            aria-label="Réordonner"
            data-testid={`drag-handle-${item.id}`}
            {...attributes}
            {...listeners}
            className="text-ink-40 hover:text-ink-80 cursor-grab active:cursor-grabbing px-1"
          >
            <span aria-hidden>⋮⋮</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex-1 min-w-0 text-left"
            data-testid={`poi-select-${item.id}`}
          >
            <div className="flex items-start gap-2">
              <span aria-hidden className="text-sm mt-0.5">📍</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {scene.title || `Scène ${scene.sceneIndex + 1}`}
                </p>
                <p className="text-[11px] text-ink-60">
                  {scene.photosRefs.length} photos ·{' '}
                  {scene.studioAudioKey || scene.originalAudioKey ? '1 audio' : '0 audio'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </li>
  );
}

interface WalkItemProps {
  item: Extract<TimelineItem, { kind: 'walk' }>;
  selected: boolean;
  onSelect: (id: string) => void;
}

function WalkItem({ item, selected, onSelect }: WalkItemProps) {
  return (
    <li>
      <button
        type="button"
        className={`${baseClass(selected)} ${item.walk.deleted ? 'opacity-50 line-through' : ''}`}
        onClick={() => onSelect(item.id)}
        data-testid={`timeline-walk-${item.id}`}
      >
        <div className="flex items-start gap-2">
          <span aria-hidden className="text-sm mt-0.5">🚶</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Marche #{item.walk.order}</p>
            <p className="text-[11px] text-ink-60">
              {Math.round((item.walk.durationMs ?? 0) / 1000)}s ·{' '}
              {Math.round(item.walk.distanceM ?? 0)}m
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

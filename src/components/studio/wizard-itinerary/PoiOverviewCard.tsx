'use client';

interface PoiOverviewCardProps {
  /** 1-based index displayed as a numbered marker (italic editorial). */
  index: number;
  title: string;
  /** Has GPS coordinates set. */
  hasGps: boolean;
  /** Validated by the guide. */
  validated: boolean;
  /** Disable all interactive controls (locked status). */
  locked?: boolean;
  /** Show reorder ▲ button (false for first item). */
  canMoveUp?: boolean;
  /** Show reorder ▼ button (false for last item). */
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEdit?: () => void;
  onToggleValidate?: () => void;
  onDelete?: () => void;
}

/**
 * <PoiOverviewCard> — card POI dans la liste Itinéraire (vue résumé).
 * Numéro grenadine italique + titre + indicateurs GPS/Validé + actions iconBtn.
 * Port de docs/design/ds/wizard-3-itineraire.jsx:67-86.
 */
export function PoiOverviewCard({
  index,
  title,
  hasGps,
  validated,
  locked = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onEdit,
  onToggleValidate,
  onDelete,
}: PoiOverviewCardProps) {
  return (
    <div
      data-testid="poi-overview-card"
      className="bg-card border border-line rounded-md px-4 py-3 grid items-center gap-3"
      style={{ gridTemplateColumns: '40px 1fr auto' }}
    >
      {/* Reorder column */}
      <div className="flex flex-col items-center gap-0.5">
        {canMoveUp && !locked && (
          <button
            type="button"
            onClick={onMoveUp}
            data-testid="poi-move-up"
            aria-label="Déplacer vers le haut"
            className="text-ink-40 hover:text-ink leading-none text-meta cursor-pointer"
          >
            ▲
          </button>
        )}
        <span
          className="w-7 h-7 rounded-full bg-grenadine text-paper flex items-center justify-center font-editorial italic font-bold text-caption shrink-0"
          aria-hidden="true"
        >
          {index}
        </span>
        {canMoveDown && !locked && (
          <button
            type="button"
            onClick={onMoveDown}
            data-testid="poi-move-down"
            aria-label="Déplacer vers le bas"
            className="text-ink-40 hover:text-ink leading-none text-meta cursor-pointer"
          >
            ▼
          </button>
        )}
      </div>

      {/* Title + indicators */}
      <div className="min-w-0">
        <div className="text-caption font-medium text-ink truncate">{title}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={`w-1.5 h-1.5 rounded-pill ${hasGps ? 'bg-success' : 'bg-ocre'}`}
            aria-hidden="true"
          />
          <span className={`text-meta ${hasGps ? 'text-success' : 'text-ocre'}`}>
            {hasGps ? 'GPS OK' : 'Pas de GPS'}
          </span>
          {validated && (
            <span className="text-meta text-olive font-bold ml-2" data-testid="poi-validated">
              ✓ Validé
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!locked && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              data-testid="poi-edit"
              aria-label="Éditer"
              title="Éditer"
              className="w-7 h-7 rounded-sm bg-transparent border-none text-ink-60 hover:text-grenadine hover:bg-grenadine-soft transition cursor-pointer text-meta"
            >
              ✎
            </button>
          )}
          {onToggleValidate && (
            <button
              type="button"
              onClick={onToggleValidate}
              data-testid="poi-validate"
              aria-label={validated ? 'Retirer la validation' : 'Valider'}
              title={validated ? 'Retirer la validation' : 'Valider'}
              aria-pressed={validated}
              className={`w-7 h-7 rounded-sm bg-transparent border-none transition cursor-pointer text-meta ${
                validated
                  ? 'text-success'
                  : 'text-ink-60 hover:text-success hover:bg-olive-soft'
              }`}
            >
              ✓
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              data-testid="poi-delete"
              aria-label="Supprimer"
              title="Supprimer"
              className="w-7 h-7 rounded-sm bg-transparent border-none text-ink-60 hover:text-danger hover:bg-grenadine-soft transition cursor-pointer text-meta"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

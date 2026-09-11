/**
 * Déplacement d'un marqueur Leaflet au clavier (lot 4).
 *
 * Les marqueurs de l'itinéraire ne bougeaient qu'à la souris. Leaflet les
 * rend focusables (`keyboard: true` par défaut) mais n'attache rien aux
 * flèches. Une fois le marqueur au focus : flèches = ~11 m, Maj + flèches =
 * ~110 m. L'événement est stoppé pour que la carte ne se déplace pas en même
 * temps. Le rappel reçoit la position finale, comme un `dragend`.
 */

/** ≈ 11 m en latitude ; un peu moins en longitude selon la latitude. */
export const NUDGE_DEG = 0.0001;
const SHIFT_FACTOR = 10;

type LatLngLike = { lat: number; lng: number };

export interface NudgeableMarker {
  getLatLng(): LatLngLike;
  setLatLng(latlng: [number, number]): unknown;
  getElement?(): HTMLElement | undefined;
}

/** Nouvelle position pour une touche, ou null si la touche ne bouge rien. */
export function nudgedPosition(
  from: LatLngLike,
  key: string,
  shift = false,
): [number, number] | null {
  const step = NUDGE_DEG * (shift ? SHIFT_FACTOR : 1);
  switch (key) {
    case 'ArrowUp':
      return [from.lat + step, from.lng];
    case 'ArrowDown':
      return [from.lat - step, from.lng];
    case 'ArrowLeft':
      return [from.lat, from.lng - step];
    case 'ArrowRight':
      return [from.lat, from.lng + step];
    default:
      return null;
  }
}

const ATTACHED = new WeakSet<HTMLElement>();

/**
 * À appeler quand le marqueur est ajouté à la carte (événement `add`) :
 * son élément DOM n'existe pas avant. Idempotent par élément.
 */
export function attachKeyboardNudge(
  marker: NudgeableMarker,
  onMove: (lat: number, lng: number) => void,
): void {
  const el = marker.getElement?.();
  if (!el || ATTACHED.has(el)) return;
  ATTACHED.add(el);
  el.addEventListener('keydown', (event: KeyboardEvent) => {
    const next = nudgedPosition(marker.getLatLng(), event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    marker.setLatLng(next);
    onMove(next[0], next[1]);
  });
}

import { attachKeyboardNudge, NUDGE_DEG, nudgedPosition } from '../keyboard-nudge';

describe('nudgedPosition', () => {
  const from = { lat: 43.7, lng: 7.25 };

  it('déplace d’un pas selon la flèche, dix pas avec Maj', () => {
    expect(nudgedPosition(from, 'ArrowUp')).toEqual([43.7 + NUDGE_DEG, 7.25]);
    expect(nudgedPosition(from, 'ArrowDown')).toEqual([43.7 - NUDGE_DEG, 7.25]);
    expect(nudgedPosition(from, 'ArrowLeft')).toEqual([43.7, 7.25 - NUDGE_DEG]);
    expect(nudgedPosition(from, 'ArrowRight', true)).toEqual([43.7, 7.25 + NUDGE_DEG * 10]);
  });

  it('ignore les autres touches', () => {
    expect(nudgedPosition(from, 'Enter')).toBeNull();
    expect(nudgedPosition(from, 'a')).toBeNull();
  });
});

describe('attachKeyboardNudge', () => {
  function fakeMarker() {
    const el = document.createElement('div');
    let pos = { lat: 43.7, lng: 7.25 };
    return {
      el,
      marker: {
        getLatLng: () => pos,
        setLatLng: (next: [number, number]) => {
          pos = { lat: next[0], lng: next[1] };
        },
        getElement: () => el,
      },
      position: () => pos,
    };
  }

  it('déplace le marqueur au focus et prévient l’appelant, sans laisser la carte bouger', () => {
    const { el, marker, position } = fakeMarker();
    const onMove = jest.fn();
    attachKeyboardNudge(marker, onMove);

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    const stop = jest.spyOn(event, 'stopPropagation');
    el.dispatchEvent(event);

    expect(position()).toEqual({ lat: 43.7, lng: 7.25 + NUDGE_DEG });
    expect(onMove).toHaveBeenCalledWith(43.7, 7.25 + NUDGE_DEG);
    expect(event.defaultPrevented).toBe(true);
    expect(stop).toHaveBeenCalled();
  });

  it('ne s’attache qu’une fois par élément, et laisse passer Entrée', () => {
    const { el, marker } = fakeMarker();
    const onMove = jest.fn();
    attachKeyboardNudge(marker, onMove);
    attachKeyboardNudge(marker, onMove);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(onMove).toHaveBeenCalledTimes(1);
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    el.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
  });

  it('ne fait rien si le marqueur n’a pas encore d’élément', () => {
    expect(() => attachKeyboardNudge({ getLatLng: () => ({ lat: 0, lng: 0 }), setLatLng: () => {} }, jest.fn())).not.toThrow();
  });
});

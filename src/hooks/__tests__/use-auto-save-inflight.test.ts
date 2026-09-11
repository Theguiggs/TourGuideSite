/**
 * La frappe faite PENDANT une sauvegarde lente ne doit ni être perdue de vue,
 * ni être annoncée comme sauvegardée.
 *
 * Avant correction, `performSave` retournait immédiatement quand une écriture
 * était en vol : la demande était oubliée, et `isDirty` repassait à faux à la
 * fin de l'écriture précédente. L'interface affichait « Sauvegardé » alors que
 * le texte courant n'était pas parti.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../use-auto-save';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/**
 * Monte le hook sur une base « v0 » puis passe à « v1 » : sans ce premier
 * changement, la donnée égale la référence de base et rien n'est jamais écrit.
 */
function mountDirty(onSave: (data: string) => Promise<void>) {
  const hook = renderHook(
    ({ data }) => useAutoSave({ data, onSave, debounceMs: 10_000, saveOnBlur: false }),
    { initialProps: { data: 'v0' } },
  );
  hook.rerender({ data: 'v1' });
  return hook;
}

describe('useAutoSave while a save is in flight', () => {
  it('re-saves the newest text instead of dropping it', async () => {
    const first = deferred();
    const saved: string[] = [];
    const onSave = jest.fn(async (data: string) => {
      saved.push(data);
      if (saved.length === 1) await first.promise;
    });

    const { result, rerender } = mountDirty(onSave);

    // Sauvegarde de « v1 » — elle reste en vol.
    act(() => {
      void result.current.saveNow();
    });
    await waitFor(() => expect(saved).toEqual(['v1']));

    // Le guide continue de taper pendant l'écriture, et une seconde demande part.
    rerender({ data: 'v2' });
    await act(async () => {
      await result.current.saveNow();
    });

    // La première écriture se termine : la seconde doit alors partir seule.
    await act(async () => {
      first.resolve();
      await first.promise;
    });

    await waitFor(() => expect(saved).toEqual(['v1', 'v2']));
  });

  it('keeps reporting unsaved changes until the newest text is really written', async () => {
    const first = deferred();
    const onSave = jest.fn(async (data: string) => {
      if (data === 'v1') await first.promise;
    });

    const { result, rerender } = mountDirty(onSave);

    act(() => {
      void result.current.saveNow();
    });
    rerender({ data: 'v2' });

    await act(async () => {
      first.resolve();
      await first.promise;
    });

    // La relance porte bien le texte courant, pas celui qui vient de partir.
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('v2'));
    await waitFor(() => expect(result.current.isDirty).toBe(false));
  });

  it('still refuses to write when nothing changed', async () => {
    const onSave = jest.fn(async () => {});
    const { result } = renderHook(() =>
      useAutoSave({ data: 'stable', onSave, debounceMs: 10_000, saveOnBlur: false }),
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});

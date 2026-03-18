import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../use-auto-save';

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts not dirty and not saving', () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ data: 'hello', onSave }));
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('becomes dirty when data changes', () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave }),
      { initialProps: { data: 'hello' } },
    );

    rerender({ data: 'hello world' });
    expect(result.current.isDirty).toBe(true);
  });

  it('auto-saves after debounce delay', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 1000 }),
      { initialProps: { data: 'initial' } },
    );

    rerender({ data: 'changed' });

    // Not saved yet
    expect(onSave).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });

    expect(onSave).toHaveBeenCalledWith('changed');
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSavedAt).toBeTruthy();
  });

  it('does not save when disabled', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 1000, enabled: false }),
      { initialProps: { data: 'initial' } },
    );

    rerender({ data: 'changed' });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save if data unchanged', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave({ data: 'same', onSave, debounceMs: 1000 }));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saveNow triggers immediate save', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave, debounceMs: 30000 }),
      { initialProps: { data: 'initial' } },
    );

    rerender({ data: 'manual save' });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).toHaveBeenCalledWith('manual save');
  });
});

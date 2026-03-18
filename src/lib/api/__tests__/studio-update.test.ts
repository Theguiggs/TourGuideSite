import { updateSceneText } from '../studio';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

describe('updateSceneText', () => {
  it('updates text for known scene', async () => {
    const result = await updateSceneText('scene-1', 'Updated text');
    expect(result.ok).toBe(true);
  });

  it('accepts empty text', async () => {
    const result = await updateSceneText('scene-1', '');
    expect(result.ok).toBe(true);
  });

  it('succeeds for any scene id in stub mode', async () => {
    const result = await updateSceneText('nonexistent', 'Some text');
    expect(result.ok).toBe(true);
  });
});

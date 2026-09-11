/**
 * Le chaînon qui manquait : une prise enregistrée dans le Studio web doit
 * atteindre S3 PUIS sa Scène, et le dire quand elle n'y arrive pas.
 */

jest.mock('@/lib/studio/studio-upload-service', () => ({
  uploadAudio: jest.fn(),
}));
jest.mock('@/lib/api/studio', () => ({
  updateSceneData: jest.fn(),
}));

import { uploadAudio } from '@/lib/studio/studio-upload-service';
import { updateSceneData } from '@/lib/api/studio';
import { persistTake } from '../take-persistence';

const mockUpload = uploadAudio as jest.Mock;
const mockUpdate = updateSceneData as jest.Mock;

const input = () => ({
  blob: new Blob(['audio'], { type: 'audio/webm' }),
  sessionId: 'session-1',
  sceneId: 'scene-abc',
  sceneIndex: 2,
  language: 'fr',
  takesCount: 3,
  selectedTakeIndex: 1,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('persistTake', () => {
  it('uploads with the session language then attaches the key to the scene', async () => {
    mockUpload.mockResolvedValue({ ok: true, s3Key: 'guide-studio/sub/s1/audio/scene-abc_fr_1.webm' });
    mockUpdate.mockResolvedValue({ ok: true });

    const result = await persistTake(input());

    expect(result).toEqual({ ok: true, s3Key: 'guide-studio/sub/s1/audio/scene-abc_fr_1.webm' });
    expect(mockUpload).toHaveBeenCalledWith(expect.any(Blob), 'session-1', 2, 'scene-abc', 'fr');
  });

  it('writes the human-voice attestation the approval Lambda requires', async () => {
    mockUpload.mockResolvedValue({ ok: true, s3Key: 'key-1' });
    mockUpdate.mockResolvedValue({ ok: true });

    await persistTake(input());

    // Sans `baseAudioSource: 'recording'`, `validateSource()` refuse la
    // soumission avec « N scène(s) sans audio humain attesté ».
    expect(mockUpdate).toHaveBeenCalledWith('scene-abc', {
      studioAudioKey: 'key-1',
      status: 'recorded',
      baseAudioSource: 'recording',
      takesCount: 3,
      selectedTakeIndex: 1,
    });
  });

  it('omits the take counters when the caller does not know them', async () => {
    mockUpload.mockResolvedValue({ ok: true, s3Key: 'key-1' });
    mockUpdate.mockResolvedValue({ ok: true });

    const rest = { ...input() };
    delete (rest as Partial<typeof rest>).takesCount;
    delete (rest as Partial<typeof rest>).selectedTakeIndex;
    await persistTake(rest);

    expect(mockUpdate).toHaveBeenCalledWith('scene-abc', {
      studioAudioKey: 'key-1',
      status: 'recorded',
      baseAudioSource: 'recording',
    });
  });

  it('never touches the scene when the upload fails', async () => {
    mockUpload.mockResolvedValue({ ok: false, error: 'Upload audio échoué après 3 tentatives.' });

    const result = await persistTake(input());

    expect(result).toEqual({ ok: false, error: 'Upload audio échoué après 3 tentatives.' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('reports failure when the scene write fails, rather than claiming the take is saved', async () => {
    mockUpload.mockResolvedValue({ ok: true, s3Key: 'key-1' });
    mockUpdate.mockResolvedValue({ ok: false, error: 'Erreur de sauvegarde.' });

    const result = await persistTake(input());

    expect(result).toEqual({ ok: false, error: 'Erreur de sauvegarde.' });
  });
});
